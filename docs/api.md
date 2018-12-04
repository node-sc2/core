# API Reference
All parameter examples below are shown with their *default* values.

## Main Export
The main export exposes all relevant APIs. Some are available separely through deep linking as well.
```js
const {
    createAgent,
    createEngine,
    createSystem,
    createPlayer,
    taskFunctions,
} = require('@node-sc2/core');
```

### *`createPlayer(settings, bot?) => Player`*
This is a convenience function for creating player objects to be passed to `Engine#runGame`. You can construct the player objects manually instead, for more control. If the 'player' should be an Agent, you must pass it as the second parameter.
```js
settings = {
    race: Race.RANDOM,
    difficulty: Difficulty.MEDIUM, // only set this for a built-in AI player
}
```

### *`taskFunctions`*
This is a namespace of convenience functions that are used only with `build` Systems. See the section below on `BuildSystem`'s for  usage.

## Engine
An Engine is the glue that wires all the parts together internally. It is similar to the concept of the 'Coordinator' in some other sc2 APIs. In `node-sc2`, the engine is used to connect to a client, create games, and join games (whether created by this engine or not). When a new Engine is created, it also creates the *context* (called the `World`) that will exist in any game it coordinates, including all resources and data. During a game, it runs the main loop and handles dispatching of each `step` across all systems and agents.

### *`createEngine(options?) => Engine`*
```js
options = {
    host: '127.0.0.1', // passed to the underlying proto client
    port: 5000, // passed to the underlying proto client
}
```

### *`engine.connect() => Promise<SC2APIProtocol.ResponsePing>`*
This function must be awaited (or the returning promise, resolved) before anything else useful can happen. Once the engine is connected to the SC2 client, you can then invoke either `runGame` or some combination of `createGame` and/or `joinGame`, depending on the desired behavior.

### *`engine.runGame(map, players) => Promise<SC2APIProtocol.ResponseJoinGame>`*
This is a convenience function for both creating a game, and then joining it. Its primary use is to facilitate starting a game against the built in AI.

If `map` is a string containing only the map name, it will be loaded from the client cache. However, if map is a string containing a relative or absolute path to a `.SC2Map` file, then it will be loaded from that local file.

```js
players = [{
    type: PlayerType.PARTICIPANT,
    race: Race.RANDOM,
    agent: bot, // this is your bot created from `createAgent`
}, {
    type: PlayerType.COMPUTER,
    race: Race.RANDOM,
    difficulty: Difficulty.EASY,
}];
```

For your convenience, there is a `createPlayer` function in the main export that can be used to shorten this boilerplate, here is an example:

```js
players = [
    createPlayer({ race: Race.RANDOM }, bot), // bot is your bot created from `createAgent`
    createPlayer({ race: Race.RANDOM, difficulty: Difficulty.MEDIUM }),
]
```
### *`engine.createGame(map, players, realtime?) => Promise<SC2APIProtocol.ResponseCreateGame>`*
Creates a new game on the client with the given map and player setup.
```js
engine.createGame('Blueshift LE', [{
        type: PlayerType.PARTICIPANT,
        race: Race.RANDOM,
    }, {
        type: PlayerType.COMPUTER,
        race: Race.RANDOM,
        difficulty: Difficulty.EASY,
    }]);
});
```
The client will expect players to join the game after it's created, and the game will not start until the players defined in the player setup join.

### *`engine.joinGame(bot) => Promise<[World, SC2APIProtocol.PlayerResult[]]>`*
Joins the game with the given bot as the participant defined previously, and then starts the internal game loop when all participants are ready. Returns a tuple of a snapshot of the game context (`world`) on the last frame of the game, and the game results (an array of `PlayeResult`).

```js
const [world, results] = await engine.joinGame(bot);
```
## Agent
An agent represents an AI controlling a player. The factory is available from the main export. In game, it is exposed throughout the engine via the `World` context.

### *`createAgent(blueprint?) => Agent`*
Accepts a blueprint implementing `EventConsumer` and returns an `Agent`.
```js
blueprint = {
    settings: {
        race: Race.RANDOM,
    },
    // a *synchronous* function of any additional setup you would like to run *before* the 'gameStart' event
    setup: (world: World) => void; 
    ...EventConsumer // see the EventConsumer section for details on what this implements
}
```

