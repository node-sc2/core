
'use strict';

const rgb = (r, g, b) => ({ r, g, b });

const color = {
    BLACK: rgb(0, 0, 0),
    GRAY: rgb(128, 128, 128),
    SILVER:	rgb(192, 192, 192),
    WHITE: rgb(255, 255, 255),
    YELLOW: rgb(255, 255, 0),
    ORANGE_RED: rgb(255,69,0),
    CRIMSON: rgb(220,20,60),
    FIREBRICK: rgb(178,34,34),
    MAROON: rgb(128, 0, 0),
    RED: rgb(255, 0, 0),
    DARK_GREEN: rgb(0,100,0),
    GREEN: rgb(0, 128, 0),
    LIGHT_GREEN: rgb(28, 192, 28),
    LIME_GREEN: rgb(50,205,50),
    PALE_GREEN: rgb(152,251,152),
    LIME: rgb(0, 255, 0),
    SPRING_GREEN: rgb(0,255,127),
    OLIVE: rgb(128, 128, 0),
    NAVY: rgb(0, 0, 128),
    BLUE: rgb(0, 0, 255),
    TEAL: rgb(0, 128, 128),
    AQUA: rgb(0, 255, 255),
    PURPLE: rgb(128, 0, 128),
    HOT_PINK: rgb(255,105,180),
    FUCHSIA: rgb(255, 0, 255),
};

module.exports = color;
