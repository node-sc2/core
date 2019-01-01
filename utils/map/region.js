'use strict';

const debugDebug = require('debug')('sc2:debug:RegionUtil');
let natGraph;

/**
 * In theory this returns an area (grid) of the 'front' of your natural
 * @param {MapResource} map
 * @returns {Point2D[]}
 */
function frontOfNatural(map) {
    const natural = map.getNatural();

    if (!natural) {
        debugDebug('Current map has no definable natural, can not calculate');
        return [];
    }

    let enemyNat = map.getEnemyNatural();

    if (!enemyNat) {
        debugDebug('We do not know where our enemy nat is (yet?), defaulting to their main');
        enemyNat = map.getEnemyMain();
    }

    // natural area, sorted by distance from the enemy natural
    natGraph = natGraph || natural.areas.areaFill
        .map(p => ({ ...p, d: map.path(p, enemyNat.townhallPosition).length }))
        .sort((a, b) => a.d - b.d);

    // slice off the front.. so uh, it's the front
    return natGraph.slice(0, Math.floor(natGraph.length / 3));
}

function frontOfGrid({ resources }, grid) {
    const { map } = resources.get();
    const mapCenter = map.getCenter(true);

    const frontGrid = grid
        .map(point => ({ ...point, distance: map.path(point, mapCenter).length} ))
        .sort((a, b) => a.distance - b.distance);

    return frontGrid.slice(0, Math.floor(frontGrid.length / 3));
}

module.exports = { frontOfNatural, frontOfGrid };