(function(photographerOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    photographerOperationsManager.createNewApplication = function(userId, data, next){
        database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).exec(function(err,userResult){
           if(err){
               next(err);
           } else{
               var photographerApplication = new database.PhotographerApplication({
                   name : data.name,
                   email : data.email,
                   zipCode : data.zipCode,
                   phoneNumber : data.phoneNumber,
                   categories : data.specialization,
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
                //applicationResult.reviewPhase = 3;

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
})(module.exports);