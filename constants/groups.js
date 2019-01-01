'use strict';

const unitType = require('./unit-type');
const abilities = require('./ability');

/** @type {UnitTypeGroup} */
const flyingStructureTypes = [
    unitType.FACTORYFLYING,
    unitType.BARRACKSFLYING,
    unitType.ORBITALCOMMANDFLYING,
    unitType.COMMANDCENTERFLYING,
    unitType.STARPORTFLYING,
];

/** @type {UnitTypeGroup} */
const structureTypes = [
    unitType.ARMORY,
    unitType.ASSIMILATOR,
    unitType.AUTOTURRET,
    unitType.BANELINGNEST,
    unitType.BARRACKS,
    unitType.BARRACKSFLYING,
    unitType.BARRACKSREACTOR,
    unitType.BARRACKSTECHLAB,
    unitType.BUNKER,
    unitType.COMMANDCENTER,
    unitType.COMMANDCENTERFLYING,
    unitType.CREEPTUMOR,
    unitType.CREEPTUMORBURROWED,
    unitType.CREEPTUMORQUEEN,
    unitType.CYBERNETICSCORE,
    unitType.DARKSHRINE,
    unitType.ENGINEERINGBAY,
    unitType.EVOLUTIONCHAMBER,
    unitType.EXTRACTOR,
    unitType.FACTORY,
    unitType.FACTORYFLYING,
    unitType.FACTORYREACTOR,
    unitType.FACTORYTECHLAB,
    unitType.FLEETBEACON,
    unitType.FORGE,
    unitType.FUSIONCORE,
    unitType.GATEWAY,
    unitType.GHOSTACADEMY,
    unitType.GREATERSPIRE,
    unitType.HATCHERY,
    unitType.HIVE,
    unitType.HYDRALISKDEN,
    unitType.INFESTATIONPIT,
    unitType.KD8CHARGE,
    unitType.LAIR,
    unitType.LURKERDENMP,
    unitType.MISSILETURRET,
    unitType.NEXUS,
    unitType.NYDUSCANAL,
    unitType.NYDUSNETWORK,
    unitType.ORACLESTASISTRAP,
    unitType.ORBITALCOMMAND,
    unitType.ORBITALCOMMANDFLYING,
    unitType.PHOTONCANNON,
    unitType.PLANETARYFORTRESS,
    unitType.POINTDEFENSEDRONE,
    unitType.PYLON,
    unitType.REACTOR,
    unitType.REFINERY,
    unitType.ROACHWARREN,
    unitType.ROBOTICSBAY,
    unitType.ROBOTICSFACILITY,
    unitType.SENSORTOWER,
    unitType.SHIELDBATTERY,
    unitType.SPAWNINGPOOL,
    unitType.SPINECRAWLER,
    unitType.SPINECRAWLERUPROOTED,
    unitType.SPIRE,
    unitType.SPORECRAWLER,
    unitType.SPORECRAWLERUPROOTED,
    unitType.STARGATE,
    unitType.STARPORT,
    unitType.STARPORTFLYING,
    unitType.STARPORTREACTOR,
    unitType.STARPORTTECHLAB,
    unitType.SUPPLYDEPOT,
    unitType.SUPPLYDEPOTLOWERED,
    unitType.TECHLAB,
    unitType.TEMPLARARCHIVE,
    unitType.TWILIGHTCOUNCIL,
    unitType.ULTRALISKCAVERN,
    unitType.WARPGATE,
];

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
const addonTypes = [
    unitType.TECHLAB,
    unitType.REACTOR,
    unitType.BARRACKSTECHLAB,
    unitType.FACTORYTECHLAB,
    unitType.STARPORTTECHLAB,
    unitType.BARRACKSREACTOR,
    unitType.FACTORYREACTOR,
    unitType.STARPORTREACTOR,
];

