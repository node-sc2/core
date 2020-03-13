'use strict';

const chalk = require('chalk');
const Uint1Array = require('uint1array');

 /**
  * @param {Grid2D} grid 
  */
function debugGrid(grid) {
    const displayGrid = grid.slice();
    displayGrid.reverse().forEach((row) => {
        console.log(
            row.map((pixel) => {
                switch(pixel) {
                    case 0:
                        return ' ';
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
    // @WIP: none of this actually works... this debugger statement might help
    // debugger;
    if (!width) {
        throw new Error('Map width needed to digest raw grids!');
    }

    const BYTE_LENGTH = imageData.data.byteLength;

    /* new fast code, 0.02ms per digestion */
    const arrayBuffer = imageData.data.buffer;

    const result = [];
    let i = 0;

    while (i < BYTE_LENGTH) {
        if (result.length >= height) {
            break;
        }
        if (arrayBuffer.byteLength < (imageData.data.byteOffset + (i * 8))) {
            break;
        }
    	result.push(new Uint1Array(arrayBuffer, (i * 8) + imageData.data.byteOffset, width));
    	i += width;
    }
    
    return result.reverse();

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

    // @WIP: more trying to log / debug things... maybe helpful?
    // console.log(paGrid, paGrid.data.buffer);
    const placementGrid2D = consumeImageData(plGrid, x, y);
    const pathingGrid2D = consumeImageData(paGrid, x, y);
    const heightGrid2D = consumeImageData(teGrid, x, y);

    // console.log(pathingGrid2D)

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
    
    debugGrid(placementGrid2D);

    // const pathing = pathingGrid2D.map((row) => {
    //     return row.map(pixel => {
    //         return pixel === 255 ? 1 : 0;
    //     });
    // });

    debugGrid(pathingGrid2D);

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