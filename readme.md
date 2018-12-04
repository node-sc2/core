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

Now make sure you have an instance of the SC2 client running with the proto server. On windows, you would do this by navigating in a command prompt to: `C:\Program Files (x86)\StarCraft II\Support64` and running the command: `"C:\Program Files (x86)\StarCraft II\Versions\Base70154\SC2_x64.exe" -listen 127.0.0.1 -port 5000 -displayMode 0`, assuming default installation location and uptodate Base version. NOTE: In the near future a launcher will be added so this 'just works' across all platforms.

Now you can watch it go with `node main.js`. Wasn't that easy? Now this isn't going to win you any awards... but it might win you a few games against the built-in AI.

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

### Getting Help
First I would encourage you to read through all available documentation. Beyond this readme, three other user documents are available:

- [Overview](docs/overview.md)
- [Tutorial](docs/tutorial.md)
- [API Reference](docs/api.md)

Beyond that, there are also two documents aimed towards those wanting to help develop the core library, or just understanding more about how it works:

- [Design](docs/design.md)
- [Internals](docs/internals.md)

Beyond the documentation, Starcraft 2 AI has a *very* active community, available through this discord invitation link: https://discord.gg/Emm5Ztz - This library specifically can be discussed in the #javascript channel. Come say hi!






