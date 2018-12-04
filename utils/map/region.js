'use strict';

const { distance } = require('../geometry/point');

/**
 * In theory this returns an area (grid) of the 'front' of your natural
 * @param {Expansion[]} expansions 
 * @returns {Point2D[]}
 */
function frontOfNatural(expansions) {
    const enemyNat = expansions[expansions.length - 2];

    // natural area, sorted by distance from the enemy natural
    const natArea = expansions[1].areas.areaFill
        .sort((a, b) => distance(enemyNat.townhallPosition, a ) - distance(enemyNat.townhallPosition, b ));

    // cut off the front half.. so uh, it's the front
    return natArea.slice(0, Math.floor(natArea.length / 2));
    // drawDebug(bot, front, bot.expansions[1])
    // return front
}

module.exports = { frontOfNatural };