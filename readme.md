# node-sc2
`node-sc2` is a lightweight node.js framework to facilitate writing simple agents (or "bots") for Starcraft II in JavaScript.

### Why `node-sc2`?
There are a few existing libraries in the node.js ecosystem to work with the C++ API ([sc2client-api](https://github.com/Blizzard/s2client-api)), but `node-sc2` is a pure javascript implementation of [sc2client-proto](https://github.com/Blizzard/s2client-proto), with the goal of being ergonomic across a variety of environments without the need for additional build tools. Under the hood it uses [`@node-sc2/proto`](https://github.com/node-sc2/proto#readme) as the transport layer.

### Getting started
`npm install --save @node-sc2/core`

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

**NOTE**: The first time you run the bot, it will take up to 15 seconds to launch the SC2 client. After that, the default behavior is to keep the client running, so starting a new game in an existing client takes only a moment. Also, feel free to manage the client yourself, as node-sc2 will just use the existing instance listening on the selected port, if it exists.

### Overview
An overview of the library and its usage is available by clicking [here](docs/overview.md). The overview is the recommended place to get started. If you want to skip it and go straight to a tutorial of a bot that can consistently win against the built-in Elite AI, click [here](docs/tutorial.md).

### Notice of Active Development
The goal of `@node-sc2/core` is to use semver. As long as `@node-sc2/core` is pre v1.0.0, the library is under very active development. It may be missing obvious features, even ones that are simple to implement. It may expose APIs that are fundimentally broken. It *may* even break backwards compatibility (although we're going to try really hard not to without major version bumps). The goal is to get to v1.0.0 rapidly and remove this notice.

### Contributing
*Any* contributions are appreciated. That includes detailed issue reports (with repro if possible), comments, concerns, API design/suggestions, and PRs. I will try to work together with everyone as much as feasible to create the best user experience possible.

### Ladder and Tournament Submission
Currently there is no in-place mechanism to submit a bot to any ladder or tournament (such as one that uses the [`Sc2LadderServer`](https://github.com/Cryptyc/Sc2LadderServer)). It is on the major timeline and should be working in multiple capacities by v1.0.0.

### Features and Roadmap
This readme will be updated with a link to a Trello board shortly, outlining feature development roadmap progress. On top of that, github issues can be used to discuss features and bugs.

### Speed Control
Default is 4 frames per step. This can be adjusted with the `STEP_COUNT` env var... for example, `STEP_COUNT=8 node main.js` for faster simulations.

### Debugging
`node-sc2` makes use of the `debug` library. Run your agent with `DEBUG=sc2:debug:*` for additional helpful output, or `DEBUG=sc2:*` for way too much output that's probably not too helpful :) For extra fun, run your script with `node --inspect`, open a chrome instance, navigate to `chrome://inspect` and click on "Open dedicated DevTools for Node". Enjoy the full debugging experience (including cpu and memory profiling, pausing, breakpoints, etc).

### Getting Help
First I would encourage you to read through all available documentation. Beyond this readme, three other user documents are available:

- [Overview](docs/overview.md)
- [Tutorial](docs/tutorial.md)
- [API Reference](docs/api.md)

Beyond that, there are also two documents aimed towards those wanting to help develop the core library, or just understanding more about how it works:

- [Design](docs/design.md)
- [Internals](docs/internals.md)

Beyond the documentation, Starcraft 2 AI has a *very* active community, available through this discord invitation link: https://discord.gg/Emm5Ztz - This library specifically can be discussed in the #javascript channel. Come say hi!






