'use strict';

const { createPoint2D } = require('./point');
const Color = require('../../constants/color');

const DEG_TO_RAD = Math.PI / 180.0;
const TWO_PI = Math.PI * 2;

const toRadians = deg => deg * DEG_TO_RAD;
const toDegrees = rad => rad / DEG_TO_RAD;

/**
 * Given a centerPoint C and a radius R, returns a random point that is on the 
 * circumference defined by C and R. 
 * @param {Point2D} centerPoint 
 * @param {number} radius 
 * @returns {Point2D}
 */
const randomCircumferencePoint = (centerPoint, radius) => {
    const theta = Math.random() * TWO_PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    return {
        x: Math.floor(centerPoint.x + radius * cosTheta),
        y: Math.floor(centerPoint.y + radius * sinTheta),
    };
};

/**
 * 
 * @param {Point2D} centerPoint 
 * @param {number} radius 
 * @param {number} n
 * @return {Array<Point2D>}
 */
const randomCirclePoints = (centerPoint, radius, n = 1) => {
    return Array.from({ length: n }, () => {
        // http://mathworld.wolfram.com/DiskPointPicking.html
        return randomCircumferencePoint(centerPoint, Math.sqrt(Math.random()) * radius);
    });
};

/**
 * Finds all map grids with any corner within a circle
 * @param {Point2D} c 
 * @param {{ distance?: number; normalize?: boolean; }} options 
 * @param {Debugger} [debug]
 * @regridsInCircleoint2D>}
 */
const gridsInCircle = (c, r, options = {}, debug) => {
    const opts = {
        distance: 0.5,
        ...options,
    };

    const center = createPoint2D(c);

    if (debug) debug.setDrawSpheres(`${r}`, [{ pos: center, color: Color.YELLOW, size: 5 }]);
    const transform = options.normalize ? createPoint2D : (T) => T;

    const d = opts.distance * 2;
    const myPoints = [];
    for (let x = center.x - r; x < center.x + d + r; x += d) {
        for (let y = center.y - r; y < center.y + d + r; y += d) {
            if (debug){
                debug.setDrawCells(`xy-${x}${y}`, [{ pos: { x, y } }], { color: Color.WHITE, size: 1 });
            }
            if (
                (Math.pow((x - c.x), 2) + Math.pow((y - c.y), 2) <= r * r) ||
                (Math.pow(((x + d) - c.x), 2) + Math.pow((y - c.y), 2) <= r * r) ||
                (Math.pow((x - c.x), 2) + Math.pow(((y + d) - c.y), 2) <= r * r) ||
                (Math.pow(((x + d) - c.x), 2) + Math.pow(((y + d) - c.y), 2) <= r * r)
            ) {
                myPoints.push(transform({ x, y }));
            }
        }
    }

    return myPoints;
};

module.exports = { toRadians, toDegrees, gridsInCircle, randomCirclePoints };