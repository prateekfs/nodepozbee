(function(customerOperations){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");

    //

    customerOperations.getPhotographersWithinRect = function(rect,next){
        database.Photographer.find({
            location : {
                $geoWithin : {
                    $geometry :{
                        type : "Polygon",
                        coordinates : [rect]
                    }

                }
            },
            isOnline : true
        }).exec(function(err,photographers){
           if(err){
               next(err);
           } else{
               next(null, operationResult.createSuccesResult(photographers));
           }
        });
    }

    customerOperations.findPhotographersForInstant = function(userId, location, categoryId, photographStyle, next){
        async.waterfall([
            function(cb){
                database.User.findOne({_id : userId}).populate("photographer").exec(function(err,userResult){
                    if(err){
                        cb(err);
                    }else{
                        if(userResult.photographer && userResult.photographer.isActive){
                            cb(operationResult.createErrorResult("You have active Photographer"));
                        }else{
                            cb(null);
                        }
                    }
                })
            },
            function(cb){
                var time = new Date(new Date().getTime() + 4 * 60 * 60 * 1000);
                database.ScheduledRequest.find({ $or : [ { isAnswered : true, accepted : true }, { isAnswered : false } ], sessionDate : { $lt : time } }).exec(function(err,result){
                    if(err || !result){
                        cb();
                    }else{
                        if(result.length == 0){
                            cb();
                        }else{
                            cb(operationResult.createErrorResult("You have scheduled request soon"));
                        }
                    }
                })
            },
            function(cb){
                database.InstantRequest.findOne({userId : userId, finished : false}).exec(function(err,instantRequest) {
                    if (err) {
                        next(err);
                    } else {
                        if(instantRequest){
                            cb(operationResult.createErrorResult());
                        }else{
                            cb(null);
                        }
                    }
                });
            },
            function(cb){
                database.InstantRequest.aggregate(
                    {
                        $match: {
                            finished: false
                        }
                    },
                    {
                        $unwind: "$photographerRequests"
                    },
                    {
                        $match: {
                            $or: [
                                {
                                    $and : [
                                        {"photographerRequests.isTaken": false},
                                        {
                                            "photographerRequests.askedDate" : {$ne : null}
                                        },
                                        {
                                            "photographerRequests.askedDate" : {
                                                $gte : new Date(new Date().getTime() - 15000)
                                            }
                                        }
                                    ]
                                },
                                {
                                    $and : [
                                        {"photographerRequests.isAnswered": true},
                                        {"photographerRequests.isTaken": true}
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $project: {
                            "_id": 0,
                            "photographerRequests.photographerId": 1
                        }
                    }
                ).exec(function(err,photographerIds){
                    if(err){
                        cb(err);
                    }else{
                        cb(null, _.map(photographerIds, function(p){ return p.photographerRequests.photographerId }));
                    }
                })
            },
            function(excludingPhotographerIds, cb){
                database.Photographer.find({
                    _id : {$nin : excludingPhotographerIds},
                    location : {
                        $nearSphere : {
                            $geometry : {
                                type : "Point",
                                coordinates : location
                            },
                            $maxDistance: 20 * METERS_PER_MILE
                        }
                    },
                    categories : {
                        $elemMatch : {
                            categoryId : categoryId,
                            styles : { $in : [photographStyle]}
                        }
                    },
                    isOnline : true
                }).exec(function(err,photographers){
                    var photographerIds = _.map(photographers,function(photographer){ return photographer._id; })
                    customerOperations.sortPhotographersByTheirAcceptence(photographerIds,null, function(err,photographerStatistics){
                        if(err || photographerStatistics.length == 0){
                            cb(null, operationResult.createSuccesResult())
                        }else{
                            var instantRequest = new database.InstantRequest({
                                userId : userId,
                                photographerRequests : [],
                                location : {
                                    type : "Point",
                                    coordinates : location
                                },
                                categoryId : mongoose.Types.ObjectId(categoryId),
                                photographStyle : photographStyle
                            });
                            _.each(photographerStatistics, function(ps,i){
                                var photographerLocation = _.find(photographers,function(p){ return p._id == ps.photographerId }).location.coordinates
                                var photographerRequest = {
                                    photographerId : ps.photographerId,
                                    isTaken : false,
                                    isAnswered : false,
                                    askedDate : null,
                                    askedLocation : photographerLocation
                                };

                                instantRequest.photographerRequests.push(photographerRequest);
                            });
                            instantRequest.save(function(err,instantRequestSaveResult){
                                if(err){
                                    cb(err);
                                } else{
                                    cb(null, operationResult.createSuccesResult(instantRequestSaveResult))
                                }
                            });

                        }
                    });

                });
            }
        ], function(err,result){
            if(err){
                next(err);
            }else{
                next(null,result);
            }
        })
    }

    customerOperations.checkInstantRequestStatus = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : mongoose.Types.ObjectId(instantRequestId)}).exec(function(err,instantRequest){
           if(err || !instantRequest){
               next(err == null ? new Error("NoInstant") : err);
           }else{
               if(instantRequest.found){
                   if(instantRequest.finished){
                       next(null, operationResult.createSuccesResult(true));
                   }else {
                       next(null, operationResult.createSuccesResult(instantRequest));
                   }
               }else{
                   next(null, operationResult.createSuccesResult(false));
               }
           }
        });
    }

    customerOperations.gatherScheduledRequestInformationForCustomer = function(scheduledRequestId, next){
        database.ScheduledRequest.findOne({
            _id : scheduledRequestId
        })
            .populate("categoryId")
            .populate("userId")
            .exec(function(err,scheduledRequestResult){
                if(err){
                    next(err);
                } else{
                    var photographerId = scheduledRequestResult.photographerId;

                    database.User.findOne({
                        photographer : photographerId
                    })
                        .populate("photographerApplications")
                        .populate("photographer").exec(function(err,userResult){
                            if(err){
                                next(err);
                            }else{
                                if (!userResult){
                                    next(null, null);
                                }else{
                                    var photographerName = userResult.name;
                                    var photographerNumber = userResult.phoneNumber;
                                    var photographerPhoto = userResult.profilePicture;
                                    var category = scheduledRequestResult.categoryId.name
                                    var appliedApplication = _.find(userResult.photographerApplications, function(pa){ return pa.isApproved });
                                    var cameraPhoto = (appliedApplication.cameraPhotos && appliedApplication.cameraPhotos.length > 0) ? appliedApplication.cameraPhotos[0] : null;
                                    var cameraModel = appliedApplication.cameraModel;
                                    var scheduledRequestIdStr = scheduledRequestId.toString();
                                    var photographerLocation = userResult.photographer.location.coordinates;
                                    var obj = scheduledRequestResult.toObject();

                                    next(null, {
                                        "photographerName" : photographerName,
                                        "photographerNumber" : photographerNumber,
                                        "photographerPhoto" : photographerPhoto,
                                        "category" : category,
                                        "cameraPhoto" : cameraPhoto,
                                        "scheduledRequestIdStr" : scheduledRequestIdStr,
                                        "photographerLocation" : photographerLocation,
                                        "cameraModel" : cameraModel
                                    });
                                }
                            }
                        })
                }
            });
    }

    customerOperations.gatherInstantRequestInformationForCustomer = function(instantRequestId, next){
        database.InstantRequest.findOne({
            _id : instantRequestId
        })
            .populate("categoryId")
            .exec(function(err,instantRequestResult){
           if(err){
               next(err);
           } else{
               var photographerRequest = _.find(instantRequestResult.photographerRequests, function(pr){ return pr.isTaken });
               var photographerId = photographerRequest.photographerId;

               database.User.findOne({
                   photographer : photographerId
               })
                   .populate("photographerApplications")
                   .populate("photographer").exec(function(err,userResult){
                   if(err){
                       next(err);
                   }else{
                       if (!userResult){
                           next(null, null);
                       }else{
                           var photographerName = userResult.name;
                           var photographerNumber = userResult.phoneNumber;
                           var photographerPhoto = userResult.profilePicture;
                           var category = instantRequestResult.categoryId.name + "-" + (instantRequestResult.photographStyle == 1 ? "Indoor" : "Outdoor") ;
                           var appliedApplication = _.find(userResult.photographerApplications, function(pa){ return pa.isApproved });
                           var cameraPhoto = (appliedApplication.cameraPhotos && appliedApplication.cameraPhotos.length > 0) ? appliedApplication.cameraPhotos[0] : null;
                           var cameraModel = appliedApplication.cameraModel;
                           var instantRequestIdStr = instantRequestId.toString();
                           var photographerLocation = photographerRequest.currentLocation.coordinates;

                           next(null, {
                               "photographerName" : photographerName,
                               "photographerNumber" : photographerNumber,
                               "photographerPhoto" : photographerPhoto,
                               "category" : category,
                               "cameraPhoto" : cameraPhoto,
                               "instantRequestId" : instantRequestIdStr,
                               "photographerLocation" : photographerLocation,
                               "cameraModel" : cameraModel
                           });
                       }
                   }
               })
           }
        });
    }

    customerOperations.checkIfUserHasUnfinishedInstantRequest = function(userId, next){
        database.InstantRequest.findOne({
            userId: userId,
            $or: [
                {finished: false, finishedDate : null},
                {found : true, finished : true, userConfirmed : false, cancelled : false}
            ]
            }).exec(function(err,result){
           if(err){
               next(err);
           } else{
               if(result){
                   if(result.found === true) {
                       customerOperations.gatherInstantRequestInformationForCustomer(result._id, function (err, gatheredInfo) {
                            var obj = result.toObject();
                            if(gatheredInfo){

                                obj.foundPhotographerInformation = gatheredInfo;
                            }
                            next(null, operationResult.createSuccesResult(obj));
                       });
                   }else {
                       next(null, operationResult.createSuccesResult(result));
                   }
               }else{
                   next(null, operationResult.createSuccesResult());
               }
           }
        });
    }

    customerOperations.checkIfUserHasOngoingScheduledRequest = function(userId, next){
        var date = new Date();
        database.ScheduledRequest.findOne({
            userId: userId,
            sessionDate : { $lt : date },
            isAnswered : true,
            accepted : true,
            cancelled : false,
            shootingFinished : false
        }).exec(function(err,result){
            if(err){
                next(err);
            } else{
                if(result){
                    customerOperations.gatherScheduledRequestInformationForCustomer(result._id , function(err, gatheredInfo){
                        var obj = result.toObject();
                        obj.foundPhotographerInformation = gatheredInfo
                        next(null, operationResult.createSuccesResult(obj));
                    })
                }else{
                    next(null, operationResult.createSuccesResult());
                }
            }
        });
    }


    customerOperations.getInstantRequestById = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : instantRequestId}).populate("userId").populate("categoryId").exec(function(err,result){
            if(err){
                next(err);
            }else{
                if (!result){
                    next(null,null);
                    return;
                }
                var obj = result.toObject();
                database.User.populate(result.userId, {"path":"socialUser"}, function(err,userOutput){
                    if(userOutput){
                        obj.userId = userOutput.toObject();
                        next(null, obj);
                    }else{
                        next(null, obj);
                    }
                })

            }
        });
    }
    customerOperations.setInstantRequestStarted = function(instantRequestId, next){
        database.InstantRequest.update(
            {
            _id : instantRequestId
            },
            {
                $set : {
                    started : true
                }
            }
        ).exec(function(err,updateResult){
               if(err){
                   next(err);
               } else{
                if (updateResult != null && updateResult.nModified > 0){
                    next(null);
                }
               }
            });
    }

    customerOperations.checkIfInstantRequestStarted = function(instantRequestId, next){
        database.InstantRequest.findOne({
            _id : instantRequestId,
            started : false
        }).exec(function(err,instantRequest){
            if(instantRequest){
                instantRequest.finished = true;
                instantRequest.finishedDate = new Date();
                instantRequest.save(function(err,saveResult){
                   if(err){

                   }
                });
            }
        });
    }

    customerOperations.setInstantRequestNotFound = function(instantRequestId, next){
        database.InstantRequest.update(
            {
                _id : instantRequestId
            },
            {
                $pull:
                {
                    photographerRequests : { askedDate : null }
                },
                finished : true,
                finishedDate : new Date()
            }).exec(function(err,updateResult){
            if(err){
                next(err);
            }else{
                next(null)
            }
        })
    }

    customerOperations.setPhotographerAsked = function(instantRequestId, photographerId, next){
        database.InstantRequest.update(
            {
                _id : instantRequestId,
                "photographerRequests.photographerId" : photographerId},
            {
                $set :
                {
                    "photographerRequests.$.askedDate" : new Date()
                }
            }).exec(function(err,updateResult){
                next(err);
            });
    }

    customerOperations.checkIfInstantRequestHasTakenOrCancelled = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : mongoose.Types.ObjectId(instantRequestId),$or : [{found : true}, {cancelled : true}]}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                if(!result){
                    next(null, false, false);
                }else {
                    next(null, result.found, result.cancelled);
                }
            }
        })
    }

    customerOperations.confirmFinishedPhotoShooting = function(instantRequestId, next){
        database.InstantRequest.update({
            _id : instantRequestId
        },{
            $set :
            {
                userConfirmed : true
            }
        }).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult());
            }
        })
    }

    customerOperations.cancelInstantRequest = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : instantRequestId}).exec(function(err,result){
           if(err){
               next(err);
           }else if(result){
               //if (result.found && result.found === true){
               //    next(null, operationResult.createErrorResult());
               //}else{
                   result.cancelled = true;
                   result.finished = true;
                   result.finishedDate = new Date();
                   var photographerIds = _.map(result.photographerRequests, function(pr){ return pr.photographerId });
                   var newPhotographerRequestsArray =  result.photographerRequests.filter(function(pr){
                      return !pr.isAnswered
                   });

                   result.photographerRequests = newPhotographerRequestsArray
                   result.save(function(err,saveResult){
                       if(err){
                           next(err);
                       }else{
                           next(null, photographerIds, operationResult.createSuccesResult());
                       }
                   })
               //}
           }
        });
    }

    customerOperations.setSelectedWatermarkPhotos = function(instantRequestId, watermarkPhotoIds, next){
        database.WatermarkPhotos.update({
            _id : {
                $in : watermarkPhotoIds
            }
        },{
            $set : {
                isChoosed : true
            }
        },{"multi": true}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                if (result.nModified > 0){
                    database.InstantRequest.findOneAndUpdate({
                        _id : instantRequestId
                    },{
                        $set : {
                            userChoosed : true,
                            userChoosedDate : new Date(),
                            updated : new Date()
                        }
                    },{
                        new : true
                    }).exec(function(err,instantRequest){
                       if(err){
                           database.WatermarkPhotos.update({
                               _id : {
                                   $in : watermarkPhotoIds
                               }
                           },{
                               $set : {
                                   isChoosed : false
                               }
                           },{"multi" : true}).exec();
                           next(err);
                       }else{
                           next(null, operationResult.createSuccesResult({userChoosedDate : instantRequest.userChoosedDate}), instantRequest);
                       }
                    });

                }
            }
        })
    }

    customerOperations.getUsersInstantRequestsHistory = function(userId, skipCount, limitCount, include, exclude, next){
        var matchQuery;
        if (exclude) {
            matchQuery = {
                "userId" : userId,
                "photographerRequests.isTaken" : true,
                "_id" : {
                    $nin : [exclude]
                }
            }
        }else{
            matchQuery = {
                "userId" : userId,
                "photographerRequests.isTaken" : true
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
                    editedPhotosAddedDate : 1,
                    photographerId : 1,
                    photographerRequests : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    var instantRequests = [];
                    async.series([
                        function(initialCb){
                            if(include){
                                var includingInstantReq = _.find(result, function(ir){ return ir._id.toString() == include.toString() });
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
                                                editedPhotosAddedDate : 1,
                                                photographerId : 1
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


                        },
                        function(initialCb){
                            async.each(result, function(instantRequest, eachCb){
                                async.series([
                                    function(cb){
                                        database.User.findOne({photographer : instantRequest.photographerRequests.photographerId}).exec(function(err, userResult){
                                            if(err){
                                                cb(err);
                                            }else{
                                                instantRequest.userName = userResult.name;
                                                instantRequest.userEmail = userResult.email;
                                                instantRequest.userPhoneNumber = userResult.phoneNumber;
                                                instantRequest.userPictureUri = userResult.profilePicture;

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
                                    initialCb(null, operationResult.createSuccesResult(instantRequests));
                                }
                            });
                        }
                    ], function(err){
                       if(err){
                           next(err);
                       }else{
                           next(null, operationResult.createSuccesResult(instantRequests));
                       }
                    });


                }
            });
    }

    customerOperations.getInstantRequestHistory = function(id, next){
        database.InstantRequest.aggregate(
            {
                $unwind : "$photographerRequests"
            },
            {
                $match : {
                    _id : id
                }
            },
            {
                $sort:
                {
                    "updated" : -1,
                    "requestDate": -1
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
                    editedPhotosAddedDate : 1,
                    photographerId : 1
                }
            }
        ).exec(function(err,result){
                if(err){
                    next(err);
                }else{
                    if(result.length == 0){
                        next(null, operationResult.createSuccesResult());
                        return;
                    }
                    var instantRequest = result[0];
                    async.series([
                        function(cb){
                            database.User.findOne({photographerId : instantRequest.photographerId}).exec(function(err, userResult){
                                if(err){
                                    cb(err);
                                }else{
                                    instantRequest.userName = userResult.name;
                                    instantRequest.userEmail = userResult.email;
                                    instantRequest.userPhoneNumber = userResult.phoneNumber;
                                    instantRequest.userPictureUri = userResult.profilePicture;

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
                            next(err);
                        }else{
                            next(null, operationResult.createSuccesResult(instantRequest));
                        }
                    });

                }

            });
    }

    customerOperations.sortPhotographersByTheirAcceptence = function(photographerIds, excludingInstantRequestIds, next){
        excludingInstantRequestIds = excludingInstantRequestIds == null ? [] : excludingInstantRequestIds;
        database.InstantRequest.aggregate(
            {$match :
                {
                    _id :
                    {
                        $nin : excludingInstantRequestIds
                    },
                    photographerRequests :
                    {
                        $elemMatch :{ photographerId : {$in : photographerIds} }
                    }
                }
            },
            {
                $unwind : "$photographerRequests"
            },
            {
                $match :
                {
                    "photographerRequests.photographerId" : {$in : photographerIds}
                }
            },
            {
                $limit : 10
            },
            {$group :
                {
                    _id :
                    {
                        photographerId : "$photographerRequests.photographerId",
                        taken : "$photographerRequests.isTaken",
                        answered : "$photographerRequests.isAnswered"
                    },
                    count : {$sum : 1}
                }
            }).exec(function(err,resultArray){
                if(err){
                    next(null);
                    return;
                }
                var photographerStatistics = [];
                _.each(photographerIds, function(_id){
                    var photographerResults = _.filter(resultArray, function(res){
                        return res._id.photographerId.toString() == _id.toString();
                    })
                    var answeredCount = 0;
                    var takenCount = 0;
                    var notAnsweredCount = 0;

                    var length = photographerResults.length;
                    for(var i = 0; i < length; i++){
                        var filtered = photographerResults[i];
                        if(filtered._id.answered === true && filtered._id.taken === true){
                            answeredCount += filtered.count;
                            takenCount += filtered.count
                        }else if (filtered._id.answered === true && filtered._id.taken === false){
                            answeredCount += filtered.count;
                        }else{
                            notAnsweredCount += filtered.count;
                        }
                    }
                    photographerStatistics.push({
                        photographerId : _id,
                        answered: answeredCount,
                        taken: takenCount,
                        notAnswered: notAnsweredCount,
                        answeredRate : answeredCount / (answeredCount + notAnsweredCount),
                        takenRate : takenCount / (answeredCount + notAnsweredCount)
                    });
                });

                photographerStatistics.sort(function(a,b){ return b.takenRate - a.takenRate });
                next(null,photographerStatistics);
            });
    }


})(module.exports)