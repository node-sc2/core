'use strict';

const createError = require('create-error');

const NodeSC2Error = createError('NodeSc2Error');
const ActionManagerError = createError(NodeSC2Error, 'ActionManagerError');

const defaultProps = { data: {}, status: 0 };

const BuildError = createError(ActionManagerError, 'BuildError', defaultProps);
const TrainError = createError(ActionManagerError, 'TrainError', defaultProps);
const GatherError = createError(ActionManagerError, 'GatherError', defaultProps);

const MapDecompositionError = createError(NodeSC2Error, 'MapDecompositionError');
const GameEndedError = createError('GameEndedError');

module.exports = {
    GameEndedError,
    NodeSC2Error,
        MapDecompositionError,
        ActionManagerError,
            BuildError, TrainError, GatherError,
};
