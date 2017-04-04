(function(photographerApplication){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,

        photographerApplicationSchema= new Schema({
            name : {
              type : String,
                required : true
            },
            email:{
                type : String,
                required : true
            },
            created : {
                type : Date,
                required : true
            },
            zipCode : {
                type : Number,
                required : true
            },
            phoneNumber:  {
                type : String,
                required : true
            },
            categories : {
                type : [Schema.Types.ObjectId],
                ref: "Categories"
            },
            cameraModel : {
                type : String,
                required : true
            },
            ableToRetouch : {
                type : Boolean
            },
            minHourlyRate : {
                type : Number
            },
            webSite : {
                type : String
            },
            isApproved : {
                type : Boolean,
                required : true
            },
            reviewPhase : {
                type : Number,
                required : true
            },
            cameraPhotos : {
                type : [String]
            },
            backgroundDocs : {
                type : [String]
            }
        },{collection : "photographerApplication"});

    photographerApplicationSchema.pre("validate", function(next){
        this.created = new Date();
        next();
    });

    photographerApplicationSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    photographerApplication.Model = mongoose.model("PhotographerApplication",photographerApplicationSchema);
})(module.exports);