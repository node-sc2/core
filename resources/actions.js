'use strict';

const debugActionManager = require('debug')('sc2:debug:actionManager');
const createTransport = require('@node-sc2/proto');
const { distance } = require('../utils/geometry/point');
const getRandom = require('../utils/get-random');
const {
    Ability,
    enums: { Alliance, DisplayType },
    groups: { gasMineTypes }, 
} = require('../constants');
const { GasMineRace } = require('../constants/race-map');
const { BuildError, TrainError, GatherError } = require('../engine/errors');

/**
 * @returns {ActionManager}
 * @param {World} world
 */
function createActionManager(world) {
    const protoClient = createTransport();
    
    return {
        _client: protoClient,
        async do(abilityId, tags) {
            return this.sendAction({
                abilityId,
                unitTags: tags,
            });
        },
        async move(units, pos, queue = false) {
            // drawDebug(this, [pos], this.expansions[1])
            const moveTo = {
                abilityId: Ability.MOVE,
                targetWorldSpacePos: pos,
                unitTags: units.map(u => u.tag),
                queueCommand: queue,
            };

            return this.sendAction(moveTo);
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
        async gather(unit, mineralField, queue = true) {
            const { units } = world.resources.get();

            if (!unit.isWorker()) {
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
        async canPlace(unitTypeId, positions) {
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
                .filter(g => g.displayType === DisplayType.VISIBLE)
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