(function(customerController){
    var database = require("../PozbeeBE.data/database");
    var mongoose = require("mongoose");
    var customerOperations = require("../PozbeeBE.managers/customerOperations");
    var photographerOperations = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});
    var _ = require("underscore");
    var async = require("async");
    var operationResult = require("../PozbeeBE.helpers/operationResult");

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
            customerOperations.getInstantRequestById(instantRequestId, function(err,result){
                if(err || result.finished){

                }else{
                    var timer;
                    var found = false;
                    async.eachSeries(result.photographerRequests, function(item, callback){
                        if(found){
                            callback();
                        }
                        photographerOperations.getPhotographerUserId(item.photographerId, function(err,userId){
                            var userInfo = {
                                name : result.userId.name,
                                category : result.categoryId.name,
                                photographStyle : result.photographStyle == 1 ? "Indoor" : "Outdoor",
                                pictureUri : result.userId.socialUser == null ? null : result.userId.socialUser.pictureUri
                            }
                            customerController.io.of("photographer").to(userId.toString()).emit("newInstantPhotographerRequest",userInfo);
                            customerOperations.setPhotographerAsked(mongoose.Types.ObjectId(instantRequestId),item.photographerId, function(err,result){ });
                            timer = setTimeout(function(){
                                customerOperations.checkIfInstantRequestHasTaken(instantRequestId, function(err,result){
                                    clearTimeout(timer);
                                    if(err){
                                        callback();
                                    }else{
                                        if(result === true){
                                            found = true
                                        }else{
                                            callback();
                                        }
                                    }
                                });
                            },5000);
                        })

                    }, function(err){
                        if(timer){
                            clearTimeout(timer);
                        }
                        if(!found){
                            customerOperations.setInstantRequestNotFound(instantRequestId.toString(), function(err,result){

                            });
                            customerController.io.of("customer").to(result.userId.toString()).emit("noPhotographerHasBeenFound");
                        }
                    })
                }
            })

            res.status(200).send(operationResult.createSuccesResult());
        });

        return router
    }

})(module.exports);