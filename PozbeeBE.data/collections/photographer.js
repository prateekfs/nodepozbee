(function(photographer){
    var mongoose = require('mongoose'),
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
            price : {
                type : Number
            }
        })
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
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            }
        },{collection : "photographer"});

    photographerSchema.pre("validate", function(next){
        this.created = new Date();
        this.isOnline = false;
        this.isActive = false;
        next();
    });

    photographerSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    photographer.Model = mongoose.model("Photographer",photographerSchema);
})(module.exports);