"use strict";

// eslint-disable-next-line
const Color = require('../constants/color');
const getRandom = require('../utils/get-random');
const { add, createPoint2D } = require('../utils/geometry/point');

/**
 * @param {World} world
 * @returns {Debugger}
 */
function createDebugger(world) {
    /** @type {{ [key: string]: SC2APIProtocol.DebugCommand[] }} */
    let commands = {};
    let tempCommands = {};

    return {
        touched: false,
        updateScreen() {
            const { actions: { _client } } = world.resources.get();

            const debugCommands = Object.values(commands).reduce((commands, command) => {
                return commands.concat(command);
            }, []);

            const debugTempCommands = Object.values(tempCommands).reduce((commands, command) => {
                return commands.concat(command);
            }, []);

            tempCommands = {};
            return _client.debug({ debug: debugCommands.concat(debugTempCommands) });
        },
        removeCommand(id) {
            this.touched = true;
            const textId = `${id}-text-0`;
            const { [id]: ignored, [textId]: ignored2, ...commandsToKeep } = commands;
            commands = commandsToKeep;
        },
        setRegions(expansions) {
            this.touched = true;
            commands.regions = expansions.map((expansion) => ({
                draw: {
                    text: expansions.map((expansion, i) => {
                        return {
                            color: Color.RED,
                            text: `DISTANCE ORDER ${i} \n COORDS ${JSON.stringify(expansion.townhallPosition)}`,
                            worldPos: { ...expansion.townhallPosition, z: expansion.zPosition + 3 },
                        };
                    }),
                    boxes: [
                        ...expansion.areas.mineralLine.map((point) => {
                            return {
                                color: Color.GREEN,
                                min: { x: point.x + 0.25, y: point.y + 0.25 , z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.03 },
                            };
                        }),
                        ...expansion.areas.behindMineralLine.map((point) => {
                            return {
                                color: Color.RED,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.02 },
                            };
                        }),
                        ...expansion.areas.areaFill.map((point) => {
                            return {
                                color: Color.BLACK,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.01 },
                            };
                        }),
                        ...expansion.areas.hull.map((point) => {
                            return {
                                color: Color.YELLOW,
                                min: { x: point.x + 0.25, y: point.y + 0.25, z: expansion.zPosition },
                                max: { x: point.x + 0.75, y: point.y + 0.75, z: expansion.zPosition + 0.04 },
                            };
                        }),
                    ],
                    spheres: [
                        {
                            color: Color.PURPLE,
                            p: { ...expansion.townhallPosition, z: expansion.zPosition + 0.1 },
                            r: 2.75,
                        },
                        {
                            color: Color.GREEN,
                            p: { ...expansion.centroid, z: expansion.zPosition + 0.1 },
                            r: 1,
                        },
                    ],
                }
            }));
        },
        setDrawLines(id, wLines, opts = {}) {
            this.touched = true;
            const defaultColor = opts.color || getRandom(Object.values(Color));
            const skipText = opts.includeText !== undefined && !opts.includeText;
            if (wLines.length > 0) {
                commands[id] = [{
                    draw: {
                        lines: wLines.map((wLine, i) => {
                            const { p0, p1 } = wLine;
                            p0.z = (opts.zPos || p0.z || world.resources.get().map.getHeight(p0)) + 0.01;
                            p1.z = (opts.zPos || p1.z || world.resources.get().map.getHeight(p1)) + 0.01;

                            if (!skipText) {
                                this.setDrawTextWorld(`${id}-text-${i}`, [{
                                    color: wLine.color || defaultColor,
                                    text: `${id}-${i}`,
                                    pos: {
                                        x: ((p0.x + p1.x) / 2) - 0.5,
                                        y: ((p0.y + p1.y) / 2) + 0.5 ,
                                    },
                                }]);
                            }

                            return {
                                color: wLine.color || defaultColor,
                                line: { p0, p1 },
                            };
                        })
                    }
                }];
            }
        },
        setDrawCells(id, cells, opts = {}) {
            this.touched = true;
            const skipText = opts.includeText !== undefined && !opts.includeText;
            const defaultColor = opts.color || getRandom(Object.values(Color));
            if (cells.length > 0) {
                commands[id] = [{
                    draw: {
                        boxes: cells.map((cell, i) => {
                            const { pos } = cell;

                            const color = cell.color || defaultColor;
                            const size = 1 - (cell.size || opts.size || 0.8);
                            const zPos = opts.zPos || pos.z || world.resources.get().map.getHeight(createPoint2D(pos));
                            const height = opts.height ? opts.height : opts.cube ? 1 - size : 0.02;

                            if (!skipText) {
                                this.setDrawTextWorld(`${id}-text-${i}`, [{
                                    pos,
                                    color,
                                    text: cell.text ? `${cell.text}` : `${id}-${i}`,
                                }], {
                                    temp: opts.persistText ? false : true,
                                });
                            }

                            return {
                                color,
                                min: { x: pos.x + (size / 2), y: pos.y + (size / 2), z: zPos },
                                max: { x: pos.x + (1 - (size / 2)), y: pos.y + (1 - (size / 2)), z: zPos + height },
                            };
                        })
                    }
                }];
            }
        },
        setDrawSpheres(id, spheres, opts = {}) {
            this.touched = true;
            const skipText = opts.includeText !== undefined && !opts.includeText;
            const setter = opts.temp ? tempCommands : commands;
            if (spheres.length > 0) {
                setter[id] = [{
                    draw: {
                        spheres: spheres.map((wSphere, i) => {
                            const { pos } = wSphere;
                            const zPos = opts.zPos || pos.z || world.resources.get().map.getHeight(wSphere.pos);

                            if(!skipText) {
                                this.setDrawTextWorld(`${id}-text-${i}`, [{
                                    pos: add(pos, 0.25),
                                    text: wSphere.text ? `${wSphere.text}` : `${id}-${i}`,
                                }],{
                                    temp: opts.persistText ? false : true,
                                });
                            }
                            
                            return {
                                color: wSphere.color || opts.color || getRandom(Object.values(Color)),
                                p: { x: pos.x, y: pos.y, z: zPos + 0.01 },
                                r: wSphere.size || opts.size || 0.5,
                            };
                        })
                    }
                }];
            }
        },
        setDrawTextWorld(id, texts, opts = {}) {
            this.touched = true;
            const setter = opts.temp ? tempCommands : commands;
            if (texts.length > 0) {
                setter[id] = [{
                    draw: {
                        text: texts.map((wText) => {
                            const color = wText.color || Color.WHITE;
                            const zPos = opts.zPos || wText.pos.z || world.resources.get().map.getHeight(createPoint2D(wText.pos));
                            return {
                                color,
                                size: opts.size,
                                text: wText.text,
                                worldPos: { ...wText.pos, z: zPos },
                            };
                        }),
                    }
                }];
            }
        },
        setDrawTextScreen(id, texts, opts = {}) {
            this.touched = true;
            if (texts.length > 0) {
                commands[id] = [{
                    draw: {
                        text: texts.map((vText) => {
                            const color = vText.color || opts.color || Color.FIREBRICK;
                            const zPos = opts.zPos || vText.pos.z;
                            return {
                                color,
                                size: vText.size || opts.size || 8,
                                text: vText.text,
                                virtualPos: { ...vText.pos, z: zPos || undefined },
                            };
                        }),
                    }
                }];
            }
        },
    };
}



module.exports = createDebugger;