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
        const { events, units, frame, actions } = world.resources.get();

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
         * Test for a unit transforming type
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const isTransforming = (incData, currentUnit) => {
            return currentUnit.unitType !== incData.unitType;
        };

        /**
         * Test for a unit finishing a burrow
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const hasBurrowed = (incData, currentUnit) => {
            return incData.isBurrowed && !currentUnit.isBurrowed;
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
         * Test for unit exiting a skirmish
         * @param {SC2APIProtocol.Unit} incData
         * @param {Unit} currentUnit
         */
        const hasDisengaged = (incData, currentUnit) => {
            return (
                currentUnit.engagedTargetTag !== '0' &&
                incData.engagedTargetTag === '0'
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

                    // the unit is finished, but it's also idle
                    if (unitData.orders.length > 0) {
                        events.write({
                            name: "unitIdle",
                            data: currentUnit,
                            type: 'all',
                        });
                    }
                }

                if (isIdle(unitData, currentUnit)) {
                    events.write({
                        name: "unitIdle",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (isTransforming(unitData, currentUnit)) {
                    events.write({
                        name: "unitIsTransforming",
                        data: currentUnit,
                        type: 'all',
                    });
                }

                if (hasBurrowed(unitData, currentUnit)) {
                    events.write({
                        name: "unitHasBurrowed",
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

                if (hasDisengaged(unitData, currentUnit)) {
                    events.write({
                        name: "unitHasDisengaged",
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

                    // if it's unrallied, then it's also idle
                    if (unitData.orders.length > 0) {
                        events.write({
                            name: "unitIdle",
                            data: newUnit,
                            type: 'all',
                        });
                    }
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

        const ownUnitTags = Array.from(units._units[Alliance.SELF].keys());
        return actions.sendQuery({
            abilities: ownUnitTags.map(tag => ({
                unitTag: tag,
            })),
        }).then((res) => {
            res.abilities.forEach((abilObj) => {
                const unit = units._units[Alliance.SELF].get(abilObj.unitTag);
                unit._availableAbilities = abilObj.abilities.map(a => a.abilityId);
                units._units[Alliance.SELF].set(abilObj.unitTag, unit);
            });
        });
    },
};

module.exports = createSystem(unitSystem);
