(function(controllers){
    var express = require('express');
    var router = express.Router();

    controllers.init = function(app){
        var clientController = require("./clientController");
        var userController = require("./userController");

        app.use("/api/client", clientController.init(router));
        app.use("/api/users", userController.init(router));
    }
})(module.exports);