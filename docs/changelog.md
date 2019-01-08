# Changelog
All notable changes to this project will be documented here.
Please note, this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- [v0.8.1 - 2019-01-08](#v081---2019-01-08)
- [v0.8.0 - 2019-01-01](#v080---2019-01-01)
- [v0.7.1 - 2018-12-17](#v071---2018-12-17)
- [v0.7.0 - 2018-12-14](#v070---2018-12-14)

## v0.8.1 - 2019-01-08
## Highlights:
Small patch to get out some important fixes
- Fixed path separator issue (thanks MrRacoon!)
- Fixed height calculation just being wrong :)
- added `chatReceieved` event (yay!)
- fixed broken footprint checks (still need to document footprints...)
- builder systems can now build pylons if you really want them to
- added a plate types group (for unbuildable plates at the base of the main ramp)

##  v0.8.0 - 2019-01-01
###  Highlights:
- Initial support for in-engine unit footprinting and placements (footprints look like: { w: number, h: number }, for instance, a mineral field would be { w: 2, h: 1 })
- Initial support for custom maps (or at least the engine shouldn't explode if it doesn't understand map topography or player configuration)
###  Added
- Initial support for unit type systems (good luck figuring it out how it works before i write docs :p)- Added some more proto api enums to the built-ins 
- MORE DEBUG COLORS! yay debugging
- Added `unitHasDisengaged` event
- Constants
  - Added a bunch of group constants for convenience: structuresTypes, flyingStructureTypes, addonTypes, constructionAbilities
  - Added WarpUnitAbility which maps a warp unit to its training ability id.

- Unit Resource enhancements
  - Added support for ALLY type units  
  - `getGasMines(filter: UnitFilter) => Unit[]`  
  - `getConstructingWorkers() => Unit[]` (workers with active building orders)  

- Unit Entity enhancements
  - `canMove() => bool`
  - `isHolding() => bool` - hold position check
  - `canShootUp() => bool`
  - `isStructure() => bool` - this is very literal
  - `isFinished() => bool` - same as filtering u.buildProgress >= 1
  - `isCombatUnit() => bool` - also pretty literal
  - `isConstructing() => bool` - same as filtering u.buildProgress < 1
  - `is(type: UnitTypeId) => bool` - same as filtering unit.unitType === UnitType.FOO
  - `data() => UnitTypeData` - retrieves the static UnitTypeData for the unit type
  - `abilityAvailable(ability: AbilityId) => bool` - checks if an ability is available this frame synchronous
  - `availableAbilities() => Array<AbilityId>` - returns all available abilities this frame, synchronous
  - `getLabel(label) => any` - alias of u.label.get(l)
  - `removeLabel(label) => bool` - alias of u.label.delete(l)
  - `hasLabel(label) => bool` - alias of u.label.has(l)
  - `addLabel(label, component: any) => Map<string: UnitTag, any>` - alias of u.label.add(l, component)
  - `toggle => Promise<SC2APIProtocol.ResponseAction>` - toggles some unit transformation, currently works for warp prism and liberator
  - `burrow => Promise<SC2APIProtocol.ResponseAction>` - currently only works on widow mines (and don't ask how to unburrow them :p)

- Map Resource enhancements
  - `isCustom() => bool`
  - `isPathable(point) => bool` 
  - `isPlaceable(point) => bool`
  - `isVisible(point) => bool`
  - `hasCreep(point) => bool`
  - `freeGasGeysers() => Unit[]`
  - `getEffects() => Effect[]`
  - `getHeight() => number`
  - `getSize() => { w: number, h: number }` (the 2DI map size)  
  - `getCenter(pathable?: boolean) => Point2D` (optionally require the closest pathable point vs absolute center) 
  - `isPlaceableAt(unitType, position) => bool` (this.. surprisingly works pretty well) 
  - Added some functions for internal graph cloning and manipulation  

- Map System enhancements
  - Initial support for calculating wall-offs `onGameStart`. Currently only attempts the natural wall. Check it out with `set DEBUG=sc2:debug:*,sc2:DrawDebugWalls` and retrieve it with map.getNatural().getWall()
  - Added effect events and effect data propegation
    - `onNewEffect`
    - `onExpiredEffect`

- Actions Resource enhancements
  - `warpIn(unitType, opts?: { nearPosition?: Point2D, maxQty?: number, highground?: boolean })`
  - `patrol(u: Unit | Unit[], p: Point2D | Point2D[], queue?: boolean )`

- Frame Resource Enhancements
  - `frame.timeInSeconds()`
  - `frame.getEffects()` (for internal use)

- DataStorage enhancements
  - `getEffectData()`
  - Added additional debugging output for new earmarks

- Debug System added!
  - Handles the state of the Debug Resource
  - try setting `DEBUG=sc2:debug:*,sc2:DebugOnScreen` :)

- System Entity enhancements
  - `pause()`
  - `unpause()`

- Agent Entity enhancements
  - `canAffordN(unitType, maxN) => number` (return the max you can afford)  

- Builder System enhancements
  - Added earmarks (so your build system can still work if other systems are being greedy)  
  - `pauseBuild()`
  - `resumeBuild()`
  - `earmarkDelay()` - adjusts how long the builder waits before earmarking the current task
  - Added on screen build debugging! try it with `set DEBUG=sc2:debug:*,sc2:debug:build`

- `utils/geometry/point` enhancements
  - `createPoint(point)` (floors a Point to an integer for cell use)
  - `createPoint2D(point)` (floors a Point2D to an integer for cell use)
  - `normalize(point)` (for vector normalization)

- `utils/geometry/angle` enhancements
  - `gridsInCircle(centerPoint, radius) => Point2D[]`, returns all map cells in a given radius

- `utils/geometry/plane` enhancements
  - `cellsInFootprint(centerPoint, footprint) => Point2D[]`, returns all Point2Ds in the footprint of a unit

- `utils/map/region` enhancements
  - `frontOfGrid` useful for basically any list of points

- Other enhancements
  - workers can now be labeled as 'stuck' if given a command over 250 frames old with no confirmation that the command could be attempted or errored

###  Changed
- Updated pathfinding dep to a fork with weight support
- Fixed the way tile height is calculated to not be terrible (it's still broken, but less broken)
- Fixed a long standing bug with the event-channel
  - events will no longer be swallowed sometimes when still having readers  

- Constants
Changes are mainly for improving consistency and behavior
  - Added `UnitTypeId`, `AbilityId`, and `UpgradeId` to the main export (these are the reverses, to get the string representation of the ids from the ids - for stuff like labels / debugging)

- Unit Resource enhancements
  - `getById`, `getBases`, and `getStructures` now take consistent filter arguments 
  - `getProductionUnits` now takes into account weirdo aliased mapped units to find producers

- Agent Entity changes
  - `canAffordUpgrade` now properly respects earmarks  
  - Allows adding systems to an agent while a game is running  
  - No longer breaks in custom maps with no well defined "player" or "enemy"  

- Builder System changes
  - `build` tasks now take an extra step to verify the thing they are building has started, to stop derps, before moving on 
  - will now warp in units with a normal `train` task  
  - robustified `ability` to support more scenarios (like terran addons)  

- Map Resource changes
  - Updated `map.path` to allow to inject your own graph weights  
  - Updated the silly `combatRally` function to adjust as you expand (still silly tho)

- Map System changes
  - Fixed exploding on 4 player maps (but still doesn't really support it quite right yet)
  - Updates pathing and placement grids on building changes

- Actions Resource changes
  - Updated `gather` balancing heuristics
  - Updated `build` to try to reuse a nearby builder
  - Updated `build` to actually work properly with weird targets
  - Finally refactored the geyser/mine functions that weren't documented anyway
  - Training a unit properly reduces locally available resources

- Engine Entity changes
  - Added back battlenetmap cache support as a fallback again (by map name if no local version found)

- Debug Resource changes
  - Completely smashed the debug resource and put it back together (a third time now...)
  - Supports creating of arbitrary spheres, lines, and cells, custom labels, heigh, position, etc  

- System Entitiy changes
  - Systems now default to type 'agent' if not specified  
  - Fixed `stepIncrement` not actually affecting anything, should work now  
  - Allow for 'late setup' of systems after game is running  
  - Expose system from wrapper via escape hatch

###  Removed
- Removed phase shifting adept unit type from combat unit types group

##  [0.7.1] - 2018-12-17
### Added
- Initial support added for LADDER MANAGER COMPATIBILITY! Yay, stay tuned for docs
- Terrain height added to map grids
- `randomCirclePoints` added to geometry angle utils (random points within a radius)
- added missing `toDegrees` to geometry angle utilities (to complement `toRadians`)
- Map resouce related features:
  - isPlaceable(point)
  - getHeight(point)
- added missing constant necessary to use chrono boosts

### Changed
- Broke and fixed the debug resource (that isn't documented and no one actually uses yet anyway)... it's almost actually useful now. Soon.
- Fixed builder to not accidentally build things where the nat townhall should go
- The `frontOfNatural` map utility actually does what it's supposed to now (undocumented currently)
- `actions.attack()` and `actions.attackMove()` now can accept a unit or array of units to add consistency
- `unitEntity#isWorker()` now actually returns true for workers of any race, including mules

##  [0.7.0] - 2018-12-14
### Added
- additional type groups added: `techLabtypes`, `reactorTypes`, `returningAbilities`, `constructionAbilities`
- `units.getUnfinished()` - like `inProgress()` but for all unfinished units
- `distanceX`, `distanceY`, and `subtract` point utilities
- `unitHasEngaged` and `unitHasSwitchedTargets` events
- `hasReactor` and `hasTechLab` unit methods
- `near` unit type requests for terran builder system
- ability to load a non-standard map without the map system exploding
- `actions.swapBuildings` added (for terran addon fun)
- `actions.smart`
- `bluebird`

### Changed
- BREAKING `actions` resource changes:
  - `do` accepts array or a single tag, opts with target of a unit or point
  - `move` now accepts a point2d or a unit as a target
- `actions.buildGasMine` now works on snapshot (but current) geysers
- `actions.gather` now works with mules
- `hasTechFor` now properly includes tech aliases
- launcher correctly ignores port being held by defunct or idle processes
- clarified some tutorial language
- robustifiered terran builder system placement decisions

### Removed
- `delay`
