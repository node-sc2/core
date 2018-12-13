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
const techLabTypes = [
    unitType.TECHLAB,
    unitType.BARRACKSTECHLAB,
    unitType.FACTORYTECHLAB,
    unitType.STARPORTTECHLAB,
];

/** @type {UnitTypeGroup} */
const reactorTypes = [
    unitType.REACTOR,
    unitType.BARRACKSREACTOR,
    unitType.FACTORYREACTOR,
    unitType.STARPORTREACTOR,
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
];

const returningAbilities = [
    abilities.HARVEST_RETURN,
    abilities.HARVEST_RETURN_DRONE,
    abilities.HARVEST_RETURN_MULE,
    abilities.HARVEST_RETURN_PROBE,
    abilities.HARVEST_RETURN_SCV,
];

const constructionAbilities = [
    abilities.BUILD_ARMORY,
    abilities.BUILD_BARRACKS,
    abilities.BUILD_BUNKER,
    abilities.BUILD_COMMANDCENTER,
    abilities.BUILD_ENGINEERINGBAY,
    abilities.BUILD_FACTORY,
    abilities.BUILD_GHOSTACADEMY,
    abilities.BUILD_MISSILETURRET,
    abilities.BUILD_REFINERY,
    abilities.BUILD_SENSORTOWER,
    abilities.BUILD_STARPORT,
    abilities.BUILD_SUPPLYDEPOT,
];

module.exports = {
    combatTypes,
    constructionAbilities,
    gasMineTypes,
    gatheringAbilities,
    mineralFieldTypes,
    reactorTypes,
    returningAbilities,
    techLabTypes,
    townhallTypes,
    vespeneGeyserTypes
};