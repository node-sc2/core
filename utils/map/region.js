'use strict';

let natGraph;

/**
 * In theory this returns an area (grid) of the 'front' of your natural
 * @param {MapResource} map
 * @returns {Point2D[]}
 */
function frontOfNatural(map) {
    const natural = map.getNatural();
    const enemyNat = map.getEnemyNatural();

    // natural area, sorted by distance from the enemy natural
    natGraph = natGraph || natural.areas.areaFill
        .map(p => ({ ...p, d: map.path(p, enemyNat.townhallPosition).length }))
        .sort((a, b) => a.d - b.d);

    // slice off the front.. so uh, it's the front
    return natGraph.slice(0, Math.floor(natGraph.length / 5));
}

module.exports = { frontOfNatural };