'use strict';

const ResourceManager = require('./create-resource-manager');
const ActionManager = require('../resources/actions');
const Debugger = require('../resources/debug');
const DataStorage = require('./data-storage');
const EventChannel = require('../resources/event-channel');
const Frame = require('../resources/frame');
const MapManager = require('../resources/map');
const UnitManager = require('../resources/units');

/** @returns {World} */
function createWorld() {
    const world = {
        agent: null,
        data: null,
        resources: null,
    };

    world.data = DataStorage();
    world.resources = ResourceManager();

    world.resources.set({
        frame: Frame(),
        map: MapManager(world),
        debug: Debugger(world),
        units: UnitManager(world),
        events: EventChannel(world),
        actions: ActionManager(world),
    });

    return world;
}
module.exports = createWorld;