An agent implements the following properties from multiple interfaces:
```ts
{
    // this is the actual race in game, not the one selected (in the case of random)
    race: SC2APIProtocol.Race; 
    enemy: {
        // the actual race in game (or 99, unknown), not the one selected (in the case of random)
        race: SC2APIProtocol.race; 
    };
    /**
     * these properties are implemented from `SC2APIProtocol.PlayerCommon`
     */
    playerId: number;
    minerals: number;
    vespene: number;
    foodCap: number;
    foodUsed: number;
    foodArmy: number;
    foodWorkers: number;
    idleWorkerCount: number;
    armyCount: number;
    warpGateCount: number;
    larvaCount: number;
    /**
     * these properties are implemented from `SC2APIProtocol.PlayerRaw`
     */
    powerSources: Array<{
        pos: { x, y, z };
        radius: number;
        tag: string;
    }>,
    camera: { x, y, z };
    upgradeIds: Array<number>;
}
```
As well as the above data directly related to the player itself, the following helper methods are exposed:

### *`agent.hasTechFor(unitType) => boolean`*
This is a synchronous function that, given a `unitType`, will return `true` or `false` whether you have the tech available to build/train the given unit.

### *`agent.canAfford(unitType, earmarkName?) => boolean`*
This is a synchronous function that, given a `unitType`, will return `true` or `false` whether you have the resources available to build/train the given unit.

This function also takes into account all `Earmark`'s currently in place (if any), and as such will tell you that you cannot afford something *even if you can*, if it encroaches on an earmark. If you want to check if something can be afforded *while consuming an earmark*, pass the earmark name along as the second parameter. If the function returns true - that earmark will be consumed, so either you must then choose to build/train the unit or issue a new earmark. For more information about using the Earmark API see [INSERT LINK HERE].

### *`agent.canAffordUpgrade(upgrade) => boolean`*
Same as above but for upgrades. Does not currently implement earmarks.

### *`agent.use(system) => void`*
`System`'s (explained below) are mounted to your agent before the game starts, via `agent.use()`. It accepts either a single system, or an array of systems.

## System

### *`createSystem(SystemBlueprint) => System`*
Accepts a `SystemBlueprint` and returns a `System`.
```js
systemBlueprint = {
    name: 'MyCoolSystem', // this is the only required property, used for logging and debugging
    type: 'agent', // 'agent' is the default system type
    defaultOptions: {
        state: {}, // allows you to preset a state on initialization
        stepIncrement: 8, // how often the system runs, default is 8
    },
    // a *synchronous* function of any additional setup you would like to run *before* the 'gameStart' event
    setup: (world: World) => void; 
    ...EventConsumer, // see the EventConsumer section for event handlers that can be implemented in a system
}
```

Systems also implement the following properties:
```ts
    {
        state: object;
        setState(newState: object): void;
        setState(newState: (currentState) => object): void;
    }
```

In case those signatures are unclear, systems hold local, encapsulated state for use across frames. In any system function, `this.state` can be used to access the current state object. To mutate the state, you can use either `this.setState({ newProp: someValue })` which will perform a shallow merge, or you can pass in a function that takes the entire current state object, and returns the new state, but the state passed in *should not be mutated* - eg:

```js
this.setState((currentState) => {
    return { fooValue: currentState.fooValue +=1, barValue: 'bar' };
});
```

This encourages immutability, as well as keeping state shallow (without deep / graph objects). Of course, you can completely ignore this and just set things however you like (`this.state.foo = bar`), but these are best practices that you may be familiar with if you've worked with frameworks before such as React.

## EventConsumer
EventConsumer is a trait that represents a sum of the available event handlers that can be implemented. This includes all built-in events, as well as custom events you would like to create or use. The agent and system blueprints both implement this trait, and therefore can accept any of these handlers. The following are the built-in ones:

