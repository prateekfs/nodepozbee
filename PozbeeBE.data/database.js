(function(database){
    var mongoose = require("mongoose");
    var db = mongoose.connection;
    var config = require("../config");
    mongoose.connect(config.get("mongoose:uri"));
    db.once("open",function(err){

    });

    database.Client = require("./collections/client").Model;
    database.AccessToken = require("./collections/accessToken").Model;
    database.RefreshToken = require("./collections/refreshToken").Model;
    database.PhoneActivation = require("./collections/phoneActivation").Model;
    database.User = require("./collections/user").Model;
    database.Device = require("./collections/device").Model;
})(module.exports);
