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
        _render: null,
        _feature: null,
        _score: null,
        getObservation() {
            return this._observation;
        },
        getRender() {
            return this._render;
        },
        getFeatureLayer() {
            return this._feature;
        },
        getScore() {
            return this._score;
        },
        getGameInfo() {
            return this._gameInfo;
        },
        getGameLoop() {
            return this._gameLoop;
        },
        getEffects() {
            return this._observation.rawData.effects;
        },
        getMapState() {
            return this._observation.rawData.mapState;
        },
        getPrevious() {
            return this._previous;
        },
        timeInSeconds() {
            return Math.round(this.getGameLoop() * 44 / 1000);
        },
    };

}

module.exports = createFrame;