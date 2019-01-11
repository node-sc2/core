'use strict';

const { gridsInCircle } = require('../geometry/angle');
const { add, areEqual, avgPoints, createPoint2D, closestPoint, multiply, normalize, subtract, distance } = require('../geometry/point');
const { cellsInFootprint } = require('../geometry/plane');
const { getFootprint } = require('../geometry/units');
const { COMMANDCENTER } = require('../../constants/unit-type');

/**
 * @param {World} world 
 * @param {SC2APIProtocol.Point} center 
 * @param {Array<Unit>} mineralFields 
 */
function calculateTownhallPlacement(world, center, mineralFields, geysers) {
    const { map, debug } = world.resources.get();

    /**
     * this moves the centroid toward the correct th position, (the direction of the geysers)
     * where prevents issues like with the mineral fields of the gold on Automaton being flat
     * and the placement not being obvious
     * 
     * @TODO: allow multiple placements sometimes... like for the gold on automaton :p
     */
    const clusterUnits = [...mineralFields, ...geysers];
    const vectors = clusterUnits.map(field => normalize(subtract(field.pos, center)));
    const avgVecPos = subtract(center, multiply(avgPoints(vectors), 15));

    // this uses only normalized (that is, floored) placement cell values
    const grids = gridsInCircle(createPoint2D(avgVecPos), 5, { normalize: true })
        .map((cell) => {
            // the entire footprint grid(5x5) for the possible placement of a townhall on a cell
            const thCells = cellsInFootprint(cell, getFootprint(COMMANDCENTER));

            const cellBucket =  thCells.map((thCell) => {
                // the closest cluster resource (mineralField or vespeneGeyser) to a specific placement cell
                const closestResource = clusterUnits.reduce((closestField, field) => {
                    // the footprint grid for the cluster resource
                    const mfCells = cellsInFootprint(createPoint2D(field.pos), getFootprint(field.unitType));
                    // the closest cluster unit *cell* to the placement cell
                    const closestMfCell = closestPoint(thCell, mfCells);
                    const d = distance(thCell, closestMfCell);
                    if (d < closestField.distance) {
                        return { closestField: field, distance: d };
                    } else {
                        return closestField;
                    }
                }, { closestField: null, distance: Infinity } );

                return { ...thCell, closest: closestResource };
            });

            return {
                ...cell,
                cellBucket,
            };
        })
        // every cell for the placement must be 3 (min distance) + 1 (cell size) away from every resource unit
        .filter(cell => cell.cellBucket.every(cell => cell.closest.distance >= 3 + 1))
        // drop all the extra metadata
        .map(grid => ({ x: grid.x, y: grid.y }))
        // check that a townhall can fit here (as far as we know, given the current internal placement grid)
        .filter((placement) => {
            // don't check placeable if it matches the townhall starting position, because it's right
            if (areEqual(add(placement, 0.5), map.getLocations().self)) return true;
            return map.isPlaceableAt(COMMANDCENTER, placement);
        });

    const townhallPlacement = closestPoint(center, grids);
    return townhallPlacement;
}

module.exports = calculateTownhallPlacement;