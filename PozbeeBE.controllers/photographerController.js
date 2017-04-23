(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});

    photographerController.applyIOToManagers = function(io){
        photographerOperationsManager.io = io;
    }

    photographerController.init = function(router){

        router.get("/createPhotographer", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            photographerOperationsManager.createPhotographer(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/setPhotographerActive/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isActive = req.query.isActive === "1" ? true : false;
            var deviceId = req.query.deviceId;
            var userId = req.user._id;
            photographerOperationsManager.setPhotographerActiveStatus(userId, photographerId, isActive, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   if(photographerController.io){
                       photographerController.io.of("photographer").to(req.user._id.toString()).emit("photographerActiveStatusChanged",isActive,deviceId);
                   }
                   res.status(200).send(result);
               }
            });
        });

        router.get("/setPhotographerOnline/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isOnline = req.query.isOnline == "1" ? true : false;
            var deviceId = req.query.deviceId;
            photographerOperationsManager.setPhotographerOnlineStatus(photographerId,isOnline, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    if(photographerController.io){
                        photographerController.io.of("photographer").to(req.user._id.toString()).emit("photographerOnlineStatusChanged",isOnline,deviceId);
                        photographerController.io.of("customer").to(req.user._id.toString()).emit("joinedSuccessFully",isOnline,deviceId);
                    }
                    res.status(200).send(result);
                }
            });
        });

        router.get("/checkIfPhotographerUpdated/:photographerId/:version", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var version = Number(req.params.version)
            photographerOperationsManager.checkIfPhotographerUpdated(photographerId,version, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });

        router.post("/uploadPhotographerLocation", passport.authenticate("bearer",{session : false}), function(req,res){
            var userId = req.user._id;
            var data = req.body;
            photographerOperationsManager.updateLocationOfPhotographer(userId, data, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });

        return router;
    }
})(module.exports);