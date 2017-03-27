(function(photographerController){
    var database = require("../PozbeeBE.data/database");
    var photographerOperationsManager = require("../PozbeeBE.managers/photographerOperationsManager");
    var passport = require("passport");
    var _ = require("underscore");
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

        return router;
    }
})(module.exports);