(function(photographerOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");
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
                    if (!photographerOfInterest.isAnswered && photographerOfInterest.askedDate > new Date(new Date().getTime() - 15000)){
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

    photographerOperationsManager.checkIfPhotographerActiveInstantRequest = function(photographerId, locationData, next){
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
                           database.InstantRequest.findOneAndUpdate({
                               _id : instantRequestId,
                               $pull : {
                                   photographerRequests: {askedDate : null}
                               }
                           }).exec(function(err,res){
                               if(err){
                                   next(null, true);
                               }else{
                                   next(null, res);
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
})(module.exports);