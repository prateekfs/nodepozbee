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
            customerOperations.getInstantRequestById(instantRequestId, function(err,result) {
                if (err || !result || result.finished) {

                } else {
                    customerController.nameThisMotherfucker(result);
                }
            });
            res.status(200).send(operationResult.createSuccesResult());
        });



        return router
    }

    customerController.nameThisMotherfucker = function(instantRequest){
        var timer;
        var found = false;
        async.eachSeries(_.filter(instantRequest.photographerRequests, function(p){ return !p.isAnswered }), function(item, callback){
            if(found){
                callback();
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
                customerController.io.of("photographer").to(userId.toString()).emit("newInstantPhotographerRequest",userInfo);
                customerOperations.setPhotographerAsked(mongoose.Types.ObjectId(instantRequest._id),item.photographerId, function(err,result){ });
                timer = setTimeout(function(){
                    customerOperations.checkIfInstantRequestHasTaken(instantRequest._id, function(err,result){
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
                },16000);
                var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id = instantRequest._id.toString() });
                if (index == -1){
                    global.instantRequestTimers.push({"id" : instantRequest._id.toString(), "timer": timer, "cb" : callback});
                }

            })

        }, function(err){
            if(timer){
                clearTimeout(timer);
                var index = _.findIndex(global.instantRequestTimers, function(timer){ return timer.id = instantRequest._id.toString() });
                global.instantRequestTimers.splice(index,1);
            }
            if(!found){
                customerOperations.setInstantRequestNotFound(instantRequest._id.toString(), function(err,result){

                });
                customerController.io.of("customer").to(instantRequest.userId._id.toString()).emit("noPhotographerHasBeenFound");
            }
        })
    }

})(module.exports);