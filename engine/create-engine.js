'use strict';

const debugEngine = require('debug')('sc2:debug:engine');
const debugSilly = require('debug')('sc2:silly:engine');
const promiseMap = require('promise.map');
const pascalCase = require('pascal-case');
// const delay = require('delay');
// const chalk = require('chalk');
const hrtimeH = require('convert-hrtime');
const World = require('./create-world');
const frameSystem = require('../systems/frame');
const unitSystem = require('../systems/unit');
const mapSystem = require('../systems/map');
const { Race, StatusId } = require('../constants/enums');
const { NodeSC2Error, GameEndedError } = require('./errors');

// const STEP_DELAY_MIN = 33;

const STEP_COUNT = parseInt(process.env.STEP_COUNT, 10) || 4;

const NOOP = () => {};

// function calculateDelay(ms) {
//     const attemptDelay = parseInt((STEP_DELAY_MIN - ms).toFixed(2), 10);
//     return attemptDelay > 0 ? attemptDelay : 0;
// }

/**
 * @param {object} opts
 * @returns {Engine}
 */
function createEngine(opts = { port: 5000, host : '127.0.0.1' }) {
    opts.onGameEnd = opts.onGameEnd || NOOP;

    const world = World();
    const { actions: { _client } } = world.resources.get();

    /** @type {Engine} */
    const engine = {
        use(sys) {
            if (Array.isArray(sys)) {
                sys.forEach(s => this.systems.push(s));
            } else {
                this.systems.push(sys);
            }
        },
        systems: [],
        async connect() {
            const pingRes = await _client.connect(opts);

            /** 
             * this should really never happen - but we have to account for
             * strange issues dealing with the last frame. If we get here somehow,
             * at least the game end event things still happen and there can be some
             * clean up logic from the user side of things...
             * 
             * @FIXME: in theory this could trigger onGameEvent twice... add an internal
             * symbol on the engine to denote that it was already fired and suppress this
             * and its warning -
             * 
             * @TODO: @node-sc2/proto should be throwing a custom error type here so we
             * can safely expect what the error shape is -
             */
            _client._ws.on('error', (e) => {
                // @ts-ignore
                if (e.err[0] === 'Game has already ended') {
                    engine.onGameEnd([]);
                }
            });

            return pingRes;
        },
        async runGame(map = '', players = []) {
            const player = players.find(p => !!p.agent);
            player.agent.settings.race = player.race;

            await this.createGame(map, players);
            return this.joinGame(player.agent);
        },
        async createGame(map = '', playerSetup = [], realtime = false) {
            if (_client.status !== 1 && _client.status !== 5) {
                console.warn(`cannot create a game unless in "launched" or "ended" status, current status is ${StatusId[_client.status]}`);
                return;
            }

            /** @type {SC2APIProtocol.RequestCreateGame} */
            const game = {
                realtime,
                playerSetup,
            };

            if (map.includes('SC2Map')) {
                game.localMap = {
                    mapPath: map,
                };
            } else {
                game.battlenetMapName = map;
            }

            debugEngine('CREATE GAME REQUEST: ', game);

            return _client.createGame(game);
        },
        async joinGame(agent, options = {}) {
            world.agent = agent;
            
            if (!agent.interface.raw) {
                throw new Error('`raw` is currently the only interface supported by this engine.');
            }

            switch (_client.status) {
                case 1:
                case 2: {
                    const participant = {
                        race: agent.settings && agent.settings.race || Race.RANDOM,
                        options: agent.interface,
                        ...options
                    };

                    // join the game and subsequently set the playerId for the bot
                    const joinGame = await _client.joinGame(participant);
                    debugEngine('JOIN GAME RES: ', joinGame);

                    agent.playerId = joinGame.playerId;

                    return this.firstRun();
                }

                case 3: {
                    console.warn(`cannot create game already in progress, attemping to resync to existing game...`);

                    /* @FIXME how do we actually negotiate our player id here for resyncing? assuming 1 for debugging... */
                    agent.playerId = 1;

                    return this.firstRun();
                }

                default: {
                    throw new Error(`cannot join a game this engine didn't create unless in "launched" status, current status is ${StatusId[_client.status]}`);
                }

            }
        },
        async firstRun() {
            const { data, resources, agent } = world;

            /** @type {SC2APIProtocol.ResponseData} */
            const gameData = await _client.data({
                abilityId: true,
                unitTypeId: true,
                upgradeId: true,
                buffId: true,
                effectId: true,
            });

            ['abilities', 'units', 'upgrades', 'buffs', 'effects'].forEach((dataType) => {
                if (gameData[dataType]) data.set(dataType, gameData[dataType]);
            });

            [...this.systems, ...agent.systems, agent].forEach(system => system.setup(world));

            const { events } = resources.get();

            events.write({
                name: 'gameStart',
                type: 'all',
            });

            await this.dispatch();
            return this.runLoop();
        },
        onGameEnd(results) {
            // @TODO: have some option to configure auto-saving of replays
            return [world, results];
        },
        async runLoop() {
            const { events, frame } = world.resources.get();

            if (_client.status !== 3) {
                debugEngine('exiting loop, status no longer in game');
                process.exit();
            }

            if (this.lastRequest) {
                this.loopDelay = hrtimeH(process.hrtime(this.lastRequest)).milliseconds;

                /** 
                 * I'd like to keep this here. I think as long as this api is aligned to providing a framework
                 * to get bots onto a ladder (like sc2ai, etc) or into tournaments - the user shouldn't be able
                 * to make a slow, resource draining bot without it being shoved in their face.
                 * 
                 * @TODO: maybe allow this to be configurable? not off... per se, but some threshhold.
                 */
                if (this.loopDelay / STEP_COUNT > 44.6) {
                    console.warn(`WARNING! loop delay is ${this.loopDelay / STEP_COUNT}ms, greater than realtime of 44ms`);
                }

                /**
                 * this was here for testing, but we could use it in the future to implement realtime
                 * 
                 * this.loopDelay = hrtimeH(process.hrtime(this.lastRequest)).milliseconds;
                 * const shouldDelay = calculateDelay(this.loopDelay);
                 * debug('delay frame: ', shouldDelay);
                 * //@ts-ignore bogus export default typing issue with `delay` package
                 * await delay(shouldDelay || 0);
                 */
            }

            this.lastRequest = process.hrtime();

            await _client.step({ count: STEP_COUNT });

            events.write({
                name: 'step',
                type: 'all',
                data: frame.getGameLoop() + STEP_COUNT,
            });

            try {
                await this.dispatch();
            } catch(e) {
                // @FIXME: this really shouldn't be branched via an error... but it was a quick fix
                if (e instanceof GameEndedError) {
                    // game over dude, we outtie
                    return this.onGameEnd(e.data);
                } else {
                    throw e;
                }
            }

            return this.runLoop();
        }
        ,
        async dispatch() {
            /**
             * First, run all engine systems, and in series - the 'step' event propegates
             * all other events as well - starting with the frame system that handles digesting
             * the updated frame data.
             */
            const engineSystems = this.systems;
            await promiseMap(engineSystems, system => system(world), 1); // concurrency: 1
            
            /**
             * Next let the agent itself consume events -
             * 
             * @FIXME: this is a lot of duplicated logic from the system wrapper...
             * maybe an agent itself should just be a glorified system? alternative
             * is that it's time to break the dispatcher out into an actual entity
             * instead of just this engine function.
             */ 

            const { agent, resources } = world;
            const { events } = resources.get();
            const eventsWithHandlers = events.read(agent.readerId).filter(event => agent[`on${pascalCase(event.name)}`]);
            const handlerPromises = eventsWithHandlers.length > 0 ?
                eventsWithHandlers.map((event) => {
                    return agent[`on${pascalCase(event.name)}`](world, event.data, event)
                        .catch((err) => {
                            if (err instanceof NodeSC2Error) {
                                debugSilly(`Agent handler error: on${pascalCase(event.name)}: `, err);
                            } else {
                                console.warn(`Agent handler error: on${pascalCase(event.name)}: `);
                                debugEngine(err.message);
                                debugEngine(err.stack);
                            }
                        });
                }) :
                [];

            await Promise.all(handlerPromises);

            /**
             * @TODO: Should agent systems always be run concurrently? 
             * 
             * i fear making this configurable because it could cause massive 
             * perf issues with a ton of systems all potentially awaiting transport.
             * On the other hand - it would create a huge amount of flexibility to
             * allow systems to define their other system dependencies... such as acting
             * on entities with certain labels after they have been assigned/removed
             * by other systems that frame.
             */
            const { agent: { systems } } = world;
            return promiseMap(systems, system => system(world));
        },
        lastRequest: null,
    };

    engine.use([
        frameSystem,
        unitSystem,
        mapSystem,
    ]);

    return engine;
}

module.exports = createEngine;
