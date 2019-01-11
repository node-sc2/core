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
            x: point.x + rhs,
            y: point.y + rhs,
        };
    } else {
        return {
            x: point.x + rhs.x,
            y: point.y + rhs.y,
        };
    }
}

/**
 * subtract point or number from point
 * @param {Point2D} point 
 * @param {(Point2D | number)} rhs 
 */
function subtract(point, rhs) {
    if (typeof rhs === 'number') {
        return {
            x: point.x - rhs,
            y: point.y - rhs,
        };
    } else {
        return {
            x: point.x - rhs.x,
            y: point.y - rhs.y,
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

/**
 *
 * @param {Point2D} pos 
 * @param {Point2D[]} points
 * @return {Point2D}
 */
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

function normalize(vec) {
    return {
        x: vec.x / Math.sqrt(vec.x * vec.x + vec.y * vec.y),
        y: vec.y / Math.sqrt(vec.x * vec.x + vec.y * vec.y),
    };
}

/**
 * @param {Point2D} param0 
 */
const createPoint2D = ({x, y}) => ({ x: Math.floor(x), y: Math.floor(y) });

/**
 * @param {SC2APIProtocol.Point} param0 
 */
const createPoint = ({x, y, z}) => ({ x: Math.floor(x), y: Math.floor(y), z:  Math.floor(z) });

/**
 * 
 * @param {Point2D} point 
 * @param {boolean} includeDiagonal 
 */
function getNeighbors(point, includeDiagonal = true) {
    const normal = createPoint2D(point);

    const getAdjacents = ({ x, y }) => [
        { y: y - 1, x},
        { y, x: x - 1},
        { y, x: x + 1},
        { y: y + 1, x},
    ];

    const getDiags = ({ x, y }) => [
        { y: y - 1, x: x - 1},
        { y: y - 1, x: x + 1},
        { y: y + 1, x: x - 1},
        { y: y + 1, x: x + 1},
    ];

    let neighbors = getAdjacents(normal);

    if (includeDiagonal) {
        neighbors = neighbors.concat(getDiags(normal));
    }

    return neighbors;
}

module.exports = {
    createPoint,
    createPoint2D,
    getNeighbors,
    areEqual,
    avgPoints,
    dotProduct,
    distance,
    distanceX,
    distanceY,
    distanceSquared,
    add,
    subtract,
    multiply,
    divide,
    normalize,
    closestPoint,
    nClosestPoint
};