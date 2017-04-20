(function(customerOperations){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");

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
})(module.exports)