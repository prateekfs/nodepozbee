(function(photographerIO){
    var _ = require("underscore");
    var socket = require("socket.io");
    var operationResult = require("../operationResult");
    photographerIO.init = function(app){
        var io = socket(app);
        io.of("photographer").on("connection",function(s){
            s.on("join", function(userId,cb){
                s.join(userId, function(err){
                    cb(operationResult.createSuccesResult());
                    s.emit("joinedSuccessFully", "şans","test", function(data,test){
                        console.log(data);
                        console.log(test);
                    })
                });
            });
        })

        return io;
    }
})(module.exports);