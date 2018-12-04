'use strict';

const { PlayerType } = require('./constants/enums');
const createAgent = require('./agent');
const createEngine = require('./engine');
const createSystem = require('./systems');
const { taskFunctions } = require('./systems/builder-plugin');

function createPlayer(settings, entity) {
    const type = entity ? PlayerType.PARTICIPANT : PlayerType.COMPUTER;
    return {
        ...settings,
        type,
        agent: entity,
    };
}

module.exports = { createAgent, createEngine, createSystem, createPlayer, taskFunctions };