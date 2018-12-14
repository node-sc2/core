'use strict';

const debugActionManager = require('debug')('sc2:debug:actionManager');
const Promise = require('bluebird');
const createTransport = require('@node-sc2/proto');
const { distance } = require('../utils/geometry/point');
const getRandom = require('../utils/get-random');
const {
    Ability,
    enums: { Alliance },
    groups: { gasMineTypes }, 
    UnitType: { MULE },
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
function createActionManager(world) {
    const protoClient = createTransport();
    
    return {
        _client: protoClient,
        async do(abilityId, ts, opts = {}) {
            const tags = Array.isArray(ts) ? ts : [ts];

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
        async smart(units, pos, queue = false) {
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
        async attack(units, unit, queue = false) {
            return this.sendAction({
                abilityId: Ability.ATTACK_ATTACK,
                targetUnitTag: unit.tag,
                unitTags: units.map(u => u.tag),
                queueCommand: queue,
            });
        },
        async attackMove(u, p, queue = false) {
            const { units, map } = world.resources.get();

            const moveUnits = u || units.getCombatUnits();
            const position = p || map.getLocations().enemy;

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

            if (!unit.isWorker() && unit.unitType !== MULE) {
                throw new GatherError('only workers can gather', { data: { unit, mineralField, queue }});
            }

            if (unit.labels.has('command') && queue === false) {
                console.warn('WARNING! unit with command erroniously told to force gather! Forcing queue');
                queue = true;
            }

            const ownBases = units.getBases(Alliance.SELF);

            let target;
            if (mineralField && mineralField.tag) {
                target = mineralField;
            } else {
                const needyBase = ownBases.sort((a, b) => {
                    return (a.assignedHarvesters - a.idealHarvesters) - (b.assignedHarvesters - b.idealHarvesters);
                })[0];

                // only include fields that are in the current frame... fixes the visible / snapshot tag flop issue
                const currentMineralFields = units.getMineralFields().filter(field => field.isCurrent());

                const needyBaseFields = units.getClosest(needyBase.pos, currentMineralFields, 6);
                
                target = units.getClosest(unit.pos, needyBaseFields)[0];
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
        async mine(units, target, queue = true) {
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
        async build(unitTypeId, posOrTarget, worker) {
            const { units, frame } = world.resources.get();

            if (world.agent.hasTechFor(unitTypeId) === false) {
                throw new BuildError(
                    'Missing tech requirements to build unit type',
                    { data: { unitTypeId, posOrTarget, worker } }
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
                    { data: { unitTypeId, posOrTarget, worker } }
                );
            }

            let pos, target;

            if (posOrTarget.tag) {
                target = posOrTarget;
            } else {
                pos = posOrTarget;
            }

            /** @type {Unit} */
            let builder;
            if (!worker) {
                const builders = units.getMineralWorkers();

                builder = units.getClosest(pos || target.pos, builders)[0];
            } else {
                builder = worker;
            }

            const { abilityId } = world.data.getUnitTypeData(unitTypeId);

            const unitCommand = {
                abilityId,
                unitTags: [builder.tag],
                queueCommand: false,
            };

            // give the builder a command label so we know we're already issuing it something this frame
            builder.labels.set('command', frame.getGameLoop());
            // console.log(`FRAME: ${frame.getGameLoop()}, MONEY: ${world.agent.minerals}, COMMAND:`, unitCommand);

            const { mineralCost, vespeneCost } = world.data.getUnitTypeData(unitTypeId);

            world.agent.minerals = world.agent.minerals - mineralCost;
            world.agent.vespene = world.agent.vespene - vespeneCost;

            if (target) {
                // @ts-ignore le sigh
                unitCommand.targetUnitTag = target.tag;
            } else {
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
                    await this.gather(builder); 

                    return res;
                });
        },
        async buildGasMine() {
            const { units } = world.resources.get();

            // @TODO: put this somewhere useful
            const geyserHasMine = (geyser) => {
                const gasMines = units.getByType(gasMineTypes);
                return gasMines.find(mine => distance(geyser.pos, mine.pos) < 1);
            };
            
            const gasMine = GasMineRace[world.agent.race];
            const geysers = units.getGasGeysers();
            
            const geyser = geysers
                .filter(g => units.getBases().some(b => distance(b.pos, g.pos) < 15))
                .find(g => !geyserHasMine(g));

            if (!geyser) {
                throw new BuildError(
                    'no free geysers in own expansions for building mines on',
                    { data: { geysers } },
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
                trainer = units.getProductionUnits(unitTypeId)
                    .find(u => u.noQueue);
            }

            if (!trainer) {
                throw new TrainError(
                    `no free production unit for type: ${unitTypeId}`,
                    { data: { unitTypeId, productionUnit }}
                );
            }

            const { abilityId } = world.data.getUnitTypeData(unitTypeId);
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