'use strict';

function circleCenterFromPoints(A, B, C) {
    const yDelta_a = B.y - A.y;
    const xDelta_a = B.x - A.x;
    const yDelta_b = C.y - B.y;
    const xDelta_b = C.x - B.x;

    const aSlope = yDelta_a / xDelta_a;
    const bSlope = yDelta_b / xDelta_b;

    const center = {
        x: (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + B.x) - aSlope * (B.x + C.x)) / (2 * (bSlope - aSlope)),
    };

    center.y = -1 * (center.x - (A.x + B.x) / 2) / aSlope + (A.y + B.y) / 2;
    
    return center;
}

/**
 * AA = Axis Aligned, distance from AA shape to AA shape
 * @param {{ pos: Point2D, w, h }} shapeA AA shape A
 * @param {{ pos: Point2D, w, h }} shapeB AA shape B
 */
function distanceAAShapes(shapeA, shapeB) {
    const dx = Math.max(Math.abs(shapeA.pos.x - shapeB.pos.x) - ((shapeA.w / 2) + (shapeB.w / 2)), 0);
    const dy = Math.max(Math.abs(shapeA.pos.y - shapeB.pos.y) - ((shapeA.h / 2) + (shapeB.h / 2)), 0);
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * AA = Axis Aligned, distance from point to AA shape
 * @param {{ pos: Point2D, w, h }} shape AA Shape
 * @param {Point2D} point map position
 */
function distanceAAShapeAndPoint(shape, point) {
    const dx = Math.max(Math.abs(shape.pos.x - point.x) - (shape.w / 2), 0);
    const dy = Math.max(Math.abs(shape.pos.y - point.y) - (shape.h / 2), 0);
    return Math.sqrt(dx * dx + dy * dy);
}

module.exports = { circleCenterFromPoints, distanceAAShapes, distanceAAShapeAndPoint };