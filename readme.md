# node-sc2
`node-sc2` is a lightweight node.js framework to facilitate fast development of agents (or "bots") for Starcraft II in JavaScript.

<!-- TOC -->

- [Motivation](#motivation)
- [Getting started](#getting-started)
    - [Hello World](#hello-world)
- [Overview and Tutorial](#overview-and-tutorial)
- [Notice of Active Development](#notice-of-active-development)
- [Contributing](#contributing)
- [Ladder and Tournament Submission](#ladder-and-tournament-submission)
- [Features and Roadmap](#features-and-roadmap)
- [Environmental Variables](#environmental-variables)
    - [Speed Control](#speed-control)
    - [Debugging](#debugging)
- [Getting Help](#getting-help)
- [Changelog](#changelog)
    - [[0.8.0] - 2019-01-01](#080---2019-01-01)
    - [[0.7.1] - 2018-12-17](#071---2018-12-17)
    - [[0.7.0] - 2018-12-14](#070---2018-12-14)

<!-- /TOC -->

### Motivation
There are a few existing libraries in the node.js ecosystem to work with the C++ API ([sc2client-api](https://github.com/Blizzard/s2client-api)), but `node-sc2` is a pure javascript implementation of [sc2client-proto](https://github.com/Blizzard/s2client-proto), with the goal of being ergonomic across a variety of environments without the need for additional build tools. Under the hood it uses [`@node-sc2/proto`](https://github.com/node-sc2/proto#readme) as the transport layer.

### Getting started
`npm install --save @node-sc2/core`

You must also have any maps you expect to load available in the standard location (`/Maps` relative to your SC2 directory). Official map downloads can be found [here](https://github.com/Blizzard/s2client-proto#map-packs). For a more up-to-date pack of maps, join the SC2 AI discord (https://discord.gg/Emm5Ztz) and type !maps in #general.

#### Hello World
The 'hello world' of sc2 bots seems to be a worker rush, so... here we go:
```js
// main.js
const { createAgent, createEngine, createPlayer } = require('@node-sc2/core');
const { Difficulty, Race } = require('@node-sc2/core/constants/enums');

const bot = createAgent({
    onGameStart({ resources }) {
        const { units, actions, map } = resources.get();

        const workers = units.getWorkers();
        return actions.attackMove(workers, map.getEnemyMain().townhallPosition);
    }
});

const engine = createEngine();

engine.connect().then(() => {
    return engine.runGame('Blueshift LE', [
        createPlayer({ race: Race.RANDOM }, bot),
        createPlayer({ race: Race.RANDOM, difficulty: Difficulty.MEDIUM }),
    ]);
});
```

Now you can run it with `node main.js`. Wasn't that easy? Now this isn't going to win you any awards... but it might win you a few games against the built-in AI.

**NOTE**: The first time you run the bot, it will take up to 15 seconds to launch the SC2 client. After that, the default behavior is to keep the client running, so starting a new game will take only a moment. Also, feel free to manage the client yourself, as `node-sc2` will just use the existing instance listening on the selected port.

### Overview and Tutorial
An overview of the library and its usage is available by clicking [here](docs/overview.md). The overview is the recommended place to get started. If you want to skip it and go straight to a tutorial of a bot that can consistently win against the built-in Elite AI, click [here](docs/tutorial.md).

### Notice of Active Development
The goal of `@node-sc2/core` is to use semver. As long as `@node-sc2/core` is pre v1.0.0, the library is under very active development. It may be missing obvious features, even ones that are simple to implement. It may expose APIs that are fundimentally broken. It *may* even break backwards compatibility (although we're going to try really hard not to without major version bumps). The goal is to get to v1.0.0 rapidly and remove this notice.

### Contributing
*Any* contributions are appreciated. That includes detailed issue reports (with repro if possible), comments, concerns, API design/suggestions, and PRs. I will try to work together with everyone as much as feasible to create the best user experience possible.

### Ladder and Tournament Submission
Currently the following method is available as a stop-gap to be able to submit your `node-sc2`-based bot to a tournament or ladder (such as one using software like [`Sc2LadderServer`](https://github.com/Cryptyc/Sc2LadderServer)). 

First install `pkg`, which is what we're going to use to package up your bot: `npm install --save-dev pkg`

Then add the `bin` directive, and this npm script to your `package.json` under `scripts`:
```js
"bin": "main.js", // change main.js to your entrypoint file name, if different
...
"scripts": {
    "build": "pkg ./ --target win-x64 --out-path ./dist",
}
```

Finally, run the script: `npm run build`. Your compiled bot will be in `dist/your-bot-name.exe` and will be compatible with the CLI commands needed to run it using the ladder manager or similar software.


In the future, this will be built into `node-sc2` and be a cli command. It is on the major timeline and should be ready by v1.0.0.

### Features and Roadmap
This readme will be updated with a link to a Trello board shortly, outlining feature development roadmap progress. On top of that, github issues can be used to discuss features and bugs.

### Environmental Variables
Various settings can be adjusted through env vars in your shell. In a windows command shell, this is done with the `set` command, eg: `set DEBUG=sc2:debug:*`. 

#### Speed Control
Default is 4 frames per step. This can be adjusted with the `STEP_COUNT` env var... for example, `STEP_COUNT=8` for faster simulations.

#### Debugging
`node-sc2` makes use of the `debug` library. Run your agent with `DEBUG=sc2:debug:*` for additional helpful output, or `DEBUG=sc2:*` for way too much output that's probably not too helpful :) For extra fun, run your script with `node --inspect`, open a chrome instance, navigate to `chrome://inspect` and click on "Open dedicated DevTools for Node". Enjoy the full debugging experience (including cpu and memory profiling, pausing, breakpoints, etc).

### Getting Help
First I would encourage you to read through all available documentation. Beyond this readme, three other user documents are available:

- [Overview](docs/overview.md)
- [Tutorial](docs/tutorial.md)
- [API Reference](docs/api.md)

Beyond that, there are also two documents aimed towards those wanting to help develop the core library, or just understanding more about how it works:

- [Design](docs/design.md)
- [Internals](docs/internals.md)

Beyond the documentation, Starcraft 2 AI has a very active community, available through this discord invitation link: https://discord.gg/Emm5Ztz - This library specifically can be discussed in the #javascript channel. Come say hi!

### Changelog
All notable changes to this project will be documented here (for now).
Please note, this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

#### [0.8.0] - 2019-01-01
#### Highlights:
- Initial support for in-engine unit footprinting and placements (footprints look like: { w: number, h: number }, for instance, a mineral field would be { w: 2, h: 1 })
- Initial support for custom maps (or at least the engine shouldn't explode if it doesn't understand map topography or player configuration)
##### Added
- Initial support for unit type systems (good luck figuring it out how it works before i write docs :p)- Added some more proto api enums to the built-ins 
- MORE DEBUG COLORS! yay debugging
- Added `unitHasDisengaged` event
- Constants
  - Added a bunch of group constants for convenience: structuresTypes, flyingStructureTypes, addonTypes, constructionAbilities
  - Added WarpUnitAbility which maps a warp unit to its training ability id.

- Unit Resource enhancements
  - Added support for ALLY type units  
  - `getGasMines(filter: UnitFilter) => Unit[]`  
  - `getById`, `getBases`, and `getStructures` now take consistent filter argument  
  - `getConstructingWorkers() => Unit[]` (workers with active building orders)  
  - `getProductionUnits` now takes into account weirdo aliased mapped units to find producers

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

##### Changed
- Updated pathfinding dep to a fork with weight support
- Fixed the way tile height is calculated to not be terrible (it's still broken, but less broken)
- Fixed a long standing bug with the event-channel
  - events will no longer be swallowed sometimes when still having readers  

- Agent Entity changes
  - `canAffordUpgrade` now properly respects earmarks  
  - Allows adding systems to an agent while a game is running  
  - No longer breaks in custom maps with no well defined "player" or "enemy"  

- Builder System changes
  - `build` tasks now take an extra step to verify the thing they are building has started, to stop derps, before moving on 
  - will now warp in units with a normal `train` task  
  - robustified `ability` to support more scenarios (like terran addons)  

- Constants
Changes are mainly for improving consistency and behavior
  - Added `UnitTypeId`, `AbilityId`, and `UpgradeId` to the main export (these are the reverses, to get the string representation of the ids from the ids - for stuff like labels / debugging)

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

#### Removed
- Removed phase shifting adept unit type from combat unit types group

#### [0.7.1] - 2018-12-17
##### Added
- Initial support added for LADDER MANAGER COMPATIBILITY! Yay, stay tuned for docs
- Terrain height added to map grids
- `randomCirclePoints` added to geometry angle utils (random points within a radius)
- added missing `toDegrees` to geometry angle utilities (to complement `toRadians`)
- Map resouce related features:
  - isPlaceable(point)
  - getHeight(point)
- added missing constant necessary to use chrono boosts

##### Changed
- Broke and fixed the debug resource (that isn't documented and no one actually uses yet anyway)... it's almost actually useful now. Soon.
- Fixed builder to not accidentally build things where the nat townhall should go
- The `frontOfNatural` map utility actually does what it's supposed to now (undocumented currently)
- `actions.attack()` and `actions.attackMove()` now can accept a unit or array of units to add consistency
- `unitEntity#isWorker()` now actually returns true for workers of any race, including mules

#### [0.7.0] - 2018-12-14
##### Added
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

##### Changed
- BREAKING `actions` resource changes:
  - `do` accepts array or a single tag, opts with target of a unit or point
  - `move` now accepts a point2d or a unit as a target
- `actions.buildGasMine` now works on snapshot (but current) geysers
- `actions.gather` now works with mules
- `hasTechFor` now properly includes tech aliases
- launcher correctly ignores port being held by defunct or idle processes
- clarified some tutorial language
- robustifiered terran builder system placement decisions

##### Removed
- `delay`