```js
{
        onStep?: (world: World, gameLoop?: number) => Promise<any>;
        onGameStart?: (world: World) => Promise<any>;
        onUnitIdle?: (world: World, data: Unit) => Promise<any>;
        onUnitDamaged?:(world: World, data: Unit) => Promise<any>;
        onUnitCreated?: (world: World, data: Unit) => Promise<any>;
        onUnitFinished?: (world: World, data: Unit) => Promise<any>;
        onEnemyFirstSeen?: (world: World, data: Unit) => Promise<any>;
        onUnitDestroyed?: (world: World, data: Unit) => Promise<any>;
}
```

As you can see, event handlers accept the `World` context as the first argument and some optional event-related data as the second argument. Unlike regular javascript event handlers, which are independent, `node-sc2` event handlers *can create backpressure*. This is a good thing, and is why they are expected to return a promise. Backpressure allows you to run your event handlers with a guarantee that they will complete *before the game step increments*. The easiest way to ensure this is simply implementing the handler as an async function, like the following:
```js
{
    async onStep(world, gameLoop) {
        // ...
    }
}
```

Then within the function body, make sure to `return` or `await` any asynchronous actions. Of course, if your function is not doing any asynchronous work, it won't matter either way. But keeping to this convention will ensure determinism throughout your systems.

As a final note, if you purposely have some extended calculation to do, or you *want* a function to run across multiple loops, you *can* leave a promise dangling on purpose (not awaiting or returning it). Just make sure to implement some sort of locking mechanism into your system state so you don't pile up multiple invocations on the stack (or at least debounce / have some maximum concurrency).

## World
The `World` is the context of a single game of Starcraft 2. It's defined like this:
```ts
World { agent: Agent, data: DataStorage, resources: ResourceManager }
```
The `world` context is given as the first argument of every event consumer handler, and therefore available in any invokable part of your agent and/or systems. The easiest way to utilize it is via destructuring. Here is an example of a system logging the agent's race:

```js
    onGameStart({ agent }) {
        console.log(`My race this game is ${agent.race}`);
    }
```

## Unit
A unit is a special type of object that represents a unit in game. Units implement the following properties:

```ts
{
    noQueue: boolean;
    lastSeen: number;
    /**
     * these properties are implemented from `SC2APIProtocol.Unit`
     */
    displayType?: DisplayType;
    alliance?: Alliance;
    tag?: string;
    unitType?: number;
    owner?: number;
    pos?: Point;
    facing?: number;
    radius?: number;
    buildProgress?: number;
    cloak?: CloakState;
    detectRange?: number;
    radarRange?: number;
    isSelected?: boolean;
    isOnScreen?: boolean;
    isBlip?: boolean;
    isPowered?: boolean;
    health?: number;
    healthMax?: number;
    shield?: number;
    shieldMax?: number;
    energy?: number;
    energyMax?: number;
    mineralContents?: number;
    vespeneContents?: number;
    isFlying?: boolean;
    isBurrowed?: boolean;
    orders?: Array<UnitOrder>;
    addOnTag?: string;
    passengers?: Array<PassengerUnit>;
    cargoSpaceTaken?: number;
    cargoSpaceMax?: number;
    buffIds?: Array<number>;
    assignedHarvesters?: number;
    idealHarvesters?: number;
    weaponCooldown?: number;
    engagedTargetTag?: string;
}
```

Units also implement the following methods:
```ts
unit.isWorker() => boolean;
unit.isTownhall() => boolean;
unit.isGasMine() => boolean;
unit.isCurrent() => boolean;
```

Units also have a `labels` property which is used to store additional flags and component meta data. It works very much like the `Map` interface and implements `set`, `get`, and `has`.

## Expansion
An expansion is a special type of object that represents an area and the surrounding region where a townhall can be placed and resources mined. It is a simple type of region decomposition. An expansion has the following properties:

