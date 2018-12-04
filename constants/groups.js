'use strict';

const unitType = require('./unit-type');
const abilities = require('./ability');

/** @type {UnitTypeGroup} */
const townhallTypes = [
    unitType.HATCHERY,
    unitType.LAIR,
    unitType.HIVE,
    unitType.NEXUS,
    unitType.COMMANDCENTER,
    unitType.ORBITALCOMMAND,
    unitType.PLANETARYFORTRESS,
];

/** @type {UnitTypeGroup} */
const mineralFieldTypes = [
    unitType.MINERALFIELD,
    unitType.MINERALFIELD750,
    unitType.LABMINERALFIELD,
    unitType.LABMINERALFIELD750,
    unitType.PURIFIERMINERALFIELD,
    unitType.PURIFIERMINERALFIELD750,
    unitType.PURIFIERRICHMINERALFIELD,
    unitType.PURIFIERRICHMINERALFIELD750,
    unitType.RICHMINERALFIELD,
    unitType.RICHMINERALFIELD750,
    unitType.BATTLESTATIONMINERALFIELD,
    unitType.BATTLESTATIONMINERALFIELD750,
];

/** @type {UnitTypeGroup} */
const vespeneGeyserTypes = [
    unitType.PROTOSSVESPENEGEYSER,
    unitType.PURIFIERVESPENEGEYSER,
    unitType.RICHVESPENEGEYSER,
    unitType.SHAKURASVESPENEGEYSER,
    unitType.SPACEPLATFORMGEYSER,
    unitType.VESPENEGEYSER,
];

/** @type {UnitTypeGroup} */
const gasMineTypes = [
    unitType.EXTRACTOR,
    unitType.ASSIMILATOR,
    unitType.REFINERY,
];

/** @type {UnitTypeGroup} */
const combatTypes = [
    unitType.BANSHEE,
    unitType.CYCLONE,
    unitType.GHOST,
    unitType.HELLION,
    unitType.HELLIONTANK,
    unitType.LIBERATOR,
    unitType.LIBERATORAG,
    unitType.MARAUDER,
    unitType.MARINE,
    unitType.MEDIVAC,
    unitType.RAVEN,
    unitType.REAPER,
    unitType.SIEGETANK,
    unitType.SIEGETANKSIEGED,
    unitType.THOR,
    unitType.THORAP,
    unitType.VIKINGASSAULT,
    unitType.VIKINGFIGHTER,
    unitType.WIDOWMINE,
    unitType.WIDOWMINEBURROWED,

    unitType.BANELING,
    unitType.BANELINGBURROWED,
    unitType.BROODLORD,
    unitType.CORRUPTOR,
    unitType.HYDRALISK,
    unitType.HYDRALISKBURROWED,
    unitType.INFESTOR,
    unitType.INFESTORBURROWED,
    unitType.INFESTORTERRAN,
    unitType.LURKERMP,
    unitType.LURKERMPBURROWED,
    unitType.MUTALISK,
    unitType.RAVAGER,
    unitType.ROACH,
    unitType.ROACHBURROWED,
    unitType.ULTRALISK,
    unitType.VIPER,
    unitType.ZERGLING,
    unitType.ZERGLINGBURROWED,

    unitType.ADEPT,
    unitType.ADEPTPHASESHIFT,
    unitType.ARCHON,
    unitType.CARRIER,
    unitType.COLOSSUS,
    unitType.DARKTEMPLAR,
    unitType.DISRUPTOR,
    unitType.DISRUPTORPHASED,
    unitType.HIGHTEMPLAR,
    unitType.IMMORTAL,
    unitType.MOTHERSHIP,
    unitType.ORACLE,
    unitType.PHOENIX,
    unitType.SENTRY,
    unitType.STALKER,
    unitType.TEMPEST,
    unitType.VOIDRAY,
    unitType.ZEALOT,
];

const gatheringAbilities = [
    abilities.HARVEST_GATHER,
    abilities.HARVEST_GATHER_DRONE,
    abilities.HARVEST_GATHER_PROBE,
    abilities.HARVEST_GATHER_SCV,
    // Abilities.HARVEST_RETURN,
    // Abilities.HARVEST_RETURN_DRONE,
    // Abilities.HARVEST_RETURN_MULE,
    // Abilities.HARVEST_RETURN_PROBE,
    // Abilities.HARVEST_RETURN_SCV,
];

module.exports = {
    combatTypes,
    gasMineTypes,
    gatheringAbilities,
    mineralFieldTypes,
    townhallTypes,
    vespeneGeyserTypes
};