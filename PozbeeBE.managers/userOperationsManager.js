(function(userOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var async = require("async");
    var mongoose = require("mongoose");
    var _ = require("underscore");

    userOperationsManager.checkIfUserUpdated = function(id, version, next){
        database.User.findOne({_id : mongoose.Types.ObjectId(id)}).populate("socialUser").populate("photographerApplications").populate("photographer").exec(function(err,userResult){
           if(err || !userResult){
               next(err);
           } else{
               if(userResult.__v == version){
                   next(null,operationResult.createSuccesResult());
               }else{
                   var photographerApplication = _.sortBy(userResult.photographerApplications, function(application){return application.createdDate}).reverse()[0];
                   var user = userResult.toObject();
                   delete user.photographerApplications;
                   user.photographerApplication = photographerApplication;
                   next(null, operationResult.createSuccesResult(user));
               }
           }
        });
    }

    userOperationsManager.fetchCategories = function(next){
        database.Category.find({}).exec(function(err,result){
           if(err){
               next(err);
           } else{
               var categories = [];
               _.each(result, function(cat){ return categories.push(cat.toObject()); });
               next(null,operationResult.createSuccesResult(categories));
           }
        });
    }

})(module.exports)