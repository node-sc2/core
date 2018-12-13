"use strict";

const createSystem = require("./index");
const createUnit = require("../engine/create-unit");

const { Alliance } = require("../constants/enums");

/**
 * Units Engine System
 * @module system/units
 */

 /** @type {UnitSystem} */
const unitSystem = {
    name: 'UnitSystem',
    type: 'engine',
    async onGameStart(world) {
        return this.onStep(world);
    },
    /**
     * Unit event creation happens here because it's convenient, not because
     * it's necessarily the proper ownership model...
     *
     * But how else to do an entire extra clone and/or iteration just for events
     * without a large perf hit... haven't quite figured that one out yet.
     *
     * @TODO: Figure out if units should be compared to the internal data cache,
     * OR to the 'last frame' recieved, OR to some mix of both.
     * 
     * @TODO: I would also really like to add 'touched' metadata, either as a label
     * or a unit prop. This would allow for advanced user-defined events, by providing
     * an iterator of 'touched' units, along with a diff. It would be off by default
     * for perf - but initial testing shows that it would be possible to do without
     * an untenable perf hit. 
     */
    async onStep(world) {
        const { events, units, frame } = world.resources.get();

        const { rawData: { units: rawUnits } } = frame.getObservation();

        const isFinished = (incData, currentUnit) => {
            return (
                incData.alliance === Alliance.SELF &&
                incData.buildProgress >= 1 &&
                currentUnit.buildProgress < 1
            );
        };

        const isIdle = (incData, currentUnit) => {
            return incData.orders.length <= 0 && !currentUnit.noQueue;
        };

        /**
         * Test for unit being damaged last frame
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const isDamaged = (incData, currentUnit) => {
            return (
                incData.shield < currentUnit.shield ||
                incData.health < currentUnit.health
            );
        };

        /**
         * Test for unit entering a skirmish
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const hasEngaged = (incData, currentUnit) => {
            return (
                currentUnit.engagedTargetTag === '0' &&
                incData.engagedTargetTag !== '0'
            );
        };

        /**
         * Test for unit switching targets
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const hasSwitchedTargets = (incData, currentUnit) => {
            return (
                currentUnit.engagedTargetTag !== '0' &&
                currentUnit.engagedTargetTag !== incData.engagedTargetTag
            );
        };

        rawUnits.forEach(unitData => {
            // unit tag from frame exists in the internal store
            if (units._units[unitData.alliance].has(unitData.tag)) {
                const currentUnit = units._units[unitData.alliance].get(unitData.tag);
                if (isFinished(unitData, currentUnit)) {
                    events.write({
                        name: "unitFinished",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (isIdle(unitData, currentUnit)) {
                    events.write({
                        name: "unitIdle",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (hasEngaged(unitData, currentUnit)) {
                    events.write({
                        name: "unitHasEngaged",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (hasSwitchedTargets(unitData, currentUnit)) {
                    events.write({
                        name: "unitHasSwitchedTargets",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (
                    unitData.alliance === Alliance.SELF &&
                    isDamaged(unitData, currentUnit)
                ) {
                    events.write({
                        name: "unitDamaged",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                currentUnit.update(unitData);

                // unit tag has never been seen before
            } else {
                const newUnit = createUnit(unitData, world);

                if (unitData.alliance === Alliance.SELF) {
                    events.write({
                        name: "unitCreated",
                        data: newUnit,
                        type: 'all',
                    });
                } else if (unitData.alliance === Alliance.ENEMY) {
                    events.write({
                        name: "enemyFirstSeen",
                        data: newUnit,
                        type: 'all',
                    });
                }

                units._units[unitData.alliance].set(unitData.tag, newUnit);
            }
        });
    },
};

module.exports = createSystem(unitSystem);
