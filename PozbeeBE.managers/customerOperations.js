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
                database.Photographer.find({
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
                                }
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

    customerOperations.checkIfUserHasUnfinishedInstantRequest = function(userId, next){
        database.InstantRequest.findOne({userId : userId, finished: false, finishedDate : null}).exec(function(err,result){
           if(err){
               next(err);
           } else{
               if(result){
                   next(null,operationResult.createSuccesResult(result));
               }else{
                   next(null, operationResult.createSuccesResult());
               }
           }
        });
    }

    customerOperations.getInstantRequestById = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : mongoose.Types.ObjectId(instantRequestId)}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null, result);
            }
        });
    }

    customerOperations.setInstantRequestNotFound = function(instantRequestId, next){
        database.InstantRequest.update({_id : mongoose.Types.ObjectId(instantRequestId)},{finished : true, finishedDate : new Date()}).exec(function(err,updateResult){
            if(err){

            }else{

            }
        })
    }

    customerOperations.checkIfInstantRequestHasTaken = function(instantRequestId, next){
        database.InstantRequest.findOne({_id : mongoose.Types.ObjectId(instantRequestId),found : true}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null, !result ? false : true);
            }
        })
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