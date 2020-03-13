'use strict';

const debugActionManager = require('debug')('sc2:debug:actionManager');
const Promise = require('bluebird');
const createTransport = require('@node-sc2/proto');
const getRandom = require('../utils/get-random');
const { distance, nClosestPoint } = require('../utils/geometry/point');
const { gridsInCircle } = require('../utils/geometry/angle');
const {
    Ability,
    enums: { Alliance, Race, AbilityDataTarget },
    UnitType,
    UnitTypeId,
    WarpUnitAbility,
} = require('../constants');
const { GasMineRace } = require('../constants/race-map');
const UnitAbilites = require('../constants/unit-ability-map');
const { ActionManagerError, BuildError, TrainError, GatherError } = require('../engine/errors');

function getRandomN(arr, n) {
    return Array.from({ length: n }, () => {
        return arr[Math.floor(Math.random()*arr.length)];
    });
}

/**
 * @returns {ActionManager}
 * @param {World} world
 */
function createActionManager(world, client) {
    const protoClient = client || createTransport();
    
    return {
        _client: protoClient,
        async do(abilityId, ts, opts = {}) {
            let tags = Array.isArray(ts) ? ts : [ts];

            if (tags[0].tag) {
                tags = tags.map(u => u.tag);
            }

            /** @type {SC2APIProtocol.ActionRawUnitCommand} */
            const doAction = {
                abilityId,
                unitTags: tags,
                queueCommand: opts.queue || false,
            };

            if (opts.target && opts.target.tag) {
                doAction.targetUnitTag = opts.target.tag;
            } else if (opts.target && opts.target.x) {
                doAction.targetWorldSpacePos = opts.target;
            }

            return this.sendAction(doAction)
                .then(async (res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not perform ability, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async smart(us, pos, queue = false) {
            const units = Array.isArray(us) ? us : [us];

            const smartTo = {
                abilityId: Ability.SMART,
                unitTags: units.map(u => u.tag),
                queueCommand: queue,
            };

            if (pos.tag) {
                smartTo.targetUnitTag = pos.tag;
            } else if (pos.x) {
                smartTo.targetWorldSpacePos = pos;
            }

            return this.sendAction(smartTo)
                .then(async (res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not SMART unit, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async move(u, posOrUnit, queue = false) {
            const units = Array.isArray(u) ? u : [u];

            const moveTo = {
                abilityId: Ability.MOVE,
                unitTags: units.map(u => u.tag),
                queueCommand: queue,
            };

            if (posOrUnit.tag) {
                moveTo.targetUnitTag = posOrUnit.tag;
            } else if (posOrUnit.x) {
                moveTo.targetWorldSpacePos = posOrUnit;
            }

            return this.sendAction(moveTo)
                .then((res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not move unit, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async patrol(u, p, queue = false) {
            const units = Array.isArray(u) ? u : [u];

            const points = Array.isArray(p) ? p : [u.pos, p];
            const [from, to] = points;

            const patrolToTo = {
                abilityId: Ability.PATROL,
                unitTags: units.map(u => u.tag),
                targetWorldSpacePos: to,
                queueCommand: true,
            };

            return this.move(units, from, queue)
                .then(() => this.sendAction(patrolToTo))
                .then((res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not patrol unit, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async attack(us, unit, queue = false) {
            const units = Array.isArray(us) ? us : [us];

            return this.sendAction({
                abilityId: Ability.ATTACK_ATTACK,
                targetUnitTag: unit.tag,
                unitTags: units.map(u => u.tag),
                queueCommand: queue,
            });
        },
        async attackMove(u, p, queue = false) {
            const us = Array.isArray(u) ? u : [u];
            const { map } = world.resources.get();

            const moveUnits = us;
            const position = p || map.getLocations().enemy[0];

            return this.sendAction({
                abilityId: Ability.ATTACK_ATTACK,
                targetWorldSpacePos: position,
                unitTags: moveUnits.map(u => u.tag),
                queueCommand: queue,
            });
        },
        async swapBuildings(unitA, unitB) {
            // both unitA and unitB pass...
            const haveAbility = [unitA, unitB].every((unit) => {
                // if they have LIFT, they will have LAND once they are lifted
                return UnitAbilites[unit.unitType].includes(Ability.LIFT);
            });

            const isComplete = [unitA, unitB].every(u => u.buildProgress >= 1);

            if (!haveAbility || !isComplete) {
                throw new ActionManagerError(
                    'These two units cannot be swapped',
                    { data: { unitA, unitB } }
                );
            }

            const unitAPos = unitA.pos;
            const unitBPos = unitB.pos;
    
            // the is dangling on purpose, don't want to hold up our game loop on this stuff
            Promise.all([
                this.do(Ability.LIFT, unitA.tag),
                this.do(Ability.LIFT, unitB.tag),
            ])
            .delay(100)
            .then(() => {
                return Promise.all([
                    this.move([unitA], unitBPos, true),
                    this.move([unitB], unitAPos, true),
                ]);
            })
            .delay(100)
            .then(() => {
                return Promise.all([
                    this.do(Ability.LAND, unitA.tag, { target: unitBPos, queue: true }),
                    this.do(Ability.LAND, unitB.tag, { target: unitAPos, queue: true }),
                ]);
            }).catch((e) => {
                debugActionManager(`Transport error while trying to engage building swap: ${e.message}`);
            });

            return null; // suppress bluebird warning
        },
        async gather(unit, mineralField, queue = true) {
            const { units } = world.resources.get();

            if (!unit.isWorker() && unit.unitType !== UnitType.MULE) {
                throw new GatherError('only workers can gather', { data: { unit, mineralField, queue }});
            }

            if (unit.labels.has('command') && queue === false) {
                console.warn('WARNING! unit with command erroniously told to force gather! Forcing queue');
                queue = true;
            }

            const ownBases = units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1);

            let target;
            if (mineralField && mineralField.tag) {
                target = mineralField;
            } else {
                let targetBase;
                const needyBase = ownBases.sort((a, b) => {
                    // sort by the closest base to the idle worker
                    return distance(unit.pos,a.pos) - distance(unit.pos, b.pos);
                })
                // try to find a base that's needy, closest first
                .find(base => base.assignedHarvesters < base.idealHarvesters);

                if (!needyBase) {
                    [targetBase] = ownBases;
                } else {
                    targetBase = needyBase;
                }

                const currentMineralFields = units.getMineralFields();
                const targetBaseFields = units.getClosest(targetBase.pos, currentMineralFields, 3);
                
                [target] = units.getClosest(unit.pos, targetBaseFields);
            }

            const sendToGather = {
                abilityId: Ability.SMART,
                targetUnitTag: target.tag,
                unitTags: [unit.tag],
                queueCommand: queue,
            };

            return this.sendAction(sendToGather)
                .then(async (res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not send to gather, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async mine(us, target, queue = true) {
            const units = Array.isArray(us) ? us : [us];

            const sendToMine = {
                abilityId: Ability.HARVEST_GATHER,
                unitTags: units.map(u => u.tag),
                targetUnitTag: target.tag,
                queueCommand: queue,
            };

            return this.sendAction(sendToMine);
        },
        async canPlace(unitTypeId, poses) {
            // limit to checking 10 placements because the client gets unhappy
            const positions = poses.length <= 10 ? poses : getRandomN(poses, 10);

            const placements = positions.map((pos) => ({
                targetPos: pos,
                abilityId: world.data.getUnitTypeData(unitTypeId).abilityId,
            })).reverse();

            /** @type {SC2APIProtocol.ResponseQuery} */
            const query = await protoClient.query({ placements });

            const successes = query.placements
                .map((p, i) => ({ placement: p, index: i }))
                .filter((p) => p.placement.result === 1);

            if (successes.length > 0) {
                return placements[getRandom(successes).index].targetPos;
            } else {
                false;
            }
        },
        async build(unitTypeId, pointOrUnitOrNone, worker) {
            const { units, frame } = world.resources.get();

            let queue = false;
            if (world.agent.hasTechFor(unitTypeId) === false) {
                throw new BuildError(
                    'Missing tech requirements to build unit type',
                    { data: { unitTypeId, pointOrUnitOrNone, worker } }
                );
            }

            /**
             * NEVER REMOVE THIS - the user should be checking this on their own
             * to avoid expensive calculations and placement calls, but *we also
             * need to check here again anyway*. Two systems wanting to build something
             * can over take one another while the other is waiting on their placement
             * call to come back, thereby both being able to afford at the start of their
             * routine but not after - AND THE API RESPONDS 1 / SUCCESS TO BOTH - very bad-
             */
            if (!world.agent.canAfford(unitTypeId)) {
                throw new BuildError(
                    `You can not (currently) afford to build unitTypeId ${unitTypeId}`,
                    { data: { unitTypeId, pointOrUnitOrNone, worker } }
                );
            }

            let pos, target;

            if (pointOrUnitOrNone && pointOrUnitOrNone.tag) {
                target = pointOrUnitOrNone;
            } else if (pointOrUnitOrNone && pointOrUnitOrNone.x) {
                pos = pointOrUnitOrNone;
            }

            const { abilityId } = world.data.getUnitTypeData(unitTypeId);

            const buildAbilityTarget = world.data.getAbilityData(abilityId).target;
            const mustBeNone = buildAbilityTarget === AbilityDataTarget.NONE;
            const canBeNone = (
                mustBeNone ||
                buildAbilityTarget === AbilityDataTarget.POINTORNONE
            );

            if (!target && !pos && !canBeNone) {
                throw new BuildError(
                    `Building unit ${unitTypeId} with build ability ${abilityId} requires a target of type ${buildAbilityTarget}, but none was given`,
                    { data: { unitTypeId, pointOrUnitOrNone, worker } }
                );
            }

            if ((target || pos) && mustBeNone) {
                throw new BuildError(
                    `Building unit ${unitTypeId} with build ability ${abilityId} must be done without a target, but you gave: ${pointOrUnitOrNone}. Try passing null as the second argument, and your target as the third.`,
                    { data: { unitTypeId, pointOrUnitOrNone, worker } }
                );
            }

            /** @type {Unit} */
            let builder;
            if (worker) {
                builder = worker;
            } else {
                const builders = [
                    ...units.getMineralWorkers(),
                    ...units.getWorkers().filter(w => w.noQueue),
                ];

                // @FIXME: race-specific stuff should be Proxy'd and not conditional like this, ugly
                if (world.agent.race === Race.PROTOSS) {
                    const builderWorkers = units.getConstructingWorkers().filter(w => !w.hasLabel('stuck'));
                    if (builderWorkers.length > 0) {
                        [builder] = units.getClosest(pos || target.pos, builderWorkers);
                        if (distance(builder.pos, pos || target.pos) < 20) {
                            queue = true;
                        } else {
                            [builder] = units.getClosest(pos || target.pos, builders);
                        }
                    } else {
                        [builder] = units.getClosest(pos || target.pos, builders);
                    }
                } else {
                    [builder] = units.getClosest(pos || target.pos, builders);
                }
            }

            if (!builder) {
                throw new BuildError(
                    'Unable to find or use builder, something is very wrong',
                    { data: { unitTypeId, pointOrUnitOrNone, worker } }
                );
            }

            const unitCommand = {
                abilityId,
                unitTags: [builder.tag],
                queueCommand: queue,
            };

            // give the builder a command label so we know we're already issuing it something this frame
            builder.labels.set('command', frame.getGameLoop());
            // console.log(`FRAME: ${frame.getGameLoop()}, MONEY: ${world.agent.minerals}, COMMAND:`, unitCommand);

            const { mineralCost, vespeneCost } = world.data.getUnitTypeData(unitTypeId);

            world.agent.minerals = world.agent.minerals - mineralCost;
            world.agent.vespene = world.agent.vespene - vespeneCost;

            if (target) { 
                unitCommand.targetUnitTag = target.tag;
            } else if (pos) {
                unitCommand.targetWorldSpacePos = pos;
            }

            return this.sendAction(unitCommand)
                .then(async (res) => {
                    // console.log('RESPONSE: ', res);
                    // *do not delete any builder labels here* - it's not fully ack'd until next frame
                    if (res.result[0] !== 1) {
                        // *not even in here*
                        debugActionManager(`failed request: ${JSON.stringify(unitCommand)}`);
                        throw new Error(`Could not build, result ${res.result[0]}`);
                    }

                    // @FIXME: is there any reason we should hold the loop on this? i feel like there might be...
                    if (unitTypeId === GasMineRace[world.agent.race]) {
                        await this.gather(builder);
                    }

                    return res;
                });
        },
        async buildGasMine() {
            const { map } = world.resources.get();
            
            const gasMine = GasMineRace[world.agent.race];
            const [geyser] = map.freeGasGeysers();

            if (!geyser) {
                throw new BuildError(
                    'no free geysers in own expansions for building mines on'
                );
            }

            return this.build(gasMine, geyser);
        },
        /**
         * Train unitType from applicable production facilities
         */
        async train(unitTypeId, productionUnit) {
            const { units } = world.resources.get();
            
            if (world.agent.hasTechFor(unitTypeId) === false) {
                throw new TrainError(
                    `Missing tech requirements to build unit type ${unitTypeId}`,
                    { data: { unitTypeId, productionUnit }}
                );
            }

            let trainer;

            if (!world.agent.canAfford(unitTypeId)) {
                throw new TrainError(
                    `cannot afford training unit: ${unitTypeId}`,
                    { data: { unitTypeId, productionUnit }}
                );
            } 

            if (productionUnit) {
                trainer = productionUnit;
            } else {
                trainer = units.getProductionUnits(unitTypeId).find(u => u.noQueue);
            }

            if (!trainer) {
                throw new TrainError(
                    `no free production unit for type: ${unitTypeId}`,
                    { data: { unitTypeId, productionUnit }}
                );
            }

            const { mineralCost, vespeneCost, abilityId } = world.data.getUnitTypeData(unitTypeId);

            world.agent.minerals = world.agent.minerals - mineralCost;
            world.agent.vespene = world.agent.vespene - vespeneCost;

            const unitCommand = { abilityId, unitTags: [trainer.tag] };

            return this.sendAction(unitCommand)
                .then(async (res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not train, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async upgrade(upgradeId, upgradeFacility) {
            const { units } = world.resources.get();
            
            let upgrader;

            if (upgradeFacility) {
                upgrader = upgradeFacility;
            } else {
                upgrader = units.getUpgradeFacilities(upgradeId).find(u => u.noQueue);
            }

            if (!upgrader) {
                throw new TrainError(
                    `no free upgrade facility for upgradeId: ${upgradeId}`,
                    { data: { upgradeId, upgradeFacility }}
                );
            }

            const { abilityId } = world.data.getUpgradeData(upgradeId);
            const unitCommand = { abilityId, unitTags: [upgrader.tag] };

            return this.sendAction(unitCommand)
                .then(async (res) => {
                    if (res.result[0] !== 1) {
                        throw new Error(`Could not start upgrade ${upgradeId}, result ${res.result[0]}`);
                    }

                    return res;
                });
        },
        async warpIn(unitType, opts = {}) {
            const { units, map } = world.resources.get();
            const abilityId = WarpUnitAbility[unitType];
            const n = opts.maxQty || 1;
            const nearPosition = opts.nearPosition || map.getCombatRally();

            const qtyToWarp = world.agent.canAffordN(unitType, n);
            if (qtyToWarp <= 0) {
                throw new ActionManagerError(
                    `cannot afford warping any qty of unit: ${UnitTypeId[unitType]}`,
                    { data: { unitType, opts }}
                );
            }

            const selectedMatricies = units.getClosest(nearPosition, world.agent.powerSources, opts.nearPosition ? 1 : 3);
            let myPoints = selectedMatricies
                .map(matrix => gridsInCircle(matrix.pos, matrix.radius))
                .reduce((acc, arr) => acc.concat(arr), [])
                .filter(p => map.isPathable(p) && !map.hasCreep(p));

            if (opts.highground) {
                myPoints = myPoints
                    .map(p => ({ ...p, z: map.getHeight(p) }))
                    .sort((a, b) => b.z - a.z)
                    .filter((p, i, arr) => p.z === arr[0].z);
            }
    
            const myStructures = units.getStructures();
            const points = nClosestPoint(nearPosition, myPoints, 100)
                .filter(point => myStructures.every(structure => distance(structure.pos, point) > 2));
    
            const warpGates = units.getById(UnitType.WARPGATE).filter(wg => wg.abilityAvailable(abilityId)).slice(0, qtyToWarp);
            if (warpGates.length <= 0) {
                throw new ActionManagerError(`No ready warpgates with ability to warp in ${UnitTypeId[unitType]}`);
            }

            const destPoints = getRandomN(points, warpGates.length);
    
            const commands = warpGates.map((warpGate, i) => ({
                abilityId,
                unitTags: [warpGate.tag],
                targetWorldSpacePos: destPoints[i],
            }));

            return this.sendAction(commands).then(async (res) => {
                if (res.result[0] !== 1) {
                    throw new Error(`Could not warp in unit, result ${res.result[0]}`);
                }

                return res;
            });
        },
        async sendQuery(query) {
            return protoClient.query(query);
        },
        async sendAction(commands) {
            const actionList = Array.isArray(commands) ? commands : [commands];

            const action = {
                actions: actionList.map((command) => {
                    return {
                        actionRaw: {
                            unitCommand: command,
                        },
                    };
                }),
            };

            return protoClient.action(action);
        },
    };
}

module.exports = createActionManager;