'use strict';

const chalk = require('chalk');

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
 * @param {SC2APIProtocol.ImageData} imageData
 * @param {number} width
 * @returns {Grid2D}
 */
function consumeImageData(imageData, width) {
    /* new fast code, 0.02ms per digestion */
    const arrayBuffer = imageData.data.buffer;

    const result = [];
    let i = 0;
    
    while (i < imageData.data.byteLength) {
    	result.push(new Uint8Array(arrayBuffer, i + imageData.data.byteOffset, width));
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
    const width = mapSize.x;

    const placementGrid2D = consumeImageData(plGrid, width);
    const pathingGrid2D = consumeImageData(paGrid, width);
    const heightGrid2D = consumeImageData(teGrid, width);

    const height = heightGrid2D.map((row) => {
        return row.map(tile => {
            return Math.round(-100 + 200 * tile / 255);
        });
    });

    const placement = placementGrid2D.map((row) => {
        return row.map(pixel => {
            return pixel === 255 ? 1 : 0;
        }); 
    });
    
    //debugGrid(placement);

    const pathing = pathingGrid2D.map((row) => {
        return row.map(pixel => {
            return pixel === 255 ? 1 : 0;
        });
    });

    //debugGrid(pathing);

    return {
        height,
        placement,
        pathing,
        miniMap: placement.map((row, y) => {
            return row.map((pixel, x) => {
                if (pixel === 1 && pathing[y][x] === 1) {
                    return 66;
                } else if (pixel === 0 && pathing[y][x] === 0) {
                    return 114;
                } else {
                    return pixel;
                }
            });
        }),
    };
}

module.exports = { consumeRawGrids, consumeImageData, debugGrid };