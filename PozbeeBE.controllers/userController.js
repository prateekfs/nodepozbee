(function(userController){
    var database = require("../PozbeeBE.data/database");
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var loginOperationsManager = require("../PozbeeBE.managers/loginOperationsManager");

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

            loginOperationsManager.activatePhone(phoneNumber,activationCode, function(err,result){
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

            loginOperationsManager.registerUser(phoneNumber,nameSurname, email, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            });
        });
        return router;
    }
})(module.exports);