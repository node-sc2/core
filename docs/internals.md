# @node-sc2/core Internal Specifications
The purpose of this document is to outline the internals of `node-sc2` for anyone interested in helping to develop core. It is also a good reference and should continued to be updated. It is not meant to be exhaustive API documentation.

## Agent
An agent represents a participant controlling a player in a game of Starcraft II. New agents are constructed from the `createAgent` factory, a property on the main export of `@node-sc2/core`. The function is passed an object representing the agent's blueprint, and returns an agent. Agents implement `EventReader`, and as such, can accept any event function, such as `onStep`, as a property, and they will be invoked by the engine's dispatch. Other user-defined systems, called `Agent Systems`, should be mounted onto the agent by the user after creation via `agent.use()`. Agent event handlers have a *lower* priority than engine systems, but a *higher* priority than other agent systems. Since the agent represents the player, it also implements the combined proto definitions of `PlayerCommon` and `PlayerRaw`, and exposes methods such as `canAfford` and `hasTechFor`, and properties such as `race`, `playerId`, `larvaCount`, `powerSources`, etc.

## Engine
An engine is the glue that allows a bot application to run. New engines are constructed from the `createEngine` factory, a property on the main export. It includes the ability to connect to a client, create games, and join games (whether created by this engine or not). When a new Engine is created, it also creates the *context* (called the `World`) that will exist in any game it coordinates, including all resources and data. An Engine is given any agent it should use while joining a game. During a game, it runs the main loop and handles dispatching of each `step` across all systems and agents.

## System
A system is an encapsulated set of routines representing a discreet piece of behavior. Systems also implement `EventReader`, meaning their blueprint object can take event handlers (of matching event type), and they will be dispatched appropriately. Systems are constructed by the `createSystem` factory, a property on the main export. The function takes an object representing the systems "blueprint", and optionally some options, and returns a *`SystemWrapper`*. The wrapped system is not *quite* the system itself, it contains additional metadata that is unavailable to the system, and is used to consume events, run the proper system functions, and make other engine-level decisions. The system wrapper can be thought of as an engine or dispatch helper. When the engine runs `dispatch()`, internally, each system wrapper is charged with handling its own system.

Because systems are all wrapped the same way, the blueprint must provide a `name` property, which is currently used only for debugging and logging purposes. There are various "type"s of systems, the two basic types being `engine` and `agent`. These systems play similar roles, but are mounted to different entities (the engine itself vs an agent) and have different dispatch priority (internal 'engine' type systems run first, and in series).

Systems are designed to be extensible by adding more types. Currently, additional prefab behavior must be added by `node-sc2` itself, but a plugin architecture could be implemented in the future allowing for new system "type"s to be introduced without too much trouble, from userland. An example of a unique system is the `build` type, which expects a `buildOrder` property on the blueprint, and turns it into a series of tasks. Like any unique system behavior, it interacts with the system object (the blueprint) via symbol properties, as to not pollute the system space and risk collision. For an example of how to create a new type of system, and the appropriate behavior plugin, see `systems/builderPlugin.js` and how it is implemented in `systems/createSystem.js`.

## Events
Events in `node-sc2` are closer to event systems in systems-level languages, than to the idiomatic 'javascript-like' events found in the browser or node.js core lib. The primary reason for this is because the mechanism dispatching events *must* leave a handler at the callsite, otherwise event handlers either would be barred from asynchronous actions (untenable) or would continue their routines through multiple gameloops / steps, and all determinism would be lost between systems and frames. One possibility was using a `stream`-like interface, in conjunction with some promise transforms and back-pressure - but this was limiting based on implementation details of existing solutions. If I was going to write a solution myself, I was going to write one ergonomic to `node-sc2`. The event system decided on is reminiscent of rustlang's `shrev` (at least loosely) and is a `resource` called `EventChannel`.

`EventChannel` is a *pull* style event system, allowing for immutable reads, where readers must *preregister* to the channel in exchange for a unique id. Events are *guaranteed* to be read by all intended readers, even between frames, as an event is not destroyed from the channel until digested by all intended targets. When an event is written to the channel (via a blueprint), all currently registered readers with the same event type (or an `all` type) are stored on a newly created `Event`. As each event is `read` during dispatch, the events are consumed *by reader id*. Once all intended readers have been consumed, the event is then destroyed.

