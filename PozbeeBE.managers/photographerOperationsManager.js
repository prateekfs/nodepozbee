(function(photographerOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");
    var watermark = require('image-watermark');
    var pathResolve = require("path").resolve;

    photographerOperationsManager.createNewApplication = function(userId, data, next){
        database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).exec(function(err,userResult){
            if(err){
                next(err);
            } else{
                var categoriesArray = _.map(data.specialization, function(catId){
                    return {categoryId : mongoose.Types.ObjectId(catId), styles : [1,2]};
                });
                var photographerApplication = new database.PhotographerApplication({
                    name : data.name,
                    email : data.email,
                    zipCode : data.zipCode,
                    phoneNumber : data.phoneNumber,
                    categories : categoriesArray,
                    cameraModel : data.camera,
                    ableToRetouch : data.retouch === "true" ? true : false,
                    minHourlyRate : data.rate,
                    webSite : data.website,
                    phoneModel : data.phoneModel,
                    reviewPhase : 2,
                    isApproved : false
                });

                photographerApplication.save(function(err,applicationSaveResult){
                    if(err){
                        next(err);
                    } else{
                        if (userResult.photographerApplications){
                            userResult.photographerApplications.push(mongoose.Types.ObjectId(applicationSaveResult._id));
                        }else{
                            userResult.photographerApplications = [mongoose.Types.ObjectId(applicationSaveResult._id)]
                        }

                        userResult.save(function(err,userSaveResult){
                            if(err){
                                applicationSaveResult.remove();
                                next(err);
                            } else{
                                next(null);
                            }
                        });
                    }
                });
            }
        });
    }

    photographerOperationsManager.getPhotographerApplicationOfUser =function(userId,next){
        database.User.findOne({_id : userId}).populate("photographerApplications").exec(function(err,userResult){
            if(err){
                next(err);
            }else{
                if(userResult.photographerApplications && userResult.photographerApplications.length > 0){
                    var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                    next(null,operationResult.createSuccesResult(photographerApplication.toObject()));
                }

            }
        })
    }
    photographerOperationsManager.getPhotographerUserId = function(photographerId, next){
        database.User.findOne({photographer : photographerId}).exec(function(err,user){
            if(err){
                next(err);
            } else{
                next(null,user._id);
            }
        });
    }
    photographerOperationsManager.checkIfPhotographerApplicationUpdated = function(userId, version, next){
        database.User.findOne({_id : userId}).populate("photographerApplications").exec(function(err,userResult){
            if(err){
                next(err);
            }else{
                if(userResult.photographerApplications && userResult.photographerApplications.length > 0){
                    var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                    if (photographerApplication.__v != version){
                        next(null,operationResult.createSuccesResult(photographerApplication.toObject()));
                    }else{
                        next(null, operationResult.createSuccesResult());
                    }

                }

            }
        })
    }
    photographerOperationsManager.uploadDocumentsPhase = function(applicationId, cameraPhotos, backgroundDocs,next){
        database.PhotographerApplication.findOne({_id : mongoose.Types.ObjectId(applicationId)}).exec(function(err, applicationResult){
            if(err || !applicationResult){
                next(err);
            }else{
                var cameraPhotoPaths = _.map(cameraPhotos, function(photo){ return photo.path});
                var bacgroundDocPaths = _.map(backgroundDocs, function(photo){ return photo.path});
                applicationResult.cameraPhotos = cameraPhotoPaths;
                applicationResult.backgroundDocs = bacgroundDocPaths;
                applicationResult.reviewPhase = 4;
                applicationResult.isApproved = true;
                applicationResult.save(function(err,applicationResultSaveResult){
                    if(err || !applicationResultSaveResult){
                        next(err);
                    }else{
                        next(null, operationResult.createSuccesResult(applicationResultSaveResult.toObject()));
                    }
                });
            }
        });
    }

    photographerOperationsManager.createPhotographer = function(userId, next){
        async.waterfall([
            function(wf){
                database.User.findOne({_id : userId}).populate("photographerApplications").exec(function(err,userResult){
                    if(err){
                        wf(err);
                    } else{
                        if(!userResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            var photographerApplication =  _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                            wf(null,userResult,photographerApplication);
                        }
                    }
                });
            },
            function(user, photographerApplication, wf){
                var photographer = new database.Photographer({
                    photographerApplication : photographerApplication._id,
                    categories : photographerApplication.categories
                });
                photographer.save(function(err,photographerSaveResult){
                    if(err){
                        wf(err)
                    } else{
                        if(!photographerSaveResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            wf(null,user,photographerSaveResult);
                        }
                    }
                });
            },function(user,photographer,wf){
                user.photographer = photographer._id;
                user.save(function(err,userSaveResult){
                    if(err){
                        wf(err);
                    } else{
                        if(!userSaveResult){
                            wf(operationResult.createErrorResult(""));
                        }else{
                            wf(null, photographer);
                        }
                    }
                });
            }
        ],function(err, photographer){
            if(err){
                next(err);
            }else{
                next(null,operationResult.createSuccesResult(photographer));
            }
        });
    }

    photographerOperationsManager.setPhotographerActiveStatus = function(userId, photographerId, isActive, next){
        database.InstantRequest.findOne({userId : userId, finished : false, finishedDate : null}).exec(function(err,instantRequest){
            if(err){
                next(err);
            }else{
                if(!instantRequest){
                    database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isActive : isActive}, $inc : {__v : 1}}).exec(function(err,updateResult){
                        if(err){
                            next(err);
                        } else{
                            next(null, operationResult.createSuccesResult(true));
                        }
                    });
                }else{
                    next(null, operationResult.createErrorResult("You have active instant request"));
                }
            }
        })

    }

    photographerOperationsManager.setPhotographerOnlineStatus = function(photographerId, isOnline, next){
        database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isOnline : isOnline}, $inc : {__v : 1}}).exec(function(err,updateResult){
            if(err){
                next(err);
            } else{
                next(null, operationResult.createSuccesResult(true));
            }
        });
    }

    photographerOperationsManager.checkIfPhotographerUpdated = function(photographerId, version, next){
        database.Photographer.findOne({_id : mongoose.Types.ObjectId(photographerId)}).exec(function(err,photographerResult){
            if(err){
                next(err);
            } else{
                if(photographerResult.__v != version){
                    next(null, operationResult.createSuccesResult(photographerResult.toObject()));
                }else{
                    next(null, operationResult.createSuccesResult());
                }
            }
        });
    }

    photographerOperationsManager.updateLocationOfPhotographer = function(userId, data, next){
        async.waterfall([
            function(wf){
                database.Device.findOne({_id : mongoose.Types.ObjectId(data.deviceId)}).populate("activeUserId").exec(function(err,device){
                    if(err){
                        wf(err);
                    }else{
                        var location = {
                            type : "Point",
                            coordinates : [data.longitude, data.latitude]
                        }
                        device.location = location;
                        device.lastLocationUpdateDate = data.eventDate;
                        device.save(function(err,deviceSaveResult){
                            if(err){
                                wf(err);
                            } else{
                                wf(null,device);
                            }
                        });
                    }
                });
            },function(device,wf){
                database.User.populate(device.activeUserId, {"path" : "photographer"}, function(err,userOutput) {
                    if (err) {
                        wf(err);
                    } else {
                        var photographer = userOutput.photographer;
                        database.Photographer.update({_id : photographer._id},{$set :{location : device.location, lastLocationUpdateDate : device.lastLocationUpdateDate}}).exec(function(err,updateResult){
                            if (err) {
                                wf(err);
                            } else {
                                wf(null, photographer._id);
                            }
                        });
                    }
                })
            }
        ], function(err, photographerId){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult(), photographerId);
            }
        })

    }

    photographerOperationsManager.checkWasntAsweredInstantRequestOfPhotographer = function(photographerId, next){
        database.InstantRequest.findOne({
            finished : false,
            photographerRequests :
            {
                $elemMatch : { photographerId : photographerId}
            }
        }).populate("userId").populate("categoryId").exec(function(err,result){
            if(err){
                next(err);
            }else{
                if(result && result.photographerRequests.length > 0){
                    var photographerOfInterest = _.filter(result.photographerRequests, function(p){
                        return p.photographerId.toString() === photographerId.toString()
                    })[0];
                    if (photographerOfInterest.isAnswered === false && photographerOfInterest.askedDate > new Date(new Date().getTime() - 15000)){
                        result = result.toObject()
                        result.photographerOfInterest = photographerOfInterest;

                        next(null,result);
                    }else{
                        next(null, null);
                    }
                }
            }
        })
    }

    photographerOperationsManager.checkIfPhotographerHasActiveInstantRequest = function(photographerId, next){
        database.InstantRequest.findOne({
            "photographerRequests.photographerId" : photographerId,
            finished : false,
            found : true})
            .populate("userId")
            .populate("categoryId")
            .exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    if (!result){
                        next(null,operationResult.createSuccesResult());
                        return;
                    }
                    var pRequest = _.find(result.photographerRequests, function(pr){ return pr.photographerId.toString() === photographerId.toString() });
                    if (pRequest.isTaken){
                        var obj = result.toObject();
                        database.User.populate(result.userId, {"path": "socialUser"}, function (err, userOutput) {
                            if (userOutput) {
                                obj.userId = userOutput.toObject();
                                next(null, operationResult.createSuccesResult(obj));
                            } else {
                                next(null, operationResult.createSuccesResult(obj));
                            }
                        });
                    }else{
                        next(null,operationResult.createSuccesResult());
                        return;
                    }
                }
            });
    }

    photographerOperationsManager.updatePhotographersActiveInstantRequest = function(photographerId, locationData, next){
        database.InstantRequest.findOne({
            "photographerRequests.isTaken" : true,
            "photographerRequests.photographerId" : photographerId,
            finished : false,
            found : true
        }).exec(function(err,instantRequestResult){
            if(err){
                next(err);
            }else{
                if(!instantRequestResult){
                    next(null,null);
                    return;
                }
                var location = {
                    type : "Point",
                    coordinates : [locationData.longitude, locationData.latitude]
                }
                var pRequest = _.find(instantRequestResult.photographerRequests, function(pr){ return pr.photographerId.toString() === photographerId.toString() });
                if (pRequest){

                    pRequest.currentLocation = location;
                    instantRequestResult.save(function(err,saveResult){
                        if(err){
                            next(err);
                        }else{
                            next(null, instantRequestResult);
                        }
                    })
                }

            }
        });
    }

    photographerOperationsManager.cancelInstantRequest = function(user, instantRequestId, next){
        database.InstantRequest.findOne({_id : instantRequestId}).exec(function(err,result){
            if(err){
                next(err);
            } else{
                var takenPr = _.find(result.photographerRequests, function(pr){ return pr.isTaken });
                if (takenPr){
                    if (takenPr.photographerId.toString() === user.photographer.toString()){
                        result.cancelled = true;
                        result.cancelledByPhotographer = true;
                        result.finished = true;
                        result.finishedDate = new Date();
                        result.save(function(err,saveResult){
                            if(err){
                                next(err);
                            } else{
                                next(null, result.userId, operationResult.createSuccesResult());
                            }
                        });
                    }else{
                        next(operationResult.createErrorResult("Something went wrong"));
                    }
                }else{
                    next(operationResult.createErrorResult("Something went wrong"));
                }
            }
        });
    }

    photographerOperationsManager.respondToInstantPhotographerRequest = function(accepted, photographerId, instantRequestId, next){
        database.Photographer.findOne({
            _id : photographerId
        }).exec(function(err,photographerResult){
            if(err){
                next(err);
            } else{
                database.InstantRequest.update({
                    _id : instantRequestId,
                    "photographerRequests.photographerId" : photographerId
                },{
                    $set : {
                        found : accepted,
                        "photographerRequests.$.isAnswered" : true,
                        "photographerRequests.$.isTaken" : accepted,
                        "photographerRequests.$.currentLocation" : photographerResult.location
                    }
                }).exec(function(err,updateResult){
                    if(err){
                        next(err);
                    }else{
                        if(accepted && updateResult.nModified > 0){
                            database.InstantRequest.findOneAndUpdate(
                                {
                                    _id : instantRequestId },
                                {
                                    $pull : {
                                        photographerRequests: {askedDate : null}
                                    }
                                },{
                                    new : true
                                }
                            )
                                .populate("userId")
                                .populate("categoryId")
                                .exec(function(err,res){
                                    if(err){
                                        next(null, operationResult.createSuccesResult());
                                    }else{
                                        database.User.populate(res.userId, {"path":"socialUser"}, function(err,userOutput){
                                            if(userOutput){
                                                var obj = res.toObject();
                                                obj.userId = userOutput.toObject();
                                                next(null, operationResult.createSuccesResult(obj));
                                            }else{
                                                var obj = res.toObject();
                                                next(null, operationResult.createSuccesResult(obj));
                                            }
                                        });
                                    }
                                })
                        }else{
                            next(null, true);
                        }

                    }
                })
            }
        });
    }

    photographerOperationsManager.confirmArrivalOfPhotographer = function(instantRequestId, next){
        database.InstantRequest.findOneAndUpdate(
            {
                _id : instantRequestId
            }, {
                $set : {
                    arrived : true,
                    arrivedDate : new Date()
                }
            }, {
                new: true
            }).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var obj = {
                        arrived : result.arrived,
                        arrivedDate : result.arrivedDate,
                        userId : result.userId
                    };

                    next(null, operationResult.createSuccesResult(obj));
                }
            })
    }

    photographerOperationsManager.startPhotoShooting = function(instantRequestId, next){
        database.InstantRequest.findOneAndUpdate(
            {
                _id : instantRequestId
            }, {
                $set : {
                    shootingStarted : true,
                    shootingStartedDate : new Date()
                }
            }, {
                new: true
            }).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var obj = {
                        shootingStarted : result.shootingStarted,
                        shootingStartedDate : result.shootingStartedDate,
                        userId : result.userId
                    };

                    next(null, operationResult.createSuccesResult(obj));
                }
            })
    }

    photographerOperationsManager.finishPhotoShooting = function(instantRequestId, next){
        database.InstantRequest.findOneAndUpdate(
            {
                _id : instantRequestId
            }, {
                $set : {
                    finished : true,
                    finishedDate : new Date()
                }
            }, {
                new: true
            }).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var obj = {
                        finished : result.finished,
                        finishedDate : result.finishedDate,
                        userId : result.userId
                    };

                    next(null, operationResult.createSuccesResult(obj));
                }
            })
    }

    photographerOperationsManager.uploadInitialPhotosOfInstantRequest = function(instantRequestId, photos, next){
        var initialPhotoPaths = _.map(photos, function(photo){ return photo.path});
        var watermarkPhotosList = [];
        async.each(initialPhotoPaths, function(path, cb){
                var watermarkPhotos = new database.WatermarkPhotos({
                    instantRequestId : instantRequestId,
                    path : path
                });
                watermarkPhotos.save(function(err,result){
                    if(err){
                        cb(err);
                    } else{
                        watermarkPhotosList.push({
                            _id : result._id.toString(),
                            path : path
                        })
                        cb();
                    }
                });
            },
            function(err){
                if(err){
                    next(err);
                }else{
                    database.InstantRequest.findOneAndUpdate(
                        {
                            _id : instantRequestId
                        } ,
                        {
                            $set :
                            {
                                nonEditedPhotosAdded : true,
                                nonEditedPhotosAddedDate : new Date(),
                                updated : new Date()
                            }
                        },{
                            new : true
                        })
                        .exec(function(err,instantRequest){
                            if(err){
                                next(err);
                            }else{
                                next(null,operationResult.createSuccesResult(watermarkPhotosList),instantRequest);
                            }
                        });

                }
            });
    }

    photographerOperationsManager.uploadEditedPhotosOfInstantRequest = function(instantRequestId, photos, next){
        var initialPhotoPaths = _.map(photos, function(photo){ return photo.path});
        var editedPhotoList = [];
        async.each(initialPhotoPaths, function(path, cb){
                var editedPhoto = new database.EditedPhotos({
                    instantRequestId : instantRequestId,
                    path : path
                });
                editedPhoto .save(function(err,result){
                    if(err){
                        cb(err);
                    } else{
                        editedPhotoList.push({
                            _id : result._id.toString(),
                            path : path
                        })
                        cb();
                    }
                });
            },
            function(err){
                if(err){
                    next(err);
                }else{
                    database.InstantRequest.findOneAndUpdate(
                        {
                            _id : instantRequestId
                        } ,
                        {
                            $set :
                            {
                                editedPhotosAdded : true,
                                editedPhotosAddedDate : new Date(),
                                updated : new Date()
                            }
                        },
                        {
                            new : true,
                            runValidators : true
                        })
                        .exec(function(err,instantRequest){
                            if(err){
                                next(err);
                            }else{
                                next(null,operationResult.createSuccesResult(editedPhotoList), instantRequest);
                            }
                        });

                }
            });
    }

    photographerOperationsManager.getPhotographerInstantRequestsHistory = function(photographerId, skipCount, limitCount, include, exclude, next){
        var matchQuery;
        if (exclude) {
            matchQuery = {
                "photographerRequests.photographerId": photographerId,
                "photographerRequests.isTaken": true,
                "_id" : {
                    $nin : [exclude]
                }
            }
        }else{
            matchQuery = {
                "photographerRequests.photographerId": photographerId,
                "photographerRequests.isTaken": true,
            }
        }
        database.InstantRequest.aggregate(
            {
                $unwind : "$photographerRequests"
            },
            {
                $match : matchQuery
            },
            {
                $sort:
                {
                    "updated" : -1,
                    "requestDate": -1
                }
            },
            {
                $skip : skipCount
            },
            {
                $limit : limitCount
            },
            {
                $project :
                {
                    _id : 1,
                    finished : 1,
                    cancelled : 1,
                    requestDate : 1,
                    location : 1,
                    arrivedDate : 1,
                    shootingStartedDate : 1,
                    finishedDate : 1,
                    userId : 1,
                    categoryId : 1,
                    photographStyle : 1,
                    nonEditedPhotosAdded : 1,
                    nonEditedPhotosAddedDate :1,
                    userChoosed : 1,
                    userChoosedDate: 1,
                    editedPhotosAdded : 1,
                    editedPhotosAddedDate : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var instantRequests = [];
                    async.series([
                            function(initialCb){
                                if (include){
                                    var includingInstantReq = _.find(result, function(ir){ return ir._id.toString == include.toString() });
                                    if(!includingInstantReq){
                                        database.InstantRequest.aggregate(
                                            {
                                                $unwind : "$photographerRequests"
                                            },
                                            {
                                                $match : {
                                                    "_id" : include
                                                }
                                            },
                                            {
                                                $project :
                                                {
                                                    _id : 1,
                                                    finished : 1,
                                                    cancelled : 1,
                                                    requestDate : 1,
                                                    location : 1,
                                                    arrivedDate : 1,
                                                    shootingStartedDate : 1,
                                                    finishedDate : 1,
                                                    userId : 1,
                                                    categoryId : 1,
                                                    photographStyle : 1,
                                                    nonEditedPhotosAdded : 1,
                                                    nonEditedPhotosAddedDate :1,
                                                    userChoosed : 1,
                                                    userChoosedDate: 1,
                                                    editedPhotosAdded : 1,
                                                    editedPhotosAddedDate : 1
                                                }
                                            }
                                        ).exec(function(err,includeResult){
                                                if(err){
                                                    initialCb(err);
                                                }else{
                                                    if(includeResult.length >0){
                                                        var includingInstantReq = includeResult[0];
                                                        result.splice(0, 0, includingInstantReq);
                                                    }
                                                    initialCb();
                                                }
                                            });
                                    }else{
                                        initialCb();
                                    }
                                }else{
                                    initialCb();
                                }
                            }, function(initialCb){
                                async.each(result, function(instantRequest, eachCb){
                                    async.series([
                                        function(cb){
                                            database.User.findOne({_id : instantRequest.userId}).populate("socialUser").exec(function(err, userResult){
                                                if(err){
                                                    cb(err);
                                                }else{
                                                    instantRequest.userName = userResult.name;
                                                    instantRequest.userEmail = userResult.email;
                                                    instantRequest.userPhoneNumber = userResult.phoneNumber;
                                                    if(userResult.socialUser != null && userResult.socialUser != undefined){
                                                        instantRequest.userPictureUri = userResult.socialUser.pictureUri;
                                                    }
                                                    cb();
                                                }
                                            })
                                        },
                                        function(cb){
                                            database.WatermarkPhotos.find({instantRequestId : instantRequest._id},{path : 1, isChoosed : true}).exec(function(err, watermarkPhotos){
                                                if(err){
                                                    cb(err);
                                                } else{
                                                    instantRequest.watermarkPhotos = watermarkPhotos;
                                                    cb();
                                                }
                                            });
                                        },
                                        function(cb){
                                            database.EditedPhotos.find({instantRequestId : instantRequest._id},{path : 1}).exec(function(err, editedPhotos){
                                                if(err){
                                                    cb(err);
                                                } else{
                                                    instantRequest.editedPhotos = editedPhotos;
                                                    cb();
                                                }
                                            });
                                        },
                                        function(cb){
                                            database.Category.findOne({ _id : instantRequest.categoryId}).exec(function(err,categoryResult){
                                                if(err){
                                                    cb(err);
                                                }else{
                                                    instantRequest.categoryName = categoryResult.name + (instantRequest.photographStyle == 1 ? " - Indoor" : " - Outdoor");
                                                    cb();
                                                }
                                            });
                                        }
                                    ], function(err){
                                        if(err){
                                            eachCb(err);
                                        }else{
                                            instantRequests.push(instantRequest);
                                            eachCb();
                                        }
                                    });
                                }, function(err){
                                    if(err){
                                        initialCb(err);
                                    }else{
                                        initialCb();
                                    }
                                });
                            }
                        ],
                        function(err){
                            if(err){
                                next(err);
                            }else{
                                next(null, operationResult.createSuccesResult(instantRequests));
                            }
                    });

                }
            });
    }

})(module.exports);