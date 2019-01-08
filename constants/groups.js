'use strict';

const UnitType = require('./unit-type');
const Ability = require('./ability');

/** @type {UnitTypeGroup} */
const flyingStructureTypes = [
    UnitType.FACTORYFLYING,
    UnitType.BARRACKSFLYING,
    UnitType.ORBITALCOMMANDFLYING,
    UnitType.COMMANDCENTERFLYING,
    UnitType.STARPORTFLYING,
];

/** @type {UnitTypeGroup} */
const unbuildablePlateTypes = [
    UnitType.UNBUILDABLEBRICKSDESTRUCTIBLE,
    UnitType.UNBUILDABLEPLATESDESTRUCTIBLE,
];

/** @type {UnitTypeGroup} */
const vespeneGeyserTypes = [
    UnitType.PROTOSSVESPENEGEYSER,
    UnitType.PURIFIERVESPENEGEYSER,
    UnitType.RICHVESPENEGEYSER,
    UnitType.SHAKURASVESPENEGEYSER,
    UnitType.SPACEPLATFORMGEYSER,
    UnitType.VESPENEGEYSER,
];

/** @type {UnitTypeGroup} */
const structureTypes = [
    UnitType.ARMORY,
    UnitType.ASSIMILATOR,
    UnitType.AUTOTURRET,
    UnitType.BANELINGNEST,
    UnitType.BARRACKS,
    UnitType.BARRACKSFLYING,
    UnitType.BARRACKSREACTOR,
    UnitType.BARRACKSTECHLAB,
    UnitType.BUNKER,
    UnitType.COMMANDCENTER,
    UnitType.COMMANDCENTERFLYING,
    UnitType.CREEPTUMOR,
    UnitType.CREEPTUMORBURROWED,
    UnitType.CREEPTUMORQUEEN,
    UnitType.CYBERNETICSCORE,
    UnitType.DARKSHRINE,
    UnitType.ENGINEERINGBAY,
    UnitType.EVOLUTIONCHAMBER,
    UnitType.EXTRACTOR,
    UnitType.FACTORY,
    UnitType.FACTORYFLYING,
    UnitType.FACTORYREACTOR,
    UnitType.FACTORYTECHLAB,
    UnitType.FLEETBEACON,
    UnitType.FORGE,
    UnitType.FUSIONCORE,
    UnitType.GATEWAY,
    UnitType.GHOSTACADEMY,
    UnitType.GREATERSPIRE,
    UnitType.HATCHERY,
    UnitType.HIVE,
    UnitType.HYDRALISKDEN,
    UnitType.INFESTATIONPIT,
    UnitType.KD8CHARGE,
    UnitType.LAIR,
    UnitType.LURKERDENMP,
    UnitType.MISSILETURRET,
    UnitType.NEXUS,
    UnitType.NYDUSCANAL,
    UnitType.NYDUSNETWORK,
    UnitType.ORACLESTASISTRAP,
    UnitType.ORBITALCOMMAND,
    UnitType.ORBITALCOMMANDFLYING,
    UnitType.PHOTONCANNON,
    UnitType.PLANETARYFORTRESS,
    UnitType.POINTDEFENSEDRONE,
    UnitType.PYLON,
    UnitType.REACTOR,
    UnitType.REFINERY,
    UnitType.ROACHWARREN,
    UnitType.ROBOTICSBAY,
    UnitType.ROBOTICSFACILITY,
    UnitType.SENSORTOWER,
    UnitType.SHIELDBATTERY,
    UnitType.SPAWNINGPOOL,
    UnitType.SPINECRAWLER,
    UnitType.SPINECRAWLERUPROOTED,
    UnitType.SPIRE,
    UnitType.SPORECRAWLER,
    UnitType.SPORECRAWLERUPROOTED,
    UnitType.STARGATE,
    UnitType.STARPORT,
    UnitType.STARPORTFLYING,
    UnitType.STARPORTREACTOR,
    UnitType.STARPORTTECHLAB,
    UnitType.SUPPLYDEPOT,
    UnitType.SUPPLYDEPOTLOWERED,
    UnitType.TECHLAB,
    UnitType.TEMPLARARCHIVE,
    UnitType.TWILIGHTCOUNCIL,
    UnitType.ULTRALISKCAVERN,
    UnitType.WARPGATE,

    // neutral
    ...vespeneGeyserTypes,
    ...unbuildablePlateTypes,
];

