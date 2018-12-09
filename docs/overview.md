# Overview
`node-sc2` aims to expose layers of abstraction that grow with the decreasing naivety of an agent in development. In other words, very simple bots can be created with very simple abstractions, while complex agents can take advantage of increasingly complex abstractions as they grow. The worker rush code in the readme is an example of a very simple abstraction, now we'll look into some slightly more complex ones, hopefully they build one on the next.

## Event Consumers
All logic *that is aware of the game context* is contained within functions provided by event consumers. An example in the worker rush snippet is the `onGameStart` method of the agent blueprint. Almost everything accessible in `node-sc2` implements the trait of `EventConsumer`. That is, they accept methods to consume events (similar to event listeners in other javascript environments). Built-in (or 'engine' level) consumers provided by `node-sc2` are currently as follows: `onGameStart`, `onStep`, `onUpgradeComplete`, `onUnitCreated`, `onUnitFinished`, `onUnitIdle`, `onUnitDamaged`, `onUnitDestroyed`, and `onEnemyFirstSeen`. This list will likely continue to grow as we move events from userland to core. You can read more about Events in details (including `EventConsumer` and the `EventChannel`) in the API Reference and the other internal docs.

## World
The first argument given to all event consumer methods is the `world`. The `world` is the context of a single game of Starcraft 2, and the easiest way to utilize it is by destructuring as follows:

```js
    onStep({ agent, data, resources }) {
        // ...
    }
```
As you can see, the `world` is made up of `agent`, a reference to your agent, `data`, which is a store of data related to internal functionality of the bot, and `resources`, which are the main points of entry to all other game state. The world and its contents are spoken of in more detail in the API Reference documentation [here](docs/api.md). We will go further into how to use the `world` context shortly, but for now it's enough to understand how to access it. 

## Systems
A system is an encapsulated part of your agent. Think of them like middleware in `express`. Systems are optional, but are very helpful for breaking bots down into easier to handle, reusable pieces, creating modularity. For instance, you could create a `WorkerRushDefense` system, and each time you make a new bot, simply include this system without having to copy and paste code or update it across many agents. Systems can even be published and installed as dependencies. There are also some special types of systems (such as a Build System) which implement additional features like following a build order. Systems implement the `EventConsumer` trait, and so they can accept consumer methods just like an agent can. Here is an example of the same worker rush bot given in the readme, but this time implemented as a system:

```js
// in worker-rush-system.js
const { createSystem } = require('@node-sc2/core');

const workerRushSystem = createSystem({
    name: 'WorkerRushSystem',
    type: 'agent',
    onGameStart({ resources }) {
        const { units, map, actions } = resources.get();

        const workers = units.getWorkers();
        return actions.attackMove(workers, map.getEnemyMain().townhallPosition);
    }
});

module.exports = workerRushSystem;
```

Then, in our main entry point, we require the system and mount it on our agent:

```js
const { createAgent, createEngine, createPlayer } = require('@node-sc2/core');
const { Difficulty, Race } = require('@node-sc2/core/constants/enums');
const workerRushSystem = require('./worker-rush-system');

const bot = createAgent();
bot.use(workerRushSystem);

const engine = createEngine();

engine.connect().then(() => {
    return engine.runGame('Blueshift LE', [
        createPlayer({ race: Race.RANDOM }, bot),
        createPlayer({ race: Race.RANDOM, difficulty: Difficulty.MEDIUM }),
    ]);
});
```

And that's it. Systems can be mounted in individual `use()` functions, or by giving `use()` an array of systems. Agent systems do technically run in the order they are mounted - however, keep in mind that they handle all asynchronous actions concurrently.

Systems also implement internal state, similar to the concept of a React component. In fact, they use the same interface of `this.state` and `this.setState`. You will learn a bit more about that in the tutorial, but for now just understand that systems are discreet pieces of your agent and that they are composed together like middleware to create your bot.

## Resources
In the example above, the `onGameStart` of the worker rush system destructures `resources` from the `world` context. Now we'll go into a little bit of detail of what is exposed through resources.

The three resources used above are `units`, `map`, and `actions`. There are others, but these are the important ones that we're going to focus on for now. All you need to know is that the resource entities themselves are accessed through a lazy function, `resources.get()`. The most ergonomic way to pull them into scope is via destructuring, as seen above.

### units
The `units` resource is a very important part of any sc2 bot, since almost everything in the game is considered a `unit`, including workers, combat units, buildings and structures, mineral fields, destructable rocks, etc etc. The `units` resource is updated every step by a system internal to the engine, and exposes a number of methods to access units through all sorts of custom filters. Some of these are by metadata, like `getClosest()`, `getAlive()`, or `inProgress()`. Others are quick helpers / shortcuts by attribute or type, like `getWorkers()` (seen above), `getUpgradeFacilities()`, `getStructures()`, etc. Finally, others allow for more specific filtering such as `getAll()`, `getByTag()`, and `withCurrentOrders()`, all of which accept various arguments. Frequently there is more than one way to come to the same result. As an example, lets say you wanted to pick all of your Zealots which are idle:

```js
const { ZEALOT } = require('@node-sc2/core/constants/unit-type');

//...

    onStep({ resources }) {
        const { units } = resources.get();

        // exhibit A
        const myIdleZealots = units.getById(ZEALOT, { noQueue: true });

        // OR, exhibit B
        const myIdleZealots = units.getByType(ZEALOT).filter(u => u.noQueue === true);
    }
```

Many of the `units` resource methods return objects that are arrays of the `Unit` type. This type is an augmented version of the protobuf `SC2APIProtocol.Unit`. You can read more in-depth about `Unit` and the `units` resource API [here](./api.md).

### map
The `map` resource represents everything related to positioning of the game world. It contains data and methods pertaining to the map size and state, self and enemy locations, expansions, and pathing. In the above example, it's used to get the position of the townhall location of the enemies main base. It also has many helper functions related to expansions, such as `getMain()`, `getEnemyNatural()`, `path()` (synchronous A* pathing lookups), `getLocations()` (for start locations), etc. Many of the `map` resources' methods return objects that are of the `Expansion` type. You can read more in-depth about `Expansion` and the `maps` resource API [here](./api.md).

### actions
The `actions` resource is the main way to interact with the sc2 client itself, via commands (actions or queries). While the other resources are mainly used as a way to *read* data from the game state, think of `actions` as a way to *write* to, or mutate, the game state. Generally, consumer methods will end with calling and returning something from this resource. In the above example, `attackMove()` is used to send the workers to attack the enemy base. Other helper methods exposed include `attack()` (a unit target), `build()`, `train()`, `move()`, `gather()`, and `upgrade()`. On top of these and others, `sendAction` is available to send a more raw query that otherwise doesn't have a method exposing. Beyond these commands, the query for placements is provided via `canPlace()`, and lower level `sendQuery()` for sending other query types. Further details of the `actions` resource API are available [here](./api.md).

## Now what? 
Now that you have a basic overview of `node-sc2`, it's time to make a bot that can consistently beat the built-in Elite AI. Head on over to the [tutorial](./tutorial.md) now!