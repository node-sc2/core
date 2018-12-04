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
                    case 'h':
                        // @ts-ignore
                        return chalk.bgGreen`░`;
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
    const gridarr = [...imageData.data];

    const grid2d = [];
    while(gridarr.length) grid2d.push(gridarr.splice(0, width));

    return grid2d;
}

/**
 * 
 * @param {SC2APIProtocol.StartRaw} raw
 * @returns {Grids}
 */
function consumeRawGrids(raw) {
    const { mapSize, placementGrid: plGrid, pathingGrid: paGrid } = raw;
    const width = mapSize.x;

    const placementGrid2D = consumeImageData(plGrid, width);
    const pathingGrid2D = consumeImageData(paGrid, width);

    const placement = placementGrid2D.map((row) => {
        return row.map(pixel => {
            return pixel === 255 ? 1 : 0;
        }); 
    }).reverse();
    
    //debugGrid(placement);

    const pathing = pathingGrid2D.map((row) => {
        return row.map(pixel => {
            return pixel === 255 ? 1 : 0;
        });
    }).reverse();

    //debugGrid(pathing);

    return {
        placement,
        pathing,
        miniMap: placement.map((row, y) => {
            return row.map((pixel, x) => {
                if (pixel === 1 && pathing[y][x] === 1) {
                    return 'B';
                } else if (pixel === 0 && pathing[y][x] === 0) {
                    return 'r';
                } else {
                    return pixel;
                }
            });
        }),
    };
}

module.exports = { consumeRawGrids, debugGrid };