/** @type {UnitTypeGroup} */
const townhallTypes = [
    UnitType.HATCHERY,
    UnitType.LAIR,
    UnitType.HIVE,
    UnitType.NEXUS,
    UnitType.COMMANDCENTER,
    UnitType.ORBITALCOMMAND,
    UnitType.PLANETARYFORTRESS,
];

/** @type {UnitTypeGroup} */
const mineralFieldTypes = [
    UnitType.MINERALFIELD,
    UnitType.MINERALFIELD750,
    UnitType.LABMINERALFIELD,
    UnitType.LABMINERALFIELD750,
    UnitType.PURIFIERMINERALFIELD,
    UnitType.PURIFIERMINERALFIELD750,
    UnitType.PURIFIERRICHMINERALFIELD,
    UnitType.PURIFIERRICHMINERALFIELD750,
    UnitType.RICHMINERALFIELD,
    UnitType.RICHMINERALFIELD750,
    UnitType.BATTLESTATIONMINERALFIELD,
    UnitType.BATTLESTATIONMINERALFIELD750,
];

/** @type {UnitTypeGroup} */
const gasMineTypes = [
    UnitType.EXTRACTOR,
    UnitType.ASSIMILATOR,
    UnitType.REFINERY,
];

/** @type {UnitTypeGroup} */
const techLabTypes = [
    UnitType.TECHLAB,
    UnitType.BARRACKSTECHLAB,
    UnitType.FACTORYTECHLAB,
    UnitType.STARPORTTECHLAB,
];

/** @type {UnitTypeGroup} */
const reactorTypes = [
    UnitType.REACTOR,
    UnitType.BARRACKSREACTOR,
    UnitType.FACTORYREACTOR,
    UnitType.STARPORTREACTOR,
];

/** @type {UnitTypeGroup} */
const addonTypes = [
    ...techLabTypes,
    ...reactorTypes,
];

/** @type {UnitTypeGroup} */
const workerTypes = [
    UnitType.DRONE,
    UnitType.PROBE,
    UnitType.SCV,
    UnitType.MULE,
];

/** @type {UnitTypeGroup} */
const combatTypes = [
    UnitType.BANSHEE,
    UnitType.CYCLONE,
    UnitType.GHOST,
    UnitType.HELLION,
    UnitType.HELLIONTANK,
    UnitType.LIBERATOR,
    UnitType.LIBERATORAG,
    UnitType.MARAUDER,
    UnitType.MARINE,
    UnitType.MEDIVAC,
    UnitType.RAVEN,
    UnitType.REAPER,
    UnitType.SIEGETANK,
    UnitType.SIEGETANKSIEGED,
    UnitType.THOR,
    UnitType.THORAP,
    UnitType.VIKINGASSAULT,
    UnitType.VIKINGFIGHTER,
    UnitType.WIDOWMINE,
    UnitType.WIDOWMINEBURROWED,

    UnitType.BANELING,
    UnitType.BANELINGBURROWED,
    UnitType.BROODLORD,
    UnitType.CORRUPTOR,
    UnitType.HYDRALISK,
    UnitType.HYDRALISKBURROWED,
    UnitType.INFESTOR,
    UnitType.INFESTORBURROWED,
    UnitType.INFESTORTERRAN,
    UnitType.LURKERMP,
    UnitType.LURKERMPBURROWED,
    UnitType.MUTALISK,
    UnitType.RAVAGER,
    UnitType.ROACH,
    UnitType.ROACHBURROWED,
    UnitType.SPINECRAWLER,
    UnitType.ULTRALISK,
    UnitType.VIPER,
    UnitType.ZERGLING,
    UnitType.ZERGLINGBURROWED,

    UnitType.ADEPT,
    // unitType.ADEPTPHASESHIFT,
    UnitType.ARCHON,
    UnitType.RAVEN,
    UnitType.COLOSSUS,
    UnitType.DARKTEMPLAR,
    UnitType.DISRUPTOR,
    UnitType.DISRUPTORPHASED,
    UnitType.HIGHTEMPLAR,
    UnitType.IMMORTAL,
    UnitType.MOTHERSHIP,
    UnitType.ORACLE,
    UnitType.PHOENIX,
    UnitType.SENTRY,
    UnitType.STALKER,
    UnitType.TEMPEST,
    UnitType.VOIDRAY,
    UnitType.ZEALOT,

    // static d... should we separate this out? i mean they.. are combat units no?
    UnitType.PHOTONCANNON,
    UnitType.SPINECRAWLER,

    // what about air? what about uprooted spine crawlers? no weapons but they should be a target....
];

