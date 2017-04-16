(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
    var multer = require("multer");
    var upload = multer({dest : "./uploads"});
    photographerController.customerIO;
    photographerController.photographerIO;
    photographerController.init = function(router){

        router.get('/becomeAPhotographer',passport.authenticate("bearer", {session : false}), function(req,res,next){
            database.Category.find({}).exec(function(err,result){
                var categories = []
                _.each(result, function(category){
                    categories.push(category.toObject());
                })
                res.render('become',{userId : req.user._id.toString(), categories : categories});
            });

        });
        router.get("/applicationResult", function(req,res,next){
            var isSuccess = req.query.isSuccess === "true" ? true : false;
            res.render("applicationResult",{isSuccess : isSuccess});
        });
        router.post('/becomeAPhotographer', function(req,res,next){
            var userId = req.body.userId;
            var data = req.body;
            photographerOperationsManager.createNewApplication(userId, data, function(err,result){
                if(err){
                    res.redirect("/api/photographer/applicationResult?isSuccess=false");
                }else{
                    res.redirect("/api/photographer/applicationResult?isSuccess=true");
                }
            })
        });

        router.get("/getPhotographerApplication",passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            photographerOperationsManager.getPhotographerApplicationOfUser(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                }else{
                    res.status(200).send(result);
                }
            })
        });
        var cpUpload = upload.fields([{ name: 'cameraPhoto', maxCount: 5 }, { name: 'backgroundDoc', maxCount: 5 }])
        router.post("/uploadCameraPhoto",cpUpload,passport.authenticate("bearer",{session : false}), function(req,res,next) {
            var photographerApplicationId = req.body.photographerApplicationId;
            var cameraPhotos = req.files.cameraPhoto;
            var backgroundDocs = req.files.backgroundDoc;

            photographerOperationsManager.uploadDocumentsPhase(photographerApplicationId,cameraPhotos,backgroundDocs,function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });

        router.get("/createPhotographer", passport.authenticate("bearer",{session : false}), function(req,res,next){
            var userId = req.user._id;
            photographerOperationsManager.createPhotographer(userId, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    res.status(200).send(result);
                }
            })
        });

        router.get("/setPhotographerActive/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isActive = req.query.isActive === "1" ? true : false;
            var deviceId = req.query.deviceId;
            photographerOperationsManager.setPhotographerActiveStatus(photographerId, isActive, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   if(photographerController.photographerIO){
                       photographerController.photographerIO.of("photographer").to(isActive, deviceId).emit("photographerActiveStatusChanged");
                   }
                   res.status(200).send(result);
               }
            });
        });

        router.get("/setPhotographerOnline/:photographerId", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var isOnline = req.query.isOnline == "1" ? true : false;
            var deviceId = req.query.deviceId;
            photographerOperationsManager.setPhotographerOnlineStatus(photographerId,isOnline, function(err,result){
                if(err){
                    res.status(444).send(err);
                } else{
                    if(photographerController.photographerIO){
                        photographerController.photographerIO.of("photographer").to(isActive, deviceId).emit("photographerOnlineStatusChanged");
                    }
                    res.status(200).send(result);
                }
            });
        });

        router.get("/checkIfPhotographerUpdated/:photographerId/:version", passport.authenticate("bearer",{session : false}), function(req,res){
            var photographerId = req.params.photographerId;
            var version = Number(req.params.version)
            photographerOperationsManager.checkIfPhotographerUpdated(photographerId,version, function(err,result){
               if(err){
                   res.status(444).send(err);
               } else{
                   res.status(200).send(result);
               }
            });
        });
        return router;
    }
})(module.exports);