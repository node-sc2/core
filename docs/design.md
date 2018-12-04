# @node-sc2/core Design Concept
## Philosophy and Design Overview
The goal of `node-sc2` is to provide the tools and API for a user to create a Starcraft II agent at various levels of abstraction. In other words, simple bots can be created using very simple abstractions, whereas complex agents can take advantage of increasingly complex abstractions as they grow.

### Level 1 - Engine Level Events
At its simplest, an agent can directly implement engine level events, such as with the `onStep` function, to have code defined in a single file to trigger every frame. This is on par with most (or all?) other language APIs with a similar system based on the C++ reference implementation.

In addition to this are other events provided by the engine that can also trigger handlers given directly to the agent (such as `onUnitCreated`, `onUnitIdle`, etc).

Event handler signatures include the `World`, which is the current game context [ADD LINK TO DOC] and the data specific to the event (such as the `gameLoop` interval for the `step` event, or the `newUnit` in question for the `onUnitCreated` event).

An entire bot can be created in one file, simply by defining these handlers on the agent.

### Level 2 - Systems
A `System` is the basic framework construct for `node-sc2`. It takes ideas from the "Middleware" concept of a TCP server, the "Component" concept of React, and the "System" concept of the "Entity-Component-System" pattern. Generally, when the framework refers to "Systems", this means systems provided by the user that allow them to breakdown and encapsulate various types of agent logic and routines. Systems are designed specifically to *not* have direct access to one another or be externally mutable. Interestingly, the framework's *internal* systems are also made out of the same entity shape, and are just run at a higher priority than user systems.

