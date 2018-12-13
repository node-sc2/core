'use strict';

/**
 * get dot product of two points
 * @param {Point2D} a
 * @param {Point2D} b 
 */
function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y;
}

/**
 * add point to point or number
 * @param {Point2D} a
 * @param {Point2D} b 
 */
function distanceSquared(a, b) {
    const diff = {
        x: a.x - b.x,
        y: a.y - b.y,
    };

    return dotProduct(diff, diff);
}

/**
 * 
 * @param {Point2D} a 
 * @param {Point2D} b 
 */
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * 
 * @param {Point2D} a 
 * @param {Point2D} b 
 */
function distanceX(a, b) {
    return Math.abs(a.x - b.x);
}

/**
 * 
 * @param {Point2D} a 
 * @param {Point2D} b 
 */
function distanceY(a, b) {
    return Math.abs(a.y - b.y);
}

/**
 * add point to point or number
 * @param {Point2D} point 
 * @param {(Point2D | number)} rhs 
 */
function add(point, rhs) {
    if (typeof rhs === 'number') {
        return {
            x: point.x * rhs,
            y: point.y * rhs,
        };
    } else {
        return {
            x: point.x + rhs.x,
            y: point.y + rhs.y,
        };
    }
}

/**
 * multiply point by point or number
 * @param {Point2D} point 
 * @param {(Point2D | number)} rhs 
 */
function multiply(point, rhs) {
    if (typeof rhs === 'number') {
        return {
            x: point.x * rhs,
            y: point.y * rhs,
        };
    } else {
        return {
            x: point.x * rhs.x,
            y: point.y * rhs.y,
        };
    }
}

/**
 * divide point by point or number
 * @param {Point2D} point 
 * @param {(Point2D | number)} rhs 
 */
function divide(point, rhs) {
    if (typeof rhs === 'number') {
        return {
            x: point.x / rhs,
            y: point.y / rhs,
        };
    } else {
        return {
            x: point.x / rhs.x,
            y: point.y / rhs.y,
        };
    }
    
}

/**
 * x,y equality check
 * @param {Point2D} a 
 * @param {Point2D} b
 */
function areEqual(a, b) {
    return a.x === b.x && a.y === b.y;
}

function closestPoint(pos, points) {
    return points.map(point => ({ point, distance: distance(pos, point) }))
            .sort((a, b) => a.distance - b.distance)
            .map(p => p.point)[0];
}

function nClosestPoint(pos, points, n = 1) {
    return points.map(point => ({ point, distance: distance(pos, point) }))
            .sort((a, b) => a.distance - b.distance)
            .map(p => p.point)
            .slice(0, n);
}

function avgPoints(points) {
    return {
        x: points.reduce((sum, n) => sum + n.x, 0) / points.length,
        y: points.reduce((sum, n) => sum + n.y, 0) / points.length,
    };
}

module.exports = {
    areEqual,
    avgPoints,
    dotProduct,
    distance,
    distanceX,
    distanceY,
    distanceSquared,
    add,
    multiply,
    divide,
    closestPoint,
    nClosestPoint
};