'use strict';

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


module.exports = { MineralField, Townhall };