Almost everything in `node-sc2` implements the behavior of an `EventReader`, generic over its more specific structure, and systems are no exception. They can have the full range of event handlers, just like an agent can. User provided systems, referred to as `Agent Systems` (because they are added by being `.use()`'d via the bot interface), act as individual organs of a larger machine. For example, my first bot had a `WorkerSystem`, a `SupplySystem`, and an `ExpansionSystem`.

Beyond being `EventReader` entities, systems can also implement specific behavior types (such as a `build` system, which allows for build order style notations), as well as hold their own internal state. `this` is heavily avoided throughout the framework internally (mostly via context injection and closures), but systems are the one major exception. `this` in a function implemented by a system should always refer to itself, including the React-like provided properties `this.state` and `this.setState` (fully optional, but used to encourage immutable state handling within the system itself).

The pattern of breaking down agent behavior into systems is especially ergonomic for reusable logic that can be shared between your bots. They can even be individually revisioned as modules themselves and simply required and used, without copypasting the same bug fixes and feature enhancements.

### Level 3 - Advanced Internal Communication
As mentioned previously, systems are designed to be encapsulated and immutable from the outside world, and yet are organs of the same machine. So how do we communicate between them? The highest level of abstractions exposed by `node-sc2` are broken down into 3 categories of system communication: Custom Events, Data Registers, and Entity Labels.

#### Custom Events
Custom events are exactly what they sound like. They allow for a basic form of generic "pub/sub" between systems. The majority of events in `node-sc2` are created by an internal system, and propegated through the engine's regular dispatch routine. The event manager itself (`EventChannel`) is exposed as a `resource` in the `World` context. Users can use the `EventChannel` api to create custom events and implement custom event handlers throughout their agent and agent systems. These custom events could do anything, from communicating simple game events to triggering system state changes, or any number of other actions in fsm / hierarchal fsm or behavior tree style designs.

Events in `node-sc2` are very different than most event systems in javascript (such as in the browser, or provided by node.js internal lib), and for good reason. This is explained more in the Internal Specifications document [ADD A LINK HERE]. But for now, know that this allows events to be very powerful. For instance, an event can be marked "persistent", continuing to be triggered every loop until a system marks it as consumed. Consider this use case in a protoss agent:

1. `ScoutingSystem` emits a persistent event relaying that the enemy Terran has landed a starport on a tech lab.
2. Other systems consume the event:
   - `StaticDefenseSystem` earmarks funds for building cannons behind each mineral line.
   - `UnitProductionSystem` verifyies there are a sufficient number of observers in place with each combat group.
3. Other systems may choose to adjust their behavior (such as not moving out to attack, changing unit locations, etc) until the event is consumed in an internally agreed-upon manner.

Events also carry their own metadata, such as what `gameLoop` (frame) they were started on, and how long they have been persisting for. Also, persistent events can optionally be set to end (consume) on their own at a future 'date' (`gameLoop` interval).

#### Data Registers
Data registers allow for implenting more of a "command pattern" style of communication between the systems, in a way that protects the systems themselves (or the engine state) from being exposed to mutability. In the `World` context exists a shared `DataStorage`, with simple `get` and `set` methods, similar to a javascript `Map` object. This is a pretty simple way to share context, of course, but the abstraction is in `DataStorage`'s `.register()` function, which allows you to implement *behavior* to interact with this data through helper functions. This allows you to both define a new data type *and* functions that act like methods of that data type, which then become usable across your systems. For instance, this is how the internal concepts of the protocol `ResponseData` (such as the unit type data, ability data, etc) and also how `earmarks` (set by systems and consumed by the agent) work.

Ultimately, this allows for arbitrary sharing of global state and actions (state mutation) without the user having to create external state stores or figure out how to properly require/share references between systems. Sort of like little safe spaces of "do whatever the heck you want".

Initial data shapes and helpers can be owned by a single system or by your agent, by registering them via either the `setup()` or  `onGameStart()` functions in the respective locations.

#### Entity Labels
So far we have pub/sub (event) driven communication, direct "command" driven style communication, and now we have the final of the trio (and the most powerful), *data* driven communication. This concept is similar to "Components" in an Entity-Component-System. For the purpose of `node-sc2`, we refer to them as "labels". Labels are simply a string identifier mapping to some sort of data - any valid value, but commonly either a `boolean` or a basic object. These labels are associated with individual entities and allow for an almost limitless variety of system design. Take this very simple example (that is actually used internal to `node-sc2`):

1. Whenever a worker is placed on gas, a `gasWorker` label is applied to the unit, with the simple value of `true`.
2. When a worker is needed to build something, and no idle workers are available, workers with the label `gasWorker` are filtered out of the mining pool (via `units.getMineralWorkers()`)

Extremely straight forward way to append extra metadata to a unit to avoid unwanted behavior with little to no additional overhead. Now let's take a more complex example. By standard, each system does its own work, encapsulated, accessing the `actions` resource to create commands (actions and queries). What if a user wanted to completely abstract this away, having their systems unaware *that the action manager resource even exists*? Simple, we implement desired behavior as unit labels. Here's an example use case, a naive implementation of a scouting system:

1. `SystemA` wants to know if the enemy has taken a 3rd base, but the `map` resource shows the possible locations have not been scouted this game.
2. `SystemA` selects the closest zergling, and sets the label `scoutLocation` with the position values (`[{ x, y }, ...]`) of the townhall location of the possible enemy 3rds.
3. `SystemB`, possibly a `MovementSystem`, receives a list of units with various movement related labels. For each unit with the `scoutLocation` label set, it queues up a set of move commands for that unit, one for each value, where it only has to get close enough based on the target position and its unit vision range. It might also use the A*-based `path` function of the `map` resource to create paths that are least likely to cross enemy units.

In this example we see abstracting a somewhat complex operation into a simple unit label. As a bonus, this common consumption of the label by a single system makes it reusable between other systems. No shared functions or data types are needed, no requiring of external resources... *only by changing a piece of data*. The same concept can be used create more robust behavior for the above naive example. For instance, `MovementSystem` might keep internal state of the commands it sent and the position of the units. It could even expose this using a Data Register so other systems can check on the progress of said movements.. etc.

Consider the possibilities of using labels and their associated data to define skirmishes, defensive reactions, combat targeting, army groups, harassment campaigns, or even to drive individual unit behavior trees.