```ts
    areas: {
        areaFill: Array<Point2D>; // every coordinate in the expansion
        placementGrid: Array<Point2D>; // coordinates free to be placeable (1x1)
        mineralLine: Array<Point2D>; // coordinates considered to be in the mineral line
        behindMineralLine: Array<Point2D>; // cooordinates considered to be behind the mineral line
    };
    cluster: {
        centroid: Point3D; // the average center point of the mineral fields
        // @FIXME: these currently do not update properly throughout the game
        mineralFields: Unit[], // an array of the mineral fields
        // @FIXME: these currently do not update properly throughout the game
        vespeneGeysers: Unit[], // an array of the vespene geysers
    };
    townhallPosition: Point2D; // the optimal placement position for a townhall building
    zPosition: number; // the z-height of the expansion
    centroid: Point2D; // the average center point of *all* expansion coordinates
    pathFromMain: Path; // a 2D array representing a path from the player's main base to this expansion
    pathFromEnemy: Path; // a 2D array representing a path from the enemy's main base to this expansion
```

Expansions also have the following methods:
```ts
expansion.getBase() => Unit; // the base currently occupying the expansion, if any
expansion.getAlliance() => SC2APIProtocol.Alliance; // the alliance who owns the expansion currently
```

## Resources
Resources in `node-sc2` are objects that manage and expose various parts of the API, shared between all agents and systems. The `resources` instance of the `ResourceManager` exposed from the `world` context likely has only 1 method you'll use, that is, `get()`. This method exposes all resources and is suggested to be used via destructuring. Here is an example, showing all available built-in resources:

```js
    onStep({ resources }) {
        const { actions, events, frame, map, units, debug } = resources.get();
    }
```

This way you can simply destructure whatever resources you need for a certain routine. Now we'll go over each of the resources in detail.

### frame
The `frame` resource represents the current underlying game frame data. It has a number of methods that act as synchronous accessors to this raw data.

#### *`frame.getObservation() => SC2APIProtocol.Observation`*
The raw observation data. Most of this is digested and made available in more useful interfaces.
#### *`frame.getGameInfo: () => ResponseGameInfo;`*
The raw `gameInfo`, currently only updated at the start of the game.
#### *`frame.getGameLoop: () => number;`*
The current `gameLoop` interval. This is the same that is passed into `onStep` consumer as the second argument.
#### *`frame.getMapState: () => SC2APIProtocol.MapState;`*
This includes the `ImageData` for visibility and creep.

### units
Most things in the game are represented by a `Unit`, therefore this is a very important resource that you will use regularly.

One thing to keep in mind, is that most (if not all) unit methods will take either an `Alliance` enum value (eg: `Alliance.SELF`) or a more complex filter object, based on unit data. For instance, `units.getAlive({ isFlying: true })` will return an array of all living units that are flying.

#### *`units.clone() => Map<string, Unit>`*
This returns a deep clone off all units, minus any methods (data only). You will likely never need this, unless you need to do some destructive transforms to be able to process data (possibly for combat simulation?). The string keys on the `Map` returned are the unit tags. Try to avoid it where possible as it could have some significant overhead later in the game.

#### *`units.getAll(filter?: (number | UnitFilter)) => Unit[]`*
Returns *all* units, based on filter, or literally *all units* if no filter is given. Please note that *all* means *all*. That includes dead units, neutral units, snapshot units, etc. You generally don't want to use this method without giving a filter. Like most methods, the filter can be of an Alliance value or an object to compare units against.

#### *`units.getAlive(filter?: (number | UnitFilter)) => Unit[]`*
Like `getAll` but only returns units that are *current*. Current means the unit data was available in the current frame. This is slightly different than literally 'alive', as your enemy units won't be current unless they are currently visible. It *will* return snapshots as long as those snapshots are current.

#### *`units.getBases(alliance?: Alliance) => Unit[]`*
Returns all non-dead townhalls of a specific alliance. Defaults to `Alliance.SELF` if none is given.

#### *`units.getById(unitTypeId: number, filter?: UnitFilter) => Unit[]`*
Returns all units of a `unitType`. `unitType`'s can be retrieved from constants:

```js
const { ZEALOT } = require('@node-sc2/constants/unitType');

// ...
{
    onStep({ resources }) {
        const { units } = resources.get();
        const zealots = units.getById(ZEALOT);
    }
}
```

This is *similar* to `getByType` but not the same. This method takes only a single `unitType` id and excepts an optional filter as a second argument. `getByType` takes an array of `unitType`s, but does not accept a filter.

