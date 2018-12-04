'use strict';

const rgb = (r, g, b) => ({ r, g, b });

const color = {
    WHITE: rgb(255, 255, 255),
    RED: rgb(255, 0, 0),
    GREEN: rgb(0, 255, 0),
    YELLOW: rgb(255, 255, 0),
    BLUE: rgb(0, 0, 255),
    TEAL: rgb(0, 255, 255),
    PURPLE: rgb(255, 0, 255),
    BLACK: rgb(0, 0, 0),
    GRAY: rgb(128, 128, 128),
};

module.exports = color;