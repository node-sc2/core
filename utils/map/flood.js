'use strict';
const { distance } = require('../geometry/point');

/**
 * @param {Grid2D} mapData 
 * @param {number} x 
 * @param {number} y 
 * @param {( string | number )} oldVal 
 * @param {( string | number )} newVal 
 * @param {Array<Point2D>} filled 
 * @param {(number | boolean)} [maxReach]
 * @param {Point2D} [startPos]
 * @returns {Array<Point2D>}
 */
function floodFill(mapData, x, y, oldVal, newVal, maxReach = false, filled = [], startPos) {
    
    const mapWidth = mapData.length;
    const mapHeight = mapData[0].length;

    if (startPos == null) {
        startPos = { x, y };
    }

    if (oldVal == null) {
        oldVal = mapData[y][x];
    }

    if (maxReach && distance(startPos, { x, y }) > maxReach) {
        return filled;
    }

    if (mapData[y][x] !== oldVal || filled.some(pix => pix.x === x && pix.y === y)) {
        return filled;
    }

    mapData[y][x] = newVal;
    filled.push({ y, x });

    if (x > 0) { // left
        floodFill(mapData, x - 1, y, oldVal, newVal, maxReach, filled, startPos);
    }
    if (y > 0) { // up
        floodFill(mapData, x, y - 1, oldVal, newVal, maxReach, filled, startPos);
    }
    if (x < mapWidth - 1) { // right
        floodFill(mapData, x + 1, y, oldVal, newVal, maxReach, filled, startPos);
    }
    if (y < mapHeight - 1) { // down
        floodFill(mapData, x, y + 1, oldVal, newVal, maxReach, filled, startPos);
    }

    return filled;
}

module.exports = floodFill;