#### *`units.getByTag(unitTags: string) => Unit`*
#### *`units.getByTag(unitTags: string[]) => Unit[]`*
Returns `Unit` if given a `tag`. Returns `Unit[]` if given `tag[]`. Unit tags are string representations of the unique unit id, available on `unit.tag`.

#### *`units.getByType(unitType[]) => Unit[]`*
Similar to `getById`, but accepts an array of `unitType`s. Returns all live units that match any of the given types.

#### *`units.getCombatUnits() => Unit[]`*
Returns all *own*, living, combat units. Basically a shortcut to get your whole army. Think F2.

#### *`units.getClosest(pos: Point2D, units: Unit[], n?: number) => Unit[]`*
Given a `Point2D` (`{ x, y }`), an array of units, and an optional number `n`, returns the closest `n` units to the point. Default of `n` is 1. Always returns an array.

#### *`units.getProductionUnits(unitTypeId: number) => Unit[]`*
Given a `unitType`, returns all living units that can produce that `unitType`. (eg:, give it `unitType.MARINE`, to get all of your barracks).

#### *`units.getUpgradeFacilities(upgradeId: number) => Unit[]`*
Given an `upgrade`, returns all living units that can research that `upgrade`. (eg:, given `upgrade.CHARGE`, returns your templar archives).

#### *`units.getMineralFields(filter?: UnitFilter) => Unit[]`*
Returns all mineral fields across the entire map.

#### *`units.getGasGeysers(filter?: UnitFilter) => Unit[]`*
Returns all vespene geysers across the entire map.

#### *`units.getStructures(filter?: UnitFilter) => Unit[]`*
Returns all living units with the `structure` attribute.

#### *`units.getWorkers(includeBusy = false) => Unit[]`*
Returns all own living workers. By default, will not return workers which have been issued a command already this frame.

#### *`units.getIdleWorkers() => Unit[]`*
Returns all own living workers with no orders.

#### *`units.getMineralWorkers() => Unit[]`*
Returns all own living workers that are:
- currently mining
- not mining gas
- not issued any other command this frame

#### *`units.inProgress(unitTypeId: number) => Unit[]`*
Returns units of the given `unitType` which are not "finished" (eg: buildings being constructed / morphed / warped).

#### *`units.withCurrentOrders(abilityId: number) => Unit[]`*
Returns living units with the given `ability` somewhere in their order queue. Useful for seeing if you've already given a certain command (like to build something) in a very recent frame.

#### *`units.withLabel(label: string) => Unit[]`*
Returns *all* units with a given label. Labels are discussed more in the Labels section [ADD LINK HERE].

### map
The `map` resource represents everything related to positioning of the game world. It contains data and methods pertaining to the map size and state, self and enemy locations, expansions, and pathing.

#### map.getLocations() => Locations;
Returns the starting locations of the player and enemy:
```js
locations = {
    self: Point2D;
    enemy: Point2D;
}
```

#### map.getExpansions(alliance?: Alliance) => Expansion[];
Returns all expansions on the map in order of distance from alliance. By default, will return them in order from your starting position. If given `Alliance.ENEMY`, will return them in the order from the enemy main. This allows for simple destructuring such as:

```js
const [main, natural] = map.getExpansions();
// or...
const [enemyMain] = map.getExpansions(Alliance.ENEMY);
```

The following related convenience functions also exist to get common expansion locations:
```ts
map.getMain() => Expansion;
map.getEnemyMain() => Expansion;
map.getNatural() => Expansion;
map.getEnemyNatural() => Expansion;
map.getThirds() => Expansion[];
map.getEnemyThirds() => Expansion[];
```
Note that `getThirds` and `getEnemyThirds` return two expansions. This is because on *most* maps, third and fouth bases are fairly interchangeable. The first expansion in the array will be the closer one, however.

#### map.getClosestExpansion(point: Point2D) => Expansion;
Given a point, returns the closest expansion.

#### map.getAvailableExpansions() => Expansion[];
Returns all expansions that have not been (knowingly) taken, in order from the players perspective.

#### map.getOccupiedExpansions(alliance?: Alliance) => Expansion[];
Given an alliance, returns all expansions that have been taken by that alliance.

