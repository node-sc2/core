'use strict';

const { Alliance } = require('../constants/enums');
const { townhallTypes } = require('../constants/groups');
const { GasMineRace, WorkerRace } = require('../constants/race-map');

/**
 * Unit factory - exclusively for UnitManager use
 * @param {SC2APIProtocol.Unit} unitData 
 * @param {World} world 
 * @returns {Unit}
 */
function createUnit(unitData, { agent, resources }) {
    const { frame } = resources.get();

    const { alliance } = unitData;

    const blueprint = {
        tag: unitData.tag,
        labels: new Map(),
        lastSeen: frame.getGameLoop(),
        noQueue: unitData.orders.length === 0,
        isTownhall() {
            return townhallTypes.includes(this.unitType);
        },

        isWorker() {
            return WorkerRace[agent.race] === this.unitType;
        },

        isGasMine() {
            return GasMineRace[agent.race] === this.unitType;
        },
        isCurrent() {
            // if this unit wasn't updated this frame, this will be false
            return this.lastSeen === frame.getGameLoop();
        },
        update(unit) {
            Object.assign(this, unit, {
                noQueue: unit.orders.length === 0,
                lastSeen: frame.getGameLoop(),
            });

            /**
             * so this is a perf thing - depending on the version of node it actually
             * made a pretty big difference... but as of v10 it seems okay? keeping
             * for posterity -
             * 
             * this.displayType = unit.displayType;
             * this.alliance = unit.alliance;
             * this.unitType = unit.unitType;
             * this.owner = unit.owner;
             * this.pos = unit.pos;
             * this.facing = unit.facing;
             * this.radius = unit.radius;
             * this.buildProgress = unit.buildProgress;
             * this.cloak = unit.cloak;
             * this.detectRange = unit.detectRange;
             * this.radarRange = unit.radarRange;
             * this.isSelected = unit.isSelected;
             * this.isOnScreen = unit.isOnScreen;
             * this.isBlip = unit.isBlip;
             * this.isPowered = unit.isPowered;
             * this.health = unit.health;
             * this.healthMax = unit.healthMax;
             * this.shield = unit.shield;
             * this.shieldMax = unit.shieldMax;
             * this.energy = unit.energy;
             * this.energyMax = unit.energyMax;
             * this.mineralContents = unit.mineralContents;
             * this.vespeneContents = unit.vespeneContents;
             * this.isFlying = unit.isFlying;
             * this.isBurrowed = unit.isBurrowed;
             * this.orders = unit.orders;
             * this.addOnTag = unit.addOnTag;
             * this.passengers = unit.passengers;
             * this.cargoSpaceTaken = unit.cargoSpaceTaken;
             * this.cargoSpaceMax = unit.cargoSpaceMax;
             * this.buffIds = unit.buffIds;
             * this.assignedHarvesters = unit.assignedHarvesters;
             * this.idealHarvesters = unit.idealHarvesters;
             * this.weaponCooldown = unit.weaponCooldown;
             * this.engagedTargetTag = unit.engagedTargetTag;
             * this.noQueue = unit.orders.length === 0;
             * this.lastSeen = frame.getGameLoop();
             */
        },
    };

    // i promise there's a reason for this that one day i'll figure out
    switch(alliance) {
        case Alliance.ALLY:
        case Alliance.SELF: {
            return {
                ...unitData,
                ...blueprint,
                
            };
        }
        case Alliance.ENEMY: {
            return {
                ...unitData,
                ...blueprint,
            };
        }
        case Alliance.NEUTRAL: {
            return {
                ...unitData,
                ...blueprint,
            };
        }
        default: {
            throw new Error('CANT CREATE A UNIT WITH NO ALLIANCE, THIS SHOULD NEVER HAPPEN');
        }
    }
}

module.exports = createUnit;