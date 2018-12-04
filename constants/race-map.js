'use strict';

const { Race } = require('./enums');
const UnitType = require('./unit-type');
const Ability = require('./ability');

// These constants are helpers to create race-agnostic routines

const GasMineRace = {
    [Race.ZERG]: UnitType.EXTRACTOR,
    [Race.PROTOSS]: UnitType.ASSIMILATOR,
    [Race.TERRAN]: UnitType.REFINERY,
};

const SupplyUnitRace = {
    [Race.ZERG]: UnitType.OVERLORD,
    [Race.PROTOSS]: UnitType.PYLON,
    [Race.TERRAN]: UnitType.SUPPLYDEPOT,
};

const TownhallRace = {
    [Race.ZERG]: [UnitType.HATCHERY, UnitType.LAIR, UnitType.HIVE],
    [Race.PROTOSS]: [UnitType.NEXUS],
    [Race.TERRAN]: [UnitType.COMMANDCENTER, UnitType.ORBITALCOMMAND, UnitType.PLANETARYFORTRESS],
};

const WorkerRace = {
    [Race.ZERG]: UnitType.DRONE,
    [Race.PROTOSS]: UnitType.PROBE,
    [Race.TERRAN]: UnitType.SCV,
};

const HarvestGatheringRace = {
    [Race.ZERG]: Ability.HARVEST_GATHER_DRONE,
    [Race.PROTOSS]: Ability.HARVEST_GATHER_PROBE,
    [Race.TERRAN]: Ability.HARVEST_GATHER_SCV,
};

module.exports = {
    GasMineRace,
    SupplyUnitRace,
    TownhallRace,
    WorkerRace,
    HarvestGatheringRace,
};


