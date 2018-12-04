# Tutorial Part 1 - Making a Build System
In this tutorial we're going to walk through creating a relatively simple bot, but one that is capable of consistently beating the built in Elite AI (random race) and on random maps.

## Setup
The first thing we're going to do is create a new directory for your bot, and initialize the project. First, in your newly created directory, `npm init`. Then after the prompts, install `node-sc2` with `npm install --save @node-sc2/core`. Now create a new entry file. You should name it whatever you chose during your `init`. It's common to use `index.js` or `app.js`, but in this example I will use `main.js` (as it makes a little more sense in the non-web context of our agent). Then lets populate the entry point with the same code from the readme, but without the `onGameStart` method, and with making our bot Protoss instead of Random:

```js
const { createAgent, createEngine, createPlayer } = require('@node-sc2/core');
const { Difficulty, Race } = require('@node-sc2/core/constants/enums');

const bot = createAgent();

const engine = createEngine();

engine.connect().then(() => {
    return engine.runGame('Cerulean Fall LE', [
        createPlayer({ race: Race.PROTOSS }, bot),
        createPlayer({ race: Race.RANDOM, difficulty: Difficulty.MEDIUM }),
    ]);
});
```
Okay great, now we have a bot that does nothing, but starts a game against a medium AI when ran. Next we're going to create a system. If you followed the [Overview](./overview.md) (you did, right?) then you should understand how a system works.

## Creating a build order
To make things a little easier on ourselves, we're going to use a feature of systems that allows them to follow a build order. To keep things straight forward, (but still show some complexity), we're going to opt for early aggression (but not a cheese!), an 8-gate chargelot all-in. To initialize a system that can understand a build order, simply define `type: 'build'` in the system blueprint, and then provide the build order in the `buildOrder` prop as an array of tasks:

```js
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const {
    ASSIMILATOR,
    CYBERNETICSCORE,
    GATEWAY,
    NEXUS,
    TWILIGHTCOUNCIL,
} = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const eightGateAllIn = {
    name: 'EightGateAllIn',
    type: 'build',
    buildOrder: [
        [16, build(ASSIMILATOR)],
        [17, build(GATEWAY)],
        [20, build(NEXUS)],
        [21, build(CYBERNETICSCORE)],
        [26, build(TWILIGHTCOUNCIL)],
        [34, upgrade(CHARGE)],
        [34, build(GATEWAY, 7)],
    ],
}

module.exports = createSystem(eightGateAllIn);
```

So let's break this down a little bit. First you'll notice we're pulling in `taskFunctions` from the main export. This is a series of helper functions while creating builds, namely, `build`, `train`, `upgrade`, and `do`. For now we're only going to worry about `build` and `upgrade`.

The build order itself is pretty simple. It's an array of tuples (fixed length arrays) where each contains `[supply: number, BuildTask]`. That is, the first element is a number relating to at what minimum supply you to do the task, and the second element is the task itself (that we use the helper functions for). If you pass a second parameter to `build`, that will tell it the *quantity* you want of the thing you're building. The supply numbers aren't an exact science, as I wrote this up a little swiftly, but it works. As you can see, constants, required from core constant definitions, are passed through to the build functions.

So now, if you require this in your main entry point, and `bot.use()` it, and run your bot, you'll see a few things happening. Firstly, your nexus starts producing probes right away, great! This is because you start at 12 supply, and your first build order command is at 16, so it's trying to make enough probes to satisfy that. There's a problem, tho, that you only start with 15 supply cap - so the agent can't get to 16, oops. Wat do? Well....

## Hello Modularity
We're going to cheat *a little*. `node-sc2` publishes a ready-to-use protoss system for supply management. It's compatible with most types of builds and is generally good with keeping up sane positions and timings to add pylons. Here's how we use it - first, install it:
```sh
npm install --save @node-sc2/system-protoss-supply
```

Then, we just require it and add it to our bot like any other system! Let's add this into our main entry point code:
```js
const protossSupplySystem = require('@node-sc2/system-protoss-supply');

// ... then down after you create your bot...
bot.use(protossSupplySystem);
```

That's it! Now let's try running the bot again...

# Tutorial Part 2 - Fix The Lazy
## Mining Gas
In part 1 we got a basic wireframe put together. We built a pylon, a gateway, a nexus, a cyber core... what's the problem now? Probes never move into gas. That's easy enough to fix, let's add a consumer for our assimilator finishing, `onUnitFinished`:

```js
    // the second parameter of unit-based event consumers is the unit
    async onUnitFinished({ resources }, newBuilding) { 
        // check to see if the unit in question is a gas mine
        if (newBuilding.isGasMine()) {
            const { units, actions } = resources.get();

            // get the three closest probes to the assimilator
            const threeWorkers = units.getClosest(newBuilding.pos, units.getMineralWorkers(), 3);
            // add the `gasWorker` label, this makes sure they aren't used in the future for building
            threeWorkers.forEach(worker => worker.labels.set('gasWorker', true));
            // send them to bind at the `newBuilding` (the assimilator)
            return actions.mine(threeWorkers, newBuilding);
        }
    },
```

Let's run it again and see what happens! Alright... so we mine gas, we build our twilight council, upgrade charge, and build a ton of gateways. There's still a few problems. If you notice, the probes are unbalanced between the bases, some probes never even mine after they are produced, and nothing is being produced out of the gateways. Let's fix that.

