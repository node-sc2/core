'use strict';

const debug = require('debug')('sc2:debug:Bot');
const xor = require('lodash.xor');
const { Race, PlayerType } = require('../constants/enums');
const NOOP = () => {};

/**
 * @param {AgentSystem} blueprint
 * @returns {Agent}
 */
function createAgent(blueprint = {}) {
    debug('new bot created with options:', blueprint);

    return {
        ...blueprint,
        _world: null,
        systems: [],
        use(sys) {
            if (Array.isArray(sys)) {
                sys.forEach(s => this.systems.push(s));
            } else {
                this.systems.push(sys);
            }
        },
        settings: {
            type: PlayerType.PARTICIPANT,
            race: Race.RANDOM,
            ...blueprint.settings,
        },
        interface: blueprint.interface || { raw: true },
        canAfford(unitTypeId, earmarkName) {
            const { data } = this._world;
            const { minerals, vespene } = this;

            const earmarks = data.getEarmarkTotals(earmarkName);
            
            const unitType = data.getUnitTypeData(unitTypeId);
            
            const result = (
                (minerals - earmarks.minerals >= unitType.mineralCost) &&
                (unitType.vespeneCost ? vespene - earmarks.vespene >= unitType.vespeneCost : true)
            );

            if (result) {
                if (earmarkName) {
                    data.settleEarmark(earmarkName);
                }
                return true;
            } else {
                return false;
            }
        },
        canAffordUpgrade(upgradeId) {
            const { data } = this._world;

            const { minerals, vespene } = this;
            const upgrade = data.getUpgradeData(upgradeId);

            return (
                (minerals >= upgrade.mineralCost) &&
                (upgrade.vespeneCost ? vespene >= upgrade.vespeneCost : true)
            );
        },
        hasTechFor(unitTypeId) {
            const { data, resources } = this._world;
            const { units } = resources.get();

            const { techRequirement } = data.getUnitTypeData(unitTypeId);
            const { techAlias } = data.getUnitTypeData(techRequirement);

            const needsOneOf = [ techRequirement, ...techAlias];

            // if has no tech requirements
            if (techRequirement === 0 || needsOneOf.length <= 0) {
                return true;
            }

            // see if there's other tech aliases to satisfy these
            const needsOneOfAny = needsOneOf.reduce((acc, techUnitType) => {
                const aliases = data.get('units').filter(utd => utd.techAlias.includes(techUnitType));
                if (aliases.length > 0) {
                    const aliasUnitIds = aliases.map(a => a.unitId);
                    acc = acc.concat([techUnitType, ...aliasUnitIds]);
                } else {
                    acc = acc.concat([techUnitType]);
                }
                return acc;
            }, []);

            return needsOneOfAny.some((requirementTypeId) => {
                return units.getById(requirementTypeId, { buildProgress: 1 }).length > 0;
            });
        },
        setup(world) {
            this._world = world;
            const { events } = world.resources.get();

            this.readerId = events.createReader('agent');
            return blueprint.setup ? blueprint.setup(world) : this.readerId;
        },
        async onStep(world) {
            const { frame, events } = world.resources.get();
            const observation = frame.getObservation();
            
            const newUpgrades = xor(observation.rawData.player.upgradeIds, this.upgradeIds);

            if (newUpgrades) {
                newUpgrades.forEach((upgrade) => {
                    events.write({
                        name: 'upgradeComplete',
                        data: upgrade,
                    });
                });
            }

            Object.assign(
                this, 
                observation.rawData.player, // { powerSources: [{PowerSource}, ...], upgradeIds: [int, ...], camera: Point}
                observation.playerCommon // { minerals, vespenese, foodCap, ... }
            );

            return blueprint.onStep ? blueprint.onStep(world) : NOOP;
        },
        async onGameStart(world) {
            const { frame } = world.resources.get();

            const gameInfo = frame.getGameInfo();

            const thisPlayer = gameInfo.playerInfo.find(player => player.playerId === this.playerId);
            const enemyPlayer = gameInfo.playerInfo.find(player => player.playerId !== this.playerId);
            this.race = thisPlayer.raceActual;

            /** 
             * if the enemy requested random, we don't know their race yet - otherwise set it to their raceRequested 
             * 
             * @TODO: the first time we see an enemy unit, we should set the value of this on the agent and then 
             * memoize it
             */
            this.enemy = {
                race: enemyPlayer.raceRequested !== Race.RANDOM ? enemyPlayer.raceRequested : Race.NORACE,
            };

            return blueprint.onGameStart ? blueprint.onGameStart(world) : NOOP;
        }
    };
}

module.exports = createAgent;