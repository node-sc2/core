'use strict';

const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { combatTypes } = require('@node-sc2/core/constants/groups');
const {
    ASSIMILATOR,
    CYBERNETICSCORE,
    GATEWAY,
    NEXUS,
    TWILIGHTCOUNCIL,
    ZEALOT,
} = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const eightGateAllIn = createSystem({
    name: 'EightGateAllIn',
    type: 'build',
    defaultOptions: {
        state: { armySize: 12 },
    },
    buildOrder: [
        [16, build(ASSIMILATOR)],
        [17, build(GATEWAY)],
        [20, build(NEXUS)],
        [21, build(CYBERNETICSCORE)],
        [26, build(TWILIGHTCOUNCIL)],
        [34, upgrade(CHARGE)],
        [34, build(GATEWAY, 7)],
    ],
    async onStep({ resources }) {
        const { units, map, actions, debug } = resources.get();

        if (this.state.buildComplete) {
            const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);

            if (idleCombatUnits.length > this.state.armySize) {
                this.setState({ armySize: this.state.armySize + 2 });
                const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

                return Promise.all([enemyNat, enemyMain].map((expansion) => {
                    return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
                }));
            }
        }

        const idleGateways = units.getById(GATEWAY, { noQueue: true, buildProgress: 1 });

        if (idleGateways.length > 0) {
            return Promise.all(idleGateways.map(gateway => actions.train(ZEALOT, gateway)));
        }
    },
    async buildComplete() {
        this.setState({ buildComplete: true });
    },
    async onUpgradeComplete({ resources }, upgrade) {
        if (upgrade === CHARGE) {
            const { units, map, actions } = resources.get();

            const combatUnits = units.getCombatUnits();
            const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

            return Promise.all([enemyNat, enemyMain].map((expansion) => {
                return actions.attackMove(combatUnits, expansion.townhallPosition, true);
            }));
        }
    },
    async onUnitFinished({ resources }, newBuilding) {
        if (newBuilding.isGasMine()) {
            const { units, actions } = resources.get();

            const threeWorkers = units.getClosest(newBuilding.pos, units.getMineralWorkers(), 3);
            threeWorkers.forEach(worker => worker.labels.set('gasWorker', true));
            return actions.mine(threeWorkers, newBuilding);
        }
    },
    async onUnitCreated({ resources }, newUnit) {
        const { actions, map } = resources.get();

        if (newUnit.isWorker()) {
            return actions.gather(newUnit);
        } else if (combatTypes.includes(newUnit.unitType)) {
            return actions.attackMove([newUnit], map.getCombatRally());
        }
    },
});

module.exports = eightGateAllIn;