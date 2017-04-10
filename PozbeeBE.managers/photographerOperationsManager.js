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

    photographerOperationsManager.setPhotographerActiveStatus = function(photographerId, isActive, next){
        database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isActive : isActive}}).exec(function(err,updateResult){
           if(err){
               next(err);
           } else{
               next(null, operationResult.createSuccesResult(true));
           }
        });
    }

    photographerOperationsManager.setPhotographerOnlineStatus = function(photographerId, isOnline, next){
        database.Photographer.update({_id : mongoose.Types.ObjectId(photographerId)},{$set : {isOnline : isOnline}}).exec(function(err,updateResult){
            if(err){
                next(err);
            } else{
                next(null, operationResult.createSuccesResult(true));
            }
        });
    }

})(module.exports);