(function(scheduledCustomerOperations) {
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var mongoose = require("mongoose");
    var _ = require("underscore");
    var async = require("async");
    var moment = require("moment");

    scheduledCustomerOperations.getPhotographersToSchedule = function(date, categoryId, location, next){
        var d = new Date(date);
        d.setUTCHours(0,0,0);
        var requestLocalDate = global.getLocalTimeByLocation(location, new Date(date)).date;
        async.waterfall([
            function(cb){
                database.Photographer.find({
                    permanentLocation : {
                        $nearSphere : {
                            $geometry : {
                                type : "Point",
                                coordinates : location
                            },
                            $maxDistance: 50 * METERS_PER_MILE
                        }
                    },
                    categories : {
                        $elemMatch : {
                            categoryId : categoryId
                        }
                    }
                }).exec(function(err,result){
                    if(err){
                        cb(err);
                    }else{
                        cb(null, result);
                    }
                })
            }, function(list, cb){
                var photographerList = JSON.parse(JSON.stringify(list));
                async.each(list, function(photographer, eachCb){
                    database.PhotographerUnavailability.find({
                        photographerId : photographer._id,
                        day : d
                    }).exec(function(err,unavailabilityList){
                        if(err){
                            eachCb(err);
                        }else{
                            for (i = 0; i < unavailabilityList.length; i++){
                                var unavailability = unavailabilityList[i];
                                var proceedBreak = false;
                                for (j = 0; j < unavailability.hours.length; j++){
                                    var h = unavailability.hours[j];
                                    var unavailableDateMin = new Date(unavailability.day.getTime() + 1000*60*60*h);
                                    var unavailableDateMax = new Date(unavailability.day.getTime() + 1000*60*60*(h+1));
                                    var localUnavailableDateMin = global.getLocalTimeByLocation(photographer.permanentLocation.coordinates, unavailableDateMin).date;
                                    var localUnavailableDateMax = global.getLocalTimeByLocation(photographer.permanentLocation.coordinates, unavailableDateMax).date;
                                    if(localUnavailableDateMin <= requestLocalDate && requestLocalDate <= localUnavailableDateMax){
                                        var indexOfPhotographer = _.findIndex(photographerList, function(p){
                                            return p._id.toString() == photographer._id.toString();
                                        });
                                        if (indexOfPhotographer != -1){
                                            photographerList.splice(indexOfPhotographer,1);
                                        }
                                        proceedBreak = true;
                                        break;
                                    }
                                }
                                if(proceedBreak){
                                    break;
                                }
                            }
                            eachCb();
                        }
                    })
                },function(err){
                    if(err){
                        cb(err);
                    }  else{
                        cb(null,photographerList);
                    }
                });
            }
        ], function(err, photographerList){
            if(err){
                next(err);
            }else{
                next(null, operationResult.createSuccesResult());
            }
        })

    }


})(module.exports);