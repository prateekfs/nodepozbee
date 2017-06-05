(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var customerOperationsManager = require("../PozbeeBE.managers/customerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads/initialPhotos"});
    var editedUpload = multer({dest : "./uploads/editedPhotos"});
    var mongoose = require("mongoose");
    var iosNotification;


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
                    photographerController.iosNotification.sendNotification(userId,"Photographer cancelled the request.");
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
        router.get("/informCustomer",passport.authenticate("bearer", {session : false}), function(req,res,next){
            var userId = mongoose.Types.ObjectId(req.query.userId);
            photographerController.iosNotification.sendNotification(userId, "Photographer is coming", {type : global.NotificationEnum.PhotographerIsComing});
        });
        router.get("/confirmArrivalOfPhotographer", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.query.instantRequestId);
            photographerOperationsManager.confirmArrivalOfPhotographer(instantRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photographerHasArrived", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photographer has arrived!",{type : global.NotificationEnum.PhotographerArrived});

                    res.status(200).send(result);
                }
            });
        });
        router.get("/startPhotoShooting", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.query.instantRequestId);
            photographerOperationsManager.startPhotoShooting(instantRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photoShootingHasBeenStarted", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photo shooting has been started!", {type : global.NotificationEnum.PhotographingSessionStarted});

                    res.status(200).send(result);
                }
            });
        });

        router.get("/finishPhotoShooting", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.query.instantRequestId);
            photographerOperationsManager.finishPhotoShooting(instantRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    var obj = result.resultObject;
                    photographerController.io.of("customer").to(obj.userId.toString()).emit("photoShootingHasBeenFinished", obj);
                    photographerController.iosNotification.sendNotification(obj.userId,"Photo shooting has been finished!", {type : global.NotificationEnum.PhotographingSessionFinished});

                    res.status(200).send(result);
                }
            });
        });

        router.get("/getPhotographerInstantRequestsHistory", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var photographerId = mongoose.Types.ObjectId(req.query.photographerId);
            var skipCount = Number(req.query.skip);
            var limitCount = Number(req.query.limit);
            var include = req.query.include == "" ? null : mongoose.Types.ObjectId(req.query.include);
            var exclude = req.query.exclude == "" ? null : mongoose.Types.ObjectId(req.query.exclude);
            photographerOperationsManager.getPhotographerInstantRequestsHistory(photographerId, skipCount, limitCount, include, exclude, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        var cpUpload = upload.fields([{ name: 'initialPhotos', mimeType : "jpeg"}]);
        router.post("/uploadInitialPhotos", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.body.instantRequestId);
            var photos = req.files.initialPhotos;
            photographerOperationsManager.uploadInitialPhotosOfInstantRequest(instantRequestId,photos, function(err, result, instantRequest){
                if(err){
                    res.status(444).send(err);
                }else{
                    var date = global.getLocalTimeByLocation(instantRequest.location.coordinates, instantRequest.finishedDate);
                    photographerController.iosNotification.sendNotification(instantRequest.userId,'Photos have uploaded for your Instant Photo Shooting which had finished on ' + date + '. Select photos you like to be retouched.',{type : global.NotificationEnum.NonEditedPhotosAdded, id : instantRequest._id.toString()})
                    res.status(200).send(result);
                }
            });
        });

        var cpUpload = editedUpload.fields([{ name: 'editedPhotos', mimeType : "jpeg"}]);
        router.post("/uploadEditedPhotos", cpUpload, passport.authenticate("bearer",{session : false}) , function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.body.instantRequestId);
            var photos = req.files.editedPhotos;
            photographerOperationsManager.uploadEditedPhotosOfInstantRequest(instantRequestId,photos, function(err, result, instantRequest){
                if(err){
                    res.status(444).send(err);
                }else{
                    var date = global.getLocalTimeByLocation(instantRequest.location.coordinates, instantRequest.finishedDate);
                    photographerController.iosNotification.sendNotification(instantRequest.userId,'Retouched Photos have uploaded for your Instant Photo Shooting which had finished on ' + date + '.',{type : global.NotificationEnum.EditedPhotosAdded, id : instantRequest._id.toString()})
                    res.status(200).send(result);
                }
            });
        })

        return router;
    }
})(module.exports);