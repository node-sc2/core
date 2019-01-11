'use strict';

const debugFrame = require('debug')('sc2:debug:frameSystem');
const createSystem = require('./create-system');
const { GameEndedError } = require('../engine/errors');

/**
 * Frame Engine System
 * @module system/frame
 */

 /** @type {FrameSystem} */
const frameSystem = {
    name: 'FrameSystem',
    type: 'engine',
    async onGameStart({ resources }) {
        const { actions: { _client }, frame } = resources.get();
        
        const [gameInfo, responseObservation] = await Promise.all([
            _client.gameInfo(),
            _client.observation(),
        ]);

        frame._gameInfo = gameInfo;
        frame._observation = responseObservation.observation;
    },
    async onStep({ resources }) {
        const { actions: { _client }, frame, units, events } = resources.get();
        
        let incFrameData;
        try {
            incFrameData = await Promise.all([
                _client.observation(),
                // _client.gameInfo() // huuuuuuuge perf issue, 100k of $decode
            ]);
        } catch(e) {
            throw new GameEndedError('broken thingy testing', { e });
        }

        /**
         * figure out if the game is over first, that seems important...
         */
        if (incFrameData[0].playerResult.length > 0) {
            debugFrame('exiting loop, results given from observation');
            throw new GameEndedError('Player results available in observation', { data: incFrameData[0].playerResult });
        }


        const [responseObservation/* , gameInfo */] = incFrameData;

        const { observation, chat } = responseObservation;
        
        frame._previous = {
            _gameLoop: frame._gameLoop,
            // @TODO: perf, do we really need this for anything rn?
            // gameInfo: frame._gameInfo,
            // observation: frame._observation,
        };
        
        if (observation) {
            frame._gameLoop = observation.gameLoop;
            frame._observation = observation;
            frame._result = responseObservation.playerResult;
            frame._render = observation.renderData;
            frame._feature = observation.featureLayerData;
            frame._score = observation.score;
        }
        
        // if (gameInfo) {
        //     frame._gameInfo = gameInfo;
        // }

        /**
         * @TODO: this shouldn't be an issue, but should perf check it late game.
         * 
         * given accepted commands have been ack'd by the game, so free the units
         * for non-queued commands this upcoming frame.
         * 
         * @TODO: should the frame system be in charge of this? Command labels are
         * set in the action builder... maybe we should also let it clean up? 
         */
        const { actions } = responseObservation;
        if (actions.length > 0) {
            actions.forEach((action) => {
                action.actionRaw && action.actionRaw.unitCommand &&
                    action.actionRaw.unitCommand.unitTags.forEach((unitTag) => {
                        const u = units.getByTag(unitTag);
                        if (u && typeof u !== 'string') u.removeLabel('command');
                    });
            });
        }

        const outstandingCommands = units.withLabel('command');
        outstandingCommands.forEach((unit) => {
            const frameCommanded = unit.getLabel('command');
            const frameDifference = observation.gameLoop - frameCommanded;
            if (frameDifference > 250) {
                // obviously something went wrong here...
                debugFrame(`Outstanding unit command after ${frameDifference}ms!`);
                if (unit.isWorker()) {
                    unit.labels.clear();
                    unit.addLabel('stuck', true);
                }
                unit.removeLabel('command');
            } 
        });

        if (chat.length > 0) {
            chat.forEach((line) => {
                events.write({
                    name: 'chatReceived',
                    data: line,
                });
            });
        }

        /**
         * forward "unit dead" events from the observation
         */
        const { event } = responseObservation.observation.rawData;

        if (event && event.deadUnits.length > 0) {
            // apparently you get dead unit events for things like projectiles.. so..
            const deadUnits = units.getByTag(event.deadUnits).filter(unit => {
                return typeof unit !== 'string';
            });
            
            // set 'em dead
            deadUnits.forEach(unit => unit.labels.set('dead', true));

            // set an event for each dead thingy
            deadUnits.forEach(unit => events.write({
                name: 'unitDestroyed',
                type: 'all',
                data: unit,
            }));
        }
    },
};

module.exports = createSystem(frameSystem);