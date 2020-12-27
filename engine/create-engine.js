'use strict';

const debugEngine = require('debug')('sc2:debug:engine');
const debugSilly = require('debug')('sc2:silly:engine');
const Promise = require('bluebird');
const argv = require('yargs')
    .number('StartPort')
    .number('GamePort')
    .string('LadderServer')
    .string('OpponentId')
    .argv;
const pascalCase = require('pascal-case');
// const chalk = require('chalk');
const hrtimeH = require('convert-hrtime');
const { launcher, findMap } = require('./launcher');
const World = require('./create-world');
const debugSystem = require('../systems/debug');
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

// Hack to compile Glob files. Don´t call this function!
// Update: turns out this hack breaks bundling, how ironic :p
// function ಠ_ಠ() {
//     require('views/**/*.js', { glob: true });
// }

/**
 * @param {object} options
 * @returns {Engine}
 */
function createEngine(options = {}) {
    const isManaged = argv.GamePort || argv.StartPort || argv.LadderServer;

    const opts = {
        port: 5000,
        host : '127.0.0.1',
        launch: true,
        ...options,
    };

    // the ladder manager is launching this agent and it should override anything else
    if (isManaged) {
        opts.port = argv.GamePort;
        opts.host = argv.LadderServer;
    }
    
    opts.onGameEnd = opts.onGameEnd || NOOP;

    const world = World();
    const { actions: { _client } } = world.resources.get();

    /** @type {Engine} */
    const engine = {
        getWorld() { return world; },
        _totalLoopDelay: 0,
        _gameLeft: false,
        launcher,
        use(sys) {
            if (Array.isArray(sys)) {
                sys.forEach(s => this.systems.push(s));
            } else {
                this.systems.push(sys);
            }
        },
        systems: [],
        async connect() {
            if (opts.launch && !isManaged) {
                await launcher(opts);
            }

            const pingRes = await _client.connect(opts);

            /** 
             * @TODO: @node-sc2/proto should be throwing a custom error type here so we
             * can safely expect what the error shape is -
             */

            _client._ws.on('error', (e) => {
                // @ts-ignore
                debugEngine('Received error from transport layer:', e);
            });

            _client._ws.on('leftGame', () => {
                this._gameLeft = true;
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
            if (isManaged) {
                debugEngine(`Engine tried to create a game, but is being managed by a ladder manager - skipping...`);
                return;
            }

            if (_client.status !== 1 && _client.status !== 5) {
                console.warn(`cannot create a game unless in "launched" or "ended" status, current status is ${StatusId[_client.status]}`);
                return;
            }

            let mapPath, battlenetMapName;

            if (map.includes('SC2Map')) {
                mapPath = map;
            } else {
                try {
                    mapPath = await findMap(map);
                } catch (e) {
                    battlenetMapName = map;
                }
            }

            /** @type {SC2APIProtocol.RequestCreateGame} */
            const game = {
                realtime,
                playerSetup,
            };

            if (mapPath) {
                game.localMap = { mapPath };
            } else {
                game.battlenetMapName = battlenetMapName;
            }

            // @FIXME: battlenet map cache sort of is broken

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
                    /** @type {SC2APIProtocol.RequestJoinGame} */
                    let participant = {
                        race: agent.settings && agent.settings.race || Race.RANDOM,
                        options: agent.interface,
                        ...options
                    };

                    if (isManaged) {
                        let sPort = argv.StartPort + 1;

                        participant = {
                            ...participant,
                            sharedPort: sPort++,
                            serverPorts: {
                                gamePort: sPort++, 
                                basePort: sPort++,
                            },
                            clientPorts: [{
                                gamePort: sPort++,
                                basePort: sPort++,
                            }, {
                                gamePort: sPort++,
                                basePort: sPort++,
                            }]
                        };
                    }

                    // join the game and subsequently set the playerId for the bot
                    const joinGame = await _client.joinGame(participant);
                    debugEngine('JOIN GAME RES: ', joinGame);

                    agent.playerId = joinGame.playerId;

                    return this.firstRun();
                }

                case 3: {
                    console.warn(`cannot join lobby for a game already in progress, attemping to resync to existing game...`);

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

            if (isManaged) {
                agent.opponent = agent.opponent || {};
                agent.opponent.id = argv.OpponentId;
            }

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

            [...this.systems, ...agent.systems, agent, debugSystem].forEach(system => system.setup(world));

            const { events } = resources.get();

            events.write({
                name: 'gameStart',
                type: 'all',
            });

            await this.dispatch();
            return this.runLoop();
        },
        onGameEnd(results) {
            if (!results || results.length <= 0) {
                console.warn('The game ended but there is no result data');
            }
            debugEngine(`Average step delay for this game: ${this._totalLoopDelay / world.resources.get().frame.getGameLoop()}`);
            // @TODO: have some option to configure auto-saving of replays
            return [world, results];
        },
        async runLoop() {
            const { events, frame } = world.resources.get();

            if (_client.status !== 3) {
                debugEngine('exiting loop, status no longer in game');
                this.onGameEnd(frame._result);
                // @TODO: check the frame to see if there happens to be some result data?
                throw new GameEndedError('Status no longer in game');
            }

            if (this._lastRequest) {
                this._loopDelay = hrtimeH(process.hrtime(this._lastRequest)).milliseconds;

                /** 
                 * I'd like to keep this here. I think as long as this api is aligned to providing a framework
                 * to get bots onto a ladder (like sc2ai, etc) or into tournaments - the user shouldn't be able
                 * to make a slow, resource draining bot without it being shoved in their face.
                 * 
                 * @TODO: maybe allow this to be configurable? not off... per se, but some threshhold.
                 */
                if (this._loopDelay / STEP_COUNT > 44.6) {
                    // console.warn(`WARNING! loop delay is ${this._loopDelay / STEP_COUNT}ms, greater than realtime`);
                }

                this._totalLoopDelay += this._loopDelay / STEP_COUNT;

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

            this._lastRequest = process.hrtime();

            if (process.env.DELAY) {
                await Promise.delay(parseInt(process.env.DELAY, 10));
            }

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
                    console.warn('An error of an unknown type has propegated up to the game loop', e);
                    throw e;
                }
            }

            return this.runLoop();
        },
        async dispatch() {
            /**
             * First, run all engine systems, and in series - the 'step' event propegates
             * all other events as well - starting with the frame system that handles digesting
             * the updated frame data.
             */
            const engineSystems = this.systems;
            await Promise.mapSeries(engineSystems, system => system(world)); // concurrency: 1
            
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
            await Promise.map(systems, system => system(world));

            // debug system runs last because it updates the in-client debug display
            return debugSystem(world);
        },
        shutdown() {
            world.resources.get().actions._client.close();
        },
        _lastRequest: null,
    };

    engine.use([
        frameSystem,
        unitSystem,
        mapSystem,
    ]);

    return engine;
}

module.exports = createEngine;
