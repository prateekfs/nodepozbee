(function(controllers){
    var express = require('express');
    var router = express.Router();
    var clientController = require("./clientController");
    var userController = require("./userController");
    var photographerController = require("./photographerController");
    var applyPhotographerController = require("./applyPhotographerController");
    var customerController = require("./customerController");
    controllers.init = function(app, io){
        app.use("/api/client", clientController.init(router));
        app.use("/api/users", userController.init(router));
        app.use("/api/photographer", photographerController.init(router));
        app.use("/api/apply", applyPhotographerController.init(router));
        app.use("/api/customer",customerController.init(router));
    }

    controllers.applyIOToControllers = function(io){
        userController.io = io;
        photographerController.io = io;
        photographerController.io = io;
    }
})(module.exports);