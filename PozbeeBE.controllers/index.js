(function(controllers){
    var express = require('express');
    var router = express.Router();
    var clientController = require("./clientController");
    var userController = require("./userController");
    var photographerController = require("./photographerController");

    controllers.init = function(app, io){
        app.use("/api/client", clientController.init(router));
        app.use("/api/users", userController.init(router));
        app.use("/api/photographer", photographerController.init(router));
    }

    controllers.applyIOToControllers = function(customerIO, photographerIO){
        userController.io = customerIO;
        photographerController.customerIO = customerIO;
        photographerController.photographerIO = photographerIO;
    }
})(module.exports);