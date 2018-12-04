"use strict";

const debugEarmark = require('debug')('sc2:debug:earmark');
const { AbilitiesByUnit } = require('../constants');

/**
 * @returns {DataStorage & Map}
 */
function createDataManager() {

    const data = new Map([
        ['earmarks', []],
        ['abilities', null],
        ['units', null],
        ['upgrades', null],
        ['buffs', null],
        ['effects', null],
    ]);

    const StorageBlueprint = {
        register(name, fn) {
            this[name] = fn;
        },
        findUnitTypesWithAbility(abilityId) {
            return Object.entries(AbilitiesByUnit)
                .filter(([ignored, abilities]) => {
                    return abilities.some(ability => ability === abilityId);
                })
                .map(unitAbility => parseInt(unitAbility[0], 10));
        },
        getUnitTypeData(unitTypeId) {
            return this.get('units')[unitTypeId];
        },
        getUpgradeData(upgradeId) {
            return this.get('upgrades')[upgradeId];
        },
        getAbilityData(abilityId) {
            return this.get('abilities')[abilityId];
        },
        mineralCost(unitTypeId) {
            return this.getUnitTypeData(unitTypeId).mineralCost;
        },
        addEarmark(earmark) {
            const earmarks = this.get('earmarks');

            const exists = earmarks.find(em => em.name === earmark.name);

            if (exists) {
                return earmarks;
            } else {
                return this.set('earmarks', [ ...earmarks, earmark ]);
            }
            
        },
        getEarmarkTotals(earmarkName) {
            const total = this.get('earmarks').filter(em => em.name !== earmarkName).reduce((totals, em) => {
                return { minerals: totals.minerals + em.minerals, vespene: totals.vespene + em.vespene };
            }, { minerals: 0, vespene: 0});

            return total;
        },
        settleEarmark(earmarkName) {
            const newEarmarks = this.get('earmarks').filter(em => em.name !== earmarkName);

            this.set('earmarks', newEarmarks);
            return this.get('earmarks');
        },
    };

    /** @type {DataStorage} */
    const dataMap = Object.assign(data, StorageBlueprint);
    
    return dataMap;
}

module.exports = createDataManager;
