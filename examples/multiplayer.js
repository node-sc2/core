'use strict';

const { createAgent, createEngine } = require('../sc2');
const { PlayerType, Race } = require('../constants/enums');
const defenseSystem = require('../userSystems/defense');
const workerSystem = require('../userSystems/worker');
const supplySystem = require('../userSystems/supply');
const expansionSystem = require('../userSystems/expansion');
const chargelotArchon = require('../builds/chargelotArchon');

const mapPool = [
    'Dreamcatcher LE',
    'Blueshift LE',
    'Acid Plant LE',
    'Cerulean Fall LE',
    'Para Site LE',
    'Lost and Found LE',
];

const randomMap = mapPool[Math.floor(Math.random() * mapPool.length)];

const bot = createAgent({
    settings: {
        type: PlayerType.PARTICIPANT,
        race: Race.PROTOSS,
    },
});

bot.use([
    workerSystem,
    supplySystem,
    defenseSystem,
    expansionSystem,
    chargelotArchon,
]);

const bot2 = createAgent({
    settings: {
        type: PlayerType.PARTICIPANT,
        race: Race.TERRAN,
    },
});

// const bot3 = createBot({
//     settings: {
//         type: PlayerType.OBSERVER,
//     }
// });

const engine = createEngine({ port: 5555 });
// const engine2 = createEngine({ port: 5556 });
// const engine3 = createEngine({ port: 5557 });

engine.connect().then(async () => {
    // 'Dreamcatcher LE', 'Blueshift LE', 'Acid Plant LE'
    await engine.createGame(randomMap, [
        bot.settings,
        bot2.settings,
        // {
        //     type: PlayerType.COMPUTER,
        //     race: Race.RANDOM,
        //     difficulty: Difficulty.MEDIUMHARD,
        // },
    ]);

    await engine.joinGame(bot, {
        sharedPort: 5680,
        serverPorts: {
            gamePort: 5681, 
            basePort: 5682,
        },
        clientPorts: [{
            gamePort: 5683,
            basePort: 5684,
        }, {
            gamePort: 5685,
            basePort: 5686,
        }]
    });

    engine.runLoop();
});

// async function connectToHost(engine, bot) {
//     return engine.joinGame(bot, {
//         sharedPort: 5680,
//         serverPorts: {
//             gamePort: 5683,
//             basePort: 5684,
//         },
//         clientPorts: [{
//             gamePort: 5683,
//             basePort: 5684,
//         }, {
//             gamePort: 5685,
//             basePort: 5686,
//         },
//         {
//             gamePort: 5687,
//             basePort: 5688,
//         }]
//     });
// }

// engine2.onConnect = async function() {
//     await connectToHost(engine2, bot2);

//     engine2.runLoop();
// };

// engine3.onConnect = async function() {
//     await connectToHost(engine3, bot3);

//     engine3.runLoop();
// };

// engine2.connect();
// engine3.connect();
