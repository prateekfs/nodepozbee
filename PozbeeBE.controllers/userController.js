(function(userController){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var loginOperationsManager = require("../PozbeeBE.managers/loginOperationsManager");
    var userOperationsManager = require("../PozbeeBE.managers/userOperationsManager");
    var passport = require("passport");

    userController.init = function(router){
        router.get("/registerPhone/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            loginOperationsManager.registerPhoneNumber(phoneNumber, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        router.get("/activatePhone/:phoneNumber/:activationCode", function(req,res,next){
            var phoneNumber= req.params.phoneNumber;
            var activationCode = req.params.activationCode;
            var deviceId = req.query.deviceId;
            loginOperationsManager.activatePhone(phoneNumber,activationCode, deviceId, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });
        router.get("/getActivationCode/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            loginOperationsManager.getActivationCode(phoneNumber, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });

        router.get("/registerUser/:phoneNumber/:nameSurname/:email", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            var nameSurname = req.params.nameSurname;
            var email = req.params.email;
            var deviceId = req.query.deviceId;
            loginOperationsManager.registerUser(phoneNumber,nameSurname, email, deviceId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });

        router.post("/registerFacebookUser/:phoneNumber", function(req,res,next){
            var phoneNumber = req.params.phoneNumber;
            var facebookData = req.body;
            var deviceId = req.body.deviceId;

            loginOperationsManager.registerFacebookUser(phoneNumber,deviceId,facebookData,function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });
        router.post("/loginFacebookUser", function(req,res,next){
            var facebookData = req.body;
            var deviceId = req.body.deviceId;
            loginOperationsManager.loginFacebookUser(deviceId,facebookData, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        })

        router.get("/checkIfUserUpdated", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            var version = req.query.version;

            userOperationsManager.checkIfUserUpdated(userId,version, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/test/sadasd",passport.authenticate("bearer", {session : false}), function(req,res,next){
           res.status(200).send({"test": 1213});
        });
        router.get("/fetchCategories", passport.authenticate("bearer", {session : false}), function(req,res,next){
           userOperationsManager.fetchCategories(function(err,result){
               if(err){
                   res.status(444).send(err);
               }else{
                   res.status(200).send(result);
               }
           })
        });
        //app.get("/campaign/getUserPopulationRange/:venueId/:meters",
        //    passport.authenticate("bearer", { session : false }),
        //    mustbe.authorized("roles.pusher",
        //        function (req, res) {
        //            var venueId = req.params.venueId;
        //            var meters = (+req.params.meters) * 1000;
        //
        //            campaignManager.getUserPopulationRange(venueId, meters, function (err, result) {
        //                if (err) {
        //                    res.status(444).send(err);
        //                } else {
        //                    res.status(200).send(result);
        //                }
        //            })
        //        })
        //);

        return router;
    }
})(module.exports);