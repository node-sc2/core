'use strict';

const hullJs = require('hull.js');
const bresenham = require('bresenham');
const createSystem = require('./index');
const { consumeRawGrids } = require('../utils/map/grid');
const { vespeneGeyserTypes } = require('../constants/groups');
const findClusters = require('../utils/map/cluster');
const createExpansion = require('../engine/create-expansion');
const floodFill = require('../utils/map/flood');
const { distance, avgPoints, areEqual } = require('../utils/geometry/point');
const { distanceAAShapeAndPoint } = require('../utils/geometry/plane');
const { MineralField } = require('../utils/geometry/units');
const { debugGrid } = require('../utils/map/grid');
const { Alliance } = require('../constants/enums');

/**
 * @param {Point2D} param0 
 */
const createPoint2D = ({x, y}) => ({ x: Math.floor(x), y: Math.floor(y) });

/**
 * Map Engine System
 * @module system/map
 */

/**
 * 
 * @param {World} world 
 * @param {Expansion} expansion 
 */
function updateAreas(world, expansion) {
    const { map } = world.resources.get();
    const { townhallPosition: thPos, cluster: { mineralFields } } = expansion;

    const isStartingLocation = (
        // is own base
        distance(map.getLocations().self, thPos) < 5 || 
        // is enemy base
        distance(map.getLocations().enemy, thPos) < 5
    );

    //const tmpMiniMap = grids.miniMap.map(r => r.slice())
    const placementGrid = floodFill(
        map.getGrids().miniMap,
        Math.trunc(thPos.x + 3), // adding 3 to start at an x,y not occupied by the townhall
        Math.trunc(thPos.y),
        null,
        104,
        isStartingLocation ? false : 15,
    );

    const mineralLine = placementGrid
        .filter(gridPoint => {
            return mineralFields.some(field => {
                return (
                    distanceAAShapeAndPoint(MineralField(field), gridPoint) < 3.5 &&
                    distance(gridPoint, thPos) < 7
                );
            });
        });

    // expansion.mineralFieldCluster.units.forEach(field => {
    //     const sym = field.unitType === 665 ? 'm' : 'M';
    //     grid[Math.trunc(field.pos.y)][Math.trunc(field.pos.x)] = sym;
    //     grid[Math.trunc(field.pos.y)][Math.trunc(field.pos.x) - 1] = sym;
    // });

    const behindMineralLine = placementGrid
        .filter(gridPoint => {
            return mineralFields.some(field => {
                return (
                    distanceAAShapeAndPoint(MineralField(field), gridPoint) < 5 &&
                    distance(gridPoint, thPos) > 8.5
                );
            });
        });

    const areaFill = floodFill(
        map.getGrids().placement,
        Math.trunc(thPos.x),
        Math.trunc(thPos.y),
        null,
        104,
        isStartingLocation ? false : 15,
    );/* .filter((point) => {
        return !mineralLine.find(pos => pos.x === point.x && pos.y === point.y);
    }); */ // why were we doing this? The area fill should probably include the mineral line, no?

    const naiveHull = hullJs(areaFill, 1, ['.x', '.y']);

    const hull = naiveHull.reduce((acc, point, i, arr) => {
        const connector = arr[i + 1] || arr[0];
        bresenham(point.x, point.y, connector.x, connector.y, (x, y) => acc.push({x, y}));
        return acc;
    }, []);

    return {
        ...expansion,
        areas: {
            areaFill,
            hull,
            placementGrid: placementGrid.filter((point) => {
                return !mineralLine.find(pos => pos.x === point.x && pos.y === point.y);
            }),
            mineralLine,
            behindMineralLine,
        }
    };
}

/**
 * 
 * @param {World} world 
 */
