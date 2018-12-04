'use strict';

/**
 * @returns {FrameResource}
 */
function createFrame() {
    return {
        _gameLoop: 0,
        _gameInfo: null,
        _observation: null,
        _previous: null,
        getObservation() {
            return this._observation;
        },
        getGameInfo() {
            return this._gameInfo;
        },
        getGameLoop() {
            return this._gameLoop;
        },
        getMapState() {
            return this._observation.rawData.mapState;
        },
        getPrevious() {
            return this._previous;
        }
    };

}

module.exports = createFrame;