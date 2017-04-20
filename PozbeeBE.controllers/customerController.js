(function(customerController){
    var database = require("../PozbeeBE.data/database");
    var customerOperations = require("../PozbeeBE.managers/customerOperations");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});
    var _ = require("underscore");
    customerController.customerIO;
    customerController.photographerIO;

    customerController.init = function(router){
        router.post("/getPhotographersWithinRect", passport.authenticate("bearer", {session : false}), function(req,res,next){
            var arrayOfCoordinates = [];
            var arrayOfRegion = [];
            _.each(req.body["region[][]"],function(val,i){
                if((i+1)%2 == 1){
                    arrayOfCoordinates.push(Number(val));
                }else{
                    arrayOfCoordinates.push(Number(val));
                    var clone = JSON.parse(JSON.stringify(arrayOfCoordinates));
                    arrayOfRegion.push(clone);
                    arrayOfCoordinates = [];
                }
            });
            customerOperations.getPhotographersWithinRect(arrayOfRegion, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });

        return router
    }
})(module.exports);