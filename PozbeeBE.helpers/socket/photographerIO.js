(function(customerIO){
    var _ = require("underscore");
    var socket = require("socket.io");
    var operationResult = require("../operationResult");
    customerIO.customerDevices = new Dictionary();
    customerIO.io;
    customerIO.init = function(app){
        customerIO.io = socket(app);
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
        })
    }
})(module.exports);