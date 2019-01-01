'use strict';

const debugBuild = require('debug')('sc2:debug:build');
const debugBuildSilly = require('debug')('sc2:silly:build');
const { distance, distanceX, distanceY } = require('../utils/geometry/point');
const getRandom = require('../utils/get-random');
const { Alliance, BuildOrder, BuildOrderId, BuildResult, Race } = require('../constants/enums');
const { BUILD_REACTOR, BUILD_TECHLAB } = require('../constants/ability');
const { WorkerRace } = require('../constants/race-map');
const { gasMineTypes, townhallTypes, addonTypes } = require('../constants/groups');
const { Upgrade, UnitType, UnitTypeId, AbilityId, UpgradeId, Color} = require('../constants');

const { PYLON } = UnitType;

const NOOP = () => {};

/** @type {{[index: string]: BuildHelper }} */
const taskFunctions = {
    ability: (id, opts = {}) => ({ type: 'ability', id, qty: 1, opts }),
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

    system.buildOptions = {
        paused: false,
        earmarks: 1000,
        ...system.BuildOptions,
    };

    system.pauseBuild = function() {
        system.buildOptions.paused = true;
    };

    system.resumeBuild = function() {
        system.buildOptions.paused = false;
    };

    system.earmarkDelay = function(d) {
        system.buildOptions.earmarks = d; 
    };

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
            started: null,
            earmarked: false,
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
        if (system.buildOptions.paused) {
            return systemOnStep(world, gameLoop);
        }

        /** @type {BuildTaskI} */
        const task = this.state[buildSym]
            .find(o => 
                o.status === BuildOrder.COMMAND_GIVEN ||
                o.status === BuildOrder.IN_PROGRESS ||
                o.status === BuildOrder.NOT_STARTED
            );

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

        if (task.opts && task.opts.skip) {
            if (system.state[task.opts.skip]) {
                buildTask.status = BuildOrder.SKIPPED;
                return systemOnStep(world, gameLoop, this.state[buildSym][task.index], BuildResult.SKIPPED);
            }
        }

        if (buildTask.touched === false) {
            debugBuild(`starting new build task: %o`, buildTask);
            buildTask.started = gameLoop;
            buildTask.touched = true;
        }

        if (debugBuild.enabled) {
            world.resources.get().debug.setDrawTextScreen('buildOrder', [{
                pos: { x: 0.85, y: 0.1 },
                text: `Build:\n\n${this.state[buildSym].map((buildTask, i) => {
                    let reverseId;
                    if (buildTask.type === 'build' || buildTask.type === 'train') {
                        reverseId = UnitTypeId[buildTask.id];
                    } else if (buildTask.type === 'ability') {
                        reverseId = AbilityId[buildTask.id];
                    } else if (buildTask.type === 'upgrade') {
                        reverseId = UpgradeId[buildTask.id];
                    } else {
                        reverseId = UnitTypeId[WorkerRace[world.agent.race]];
                    }

                    return `${String(i).padStart(2, '0')} ${BuildOrderId[buildTask.status]}: ${buildTask.type} - ${reverseId}`;
                }).join('\n')}`,
                color: Color.YELLOW,
            }]);
        }

        if (this.buildOptions.earmarks && buildTask.status !== BuildOrder.COMMAND_GIVEN) {
            if (gameLoop - buildTask.started >= this.buildOptions.earmarks) {
                let cost;
                switch (buildTask.type) {
                    case 'train':
                    case 'build': {
                        cost = world.data.getUnitTypeData(buildTask.id);
                        break;
                    }
                    case 'upgrade': {
                        cost = world.data.getUpgradeData(buildTask.id);
                        break;
                    }
                    case 'ability': {
                        const unitFromAbility = world.data.get('units')
                            .find(ud => ud.available && ud.abilityId === buildTask.id);
                        if (unitFromAbility) {
                            cost = world.data.getUnitTypeData(buildTask.id);
                        }
                        break;
                    }
                }

                if (cost && !world.agent.canAfford(buildTask.id)) {
                    world.data.addEarmark({
                        name: `task${buildTask.index}`,
                        minerals: cost.mineralCost,
                        vespene: cost.vespeneCost,
                    });
                    buildTask.earmarked = true;
                }
            }
        }
        
        if (buildTask.status === BuildOrder.COMMAND_GIVEN) {
            if (gameLoop - buildTask.commanded >= 250) { // 11 seconds
                // assume something broke and the command derped, build it (again?)!
                buildTask.status = BuildOrder.NOT_STARTED;
            }
        }

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
            case BuildResult.COMMAND_SENT: {
                buildTask.commanded = gameLoop;
                buildTask.status = BuildOrder.COMMAND_GIVEN;
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
        async [Race.PROTOSS]({ agent, resources }, task) {
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
                        (distance(natural.townhallPosition, point) > 4.5) &&
                        (pylonsNearProduction.some(p => distance(p.pos, point) < 6.5)) &&
                        (mainMineralLine.every(mlp => distance(mlp, point) > 1.5)) &&
                        (natural.areas.hull.every(hp => distance(hp, point) > 2)) &&
                        (units.getStructures({ alliance: Alliance.SELF })
                            .map(u => u.pos)
                            .every(eb => distance(eb, point) > 3))
                    );
                });

            if (placements.length <= 0) return BuildResult.CANNOT_SATISFY;

            const foundPosition = await actions.canPlace(task.id, placements);
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            // in case something changed while waiting for placement position
            const canNoLongerAfford = !agent.canAfford(task.id);
            if (canNoLongerAfford) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.COMMAND_SENT;
            } catch (e) {
                return BuildResult.ERROR;
            }
        },
        /** @param {World} param0 */
        async [Race.TERRAN]({ resources }, task) {
            const { actions, map, units } = resources.get();

            if (addonTypes.includes(task.id)) {
                let target;
                if (task.opts.on) {
                    [target] = units.getById(task.opts.on)
                        .filter(u => u.isFinished() && u.noQueue && u.addOnTag === '0');
                    debugBuild('no available units to build addon');
                    if (!target) return BuildResult.CANNOT_SATISFY;
                } else {
                    [target] = units.getProductionUnits(task.id)
                        .filter(u => u.isFinished() && u.noQueue && u.addOnTag === '0');
                    if (!target) return BuildResult.CANNOT_SATISFY;
                }

                try {
                    await actions.build(task.id, null, target);
                    return BuildResult.COMMAND_SENT;
                } catch (e) {
                    return BuildResult.ERROR;
                }
            }

            const [main] = map.getExpansions();
            const mainMineralLine = main.areas.mineralLine;
            let hadNear;

            let places = main.areas.placementGrid;

            if (task.opts && task.opts.near) {
                hadNear = true;
                const [nearUnit] = units.getById(task.opts.near);

                places = main.areas.placementGrid.filter(point => distance(point, nearUnit.pos) < 10);

                if (places.length <= 0) {
                    hadNear = false;
                    places = main.areas.placementGrid;
                }
            }

            const placements = places => places
                .filter((point) => {
                    return (
                        (mainMineralLine.every((mlp) => {
                            return (
                                (distanceX(mlp, point) >= 5 || distanceY(mlp, point) >= 1.5) // for addon room
                            );
                        })) &&
                        (main.areas.hull.every((hp) => {
                            return (
                                (distanceX(hp, point) >= 3.5 || distanceY(hp, point) >= 1.5)
                            );
                        })) &&
                        (units.getStructures({ alliance: Alliance.SELF })
                            .map(u => u.pos)
                            .every((eb) => {
                                return (
                                    (distanceX(eb, point) >= 5 || distanceY(eb, point) >= 3) // for addon room
                                );
                            })
                        )
                    );
                });

            const firstPlacements = placements(places);

            const getFoundPosition = async () => {
                let fP = await actions.canPlace(task.id, firstPlacements);

                if (!fP && hadNear) {
                    fP = await actions.canPlace(task.id, placements(main.areas.placementGrid));
                }

                return fP;
            };

            const foundPosition = await getFoundPosition();
            if (!foundPosition) return BuildResult.CANNOT_SATISFY;

            try {
                await actions.build(task.id, foundPosition);
                return BuildResult.COMMAND_SENT;
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
                return BuildResult.COMMAND_SENT;
            } catch (e) {
                console.log(e);
                return BuildResult.ERROR;
            }
        },
    };

    /** @type {BuildFunction} */
    system[buildFnSyms.build] = async function(world, task) {
        const { agent, resources } = world;
        const { units } = resources.get();

        // command already given to build, verify it's happening
        if (task.status === BuildOrder.COMMAND_GIVEN) {
            const [u] = units.getById(task.id).filter(unit => !unit.isFinished());
            if (u) {
                return BuildResult.SUCCESS;
            } else {
                return BuildResult.CANNOT_SATISFY;
            }
        }

        if (!agent.canAfford(task.id, task.earmarked ? `task${task.index}` : null)) return BuildResult.CANNOT_SATISFY;

        const { actions, map, placer } = resources.get();

        if (gasMineTypes.includes(task.id)) {
            try {
                await actions.buildGasMine();
                return BuildResult.COMMAND_SENT;
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
                return BuildResult.COMMAND_SENT;
            } catch(e) {
                return BuildResult.ERROR;
            }
        } else {
            if (placer && placer.place) {
                const placements = placer.place(world, task.id);

                if (!placements || placements.length <= 0) {
                    return buildPlacement[agent.race](world, task);
                }

                const foundPosition = await actions.canPlace(task.id, placements);
                if (!foundPosition) {
                    return buildPlacement[agent.race](world, task);
                }

                // in case something changed while waiting for placement position
                const canNoLongerAfford = !agent.canAfford(task.id);
                if (canNoLongerAfford) return BuildResult.CANNOT_SATISFY;

                try {
                    await actions.build(task.id, foundPosition);
                    return BuildResult.COMMAND_SENT;
                } catch (e) {
                    return BuildResult.ERROR;
                }
            } else {
                return buildPlacement[agent.race](world, task);
            }
        }
    };

    system[buildFnSyms.train] = async function({ agent, resources }, task) {
        const { actions } = resources.get();

        let id;
        if (Array.isArray(task.id)) {
            id = getRandom(task.id);
        } else {
            id = task.id;
        }

        try {
            if (agent.upgradeIds.includes(Upgrade.WARPGATERESEARCH)) {
                try {
                    await actions.warpIn(id);
                } catch(e) {
                    await actions.train(id);
                }
            } else {
                await actions.train(id);
            }
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

        if (!agent.canAffordUpgrade(task.id, task.earmarked ? `task${task.index}` : null)) return BuildResult.CANNOT_SATISFY;

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
        let unitsCanDo = units.getByType(canDo).filter(u => u.abilityAvailable(task.id));

        if ([BUILD_REACTOR, BUILD_TECHLAB].includes(task.id)) {
            unitsCanDo = unitsCanDo.filter(u => u.addOnTag === '0' && u.noQueue);
        }
        
        if (unitsCanDo.length <= 0) return BuildResult.CANNOT_SATISFY;

        let target;
        if (task.opts.target) {
            target = getRandom(units.getById(task.opts.target).filter(u => u.isFinished()));
            if (!target) return BuildResult.CANNOT_SATISFY;
        }

        try {
            await actions.do(
                task.id,
                [unitsCanDo[0].tag],
                { target }
            );
            return BuildResult.SUCCESS;
        } catch (e) {
            debugBuild('BUILD ABILITY ERR:', e);
            return BuildResult.ERROR;
        }
    };
}

module.exports = { builderPlugin, taskFunctions };