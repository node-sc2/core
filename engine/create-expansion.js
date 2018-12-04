'use strict';

const { Alliance } = require('../constants/enums');
const townhallPlacement = require('../utils/map/townhall');

/**
 * @param {World} world
 * @param {Cluster} cluster
 * @returns {Expansion}
 */

function createExpansion(world, cluster) {
    const { units } = world.resources.get();

    return {
        cluster,
        labels: new Map(),
        zPosition: cluster.mineralFields[0].pos.z,
        townhallPosition: townhallPlacement(cluster.centroid, cluster.mineralFields),
        getBase() {
            if (this.base) {
                return units.getByTag(this.base);
            }
        },
        getAlliance() {
            if (this.base) {
                const base = units.getByTag(this.base);
                return base.labels.has('dead') ? Alliance.NEUTRAL : base.alliance;
            } else {
                return Alliance.NEUTRAL;
            }
        },
    };
}

module.exports = createExpansion;