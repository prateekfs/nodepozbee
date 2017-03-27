(function(controllers){
    var express = require('express');
    var router = express.Router();

    controllers.init = function(app){
        var clientController = require("./clientController");
        var userController = require("./userController");
        var photographerController = require("./photographerController");
        app.use("/api/client", clientController.init(router));
        app.use("/api/users", userController.init(router));
        app.use("/api/photographer", photographerController.init(router));
    }
})(module.exports);