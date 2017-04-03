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
                   phoneModel : data.phoneModel
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

})(module.exports);