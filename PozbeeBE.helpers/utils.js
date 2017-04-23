var crypto = require("crypto");

GLOBAL.randomValueBase64 = function randomValueBase64 (len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}

GLOBAL.Dictionary = function Dictionary() {
    var dictionary = {};

    this.setData = function (key, val) { dictionary[key] = val; }
    this.getData = function (key) { return dictionary[key]; }
    this.removeKey = function (key) { delete dictionary[key]; }

    this.dict = dictionary

}
global.METERS_PER_MILE = 1609.344;