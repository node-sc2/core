'use strict';

const PF = require('pathfinding');
const debugWeights = require('debug')('sc2:silly:DebugWeights');
const { enums: { Alliance }, Color } = require('../constants');
const { add, distance, avgPoints, closestPoint } = require('../utils/geometry/point');
const { gridsInCircle } = require('../utils/geometry/angle');
const { cellsInFootprint } = require('../utils/geometry/plane');
const { gasMineTypes } = require('../constants/groups');
const { getFootprint } = require('../utils/geometry/units');

let combatRally;
const determinedPaths = [];

/**
 * @param {Point2D} param0 
 */
const createPoint2D = ({x, y}) => ({ x: Math.floor(x), y: Math.floor(y) });

/**
 * @param {World} world
 * @returns {MapResource}
 */
function createMapManager(world) {
    return {
        _activeEffects: [],
        _grids: {
            height: null,
            placement: null,
            pathing: null,
            miniMap: null,
        },
        _ramps: [],
        _graph: null,
        _locations: {
            self: null,
            enemy: null,
        },
        _expansions: [],
        _expansionsFromEnemy: [],
        _mapState: {
            visibility: null,
            creep: null,
        },
        _mapSize: {
            x: 0,
            y: 0,
        },
        isCustom() {
            return this._expansions.length <= 0;
        },
        isPathable(p) {
            const point = createPoint2D(p);
            return !(this._grids.pathing[point.y][point.x]);
        },
        setPathable(p, pathable = true) {
            const point = createPoint2D(p);
            this._grids.pathing[point.y][point.x] = pathable ? 0 : 1;
            this._graph.setWalkableAt(p.x, p.y, pathable);
        },
        isPlaceable(p, opts = {}) {
            const point = createPoint2D(p);

            if (opts.graph) {
                return opts.graph.isWalkableAt(point.x, point.y);
            } else {
                return !!this._grids.placement[point.y][point.x];
            }
        },
        setPlaceable(p, placeable = true) {
            const point = createPoint2D(p);
            this._grids.placement[point.y][point.x] = placeable ? 1 : 0;
            this._graph.setWalkableAt(p.x, p.y, placeable);
        },
        isVisible(p) {
            const point = createPoint2D(p);
            return !!this._mapState.visibility[point.y][point.x];
        },
        hasCreep(p) {
            const point = createPoint2D(p);
            return !!this._mapState.creep[point.y][point.x];
        },
        freeGasGeysers() {
            const { units } = world.resources.get();

            // @TODO: put this somewhere useful
            const geyserHasMine = (geyser) => {
                const gasMines = units.getByType(gasMineTypes);
                return gasMines.find(mine => distance(geyser.pos, mine.pos) < 1);
            };

            return units.getGasGeysers()
                .filter(g => units.getBases().some(b => distance(b.pos, g.pos) < 15))
                .filter(g => !geyserHasMine(g));
        },
        getMain() {
            return this._expansions[0];
        },
        getEnemyMain() {
            return this._expansionsFromEnemy[0];
        },
        getNatural() {
            return this._expansions[1];
        },
        getEnemyNatural() {
            return this._expansionsFromEnemy[1];
        },
        getThirds() {
            return [this._expansions[2], this._expansions[3]];
        },
        getEnemyThirds() {
            return [this._expansionsFromEnemy[2], this._expansionsFromEnemy[3]];
        },
        getExpansions(alliance) {
            if (alliance === Alliance.ENEMY) {
                return this._expansionsFromEnemy.slice();
            } else {
                return this._expansions.slice();
            }
        },
        getOccupiedExpansions(alliance = Alliance.SELF) {
            return this._expansions.filter((expansion) => {
                return (
                    expansion.base &&
                    !expansion.getBase().labels.has('dead') &&
                    (expansion.getBase().alliance === alliance)
                );
            });
        },
        getAvailableExpansions() {
            return this._expansions.filter((expansion) => {
                const currentBase = expansion.getBase();
                return !currentBase || currentBase.labels.has('dead');
            });
        },
        closestPathable(point, r = 3) {
            const allPathable = gridsInCircle(point, r, { normalize: true })
                .filter(p => this.isPathable(p));
            return closestPoint(point, allPathable);
        },
        /**
         * Find the closest expansion to a point
         */
        getClosestExpansion(point) {
            const startPoint = this.isPathable(point) ?
                point :
                this.closestPathable(point);

            const expansionOrder = this.getExpansions();
            const { index: closestIndex } = expansionOrder.map((expansion, i) => {
                return {
                    index: i,
                    distance: this.path(startPoint, add(expansion.townhallPosition, 3)).length,
                };
            })
            .filter(exp => exp.distance > 0)
            .sort((a, b) => a.distance - b.distance)[0];

            return expansionOrder[closestIndex];
        },
        getCreep() {
            const creepRaw = this._mapState.creep;

            return creepRaw.reduce((acc, row, y) => {
                row.forEach((pixel, x) => { 
                    if (pixel !== 0) {
                        acc.push({ x, y });
                    }
                });

                return acc;
            }, []);
        },
        getEffects() {
            return this._activeEffects;
        },
        getGrids() {
            return this._grids;
        },
        getLocations() {
            return this._locations;
        },
        getHeight(p) {
            const point = createPoint2D(p);
            return this._grids.height[point.y][point.x] / 10;
        },
        getCombatRally() {
            const numOfBases = this.getOccupiedExpansions().length;
            if (combatRally && combatRally.numOfBases === numOfBases ) return combatRally.pos;

            const mapCenter = {
                x: this._mapSize.x / 2,
                y: this._mapSize.y / 2,
            };

            const pathableNearCenter = gridsInCircle(mapCenter, 5, { normalize: true })
                .filter(p => this.isPathable(p));
            const closestPathable = closestPoint(mapCenter, pathableNearCenter);

            const naturalWall = this.getNatural().getWall();
            const avg = avgPoints(naturalWall);
            const pathableNearNat = gridsInCircle(avg, 5, { normalize: true })
                .filter(p => this.isPathable(p));
            const closestNatPathable = closestPoint(avg, pathableNearNat);

            const path = this.path(closestNatPathable, closestPathable);

            // n% of the way between fon and map center
            const multiplier = numOfBases * 0.05;
            const newPos = path[Math.floor(path.length * multiplier)];
            combatRally = {
                numOfBases,
                pos: { x: newPos[0], y: newPos[1] },
            };
            return combatRally.pos;
        },
        setActiveEffects(newEffects = []) {
            this._activeEffects = newEffects;
        },
        setMapState(newMapState){
            this._mapState = newMapState;
        },
        setLocations(locations) {
            this._locations = { ...this._locations, ...locations };
        },
        setGrids(newGrids) {
            // merging allows to update partial grids, or individual
            this._grids = { ...this._grids, ...newGrids };
        },
        setSize(mapSize) {
            this._mapSize = mapSize;
        },
        getSize() {
            return this._mapSize;
        },
        getCenter(pathable = false) {
            const absoluteCenter =  {
                x: this._mapSize.x / 2,
                y: this._mapSize.y / 2,
            };

            if (pathable) {
                const pathableSurroundingGrid = gridsInCircle(absoluteCenter, 5, { normalize: true })
                    .filter(cell => this.isPathable(cell));

                return closestPoint(absoluteCenter, pathableSurroundingGrid);
            } else {
                return absoluteCenter;
            }
        },
        newGraph(grid) {
            return new PF.Grid(this._mapSize.x, this._mapSize.y, grid);
        },
        getGraph() {
            return this._graph.clone();
        },
        setGraph(graph) {
            if (graph) {
                this._graph = graph;
            } else {
                const newGraph = new PF.Grid(this._mapSize.x, this._mapSize.y, this._grids.pathing);
                newGraph.nodes.forEach((row) => {
                    row.forEach((node) => {
                        const nonWalkableNeighbors = 8 - newGraph.getNeighbors(node, 1).length;
                        switch (nonWalkableNeighbors) {
                            case 1: {
                                node.weight = 2;
                                break;
                            }
                            case 2: {
                                node.weight = 3;
                                break;
                            }
                            case 3: {
                                node.weight = 4;
                                break;
                            }
                            case 4: {
                                node.weight = 5;
                                break;
                            }
                            case 5: {
                                node.weight = 6;
                                break;
                            }
                            case 6: {
                                node.weight = 7;
                                break;
                            }
                            case 7: {
                                node.weight = 8;
                                break;
                            }
                            case 8: {
                                node.weight = 9;
                                break;
                            }
                        }
                    });
                });

                if (debugWeights.enabled) {
                    world.resources.get().debug.setDrawCells('debugWeights', newGraph.nodes.reduce((cells, row, y) => {
                        row.forEach((node, x) => {
                            if (node.walkable && node.weight > 1) {
                                cells.push({
                                    pos: {x, y},
                                    text: `W: ${node.weight}`,
                                    color: 
                                        node.weight <= 1 ? Color.LIME_GREEN :
                                            node.weight <= 5 ? Color.YELLOW :
                                                node.weight <= 20 ? Color.ORANGE_RED :
                                                    Color.RED,
                                });
                            }
                        });

                        return cells;
                    }, []));
                }

                this._graph = newGraph;
            }
        },
        setExpansions(exps) {
            this._expansions = Object.freeze(exps);
            this._expansionsFromEnemy = Object.freeze(
                this._expansions.slice().sort((a, b) => a.pathFromEnemy.length - b.pathFromEnemy.length)
            );
        },
        setRamps(ramps) {
            this._ramps = ramps;
        },
        isPlaceableAt(unitType, pos, opts =  {}) {
            const footprint = getFootprint(unitType);
            const shapePoints = cellsInFootprint(pos, footprint);

            if (opts.graph) {
                return shapePoints.every(point => opts.graph.isWalkableAt(point.x, point.y))
            } else {
                return shapePoints.every(point => this.isPlaceable(point));
            }
            
        },
        path(start, end, opts = {}) {
            const begin = createPoint2D(start);
            const finish = createPoint2D(end);

            if (!opts.force) {
                const exists = determinedPaths.find(path => (
                    path.begin.x === begin.x &&
                    path.begin.y === begin.y &&
                    path.finish.x === finish.x &&
                    path.finish.y === finish.y
                ));

                if (exists) return exists.result;
            }

            const graphClone = opts.graph ? opts.graph.clone() : this._graph.clone();

            const finder = new PF.AStarFinder({
                allowDiagonal: opts.diagonal !== undefined ? opts.diagonal : true,
                heuristic: PF.Heuristic.mahattan,
            });

            const result = finder.findPath(begin.x, begin.y, finish.x, finish.y, graphClone);
            determinedPaths.push({ begin, finish, result });

            return result;
        },
    };
}

module.exports = createMapManager;