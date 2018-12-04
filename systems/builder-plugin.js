'use strict';

const debugBuild = require('debug')('sc2:debug:build');
const debugBuildSilly = require('debug')('sc2:silly:build');
const { distance } = require('../utils/geometry/point');
const getRandom = require('../utils/get-random');
const { Alliance, BuildOrder, BuildResult } = require('../constants/enums');
const { ASSIMILATOR, NEXUS, PYLON } = require('../constants/unit-type');
const { WorkerRace } = require('../constants/race-map');

const NOOP = () => {};

/** @type {{[index: string]: BuildHelper }} */
const taskFunctions = {
    do: (id) => ({ type: 'ability', id }),
    build: (id, qty = 1, opts = {}) => ({ type: 'build', id, qty, opts }),
    train: (id, qty = 1, opts = {}) => ({ type: 'train', id, qty, opts }),
    upgrade: (id) => ({ type: 'upgrade', id, qty: 1}),
};

/**
 * Running a system through this mutator will transform it into a build order system
 * @param {EventReader<System>} system 
 */
function builderPlugin(system) {
    const buildSym = Symbol('build');
    const completeSym = Symbol('complete');

    /** @type {{[index: string]: any}} */
    const buildFnSyms = {
        do: Symbol('ability'),
        build: Symbol('build'),
        train: Symbol('train'),
        upgrade: Symbol('upgrade'),
        attack: Symbol('attack'),
        worker: Symbol('worker'),
    };

    const systemSetup = system.setup ? system.setup.bind(system) : NOOP;
    const systemOnStep = system.onStep ? system.onStep.bind(system) : NOOP;
    const buildComplete = system.buildComplete ? system.buildComplete.bind(system) : NOOP;

    function createTask(taskData, index, supply) {
        return {
            ...taskData,
            index,
            touched: false,
            supply: supply ? supply : null,
            status: BuildOrder.NOT_STARTED,
        };
    }

    const workerTask = {
        type: 'worker',
        qty: 1,
    };

    /**
     * @param {World} param0 
     * @param {Array<[number, BuildTaskI]>} bo 
     */
    function normalizeBuildOrder({ data }, bo) {
        if (Array.isArray(bo[0])) {
            return bo.reduce((acc, [supply, task]) => {
                if (acc.supply >= supply) {
                    acc.buildOrder.push(createTask(task, acc.reducerIndex));
                    
                    if (task.type === 'train') {
                        acc.supply = supply + (data.getUnitTypeData(task.id).foodRequired * task.qty);
                    } else {
                        acc.supply = supply;
                    }

                    acc.reducerIndex++;
                    return acc;
                } else {
                    Array.from({ length: supply - acc.supply }).forEach(() => {
                        acc.buildOrder.push(createTask(workerTask, acc.reducerIndex, supply));
                        acc.supply = acc.supply + 1;
                        acc.reducerIndex++;
                    });

                    acc.buildOrder.push(createTask(task, acc.reducerIndex));
                    acc.reducerIndex++;

                    if (task.type === 'train') {
                        acc.supply = supply + (data.getUnitTypeData(task.id).foodRequired * task.qty);
                    } else {
                        acc.supply = supply;
                    }
                    return acc;
                }
            }, { supply: 12, buildOrder: [], reducerIndex: 0 }).buildOrder;
        } else {
            return bo.map((task, i) => {
                return createTask(task, i);
            });
        }
    }

    system.setup = function(world) {
        this.setState({
            // @ts-ignore
            [buildSym]: normalizeBuildOrder(world, system.buildOrder),
        });
        
        return systemSetup(world);
    };


    system.onStep = async function(world, gameLoop) {
        /** @type {BuildTaskI} */
        const task = this.state[buildSym]
            .find(o => o.status === BuildOrder.IN_PROGRESS || o.status === BuildOrder.NOT_STARTED);

        if (!task) {
            if (this.state[completeSym]) {
                // @ts-ignore
                return systemOnStep(world, gameLoop);
            } else {
                this.setState({ [completeSym]: true });
                return buildComplete(world, gameLoop);
            }
        }

        const buildTask = this.state[buildSym][task.index];

        if (buildTask.touched === false) {
            debugBuild(`starting new build task: `, buildTask);
        }

        buildTask.touched = true;

        /** @enum {BuildResult} */
        const result = await this[buildFnSyms[task.type]](world, task);

        switch (result) {
            case BuildResult.SUCCESS: {
                if (task.qty > 1) {
                    buildTask.qty -= 1;
                    buildTask.status = BuildOrder.IN_PROGRESS;
                } else if (task.qty === 1) {
                    buildTask.qty = 0;
                    buildTask.status = BuildOrder.COMPLETE;
                }
                break;
            }
            case BuildResult.CANNOT_SATISFY: {
                break;
            }
            case BuildResult.ERROR: {
                break;
            }
        }

        // @ts-ignore can't call a union of fns... really ts
        return systemOnStep(world, gameLoop, this.state[buildSym][task.index], result);
    };

    /** @type {BuildFunction} */
    system[buildFnSyms.build] = async function({ agent, resources }, task) {
        if (!agent.canAfford(task.id)) return BuildResult.CANNOT_SATISFY;

        const { actions, units, map } = resources.get();

        const [main, natural] = map.getExpansions();

        if (task.id === ASSIMILATOR) {
            try {
                await actions.buildGasMine();
                return BuildResult.SUCCESS;
            } catch(e) {
                return BuildResult.ERROR;
            }
        } else if (task.id === NEXUS) {
            const expansionLocation = map.getAvailableExpansions()[0].townhallPosition;

            const foundPosition = await actions.canPlace(NEXUS, [expansionLocation]);
            // @TODO: if we can't place - try to clear out obstacles (like a burrowed zergling)
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(NEXUS, foundPosition);
                return BuildResult.SUCCESS;
            } catch(e) {
                return BuildResult.ERROR;
            }
        } else {
            const mainMineralLine = main.areas.mineralLine;

            const pylonsNearProduction = units.getById(PYLON)
                .filter(u => u.buildProgress >= 1)
                .filter(pylon => distance(pylon.pos, main.townhallPosition) < 50);

            if (pylonsNearProduction.length <= 0) return BuildResult.CANNOT_SATISFY;

            const placements = [...main.areas.placementGrid, ...natural.areas.placementGrid]
                .filter((point) => {
                    return (
                        (pylonsNearProduction.some(p => distance(p.pos, point) < 6.5)) &&
                        (mainMineralLine.every(mlp => distance(mlp, point) > 1.5)) &&
                        (units.getStructures({ alliance: Alliance.SELF })
                            .map(u => u.pos)
                            .every(eb => distance(eb, point) > 3))
                    );
                });

            if (placements.length <= 0) return BuildResult.CANNOT_SATISFY;

            const foundPosition = await actions.canPlace(task.id, placements);
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            // debug.setDrawCells('buildPlacement', placements, expansions[0].zPosition);
            // debug.updateScreen();
            // drawDebug(bot, [foundPosition], bot.main);

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.SUCCESS;
            } catch (e) {
                return BuildResult.ERROR;
            }
            
        }
    };

    system[buildFnSyms.train] = async function({ resources }, task) {
        const { actions } = resources.get();

        let id;

        if (Array.isArray(task.id)) {
            id = getRandom(task.id);
        } else {
            id = task.id;
        }

        try {
            await actions.train(id);
            return BuildResult.SUCCESS;
        } catch (e) {
            debugBuildSilly('BUILD TRAIN ERR:', e);
            return BuildResult.ERROR;
        }
    };

    system[buildFnSyms.worker] = async function({ agent, resources }) {
        const { actions } = resources.get();

        const id = WorkerRace[agent.race];

        try {
            await actions.train(id);
            return BuildResult.SUCCESS;
        } catch (e) {
            debugBuildSilly('BUILD WORKER ERR:', e);
            return BuildResult.ERROR;
        }
    };

    system[buildFnSyms.upgrade] = async function({ agent, resources }, task) {
        const { actions, units } = resources.get();

        if (!agent.canAffordUpgrade(task.id)) return BuildResult.CANNOT_SATISFY;

        const upgradeFacilities = units.getUpgradeFacilities(task.id);

        if (upgradeFacilities.length <= 0) return BuildResult.CANNOT_SATISFY;
        const freeUpgradeFacility = upgradeFacilities.find(u => u.noQueue);

        if (!freeUpgradeFacility) return BuildResult.CANNOT_SATISFY;

        try {
            await actions.upgrade(task.id, freeUpgradeFacility);
            return BuildResult.SUCCESS;
        } catch (e) {
            debugBuildSilly('BUILD UPGRADE ERR:', e);
            return BuildResult.ERROR;
        }
    };
}

module.exports = { builderPlugin, taskFunctions };