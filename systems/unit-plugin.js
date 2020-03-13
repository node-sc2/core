'use strict';

const NOOP = () => {};

/**
 * @param {EventReader<System>} system 
 */
function unitPlugin(system) {
    const unitsFilter = Array.isArray(system.units) ? system.units : [system.units];
    const labelsFilter = Array.isArray(system.labels) ? system.labels : [system.labels];

    // const systemOnGameStart = system.onGameStart ? system.onGameStart.bind(system) : NOOP;
    const systemOnStep = system.onStep ? system.onStep.bind(system) : NOOP;
    const systemOnNewUnit = system.onNewUnit ? system.onNewUnit.bind(system) : NOOP;
    const systemOnUnitIdle = system.onUnitIdle ? system.onUnitIdle.bind(system) : NOOP;
    const systemOnUnitDestroyed = system.onUnitDestroyed ? system.onUnitDestroyed.bind(system) : NOOP;
    
    function unitHasLabels(unit) {
        return labelsFilter.some(label => unit.hasLabel(label));
    }

    system.onStep = async function(world) {
        const { units } = world.resources.get();
        const labeledUnits = labelsFilter.reduce((sysLabels, label) => {
            sysLabels[label] = units.withLabel(label).filter(u => u.isFinished());
            return sysLabels;
        }, {});

        const systemUnits = unitsFilter.reduce((sysUnits, unitType) =>{
            sysUnits[unitType] = units.getById(unitType)
                .filter(u => u.isFinished())
                .filter((systemUnit) => {
                    const unitTag = systemUnit.tag;
                    const labeledTags = Object.values(labeledUnits)
                        .reduce((pool, arr) => pool.concat(arr), [])
                        .map(lu => lu.tag);
                    return !labeledTags.includes(unitTag);
                });
            return sysUnits;
        }, {});

        const all = [...Object.values(systemUnits), ...Object.values(labeledUnits)].reduce((units, unit) => units.concat(unit), []);

        const data = { all, unlabeled: systemUnits, labeled: labeledUnits };
        return systemOnStep(world, data);
    };

    /**
     * Reflects the called functions to allow for `this` to be the system itself
     * (for things like, `this.state / this.setState` to work in these fns)
     * @param {Function} target 
     * @param  {...any} args 
     */
    function reflect(target, ...args) {
        return Reflect.apply(target, system, args);
    }

    const onIdleFunctions = system.idleFunctions || {};

    system.onUnitIdle = async function(world, unit) {
        const foundLabelFn = labelsFilter.find((label) => {
            if (unit.hasLabel(label)) {
                return !!onIdleFunctions[label];
            }
        });

        if (foundLabelFn) {
            return reflect(onIdleFunctions[foundLabelFn], world, unit);
        } else if (!unit.hasNoLabels() && onIdleFunctions.labeled) {
            return reflect(onIdleFunctions.labeled, world, unit, [...unit.labels.keys()][0]);
        } else if (onIdleFunctions[unit.unitType]) {
            return reflect(onIdleFunctions[unit.unitType], world, unit);
        } else {
            return systemOnUnitIdle(world, unit);
        }
    };

    system.onUnitCreated = async function(world, unit) {
        if (unitsFilter.includes(unit.unitType) || unitHasLabels(unit)) {
            return systemOnNewUnit(world, unit);
        }
    };

    system.onUnitFinished = async function(world, unit) {
        if (unitsFilter.includes(unit.unitType) || unitHasLabels(unit)) {
            return systemOnNewUnit(world, unit);
        }
    };

    system.onUnitDestroyed = async function(world, unit) {
        if (unitsFilter.includes(unit.unitType) || unitHasLabels(unit)) {
            return systemOnUnitDestroyed(world, unit);
        }
    };
}

module.exports = unitPlugin;