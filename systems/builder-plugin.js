'use strict';

const debugBuild = require('debug')('sc2:debug:build');
const debugBuildSilly = require('debug')('sc2:silly:build');
const { distance } = require('../utils/geometry/point');
const getRandom = require('../utils/get-random');
const { Alliance, BuildOrder, BuildResult, Race } = require('../constants/enums');
const { BUILD_REACTOR, BUILD_TECHLAB } = require('../constants/ability');
const { PYLON } = require('../constants/unit-type');
const { WorkerRace } = require('../constants/race-map');
const { gasMineTypes, townhallTypes } = require('../constants/groups');

const NOOP = () => {};

/** @type {{[index: string]: BuildHelper }} */
const taskFunctions = {
    ability: (id) => ({ type: 'ability', id, qty: 1 }),
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
        ability: Symbol('ability'),
        build: Symbol('build'),
        train: Symbol('train'),
        upgrade: Symbol('upgrade'),
        attack: Symbol('attack'),
        worker: Symbol('worker'),
    };

    // const systemSetup = system.setup ? system.setup.bind(system) : NOOP;
    const systemOnGameStart = system.onGameStart ? system.onGameStart.bind(system) : NOOP;
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

    function calculateSupply({ agent, data }, acc, supply, task) {
        const isZerg = agent.race === Race.ZERG;

        if (task.type === 'train') {
            acc.supply = supply + (data.getUnitTypeData(task.id).foodRequired * task.qty);
        } else if (task.type === 'build') {
            // zergs consume a drone to build something...
            if (isZerg) {
                acc.supply = acc.supply - 1;
            } else {
                acc.supply = supply;
            }
        } else {
            acc.supply = supply;
        }
    }

    /**
     * @param {World} world
     * @param {Array<[number, BuildTaskI]>} bo 
     */
    function normalizeBuildOrder(world, bo) {
        if (Array.isArray(bo[0])) {
            return bo.reduce((acc, [supply, task]) => {
                if (acc.supply >= supply) {
                    acc.buildOrder.push(createTask(task, acc.reducerIndex));
                    calculateSupply(world, acc, supply, task);
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
                    calculateSupply(world, acc, supply, task);
                    return acc;
                }
            }, { supply: 12, buildOrder: [], reducerIndex: 0 }).buildOrder;
        } else {
            return bo.map((task, i) => {
                return createTask(task, i);
            });
        }
    }

    system.onGameStart = async function(world) {
        this.setState({
            // @ts-ignore
            [buildSym]: normalizeBuildOrder(world, system.buildOrder),
        });
        
        return systemOnGameStart(world);
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
            debugBuild(`starting new build task: %o`, buildTask);
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

    const buildPlacement = {
        async [Race.PROTOSS]({ resources }, task) {
            const { actions, map, units } = resources.get();
            const [main, natural] = map.getExpansions();
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

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.SUCCESS;
            } catch (e) {
                return BuildResult.ERROR;
            }
        },
        async [Race.TERRAN]({ resources }, task) {
            const { actions, map, units } = resources.get();
            const [main] = map.getExpansions();
            const mainMineralLine = main.areas.mineralLine;

            const placements = main.areas.placementGrid
                .filter((point) => {
                    return (
                        (mainMineralLine.every(mlp => distance(mlp, point) > 1.5)) &&
                        (units.getStructures({ alliance: Alliance.SELF })
                            .map(u => u.pos)
                            .every(eb => distance(eb, point) > 3))
                    );
                });

            if (placements.length <= 0) return BuildResult.CANNOT_SATISFY;

            const foundPosition = await actions.canPlace(task.id, placements);
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.SUCCESS;
            } catch (e) {
                return BuildResult.ERROR;
            }
        },
        /** @param {World} param0 */
        async [Race.ZERG]({ resources }, task) {
            const { actions, map, units, debug } = resources.get();
            const [main] = map.getExpansions();
            const mainMineralLine = main.areas.mineralLine;

            const placements = map.getCreep()
                .filter((point) => {
                    return (
                        (mainMineralLine.every(mlp => distance(mlp, point) > 1.5)) &&
                        (units.getStructures({ alliance: Alliance.SELF })
                            .map(u => u.pos)
                            .every(eb => distance(eb, point) > 3))
                    );
                });
            
            if (placements.length <= 0) return BuildResult.CANNOT_SATISFY;

            const foundPosition = await actions.canPlace(task.id, placements);
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.SUCCESS;
            } catch (e) {
                return BuildResult.ERROR;
            }
        },
    };

    /** @type {BuildFunction} */
    system[buildFnSyms.build] = async function(world, task) {
        const { agent, resources } = world;

        if (!agent.canAfford(task.id)) return BuildResult.CANNOT_SATISFY;

        const { actions, map } = resources.get();

        if (gasMineTypes.includes(task.id)) {
            try {
                await actions.buildGasMine();
                return BuildResult.SUCCESS;
            } catch(e) {
                return BuildResult.ERROR;
            }
        } else if (townhallTypes.includes(task.id)) {
            const expansionLocation = map.getAvailableExpansions()[0].townhallPosition;

            const foundPosition = await actions.canPlace(task.id, [expansionLocation]);
            // @TODO: if we can't place - try to clear out obstacles (like a burrowed zergling)
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.SUCCESS;
            } catch(e) {
                return BuildResult.ERROR;
            }
        } else {
            return buildPlacement[agent.race](world, task);
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

    /** @type {BuildFunction} */
    system[buildFnSyms.ability] = async function({ data, resources }, task) {
        const { actions, units } = resources.get();

        const canDo = data.findUnitTypesWithAbility(task.id);

        let unitsCanDo = units.getByType(canDo);

        if ([BUILD_REACTOR, BUILD_TECHLAB].includes(task.id)) {
            unitsCanDo = unitsCanDo.filter(u => u.addOnTag === '0');
        }
        
        if (unitsCanDo.length <= 0) return BuildResult.CANNOT_SATISFY;

        try {
            await actions.do(task.id, [unitsCanDo[0].tag]);
            return BuildResult.SUCCESS;
        } catch (e) {
            debugBuild('BUILD ABILITY ERR:', e);
            return BuildResult.ERROR;
        }
    };
}

module.exports = { builderPlugin, taskFunctions };