#### map.getGrids() => Grids;
Returns a grids object containing 2D arrays of datas:
```ts
grids = {
    miniMap: Grid2D;
    placement: Grid2D;
    pathing: Grid2D;
}    
```
Placement and pathing grids are the same as provided by the API. `miniMap` is an experimental grid representing grid containing minimap-like data.

#### map.path(start: Point2D, end: Point2D) => Path;
Given a start and end point as coordinates, does an A* search and returns the resulting path as a 2D array of sets of coordinates. Returns an empty array if pathing is impossible. NOTE: this is *not* the same as querying the API, this is significantly faster (exponentially) and done synchronously. It cannot, however, take into account any information about the map or paths not known to the system.

### actions
The action manager resource is the main way to interact with the API via commands (actions or queries).

#### actions.attack(units?: Unit[], unit?: Unit, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
Command one or more units to attack another unit.

#### actions.attackMove(u?: Unit[], p?: Point2D, queue?: boolean): Promise<SC2APIProtocol.ResponseAction>;
Command one or more units to move and attack to a position.

#### actions.build(unitType: number, target: Unit, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
#### actions.build(unitType: number, pos: Point2D, worker?: Unit): Promise<SC2APIProtocol.ResponseAction>;
Command a given worker to build a `unitType` on either a position or a target unit. If no worker is given, the system will select the least busy, closest worker.

Will reject with an instance of `BuildError` with related message and `err.data` if either the player is missing the necessary tech, or can not afford.

#### actions.do(abilityId: number, tags: string[]): Promise<SC2APIProtocol.ResponseAction>;
Command one or more units to do an ability.

#### actions.buildGasMine() => Promise<SC2APIProtocol.ResponseAction>;
Will build an assimilator, refinery, or extractor on an open geyser in an existing expansion. Will reject with an instance of `BuildError` with related message and `err.data` if there are no free geysers on any owned expansions.

#### actions.gather(unit: Unit, mineralField?: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
Given a worker unit and optionally a specific `mineralField`, will command the unit to gather minerals. When not given a target `mineralField`, the system will find the closest mineral field on the most needy base. NOTE: by default, the command is given *queued*, so it is safe to give after giving another command to a worker, or even to give to all workers `onUnitIdle`.

#### actions.mine(units: Unit[], target: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
Like `gather`, but for mining gas. Currently must be given the target vespene mine.

#### actions.move(units: Unit[], target: Point2D, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
#### actions.move(units: Unit[], target: Unit, queue?: boolean) => Promise<SC2APIProtocol.ResponseAction>;
Commands a list of units to move to a target position or target unit.

#### actions.train(unitType: number, tag?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
Given a `unitType` and, optionally, a production unit, will order to train a new unit from that facility.
If no production unit is given, it will attempt to look up a current facility that is both capable of training the given `unitType`, *and* does not currently have a queue. If the player does not have the tech to train the unit, can not afford to train the unit, or there is no free production facility, this function will reject with an instance of `TrainError`.

#### actions.upgrade(upgradeId: number, tag?: Unit) => Promise<SC2APIProtocol.ResponseAction>;
Given an upgrade and, optionally, a research facility, will order to research the upgrade from that facility.
If research facility is given, it will attempt to look up a current facility that is both capable of researching the given upgrade, *and* does not currently have a queue.

#### actions.canPlace(unitType: number, positions: Point2D[]) => Promise<(Point2D | false)>;
Given a `unitType` and an array of positions, queries the game to check placability of all positions. Returns either *a random position which returned a success*, or false.

#### actions.sendAction(unitCommand: ActionRawUnitCommand) => Promise<SC2APIProtocol.ResponseAction>;
#### actions.sendAction(unitCommand: ActionRawUnitCommand[]) => Promise<SC2APIProtocol.ResponseAction>;
A lower level interface to send arbitrary actions. Given either a single `ActionRawUnitCommand`, or an array of them, sends the action request and returns the response.

#### actions.sendQuery(query: SC2APIProtocol.RequestQuery) => Promise<SC2APIProtocol.ResponseQuery>;
A lower level interface to send arbitrary queries (such as `pathing`, `abilities`, or `placements`). Given a `RequestQuery`, returns a `ResponseQuery`.

### debug
TBD

### events
TBD