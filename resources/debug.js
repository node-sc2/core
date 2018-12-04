"use strict";

// eslint-disable-next-line
const { WHITE, RED, GREEN, YELLOW, BLUE, TEAL, PURPLE, BLACK, GRAY } = require('../constants/color');

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
            // const debugCommands = Object.values(commands).reduce((commands, command) => {
            //     return commands.concat(command);
            // }, []);

            //return _client.debug({ debug: debugCommands });
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
                                min: { x: point.x, y: point.y , z: expansion.zPosition },
                                max: { x: point.x + 0.5, y: point.y + 0.5, z: expansion.zPosition + 0.03 },
                            };
                        }),
                        ...expansion.areas.behindMineralLine.map((point) => {
                            return {
                                color: RED,
                                min: { x: point.x, y: point.y, z: expansion.zPosition },
                                max: { x: point.x + 0.5, y: point.y + 0.5, z: expansion.zPosition + 0.02 },
                            };
                        }),
                        ...expansion.areas.areaFill.map((point) => {
                            return {
                                color: BLACK,
                                min: { x: point.x, y: point.y, z: expansion.zPosition },
                                max: { x: point.x + 0.5, y: point.y + 0.5, z: expansion.zPosition + 0.01 },
                            };
                        })
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
        setDrawCells(id, cPoints, zPos, color) {
            if (cPoints.length > 0) {
                commands[id] = [{
                    draw: {
                        boxes: cPoints.map((cPoint) => {
                            return {
                                color: color || TEAL,
                                min: { x: cPoint.x, y: cPoint.y, z: cPoint.z || zPos },
                                max: { x: cPoint.x + 0.5, y: cPoint.y + 0.5, z: cPoint.z || zPos + 0.1 },
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
                                p: { x: cPoint.x, y: cPoint.y, z: cPoint.z || zPos },
                                r: 1.25,
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