function calculateExpansions(world) {
    const { units, debug, map } = world.resources.get();

    const startingLocation = map.getLocations().self;
    const mineralFields = units.getMineralFields();

    const mainBase = units.getAll(Alliance.SELF).find(u => u.isTownhall());
    const vespeneGeysers = units.getByType(vespeneGeyserTypes);

    const pathingSL = createPoint2D(startingLocation);
    pathingSL.x = pathingSL.x + 3;

    const pathingEL = createPoint2D(map.getLocations().enemy);
    pathingEL.x = pathingEL.x + 3;

    const expansions = findClusters(mineralFields)
        .map((cluster) => {
            return Object.assign(cluster,  {
                vespeneGeysers: vespeneGeysers.filter((geyser) => {
                    return distance(geyser.pos, cluster.centroid) <= 12;
                })
            });
        })
        .map(cluster => createExpansion(world, cluster))
        .map((expansion) => {
            const start = createPoint2D(expansion.townhallPosition);
            start.x = start.x + 3;

            return Object.assign(expansion, {
                pathFromMain: map.path(start, pathingSL),
                pathFromEnemy: map.path(start, pathingEL),
            });
        })
        .sort((a, b) => a.pathFromMain.length - b.pathFromMain.length)
        .map(expansion => updateAreas(world, expansion))
        .map(expansion => Object.assign(expansion, { centroid: avgPoints(expansion.areas.areaFill) }));
        
    expansions[0].base = mainBase.tag;
    
    map.setExpansions(expansions);

    debug.setRegions(expansions);
    debug.updateScreen();

    // this._expansionsFromEnemy.forEach((ex, i) => {
    //     const thPos = createPoint2D(ex.townhallPosition);
    //     map._grids.pathing[thPos.y][thPos.x] = i.toString(16);
    // });

    // map._expansions.forEach((exp) => {
    //     exp.areas.hull.forEach((hullCell) => {
    //         map._grids.miniMap[hullCell.y][hullCell.x] = 'H';
    //     });
    // });

    // path.forEach(([x, y]) => {
    //     grids.pathing[y][x] = 'P';
    // });

    // debugGrid(map._grids.miniMap);

    return expansions;
}

 /** @type {MapSystem} */
const mapSystem = {
    name: 'MapSystem',
    type: 'engine',
    async onGameStart(world) {
        const { units, frame, map } = world.resources.get();
        const { startRaw } = frame.getGameInfo();

        map.setLocations({
            self: units.getAll(Alliance.SELF).find(u => u.isTownhall()).pos,
            enemy: startRaw.startLocations[0],
        });

        map.setGrids(consumeRawGrids(startRaw));
        map.setGraph(startRaw.mapSize);

        calculateExpansions(world);
    },
    async onStep({ resources }) {
        const { frame, map } = resources.get();
        const newMapState = frame.getMapState();
        
        map._mapState = {
            ...map._mapState,
            ...newMapState,
        };
    },
    async onUnitCreated({ resources }, newUnit) {
        const { frame, map } = resources.get();

        if (!newUnit.isTownhall()) return;

        // if the 'townhall' that was just 'created' was the game starting...
        if (frame.getGameLoop() <= 8) return;

        const newExpansion = map.getExpansions().find((expansion) => {
            return areEqual(
                expansion.townhallPosition,
                map.getClosestExpansion(newUnit.pos).townhallPosition
            );
        });

        // allow for misplaced townhalls, but not macro hatches
        if (newExpansion && distance(newExpansion.townhallPosition, newUnit.pos) < 4.5) {
            newExpansion.base = newUnit.tag;
        }
    },
    async onEnemyFirstSeen({ resources }, scoutedUnit) {
        const { map } = resources.get();

        if (!scoutedUnit.isTownhall()) return;

        const enemyExpansion = map.getExpansions().find((expansion) => {
            return areEqual(
                expansion.townhallPosition,
                map.getClosestExpansion(scoutedUnit.pos).townhallPosition
            );
        });

        // allow for misplaced townhalls, but not macro hatches
        if (enemyExpansion && distance(enemyExpansion.townhallPosition, scoutedUnit.pos) < 4.5) {
            enemyExpansion.base = scoutedUnit.tag;
        }
    },

};

module.exports = createSystem(mapSystem);