## Putting Idlers to Work
Most of our problems now have to do with things being lazy. We can address the probes by adding an `onUnitCreated` consumer and telling them to get busy:

```js
    async onUnitCreated({ resources }, newUnit) {
        // if the unit is a probe...
        if (newUnit.isWorker()) {
            const { actions } = resources.get();
            /* tell it to go gather minerals - we get a little bonus here
             * because the `gather()` function also has it check for the 
             * closest mineral field at the base that needs workers, so this
             * will *also* balance for us! */
            return actions.gather(newUnit);
        }
    },
```

Then we're going to add an `onStep` consumer to check on our gateways too:

```js
    async onStep({ agent, resources }) {
        const { units, actions } = resources.get();

        // all gateways that are done building and idle
        const idleGateways = units.getById(GATEWAY, { noQueue: true, buildProgress: 1 });

        if (idleGateways) {
            // if there are some, send a command to each to build a zealot
            return Promise.all(idleGateways.map(gateway => actions.train(ZEALOT, gateway)));
        }
    },
```

Remember to also add the `ZEALOT` constant to your list of requires at the top of the file.

## Rallying An Army
So now we have our bases saturated more optimally, and zealots pumping out of all the gateways, great!. But there are still some issues you notice no doubt. The zealots just sort of... stand there next to the gateways as they pop out. Let's rally them to somewhere outside of our natural. To do that, we're going to add a little clause to our existing `onUnitCreated` consumer:

```js
// add this to the top of the filee to access the `combatTypes` unit group
const { combatTypes } = require('@node-sc2/core/constants/groups');

//... then lets update our `onUnitCreated` method....

    async onUnitCreated({ resources }, newUnit) {
        // add `map` to the resources we're getting
        const { actions, map } = resources.get();

        // this was already here
        if (newUnit.isWorker()) {
            return actions.gather(newUnit);
            /* "if the new unit is a combat unit...", just in case we
            * decide to make something other than zealots */
        } else if (combatTypes.includes(newUnit.unitType)) {
            /* `map.getCombatRally()` is sort of a silly helper, but it's 
             * a good enough default we can use for now :) */
            return actions.attackMove([newUnit], map.getCombatRally());
        }
    },
```

So now we have a small army (or a large one?!) of zealots hanging out in our natural in only about 35 - 40 lines of code... just a little more elbow grease and we're almost there!

# Tutorial Part 3 - Kill Your Opponent
## Timing Attack!
What a better time to attack than when your upgrade finishes? Good, let's do it!

```js
    async onUpgradeComplete({ resources }, upgrade) {
        if (upgrade === CHARGE) {
            const { units, map, actions } = resources.get();

            const combatUnits = units.getCombatUnits();

            // get our enemy's bases...
            const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

            // queue up our army units to attack both bases (in reverse, natural first)
            return Promise.all([enemyNat, enemyMain].map((expansion) => {
                return actions.attackMove(combatUnits, expansion.townhallPosition, true);
            }));
        }
    },
```

Cool, now we got an initial attack going. This will outright kill the medium built-in AI. Congrats! But it probably won't be enough for Elite... let's get a little smarter.

## Use the State, Luke
Initial system state can be set using the `defaultOptions` prop, lets set two properties in our state:

```js
    defaultOptions: {
        state: {
            armySize: 12
            buildCompleted: false
        },
    },
```

So now we have some default state, we'll get to what it means in a bit. Also, when the last build task is completed, the `buildComplete` function is invoked. So let's add that method now to flip our flag:

```js
    async buildComplete() {
        this.setState({ buildComplete: true });
    },
```

Great, now we have a way of checking if our build is complete or not. Just by looking at `this.state.buildComplete`. Also we have a default army size of 12. Let's use these variables to add some logic to our `onStep` function.

```js
    if (this.state.buildComplete) {
        // only get idle units, so we know how many are in waiting
        const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue); 

        if (idleCombatUnits.length > this.state.armySize) {
            // add to our army size, so each attack is slightly larger
            this.setState({ armySize: this.state.armySize + 2 });
            const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

            return Promise.all([enemyNat, enemyMain].map((expansion) => {
                return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
            }));
        }
    }
```

Awesome. Now we will continuously attack in waves once our build is done, with each wave slightly larger than the last. Now pump the difficultly up to `HARDER` or `VERYHARD` (which is Elite) and let 'em rip. This simple bot will actually win against Elite AI a large % of the time (around 85%~ in my testing), only really losing to the 7RR other early cheese it sometimes pulls out.

## Recap
A nice starting point for a winning bot in well under 100 lines :) If you got lost anywhere along the way, here's a link to the full code of the tutorial agent: [tutorial.js](../examples/tutorial.js).

## What's Next?
Try making some enhancements to this agent:
- "Seek and destroy" to finish games when opponent has stray buildings around the map or takes an early third
- Adjust workers to move off of gas when no longer needed, adjust build order to make 3 less workers
- Or instead of the above, adjust build to make a few gas units here or there to mix in with chargelots
- research warpgate! make a warp prism!
- use your probes to help defend against earlier all-ins (like the 7RR that the zerg Elite AI occasionally does)

Or anything else you can think of! Come visit us in the Starcraft 2 AI Discord (https://discord.gg/Emm5Ztz), channel #javascript