/** @type {UnitTypeGroup} */
const workerTypes = [
    unitType.DRONE,
    unitType.PROBE,
    unitType.SCV,
    unitType.MULE,
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
    unitType.SPINECRAWLER,
    unitType.ULTRALISK,
    unitType.VIPER,
    unitType.ZERGLING,
    unitType.ZERGLINGBURROWED,

    unitType.ADEPT,
    // unitType.ADEPTPHASESHIFT,
    unitType.ARCHON,
    unitType.RAVEN,
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

    // static d... should we separate this out? i mean they.. are combat units no?
    unitType.PHOTONCANNON,
    unitType.SPINECRAWLER,

    // what about air? what about uprooted spine crawlers? no weapons but they should be a target....
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
    abilities.BUILD_ASSIMILATOR,
    abilities.BUILD_BANELINGNEST,
    abilities.BUILD_BARRACKS,
    abilities.BUILD_BUNKER,
    abilities.BUILD_COMMANDCENTER,
    abilities.BUILD_CREEPTUMOR,
    abilities.BUILD_CREEPTUMOR_QUEEN,
    abilities.BUILD_CREEPTUMOR_TUMOR,
    abilities.BUILD_CYBERNETICSCORE,
    abilities.BUILD_DARKSHRINE,
    abilities.BUILD_ENGINEERINGBAY,
    abilities.BUILD_EVOLUTIONCHAMBER,
    abilities.BUILD_EXTRACTOR,
    abilities.BUILD_FACTORY,
    abilities.BUILD_FLEETBEACON,
    abilities.BUILD_FORGE,
    abilities.BUILD_FUSIONCORE,
    abilities.BUILD_GATEWAY,
    abilities.BUILD_GHOSTACADEMY,
    abilities.BUILD_HATCHERY,
    abilities.BUILD_HYDRALISKDEN,
    abilities.BUILD_INFESTATIONPIT,
    abilities.BUILD_INTERCEPTORS,
    abilities.BUILD_MISSILETURRET,
    abilities.BUILD_NEXUS,
    abilities.BUILD_NUKE,
    abilities.BUILD_NYDUSNETWORK,
    abilities.BUILD_NYDUSWORM,
    abilities.BUILD_PHOTONCANNON,
    abilities.BUILD_PYLON,
    abilities.BUILD_REACTOR,
    abilities.BUILD_REACTOR_BARRACKS,
    abilities.BUILD_REACTOR_FACTORY,
    abilities.BUILD_REACTOR_STARPORT,
    abilities.BUILD_REFINERY,
    abilities.BUILD_ROACHWARREN,
    abilities.BUILD_ROBOTICSBAY,
    abilities.BUILD_ROBOTICSFACILITY,
    abilities.BUILD_SENSORTOWER,
    abilities.BUILD_SHIELDBATTERY,
    abilities.BUILD_SPAWNINGPOOL,
    abilities.BUILD_SPINECRAWLER,
    abilities.BUILD_SPIRE,
    abilities.BUILD_SPORECRAWLER,
    abilities.BUILD_STARGATE,
    abilities.BUILD_STARPORT,
    abilities.BUILD_STASISTRAP,
    abilities.BUILD_SUPPLYDEPOT,
    abilities.BUILD_TECHLAB,
    abilities.BUILD_TECHLAB_BARRACKS,
    abilities.BUILD_TECHLAB_FACTORY,
    abilities.BUILD_TECHLAB_STARPORT,
    abilities.BUILD_TEMPLARARCHIVE,
    abilities.BUILD_TWILIGHTCOUNCIL,
    abilities.BUILD_ULTRALISKCAVERN,
];

module.exports = {
    addonTypes,
    combatTypes,
    constructionAbilities,
    flyingStructureTypes,
    gasMineTypes,
    gatheringAbilities,
    mineralFieldTypes,
    reactorTypes,
    returningAbilities,
    structureTypes,
    techLabTypes,
    townhallTypes,
    vespeneGeyserTypes,
    workerTypes,
};