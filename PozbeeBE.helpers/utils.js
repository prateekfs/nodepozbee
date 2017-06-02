var crypto = require("crypto");
var moment = require('moment-timezone');
var tzlookup = require("tz-lookup");
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

global.instantRequestTimers = [];
global.NotificationEnum = Object.freeze(
    {
        "NewInstantRequest" : 1,
        "RequestCancelled" : 2,
        "PhotographerIsComing" : 3,
        "PhotographerArrived": 4,
        "PhotographingSessionStarted" :5,
        "PhotographingSessionFinished" :6,
        "NonEditedPhotosAdded" : 7,
        "PhotographsSelected" : 8,
        "EditedPhotosAdded" : 9
    })

global.getLocalTimeByLocation = function(location ,date){
    var zone = tzlookup(location[1],location[0]);
    var d = moment.utc(date);
    var formattedDate = d.format("LLL");

    return formattedDate;
}