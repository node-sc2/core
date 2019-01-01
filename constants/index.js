'use strict';

const AbilitiesByUnit = require('./unit-ability-map');
const Ability = require('./ability');
const Color = require('./color');
const enums = require('./enums');
const groups = require('./groups');
const UnitType = require('./unit-type');
const Upgrade = require('./upgrade');

const UnitTypeId = Object.entries(UnitType).reduce((UnitTypeId, [unitType, unitTypeId]) => {
    UnitTypeId[unitTypeId] = unitType;
    return UnitTypeId;
}, {});

const AbilityId = Object.entries(Ability).reduce((AbilityId, [ability, abilityId]) => {
    AbilityId[abilityId] = ability;
    return AbilityId;
}, {});

const UpgradeId = Object.entries(Upgrade).reduce((UpgradeId, [upgrade, upgradeId]) => {
    UpgradeId[upgradeId] = upgrade;
    return UpgradeId;
}, {});

const WarpUnitAbility = {
    [UnitType.ZEALOT]: Ability.TRAINWARP_ZEALOT,
    [UnitType.STALKER]: Ability.TRAINWARP_STALKER,
    [UnitType.SENTRY]: Ability.TRAINWARP_SENTRY,
    [UnitType.ADEPT]: Ability.TRAINWARP_ADEPT,
    [UnitType.HIGHTEMPLAR]: Ability.TRAINWARP_HIGHTEMPLAR,
    [UnitType.DARKTEMPLAR]: Ability.TRAINWARP_DARKTEMPLAR,
};

module.exports = {
    Ability,
    AbilityId,
    AbilitiesByUnit,
    Color,
    enums,
    groups,
    UnitType,
    UnitTypeId,
    Upgrade,
    UpgradeId,
    WarpUnitAbility,
};
