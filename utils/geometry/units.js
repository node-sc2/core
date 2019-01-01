'use strict';

const UnitType = require('../../constants/unit-type');
const { structureTypes, flyingStructureTypes, townhallTypes, mineralFieldTypes } = require('../../constants/groups');

/**
 * @param {Unit} unit 
 */
function MineralField(unit) {
    return {
        pos: unit.pos,
        w: 2,
        h: 1,
    };
}

/**
 * @param {Point2D} pos 
 */
function Townhall(pos) {
    return {
        pos,
        w: 5,
        h: 5,
    };
}

const figureTheseOut = [
    UnitType.BUNKER,
    UnitType.CREEPTUMOR,
    UnitType.CREEPTUMORBURROWED,
    UnitType.CREEPTUMORQUEEN,
    UnitType.GREATERSPIRE,
    UnitType.KD8CHARGE, // reaper grenade
    UnitType.MISSILETURRET,
    UnitType.ORACLESTASISTRAP,
    UnitType.POINTDEFENSEDRONE,
    UnitType.SPIRE,

    // how to handle uprooting and moving of these?
    UnitType.SPINECRAWLER,
    UnitType.SPINECRAWLERUPROOTED,
    UnitType.SPORECRAWLER,
    UnitType.SPORECRAWLERUPROOTED,

    // doesn't affect pathing but affects placement?
    UnitType.SUPPLYDEPOTLOWERED,

];

const twoByTwoUnits = [
    UnitType.AUTOTURRET,
    UnitType.BANELINGNEST,
    UnitType.BARRACKSREACTOR,
    UnitType.BARRACKSTECHLAB,
    UnitType.DARKSHRINE,
    UnitType.FACTORYREACTOR,
    UnitType.FACTORYTECHLAB,
    UnitType.PHOTONCANNON,
    UnitType.PYLON,
    UnitType.REACTOR,
    UnitType.SENSORTOWER,
    UnitType.SHIELDBATTERY,
    UnitType.SPAWNINGPOOL,
    UnitType.STARPORTREACTOR,
    UnitType.STARPORTTECHLAB,
    UnitType.SUPPLYDEPOT,
    UnitType.TECHLAB,
];

function getFootprint(unitType) {
    if (!structureTypes.includes(unitType) || flyingStructureTypes.includes(unitType)) {
        return {
            h: 0,
            w: 0,
        };
    } else if (townhallTypes.includes(unitType)) {
        return {
            w: 5,
            h: 5,
        };
    } else if (mineralFieldTypes.includes(unitType)) {
        return {
            w: 2,
            h: 1,
        };
    } else if (twoByTwoUnits.includes(unitType)) {
        return {
            w: 2,
            h: 2,
        };
    } else {
        // this currently isn't totally accurate, see `figureTheseOut` above
        return {
            w: 3,
            h: 3,
        };
    }
}

module.exports = { MineralField, Townhall, getFootprint };