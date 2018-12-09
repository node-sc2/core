'use strict';

const PF = require('pathfinding');
const { consumeImageData } = require('../utils/map/grid');
const { Alliance } = require('../constants/enums');
const { distance } = require('../utils/geometry/point');

/**
 * @param {Point2D} param0 
 */
const createPoint2D = ({x, y}) => ({ x: Math.floor(x), y: Math.floor(y) });

/**
 * @param {World} world
 * @returns {MapResource}
 */
function createMapManager({ resources }) {
    return {
        _grids: {
            placement: null,
            pathing: null,
            miniMap: null,
        },
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
                return this._expansionsFromEnemy;
            } else {
                return this._expansions;
            }
        },
        getOccupiedExpansions(alliance) {
            return this._expansions.filter((expansion) => {
                return (
                    expansion.base &&
                    !expansion.getBase().labels.has('dead') &&
                    (alliance ? expansion.getBase().alliance === alliance : true)
                );
            });
        },
        getAvailableExpansions() {
            return this._expansions.filter((expansion) => {
                const currentBase = expansion.getBase();
                return !currentBase || currentBase.labels.has('dead');
            });
        },
        /**
         * Find the closest expansion to a point
         */
        getClosestExpansion(point) {
            const expansionOrder = this._expansions.slice();
            const { index: closestIndex } = expansionOrder.map((expansion, i) => {
                return {
                    index: i,
                    distance: distance(expansion.townhallPosition, point),
                };
            })
            .sort((a, b) => a.distance - b.distance)[0];

            return expansionOrder[closestIndex];
        },
        getCreep() {
            const creepRaw = consumeImageData(this._mapState.creep, this._mapSize.x);

            return creepRaw.reduce((acc, row, y) => {
                row.forEach((pixel, x) => { 
                    if (pixel !== 0) {
                        acc.push({ x, y });
                    }
                });

                return acc;
            }, []);
        },
        getGrids() {
            return this._grids;
        },
        getLocations() {
            return this._locations;
        },
        
        getCombatRally() {
            const { debug } = resources.get();

            const natural = this.getNatural().townhallPosition;
            const enemyNat = this.getEnemyNatural().townhallPosition;

            const pathBetweenNaturals = this.path(natural, enemyNat);

            // 10% of the way between agent nat and enemy
            const newPos = pathBetweenNaturals[Math.floor(pathBetweenNaturals.length / 10)];
            const newPoint =  { x: newPos[0], y: newPos[1] };

            // debug.setDrawCells('armyRally', [newPoint], this._expansions[1].zPosition);
            // debug.setDrawTextWorld('rallyLabel', [{ pos: newPoint, text: 'COMBAT RALLY', color: WHITE}], this._expansions[1].zPosition);
            // debug.updateScreen();

            return newPoint;
        },
        setLocations(locations) {
            this._locations = { ...this._locations, ...locations };
        },
        setGrids(newGrids) {
            // merging allows to update partial grids, or individual
            this._grids = { ...this._grids, ...newGrids };
        },
        setGraph(map) {
            this._mapSize = map;
        
            this._graph = new PF.Grid(map.x, map.y, this._grids.pathing);
        },
        setExpansions(exps) {
            this._expansions = exps;
            this._expansionsFromEnemy = this._expansions.slice().sort((a, b) => a.pathFromEnemy.length - b.pathFromEnemy.length);
        },
        path(start, end) {
            const graphClone = this._graph.clone();

            const finder = new PF.AStarFinder({
                allowDiagonal: true,
                heuristic: PF.Heuristic.mahattan,
            });

            const begin = createPoint2D(start);
            const finish = createPoint2D(end);

            const result = finder.findPath(begin.x, begin.y, finish.x, finish.y, graphClone);

            return result;
        },
    };
}

module.exports = createMapManager;