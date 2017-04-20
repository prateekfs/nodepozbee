(function(photographer){
    var mongoose = require('mongoose'),
        photographerApplication = require("./photographerApplication"),
        Schema = mongoose.Schema,
        unavailabilitySchema = new Schema({
            from:{
                type : Date
            },
            to :{
                type : Date
            }
        }),
        pricingSchema = new Schema({
            categoryId : {
                type : Schema.Types.ObjectId
            },
            style : {
                type : Number
            },
            price : {
                type : Number
            }
        }),
        photographerSchema= new Schema({
            created : {
                type : Date,
                required : true
            },
            updated : {
                type : Date
            },
            isActive : {
                type : Boolean,
                required : true
            },
            isOnline : {
                type : Boolean,
                required : true
            },
            photographerApplication : {
                type : Schema.Types.ObjectId,
                ref : "PhotographerApplication"
            },
            unavailableDates : {
                type : [unavailabilitySchema]
            },
            pricing:{
                type : [pricingSchema]
            },
            lastLocationUpdateDate: {
                type : Date
            },
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            categories : [photographerApplication.categorySchema]
        },{collection : "photographer"});

    photographerSchema.pre("validate", function(next){
        if (!this.created) { this.created = new Date(); }
        if (!this.isOnline) { this.isOnline = false; }
        if (!this.isActive) { this.isActive = false; }
        if (!this.location) {
            this.location = {
                type: "Point",
                coordinates: [0, 0]
            };
        }
        next();
    });

    photographerSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    photographer.Model = mongoose.model("Photographer",photographerSchema);
})(module.exports);