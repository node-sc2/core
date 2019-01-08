'use strict';

/**
 * 
 * @param {Array<T>} arr
 * @returns {T}
 * @template T 
 */
const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];
module.exports = getRandom;