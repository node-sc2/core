'use strict';

const chalk = require('chalk');
const Uint1Array = require('uint1array').default;

/**
 * @param {Grid2D} grid 
 */
function debugGrid(grid, playable, height = false) {
    const pointInRect = ({p0, p1}, x, y) => (
        (x > p0.x && x < p1.x) && (y > p0.y && y < p1.y)
    );

    const displayGrid = grid.slice().reverse();

    displayGrid.forEach((row, x) => {
        console.log(
            [...row].map((pixel, y) => {
                if (height === true) {
                    return chalk.rgb(0, pixel, 0)('X');
                }
                switch(pixel) {
                    case 0:
                        if (!pointInRect(playable, x, y)) {
                            return chalk.bgRed` `;
                        } else {
                            return chalk.bgGreen` `;
                        }
                    case 1:
                        return '░';
                    case 66:
                        return chalk.bgBlue` `;
                    case 114:
                        // @ts-ignore
                        return chalk.bgCyanBright`░`;
                    case 104:
                        
                        // ???
                        return;
                    case 72:
                        // @ts-ignore
                        return chalk.bgRed`░`;
                    default:
                        return pixel;
                }
            }).join('')
        );
    });
}

/**
 * @param {Uint8Array} buffer
 * @param {number} i
 * @param {number} bit
 */
function readSingleBit(buffer, i, bit){
    return (buffer[i] >> bit) % 2;
}

// /**
//  * @param {SC2APIProtocol.ImageData} imageData
//  * @param {number} width
//  * @returns {Grid2D}
//  */
// function consumeImageData(imageData, width, height = Infinity) {
//     if (!width) {
//         throw new Error('Map width needed to digest raw grids!');
//     }

//     const BYTE_OFFSET = imageData.data.byteOffset;
//     const BYTE_LENGTH = imageData.data.byteLength;
//     const BITS_PER_PIXEL = imageData.bitsPerPixel;
//     const WIDTH_IN_BYTES = BITS_PER_PIXEL === 1
//         ? width * 0.125
//         : width;

//     /* new fast code, 0.02ms per digestion */
//     const arrayBuffer = imageData.data.buffer;

//     const View = BITS_PER_PIXEL === 1
//         ? Uint1Array
//         : Uint8Array;

//     const result = [];
//     let i = 0;

//     while (i < BYTE_LENGTH) {
//         if (result.length >= height) {
//             break;
//         }

//         if (arrayBuffer.byteLength < (BYTE_OFFSET + i )) {
//             break;
//         }

//         result.push(new View(arrayBuffer, i + BYTE_OFFSET, WIDTH_IN_BYTES));
//         i += WIDTH_IN_BYTES;
//     }

//     return result.reverse();
// }

/**
 * @param {SC2APIProtocol.ImageData} imageData
 * @param {number} width
 * @returns {Grid2D}
 */
function consumeImageData(imageData, width, height = Infinity) {
    if (!width) {
        throw new Error('Map width needed to digest raw grids!');
    }

    let data = imageData.data.slice();
    const BITS_PER_PIXEL = imageData.bitsPerPixel;

    if (BITS_PER_PIXEL === 1 ) {
        data = data.reduce((pixels, byte) => {
            return pixels.concat(byte.toString(2).padStart(8, '0').split('').map(s => parseInt(s, 10)));
        }, []);
    }
    const result = [];
    let i = 0;

    while (data.length > 0) {
        if (result.length > height) {
            break;
        }

        result.push(data.splice(0, width));
        i += width;
    }

    return result;
}

/**
 * 
 * @param {SC2APIProtocol.StartRaw} raw
 * @returns {Grids}
 */
function consumeRawGrids(raw) {
    const { mapSize, placementGrid: plGrid, pathingGrid: paGrid, terrainHeight: teGrid } = raw;
    const { x, y } = mapSize;
    
    const placementGrid2D = consumeImageData(plGrid, x, y);
    // debugGrid(placementGrid2D, raw.playableArea);

    const pathingGrid2D = consumeImageData(paGrid, x, y).map(row => row.map(cell => cell === 0 ? 1 : 0));
    // debugGrid(pathingGrid2D, raw.playableArea);

    const heightGrid2D = consumeImageData(teGrid, x, y);
    
    const height = heightGrid2D.map((row) => {
        return row.map(tile => {
            /**
             * functional approximation just isn't good enough here...
             * so unless we store a float, this is the other option -
             */
            const approx = Math.ceil(
                Math.round(((tile - 127) / 8) * 10) / 5
            ) * 5;
            if (approx < 0) return 0;
            else return approx;
        });
    });

    const miniMap = placementGrid2D.map((row, y) => {
        return row.map((pixel, x) => {
            if (pixel === 1 && pathingGrid2D[y][x] === 0) {
                return 66;
            } else if (pixel === 0 && pathingGrid2D[y][x] === 0) {
                return 114;
            } else {
                return pixel;
            }
        });
    });

    // debugGrid(miniMap, raw.playableArea);

    return {
        height,
        miniMap,
        placement: placementGrid2D,
        pathing: pathingGrid2D,
    };
}

module.exports = { consumeRawGrids, consumeImageData, debugGrid };