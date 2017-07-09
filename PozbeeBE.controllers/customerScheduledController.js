(function(customerScheduledController) {
    var database = require("../PozbeeBE.data/database");
    var mongoose = require("mongoose");
    var customerOperations = require("../PozbeeBE.managers/customerOperationsManager");
    var scheduledCustomerOperations = require("../PozbeeBE.managers/scheduledCustomerOperations");
    var photographerOperations = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest: "./uploads"});
    var _ = require("underscore");
    var async = require("async");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var iosNotification;


    customerScheduledController.applyIOToManagers = function(io){
        customerOperations.io = io;
    }

    customerScheduledController.init = function(router){
        router.get("/getPhotographers", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var date = req.query.date;
            var categoryId = mongoose.Types.ObjectId(req.query.categoryId);
            var location = _.map(req.query.location, function(a) { return Number(a) });

            scheduledCustomerOperations.getPhotographersToSchedule(date, categoryId, location, function(err, result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });


        return router;
    }
})(module.exports);