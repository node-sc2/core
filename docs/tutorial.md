# Tutorial
In this tutorial we're going to walk through creating a relatively simple bot, but one that is capable of consistently beating the built in Elite AI (random race) and on random maps.

## Setup
The first thing we're going to do is create a new directory for your bot, and initialize the project. First, in your newly created directory, `npm init`. Then after the prompts, install `node-sc2` with `npm install --save @node-sc2/core`. Now create a new entry file. You should name it whatever you chose during your `init`. It's common to use `index.js` or `app.js`, but in this example I will use `main.js` (as it makes a little more sense in the non-web context of our agent). Then lets populate the entry point with the same code from the readme, but without the `onGameStart` method, and with making our bot Protoss instead of Random:

```js
const { createAgent, createEngine, createPlayer } = require('@node-sc2/core');
const { Difficulty, Race } = require('@node-sc2/core/constants/enums');

const bot = createAgent();

const engine = createEngine();

engine.connect().then(() => {
    return engine.runGame('Blueshift LE', [
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


