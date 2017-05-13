(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var customerOperationsManager = require("../PozbeeBE.managers/customerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});
    var mongoose = require("mongoose");

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
            photographerOperationsManager.updateLocationOfPhotographer(userId, data, function(err,result, photographerId){
                if(err){
                    res.status(444).send(err);
                } else{
                    photographerOperationsManager.updatePhotographersActiveInstantRequest(photographerId, req.body, function(err,instantRequestResult){
                        if(!err && instantRequestResult){
                            photographerController.io.of("customer").to(instantRequestResult.userId.toString()).emit("instantRequestPhotographerLocationChanged", data);
                        }
                    });
                    res.status(200).send(result);
                }
            });
        });

        router.post("/respondToPhotographerRequest",passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.body.photographerId);
            var accepted = req.body.accepted == "1" ? true : (req.body.accepted === "true" ? true : false);
            var instantRequestId = mongoose.Types.ObjectId(req.body.instantRequestId);
            var userId = req.user._id;
            photographerOperationsManager.respondToInstantPhotographerRequest(accepted,photographerId,instantRequestId,function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id === instantRequestId.toString() });
                   if (index != -1){
                       var obj = global.instantRequestTimers[index];
                       clearTimeout(obj.timer);
                       obj.cb();
                   }

                   res.status(200).send(result);
               }
            });
        });

        router.get("/photographerCancelInstantRequest/:instantRequestId", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.params.instantRequestId);
            photographerOperationsManager.cancelInstantRequest(req.user, instantRequestId, function(err, userId, result){
                if(err){
                    res.status(444).send(err);
                }else{
                    photographerController.io.of("customer").to(userId.toString()).emit("instantRequestCancelled", instantRequestId.toString());
                    res.status(200).send(result);
                }
            })
        });

        router.get("/checkIfPhotographerHasActiveInstantRequest/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.params.photographerId);
            photographerOperationsManager.checkIfPhotographerHasActiveInstantRequest(photographerId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        return router;
    }
})(module.exports);