Although the `EventChannel` itself is completely synchronous, event dispatching is handled asynchronously. The convention is that event handlers should return a promise, resolving when they are complete. Currently this is done by the engine (in `engine.dispatch()` and also in the system wrapper. In the future, this should probably be moved to a `Dispatch` entity, to separate concerns. Each loop, the engine creates a `step` event after requesting a step, and internal systems start dispatch with this single event in queue. The order of system dispatching is currently as follows:

- Engine Systems are ran first, and in series. This is necessary so that the order of `World` `resources` being mutated and other events being created is deterministic. These are the internal systems and the order they are ran in:
  - `FrameSystem` runs first, getting the current observation and updating the `frame` resource, as well as populating `unitDestroyed` events from observation.
  - `UnitSystem` then adds new `UnitEntity`'s and updates existing ones on the `units` resource, creating a number of other events based on diffing unit data.
  - `MapSystem` lastly updates the `map` resource state, which includes things like visibility and creep data.
- Next, the agent entity itself is dispatched.
- Lastly, agent systems are ran *concurrently*.

The reason the last step works even with concurrency is because events aren't destroyed until all of their readers consume them. This allows for an agent system to create an event, where some readers may consume it this frame, and others next frame. It may be possible to allow agent systems to define 'dependencies' on other agent systems as they are initially registered - allowing them to run in a certain order (or just have two naive batches). This may be implemented before v1 as discussions continue.

One other thing to note, is that `Event`s can be consumed *prematurely* by an exposed `event.destroy()` method. This was to allow for flexibility in how users can implement events originating from agent systems, as well as for destroying persisted events. The persistence features referred to the in Design Document are yet to be implemented, but will simply be re-writing fully consumed events unless expired (and with their original `gameLoop` interval, instead of the current frame). 

## World
The `World` is the context of a single game of Starcraft 2. It's defined like this:
```ts
World { agent: Agent, data: DataStorage, resources: ResourceManager }
```
#### Data
World Data is a loose concept in `node-sc2`, it's used margionally by the engine to store and retrieve static data from `ResponseData`, but mostly it's meant as a safe space for systems to share data between each other (and register helpers as methods to act on that data). This is explained more in the Design Documnet [ADD LINK].

#### Resources
Resources are discreet entities that expose various segments of the API, with the goal being single-responsibility. Most of these resources have a matching engine system whose job is to be the sole mutator of each resource. Resources are extensible and can be set on the world, even allowing for the user to add a well-defined resource + engine-level system and integrate it like the built-ins. This will likely remain undocumented initially.

The built-in resources are as follows:
- `frame` is of type `FrameResource`, and holds the current `gameLoop`, `observation`, and `gameInfo`, as well as appropriate methods to retrieve them.
- `units` is of type `UnitResource`, and holds the cached units and meta data, exposing a number of useful methods to filter and interact with these units. Units stored in the `UnitResource` are of type `UnitEntity`, which have some (although currently minimal) sets of additional helpers or methods.
- `map` is of type `MapResource` and holds both cached data about the current map / grid layouts, as well as exposes methods to calculate paths. This includes expansion information and shortcut methods to gettin specific expansions.
- `events` is of type `EventChannel` and can be used to manually create `readerIds`, and read or write events. For the most part, the regular dispatch cycles should take care of reading, but users can use this resource to create custom events by writing their blueprint to the channel.
- `debug` is of type `Debugger` and is used to draw things to the game world or game screen or otherwise interact with the game for debugging or testing purposes (creating or destroying units, setting resources, etc etc).
- `actions` is of type `ActionManager` and is the main way that most systems will interact with the transport layer. It can be used to directly make queries or send action commands, and also exposes a number of helper functions like `build`, `attack`, etc.

## Other Concepts

### Race Agnosticy
`node-sc2` strives to be race agnostic where possible. It was designed along-side a protoss bot, so initially many of the functions are written that way. Agnosticy is planned to be achieved for any existing functions or future functions by using a proxy construct, taking the context of `agent.race` and utilizing the `apply` trap of a `Proxy` object. In this way, race agnosticy can be built out "as we go" without adjusting anything about the API itself.