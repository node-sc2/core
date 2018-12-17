'use strict';

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

module.exports = { toRadians, toDegrees, randomCirclePoints };