const gatheringAbilities = [
    Ability.HARVEST_GATHER,
    Ability.HARVEST_GATHER_DRONE,
    Ability.HARVEST_GATHER_PROBE,
    Ability.HARVEST_GATHER_SCV,
];

const returningAbilities = [
    Ability.HARVEST_RETURN,
    Ability.HARVEST_RETURN_DRONE,
    Ability.HARVEST_RETURN_MULE,
    Ability.HARVEST_RETURN_PROBE,
    Ability.HARVEST_RETURN_SCV,
];

const harvestingAbilities = [
    ...gatheringAbilities,
    ...returningAbilities,
];


const constructionAbilities = [
    Ability.BUILD_ARMORY,
    Ability.BUILD_ASSIMILATOR,
    Ability.BUILD_BANELINGNEST,
    Ability.BUILD_BARRACKS,
    Ability.BUILD_BUNKER,
    Ability.BUILD_COMMANDCENTER,
    Ability.BUILD_CREEPTUMOR,
    Ability.BUILD_CREEPTUMOR_QUEEN,
    Ability.BUILD_CREEPTUMOR_TUMOR,
    Ability.BUILD_CYBERNETICSCORE,
    Ability.BUILD_DARKSHRINE,
    Ability.BUILD_ENGINEERINGBAY,
    Ability.BUILD_EVOLUTIONCHAMBER,
    Ability.BUILD_EXTRACTOR,
    Ability.BUILD_FACTORY,
    Ability.BUILD_FLEETBEACON,
    Ability.BUILD_FORGE,
    Ability.BUILD_FUSIONCORE,
    Ability.BUILD_GATEWAY,
    Ability.BUILD_GHOSTACADEMY,
    Ability.BUILD_HATCHERY,
    Ability.BUILD_HYDRALISKDEN,
    Ability.BUILD_INFESTATIONPIT,
    Ability.BUILD_INTERCEPTORS,
    Ability.BUILD_MISSILETURRET,
    Ability.BUILD_NEXUS,
    Ability.BUILD_NUKE,
    Ability.BUILD_NYDUSNETWORK,
    Ability.BUILD_NYDUSWORM,
    Ability.BUILD_PHOTONCANNON,
    Ability.BUILD_PYLON,
    Ability.BUILD_REACTOR,
    Ability.BUILD_REACTOR_BARRACKS,
    Ability.BUILD_REACTOR_FACTORY,
    Ability.BUILD_REACTOR_STARPORT,
    Ability.BUILD_REFINERY,
    Ability.BUILD_ROACHWARREN,
    Ability.BUILD_ROBOTICSBAY,
    Ability.BUILD_ROBOTICSFACILITY,
    Ability.BUILD_SENSORTOWER,
    Ability.BUILD_SHIELDBATTERY,
    Ability.BUILD_SPAWNINGPOOL,
    Ability.BUILD_SPINECRAWLER,
    Ability.BUILD_SPIRE,
    Ability.BUILD_SPORECRAWLER,
    Ability.BUILD_STARGATE,
    Ability.BUILD_STARPORT,
    Ability.BUILD_STASISTRAP,
    Ability.BUILD_SUPPLYDEPOT,
    Ability.BUILD_TECHLAB,
    Ability.BUILD_TECHLAB_BARRACKS,
    Ability.BUILD_TECHLAB_FACTORY,
    Ability.BUILD_TECHLAB_STARPORT,
    Ability.BUILD_TEMPLARARCHIVE,
    Ability.BUILD_TWILIGHTCOUNCIL,
    Ability.BUILD_ULTRALISKCAVERN,
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
    unbuildablePlateTypes,
    vespeneGeyserTypes,
    workerTypes,
};