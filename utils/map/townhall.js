'use strict';

const { toRadians } = require('../geometry/angle');
const { avgPoints } = require('../geometry/point');
const { distanceAAShapes } = require('../geometry/plane');
const { MineralField, Townhall } = require('../geometry/units');

function calculateTownhallPlacement(center, mineralFields, distances, stepSize = 0.5) {
    const radiuses = distances || [5.0, 5.3, 5.6, 5.9, 6.4, 6.8, 7.2];

    // sort smallest to largest
    radiuses.sort((a, b) => a - b);

    // an array of angles to try placement positions as
    const steps = Array.from({ length: 360 / stepSize }, (_, i) => i * stepSize);

    /* create points on circles of various radius with the same center
     * find valid placements, pick the closest to the center point */
    const validPlacements = radiuses.map((radius) => {
        return steps
            .map((angle) => {
                return {
                    x: radius * Math.cos(toRadians(angle)) + center.x,
                    y: radius * Math.sin(toRadians(angle)) + center.y,
                };
            })
            .filter((placement) => {
                return mineralFields.map(field => distanceAAShapes(Townhall(placement), MineralField(field)))
                    /* the magic number 3 is the minimal distance allowed from a townhall to a mineral field */
                    .every(distance => distance >= 3);
            });
    })
    // get points from the smallest radius circle that returned non-empty valid positions (this will be the closest, ofc)
    .find(spherePoints => spherePoints.length > 0);

    // get the average point (they will always be very close together... uh, in theory)
    return avgPoints(validPlacements);
}

module.exports = calculateTownhallPlacement;