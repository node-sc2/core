'use strict';

const chalk = require('chalk');
const Uint1Array = require('uint1array').default;

 /**
  * @param {Grid2D} grid 
  */
function debugGrid(grid, playable) {
    const pointInRect = ({p0, p1}, x, y) => (
        (x > p0.x && x < p1.x) && (y > p0.y && y < p1.y)
    );

    const displayGrid = grid.slice();

    displayGrid.forEach((row, x) => {
        console.log(
            [...row].map((pixel, y) => {
                switch(pixel) {
                    case 0:
                        if (!pointInRect(playable, x, y)) {
                            return chalk.bgRed` `;
                        } else {
                            return chalk.bgGreen` `;
                        }
                    case 1:
                        return '░';
                    case 104:
                        // @ts-ignore
                        return chalk.bgGreen`░`;
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

/**
 * @param {SC2APIProtocol.ImageData} imageData
 * @param {number} width
 * @returns {Grid2D}
 */
function consumeImageData(imageData, width, height = Infinity) {
    if (!width) {
        throw new Error('Map width needed to digest raw grids!');
    }

    const BYTE_OFFSET = imageData.data.byteOffset;
    const BYTE_LENGTH = imageData.data.byteLength;
    const WIDTH_IN_BYTES = width * 0.125;
    // const BITS_PER_PIXEL = imageData.bitsPerPixel;

    /* new fast code, 0.02ms per digestion */
    const arrayBuffer = imageData.data.buffer;

    const result = [];
    let i = 0;

    while (i < BYTE_LENGTH) {
        if (result.length >= height) {
            break;
        }

        if (arrayBuffer.byteLength < (BYTE_OFFSET + i )) {
            break;
        }

        const row = new Uint1Array(arrayBuffer, i + BYTE_OFFSET, WIDTH_IN_BYTES);
        result.push(row);
        i += WIDTH_IN_BYTES;
    }

    return result;
    // return result.reverse();

    /* old slow code, ~2ms per digestion */
    // const gridarr = [...imageData.data];

    // const grid2d = [];
    // while(gridarr.length) grid2d.push(gridarr.splice(0, width));

    // return grid2d;
}

/**
 * 
 * @param {SC2APIProtocol.StartRaw} raw
 * @returns {Grids}
 */
function consumeRawGrids(raw) {
    const { mapSize, placementGrid: plGrid, pathingGrid: paGrid, terrainHeight: teGrid } = raw;
    const { x, y } = mapSize;

    // console.log(mapSize, plGrid, paGrid)
    // @WIP: more trying to log / debug things... maybe helpful?
    
    const placementGrid2D = consumeImageData(plGrid, x, y);
    debugGrid(placementGrid2D, raw.playableArea);

    const pathingGrid2D = consumeImageData(paGrid, x, y);
    

    const heightGrid2D = consumeImageData(teGrid, x, y);

    const height = heightGrid2D.map((row) => {
        return row.map(tile => {
            /**
             * functional approximation just isn't good enough here...
             * so unless we store a float, this is the other option -
             */
            const approx = Math.round((-100 + 200 * tile / 255)) * 10;
            return Math.ceil(approx / 5) * 5;
        });
    });

    // const placement = placementGrid2D.map((row) => {
    //     return row.map(pixel => {
    //         return pixel === 255 ? 1 : 0;
    //     }); 
    // });
    
    

    // const pathing = pathingGrid2D.map((row) => {
    //     return row.map(pixel => {
    //         return pixel === 255 ? 1 : 0;
    //     });
    // });

    return {
        height,
        placement: placementGrid2D,
        pathing: pathingGrid2D,
        miniMap: placementGrid2D.map((row, y) => {
            return row.map((pixel, x) => {
                if (pixel === 1 && pathingGrid2D[y][x] === 1) {
                    return 66;
                } else if (pixel === 0 && pathingGrid2D[y][x] === 0) {
                    return 114;
                } else {
                    return pixel;
                }
            });
        }),
    };
}

module.exports = { consumeRawGrids, consumeImageData, debugGrid };