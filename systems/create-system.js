'use strict';

const debug = require('debug')('sc2:debug:system');
const debugSilly = require('debug')('sc2:silly:system');
const pascalCase = require('pascal-case');
const unitPlugin = require('./unit-plugin');
const { builderPlugin } = require('./builder-plugin');
const { NodeSC2Error, GameEndedError } = require('../engine/errors');

const NOOP = () => {};

/**
 * This digests a SystemObject, making it consumable by a bot to be run by
 * the engine. The system returned is itself callable - Think of it like a
 * wrapper + closure hidden metastate for your system objects.
 * @param {EventReader<SystemObject>} sys
 * @param {SystemOptions} opts
 */
function createSystem(sys, opts = {}) {
    const options = {
        ...sys.defaultOptions,
        ...opts,
    };

    const { stepIncrement = sys.type === 'agent' ? 8 : 1 } = options;

    const pauseSym = Symbol('pause');
    
    /**
     * create internal system, initialize state and behavior -
     * all future system convention enhancements should go here
     * 
     * @TODO this... doesn't copy non-enumerables.. is that bad?
     * @type {EventReader<System>}
     */
    const system = {
        type: 'agent',
        ...sys,
        [pauseSym]: false,
        // @ts-ignore symbol indexes still not supported...
        pause() { this[pauseSym] = true; },
        // @ts-ignore symbol indexes still not supported...
        unpause() { this[pauseSym] = false; },
        setup: sys.setup || (() => {}),
        state: options.state || {},
        setState: function setState(newState) {
            if (typeof newState === 'function') {
                this.state = newState(this.state);
            } else {
                this.state = { ...this.state, ...newState };
            }
        },
    };

    /**
     * closure-only state for use by the system wrapper
     */
    let _state = {
        stepIncrement,
        lastRan: null,
        currentFrame: null,
    };

    const _setState = function _setState(newState) {
        _state = { ..._state, ...newState };
    };

    /**
     * @type {SystemWrapper}
     * @param {World} world
     * @returns {Promise<any>}
     */
    async function systemWrapper(world) {
        const { frame, events } = world.resources.get();
        const eventsWithHandlers = events.read(system.readerId).filter(event => system[`on${pascalCase(event.name)}`]);
        
        // @ts-ignore
        if (system[pauseSym]) {
            return system.onStepPaused ? system.onStepPaused(world) : NOOP;
        }

        const handlerPromises = eventsWithHandlers.length > 0 ?
            eventsWithHandlers.map((event) => {
                if (event.name === 'step') {
                    _setState({ currentFrame: frame.getGameLoop() });

                    /* skip this system if not enough frames have passed since it last ran */
                    if ((system.type === 'agent') && _state.lastRan && _state.currentFrame - _state.lastRan <= _state.stepIncrement) {
                        debugSilly(`skipping system ${system.name}: current loop frame: ${_state.currentFrame}, last ran: ${_state.lastRan}`);
                        return;
                    }
                    
                    _setState({ lastRan: _state.currentFrame });
                    return system[`on${pascalCase(event.name)}`](world, event.data, event)
                        .catch((err) => {
                            if (err instanceof GameEndedError) {
                                throw err;
                            } else if (err instanceof NodeSC2Error) {
                                debugSilly(`System onStep error: on${pascalCase(event.name)} in ${system.name}: `, err);
                            } else {
                                debug(`System onStep error: on${pascalCase(event.name)} in ${system.name}: `);
                                debug(err.message);
                                debug(err.stack);
                            }
                        });
                } else {
                    return system[`on${pascalCase(event.name)}`](world, event.data, event)
                        .catch((err) => {
                            if (err instanceof GameEndedError) {
                                throw err;
                            } else if (err instanceof NodeSC2Error) {
                                debugSilly(`Event handler error: on${pascalCase(event.name)} in ${system.name}: `, err);
                            } else {
                                debug(`Event handler error: on${pascalCase(event.name)} in ${system.name}: `);
                                debug(err.message);
                                debug(err.stack);
                            }
                        });
                }
            }) :
            [];

        return Promise.all(handlerPromises);
    }

    systemWrapper.setup = function(world, isLateSetup = false) {
        const { events } = world.resources.get();
        system.readerId = events.createReader(system.type);
        debugSilly(`readerId ${system.readerId} registered for initialized system ${systemWrapper.name}`);

        if (system.type === 'build' && system.buildOrder) {
            builderPlugin(system);
        } else if (system.type === 'unit') {
            unitPlugin(system);
        }

        if (isLateSetup) {
            if (system.setup) {
                system.setup(world);
            }

            return system.onGameStart ? system.onGameStart(world) : system.readerId;
        } else {
            return system.setup ? system.setup(world) : system.readerId;
        }
    };

    Object.defineProperty(systemWrapper, 'name', {
        value: `${system.name}Wrapper`,
        configurable: true,
    });

    systemWrapper._system = system;
    return systemWrapper;
}

module.exports = createSystem;
