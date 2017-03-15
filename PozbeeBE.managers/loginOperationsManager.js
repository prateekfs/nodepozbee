(function(loginOperationsManager){
    var database = require("../PozbeeBE.data/database");
    var phoneActivation = database.PhoneActivation;
    var operationResult = require("../PozbeeBE.helpers/operationResult");
    var randomString = require("randomstring");
    var smsHelper = require("../PozbeeBE.helpers/smsHelper");
    var async = require("async");

    loginOperationsManager.registerPhoneNumber = function(phoneNumber, next){
        phoneActivation.findOne({phoneNumber : phoneNumber}).exec(function(err, phoneActivationResult){
           if(err){
               next(err);
           }else{
               var activationCode = randomString.generate({length : 4, charset : 'numeric'});
               async.waterfall([
                   function(wf){
                       if (phoneActivationResult && phoneActivationResult.activationCode){
                           phoneActivationResult.activationCode = activationCode;
                           phoneActivationResult.isActivated = false;
                           phoneActivationResult.save(function(err, phoneActivationUpdateResult){
                               if(err){
                                   wf(err);
                               } else{
                                   wf(null,false);
                               }
                           });
                       }else{
                           wf(null,true);
                       }
                   },function(createNew, wf){
                       if(createNew){
                           var newPhoneActivation = new database.PhoneActivation({
                               phoneNumber : phoneNumber,
                               activationCode : activationCode
                           });
                           newPhoneActivation.save(function(err,newPhoneActivationResult){
                             if(err){
                                 wf(err);
                             }else{
                                 if(newPhoneActivationResult) {
                                     wf(null);
                                 }else{
                                     wf(operationResult.createErrorResult("Unknown Error"));
                                 }
                             }
                           })
                       }else{
                            wf(null);
                       }
                   }
               ],function(err){
                   if(err && err.isSuccess != null && !err.isSuccess){
                       next(null,err);
                   }else if(err){
                        next(err);
                   }else{
                       smsHelper.sendSms(phoneNumber,activationCode,function(err,result){
                          if(err){
                              next(err);
                          }else{
                              next(null,result);
                          }
                       });
                   }
               })

           }
        });
    }
    loginOperationsManager.getActivationCode = function(phoneNumber,next){
        phoneActivation.findOne({phoneNumber : phoneNumber}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                next(null,operationResult.createSuccesResult(result.activationCode));
            }
        });
    }

    loginOperationsManager.resendActivationCode = function(phoneNumber,next){
        phoneActivation.findOne({phoneNumber : phoneNumber}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                var activationCode = randomString.generate({length : 4, charset : 'numeric'});
                result.activationCode = activationCode;
                reuslt.save(function(err,saveResult){
                    smsHelper.sendSms(phoneNumber,activationCode,function(err,result){
                        if(err){
                            next(err);
                        }else{
                            next(null,result);
                        }
                    });
                })
            }
        });
    }

    loginOperationsManager.activatePhone = function(phoneNumber, activationCode , next){
        phoneActivation.findOne({phoneNumber : phoneNumber}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                if(activationCode == result.activationCode){
                    result.isActivated = true;
                    result.save(function(err,result){
                        if(err){
                            next(err);
                        }else{
                            next(null,operationResult.createSuccesResult("Activation successful"));
                        }
                    })
                }else{
                    next(null,operationResult.createErrorResult("Entered code is mistaken"));
                }
            }
        });
    }

    loginOperationsManager.registerUser = function(phoneNumber, nameSurname, email, next){
        phoneActivation.findOne({phoneNumber : phoneNumber},{_id : 1}).exec(function(err,result){
            if(err){
                next(err);
            }else{
                async.waterfall([
                    function(wf){
                        database.User.findOne({email : email}).exec(function(err,userResult) {
                            if(err){
                                wf(err);
                            }else{
                                var user;
                                wf(null, userResult);
                            }
                        });
                    },function(userResult, wf){
                        var user;
                        if(userResult){
                            user = userResult;
                            userResult.phoneNumber = phoneNumber;
                            userResult.phoneActivation = result._id;
                        }else{
                            user = new database.User({
                                name : nameSurname,
                                email : email,
                                phoneNumber : phoneNumber,
                                phoneActivation : result._id
                            });
                        }
                        user.save(function(err,userSaveResult){
                            if(err){
                                wf(err);
                            }else{
                                wf(null,userSaveResult);
                            }
                        });
                    }, function(userResult,wf){
                        database.Device.findOne({activeUserId : userResult._id}).exec(function(err,deviceResult){
                            if(err){
                                wf(err);
                            }else{
                                if(deviceResult){
                                    deviceResult.remove(function(err,removeResult){
                                        if(err){
                                            wf(err);
                                        }else{
                                            wf(null, userResult);
                                        }
                                    });
                                }else{
                                    wf(null,userResult);
                                }
                            }
                        });
                    },function(user, wf){
                        var device = new database.Device({
                            activeUserId : user._id
                        });
                        device.save(function(err,deviceSaveResult){
                            if(err){
                                wf(err);
                            }else{
                                wf(null, { "device" : deviceSaveResult, "user" : user })
                            }
                        })
                    }
                ], function(err, result){
                    if(err){
                        next(err);
                    }else{
                        next(null, operationResult.createSuccesResult(result));
                    }
                });
            }
        });
    }
})(module.exports)