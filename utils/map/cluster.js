'use strict';

const { vespeneGeyserTypes } = require('../../constants/groups');
const { add, multiply, divide, areEqual, distanceSquared, getNeighbors } = require('../geometry/point');

/**
 * Creates clusters of units by distance between them. Right now only used for expansions.
 * @param {Unit[]} units 
 * @param {number} distanceApart 
 * @returns {Cluster[]}
 */
function createClusters(units, distanceApart = 15.0) {
    const squaredDistanceApart = distanceApart * distanceApart;

    return units.reduce((clusters, u) => {
        const isGeyser = vespeneGeyserTypes.includes(u.unitType);
        /**
         * @type {{ distance: number, target: Cluster }}
         */
        const { distance, target } = clusters.reduce((acc, b) => {
            const d = distanceSquared(u.pos, b.centroid);

            if (d < acc.distance) {
                return { distance: d, target: b };
            } else {
                return acc;
            }
        }, { distance: Infinity, target: null });

        if (distance > squaredDistanceApart) {
            return clusters.concat([{
                centroid: u.pos,
                mineralFields: isGeyser ? [] : [u],
                vespeneGeysers: isGeyser ? [u] : [],
            }]);
        } else {
            if (isGeyser) {
                target.vespeneGeysers = [...target.vespeneGeysers, u];
            } else {
                target.mineralFields = [...target.mineralFields, u];
            }
            
            const size = target.mineralFields.length + target.vespeneGeysers.length;
            target.centroid = divide(add(multiply(target.centroid, (size - 1)), u.pos), size);
            return clusters;
        }
    }, []);
}

/**
 * returns a cluster set where each cluster contains neighbor chains
 * @param {Array<Point2D>} points 
 * @returns {Point2D[][]}
 */
function clusterByNeighbor(points) {
    const sorted = points.slice().sort((a, b) => {
        if (a.y < b.y) {
            return -1;
        } else if (a.y > b.y) {
            return 1;
        } else {
            if (a.x < b.x) {
                return -1;
            } else if (a.x > b.x) {
                return 1;
            } else {
                return 0;
            }
        }
    });

    const cluster = sorted.reduce((sets, point) => {
        const setContainingNeighbors = sets.find(set => set.some((setPoint) => {
            return getNeighbors(setPoint).some(spn => areEqual(spn, point));
        }));

        if (setContainingNeighbors) {
            setContainingNeighbors.push(point);
        } else {
            sets.push([point]);
        }

        return sets;
    }, []);

    return cluster;
}

module.exports = { createClusters, clusterByNeighbor };