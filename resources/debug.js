"use strict";

// eslint-disable-next-line
const colors = require('../constants/color');
const { WHITE, RED, GREEN, YELLOW, BLUE, TEAL, PURPLE, BLACK, GRAY } = colors;
const getRandom = require('../utils/get-random');

/**
 * @param {World} world
 * @returns {Debugger}
 */
function createDebugger(world) {
    /** @type {{ [key: string]: SC2APIProtocol.DebugCommand[] }} */
    let commands = {};

    return {
        updateScreen() {
            const { actions: { _client } } = world.resources.get();

            if (process.env.DEBUG) {
                const debugCommands = Object.values(commands).reduce((commands, command) => {
                    return commands.concat(command);
                }, []);
                return _client.debug({ debug: debugCommands });
            }

            return _client.debug({ debug: [] });
        },
        removeCommand(id) {
            const { [id]: ignored, ...commandsToKeep } = commands;
            commands = commandsToKeep;
        },
        setRegions(expansions) {
            commands.regions = expansions.map((expansion) => ({
                draw: {
                    text: expansions.map((expansion, i) => {
                        return {
                            color: RED,
                            text: `DISTANCE ORDER ${i} \n COORDS ${JSON.stringify(expansion.townhallPosition)}`,
                            worldPos: { ...expansion.townhallPosition, z: expansion.zPosition + 3 },
                        };
                    }),
                    boxes: [
                        ...expansion.areas.mineralLine.map((point) => {
                            return {
                                color: GREEN,
                                min: { x: point.x + 0.25, y: point.y + 0.25 , z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.03 },
                            };
                        }),
                        ...expansion.areas.behindMineralLine.map((point) => {
                            return {
                                color: RED,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.02 },
                            };
                        }),
                        ...expansion.areas.areaFill.map((point) => {
                            return {
                                color: BLACK,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.01 },
                            };
                        }),
                        ...expansion.areas.hull.map((point) => {
                            return {
                                color: YELLOW,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.04 },
                            };
                        }),
                    ],
                    spheres: [
                        {
                            color: PURPLE,
                            p: { ...expansion.townhallPosition, z: expansion.zPosition + 0.1 },
                            r: 2.75,
                        },
                        {
                            color: GREEN,
                            p: { ...expansion.centroid, z: expansion.zPosition + 0.1 },
                            r: 1,
                        },
                    ],
                }
            }));
        },
        setDrawCells(id, cPoints, zPos, opts = {}) {
            const color = opts.color || getRandom(Object.values(colors));
            if (cPoints.length > 0) {
                commands[id] = [{
                    draw: {
                        boxes: cPoints.map((cPoint) => {
                            const zpos = zPos || cPoint.z;
                            return {
                                color,
                                min: { x: cPoint.x + 0.25, y: cPoint.y + 0.25, z: zpos },
                                max: { x: cPoint.x + 0.75, y: cPoint.y + 0.75, z: zpos + (opts.size || 0.5) },
                            };
                        })
                    }
                }];
            }
        },
        setDrawSpheres(id, cPoints, zPos, color) {
            if (cPoints.length > 0) {
                commands[id] = [{
                    draw: {
                        spheres: cPoints.map((cPoint) => {
                            return {
                                color: color || YELLOW,
                                p: { x: cPoint.x + 0.25, y: cPoint.y + 0.75, z: cPoint.z || zPos },
                                r: 0.5,
                            };
                        })
                    }
                }];
            }

        },
        setDrawTextWorld(id, wPoints, zpos) {
            if (wPoints.length > 0) {
                commands[id] = [{
                    draw: {
                        text: wPoints.map((wPoint) => {
                            return {
                                color: WHITE,
                                text: wPoint.text,
                                worldPos: { ...wPoint.pos, z: zpos },
                            };
                        }),
                    }
                }];
            }
        },
        setDrawTextScreen() {

        },
    };
}



module.exports = createDebugger;