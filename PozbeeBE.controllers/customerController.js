(function(customerController){
    var database = require("../PozbeeBE.data/database");
    var mongoose = require("mongoose");
    var customerOperations = require("../PozbeeBE.managers/customerOperationsManager");
    var photographerOperations = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});
    var _ = require("underscore");
    var async = require("async");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var iosNotification;

    customerController.applyIOToManagers = function(io){
        customerOperations.io = io;
    }

    customerController.init = function(router){

        router.post("/getPhotographersWithinRect", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var arrayOfCoordinates = [];
            var arrayOfRegion = [];
            _.each(req.body["region[][]"],function(val,i){
                if((i+1)%2 == 1){
                    arrayOfCoordinates.push(Number(val));
                }else{
                    arrayOfCoordinates.push(Number(val));
                    var clone = JSON.parse(JSON.stringify(arrayOfCoordinates));
                    arrayOfRegion.push(clone);
                    arrayOfCoordinates = [];
                }
            });
            customerOperations.getPhotographersWithinRect(arrayOfRegion, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });
        router.post("/requestInstantPhotographer", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            var location = _.map(!req.body["location[]"] ? req.body["location"] : req.body["location[]"] , function(a){return Number(a)});
            var categoryId = req.body.categoryId;
            var photographStyle = Number(req.body.photographStyle);

            customerOperations.findPhotographersForInstant(userId, location, categoryId, photographStyle, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    setTimeout(function(){
                        customerOperations.checkIfInstantRequestStarted(result._id);
                    },10000);
                    res.status(200).send(result);
                }
            });
        });

        router.get("/checkIfInstantRequestOperationFinished/:instantRequestId", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var instantRequestId = req.params.instantRequestId;
            customerOperations.checkIfInstantRequestOperationFinished(instantRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            });
        });

        router.get("/checkIfUserHasUnFinishedInstantRequest", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            customerOperations.checkIfUserHasUnfinishedInstantRequest(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        })

        router.get("/startCheckingPhotographers/:instantRequestId", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.params.instantRequestId);
            customerOperations.getInstantRequestById(instantRequestId, function(err,result) {
                if (err || !result || result.finished) {

                } else {
                    customerOperations.setInstantRequestStarted(instantRequestId,function(err){
                        if(!err){
                            customerController.nameThisMotherfucker(result);
                        }
                    })

                }
            });
            res.status(200).send(operationResult.createSuccesResult());
        });

        router.get("/confirmFinishedPhotoShooting", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.query.instantRequestId);
            customerOperations.confirmFinishedPhotoShooting(instantRequestId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });

        router.get("/cancelInstantRequest/:instantRequestId", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var instantRequestId = mongoose.Types.ObjectId(req.params.instantRequestId);
            customerOperations.cancelInstantRequest(instantRequestId, function(err,photographerIds, result){
                if(err){
                    res.status(444).send(err);
                } else{
                    var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id = instantRequestId.toString() });
                    if (index != -1){
                        var obj = global.instantRequestTimers[index];
                        clearTimeout(obj.timer);
                        obj.cb();
                    }
                    if(photographerIds){
                        _.each(photographerIds, function(id){
                            photographerOperations.getPhotographerUserId(id, function(err,userId){
                                if(!err && userId){
                                    customerController.io.of("photographer").to(userId.toString()).emit("instantRequestCancelled", instantRequestId);
                                    customerController.iosNotification.sendNotification(userId, "Customer cancelled the request", {type : global.NotificationEnum.RequestCancelled});
                                }
                            })
                        })
                    }
                    res.status(200).send(result);
                }
            });
        });
        router.get("/getUsersInstantRequestsHistory", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var skipCount = Number(req.query.skip);
            var limitCount = Number(req.query.limit);
            var userId = req.user._id;
            var include = req.query.include == "" ? null : mongoose.Types.ObjectId(req.query.include);
            var exclude = req.query.exclude == "" ? null : mongoose.Types.ObjectId(req.query.exclude);
            customerOperations.getUsersInstantRequestsHistory(userId,skipCount,limitCount, include, exclude, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/getInstantRequestHistory/:id", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var id = mongoose.Types.ObjectId(req.params.id);
            customerOperations.getInstantRequestHistory(id, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });
        router.post("/setSelectedWatermarkPhotos", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var selectedPhotoIds = Array.isArray(req.body["selectedWatermarkedPhotos[]"]) ? _.map(req.body["selectedWatermarkedPhotos[]"], function(id){
               return mongoose.Types.ObjectId(id);
            }) : [req.body["selectedWatermarkedPhotos[]"]];
            var instantRequestId = mongoose.Types.ObjectId(req.body.instantRequestId);
            customerOperations.setSelectedWatermarkPhotos(instantRequestId, selectedPhotoIds, function(err,result, instantRequest){
               if(err){
                   res.status(444).send(err);
               } else{
                   var takenPhotographer = _.find(instantRequest.photographerRequests, function(req) { return req.isTaken === true; });
                   photographerOperations.getPhotographerUserId(takenPhotographer.photographerId, function(err,userId){
                       if(!err) {
                           var date = global.getLocalTimeByLocation(instantRequest.location.coordinates, instantRequest.finishedDate);
                           customerController.iosNotification.sendNotification(userId, 'Your customer from the Instant Photo Shooting from ' + date + ' has selected photos. Check it now.', {
                               type: global.NotificationEnum.PhotographsSelected,
                               id: instantRequest._id.toString()
                           })
                       }
                   });

                   res.status(200).send(result);
               }
            });

        })

        return router;
    }


    customerController.nameThisMotherfucker = function(instantRequest){
        var timer;
        var found = false;
        var cancelled = false;
        async.eachSeries(_.filter(instantRequest.photographerRequests, function(p){ return !p.isAnswered }), function(item, callback){
            customerOperations.checkIfInstantRequestHasTakenOrCancelled(instantRequest._id, function(err, hasFound, hasCancelled){
                if(err){
                    callback(err);
                }else{
                    found = hasFound;
                    cancelled = hasCancelled
                }
                if(found || cancelled){
                    callback();
                    return;
                }
                photographerOperations.getPhotographerUserId(item.photographerId, function(err,userId){
                    if(timer){
                        clearTimeout(timer);
                        var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id = instantRequest._id.toString() });
                        global.instantRequestTimers.splice(index,1);
                    }
                    var userInfo = {
                        instantRequestId : instantRequest._id.toString(),
                        name : instantRequest.userId.name,
                        category : instantRequest.categoryId.name,
                        photographStyle : instantRequest.photographStyle == 1 ? "Indoor" : "Outdoor",
                        pictureUri : instantRequest.userId.socialUser == null ? null : instantRequest.userId.socialUser.pictureUri,
                        location : instantRequest.location.coordinates
                    }
                    customerController.io.of("photographer").to(userId  .toString()).emit("newInstantPhotographerRequest",userInfo);
                    customerOperations.setPhotographerAsked(mongoose.Types.ObjectId(instantRequest._id),item.photographerId, function(err){
                        if(!err){
                            customerController.iosNotification.sendNotification(userId, "You have a instant photographer request. Answer in 15 seconds to get", {type : global.NotificationEnum.NewInstantRequest});
                        }
                    });
                    timer = setTimeout(function(){
                        clearTimeout(timer);
                        callback();
                    },16000);
                    var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id === instantRequest._id.toString() });
                    if (index == -1){
                        global.instantRequestTimers.push({"id" : instantRequest._id.toString(), "timer": timer, "cb" : callback});
                    }

                })
            });
        }, function(err){
            if(timer){
                clearTimeout(timer);
                var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id = instantRequest._id.toString() });
                if (index != -1) {
                    global.instantRequestTimers.splice(index, 1);
                }
            }
            if(!found && !cancelled){
                customerOperations.checkIfInstantRequestHasTakenOrCancelled(instantRequest._id, function(err, hasFound, hasCancelled){
                   if(err){

                   } else if(hasFound === false && hasCancelled === false){
                       customerOperations.setInstantRequestNotFound(instantRequest._id.toString(), function(err,result){
                            if(err){

                            }else{
                                customerController.io.of("customer").to(instantRequest.userId._id.toString()).emit("noPhotographerHasBeenFound");
                            }
                       });
                   } else if(hasFound === true){
                       customerOperations.gatherInstantRequestInformationForCustomer(instantRequest._id, function(err, gatheredInfo){
                           if(!err && gatheredInfo){
                               customerController.io.of("customer").to(instantRequest.userId._id.toString()).emit("photographerFound", gatheredInfo);
                               customerController.iosNotification.sendNotification(instantRequest.userId._id, "Photographer found and is on it's way for your request", {type : global.NotificationEnum.InstantPhotographerFound});
                           }
                       });
                   }
                });

            }else if(found === true){
                customerOperations.gatherInstantRequestInformationForCustomer(instantRequest._id, function(err, gatheredInfo){
                    if(!err && gatheredInfo){
                        customerController.io.of("customer").to(instantRequest.userId._id.toString()).emit("photographerFound", gatheredInfo);
                        photographerController.iosNotification.sendNotification(userId,"Photographer cancelled the request.", {type : global.NotificationEnum.RequestCancelled});
                    }
                });
            }
        })
    }

    function findPhotographer(){

    }
})(module.exports);