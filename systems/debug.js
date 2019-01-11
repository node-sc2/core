'use strict';

const silly = require('debug')('sc2:silly:DebugSystem');
const debugDebug = require('debug')('sc2:debug:DebugSystem');
const debugOnScreen = require('debug')('sc2:DebugOnScreen');
const createSystem = require('./create-system');
const {
    Color,
    UnitTypeId,
    enums: { Alliance, AllianceId }
} = require('../constants');

module.exports = createSystem({
    name: 'DebugSystem',
    type: 'engine',
    defaultOptions: {
        state: {
            debug: debugDebug.enabled,
            unitsLost: {},
            debugOnScreen: debugOnScreen.enabled,
        },
        stepIncrement: 1,
    },
    async onUnitDestroyed(world, deadUnit) {
        if (!this.state.unitsLost[deadUnit.alliance]) {
            this.state.unitsLost[deadUnit.alliance] = {};
        }

        if (!this.state.unitsLost[deadUnit.alliance][deadUnit.unitType]) {
            this.state.unitsLost[deadUnit.alliance][deadUnit.unitType] = 0;
        }

        this.setState({
            unitsLost: {
                ...this.state.unitsLost,
                [deadUnit.alliance]: {
                    ...this.state.unitsLost[deadUnit.alliance],
                    [deadUnit.unitType]: this.state.unitsLost[deadUnit.alliance][deadUnit.unitType] += 1,
                },
            },
        });
    },
    async onStep({ data, resources }) {
        const { debug, units } = resources.get();

        if (this.state.debugOnScreen) {
            const ownUnits = units.getAlive(Alliance.SELF);

            const totalOwnUnits = ownUnits.reduce((totalUnits, u) => {
                const isWorker = u.isWorker();

                const isUnit = (
                    (u.isCombatUnit()) ||
                    (u.data().foodRequired > 0) ||
                    (
                        (u.data().foodProvided > 0) &&
                        (u.canMove())
                    )
                );

                const isStructure = (
                    (u.data().foodRequired <= 0) &&
                    (u.isStructure())
                );

                if (isWorker) {
                    if (totalUnits.Workers[u.unitType]) {
                        totalUnits.Workers[u.unitType] += 1;
                    } else {
                        totalUnits.Workers[u.unitType] = 1;
                    }
                } else if (isUnit) {
                    if (totalUnits.Units[u.unitType]) {
                        totalUnits.Units[u.unitType] += 1;
                    } else {
                        totalUnits.Units[u.unitType] = 1;
                    }
                } else if (isStructure) {
                    if (totalUnits.Buildings[u.unitType]) {
                        totalUnits.Buildings[u.unitType] += 1;
                    } else {
                        totalUnits.Buildings[u.unitType] = 1;
                    }
                }

                return totalUnits;
            }, { Units: {}, Buildings: {}, Workers: {} });

            const text = Object.keys(totalOwnUnits).map((category) => {
                const heading = `Own ${category}:\n`;
                const data = Object.entries(totalOwnUnits[category]).map(([ut, n]) => `${n}x - ${UnitTypeId[ut]}`).join('\n');
                return heading + data;
            });

            debug.setDrawTextScreen('ownUnitTypes', [{
                size: 12,
                color: Color.FIREBRICK,
                pos: { x: 0.005, y: 0.01 },
                text: text.join('\n\n'),
            }]);

            debug.setDrawTextScreen('unitsLost', [{
                size: 12,
                color: Color.FIREBRICK,
                pos: { x: 0.1, y: 0.01 },
                text: Object.keys(this.state.unitsLost).map((alliance) => {
                    const heading = `${AllianceId[alliance]} Units Lost:\n`;
                    const data = Object.entries(this.state.unitsLost[alliance]).map(([ut, n]) => {
                        return `${n}x - ${UnitTypeId[ut]}`;
                    }).join('\n');
                    return heading + data;
                }).join('\n\n'),
            }]);

            debug.setDrawTextScreen('earmarks', [{
                size: 12,
                color: Color.AQUA,
                pos: { x: 0.005, y: 0.3 },
                // eslint-disable-next-line
                text: 'Current Earmarks\n' + data.get('earmarks').map((earmark) => {
                    return `${earmark.name}: ${earmark.minerals}m, ${earmark.vespene}v`;
                }).join('\n')
            }]);
        }

        if (this.state.debug) {
            if (debug.touched) {
                await debug.updateScreen();
            }

            debug.touched = false;
        }
    },
});
