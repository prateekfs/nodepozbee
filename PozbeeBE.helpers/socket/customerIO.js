(function(customerIO){
    var _ = require("underscore");
    var socket = require("socket.io");
    var operationResult = require("../operationResult");
    var database = require("../../PozbeeBE.data/database");
    var mongoose = require("mongoose");

    customerIO.init = function(app){
        var io = socket(app);
        io.of("customer").on("connection",function(s){
            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    cb(operationResult.createSuccesResult());
                    s.emit("joinedSuccessFully", "şans","test", function(data,test){
                        console.log(data);
                        console.log(test);
                    })
                });
            });
        });
        io.of("photographer").on("connection", function(s){
            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    database.User.findOne({_id : mongoose.Types.ObjectId(userId)}).populate("photographer").exec(function(err,userResult){
                        if(err){
                            s.disconnect()
                        }else{
                            cb(operationResult.createSuccesResult());

                            s.emit("joinedSuccessFully", userResult.photographer.isActive, userResult.photographer.isOnline, function(data,test){
                                console.log(data);
                                console.log(test);
                            })
                        }
                    })
                });
            });
        });

        return io;
    }
})(module.exports);