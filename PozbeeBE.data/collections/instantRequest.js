(function(instantRequest){
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        photographerRequestSchema = new Schema({
            photographerId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Photographer"
            },
            askedDate : {
                type : Date
            },
            isAnswered : {
                type : Boolean,
                required : true
            },
            isTaken : {
                type : Boolean,
                required : true
            },
            answeredDate : {
                type : Date
            },
            askedLocation : {
                type : [Number]
            },
            currentLocation : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            }
        },{_id : false}),
        instantRequestSchema = new Schema({
            requestDate : {
                type : Date,
                required : true
            },
            userId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "User"
            },
            categoryId : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "Categories"
            },
            photographStyle : {
                type : Number,
                required : true
            },
            photographerRequests : {
                type : [photographerRequestSchema]
            },
            found : {
                type : Boolean,
                required : true
            },
            updated:{
                type : Date
            },
            started : {
                type : Boolean,
                required : true
            },
            finished : {
                type : Boolean,
                required : true
            },
            finishedDate : {
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
            cancelled : {
                type : Boolean
            },
            cancelledByPhotographer : {
                type : Boolean
            },
            arrived : {
                type : Boolean
            },
            arrivedDate : {
                type : Date
            },
            shootingStarted : {
                type : Boolean
            },
            shootingStartedDate : {
                type : Date
            },
            userConfirmed : {
                type : Boolean
            }
        },{collection : "instantRequest"});
        photographerRequestSchema.pre("validate", function(next){
            if (!this.isAnswered) { this.isAnswered = false; }
            if (!this.isTaken) { this.isTaken = false; }
        })
        instantRequestSchema.pre("validate", function(next){
            if(!this.requestDate){ this.requestDate = new Date(); }
            if(!this.found){ this.found = false; }
            if(!this.started) { this.started = false; }
            if(!this.finished) { this.finished = false; }
            if(!this.userConfirmed) {this.userConfirmed = false;}
            if (!this.photographerRequests) {
                this.photographerRequests = [];
            }
            next();
        });
        instantRequestSchema.pre("validate", function(next){
            this.updated = new Date();
            next();
        });

    instantRequest.Model = mongoose.model("InstantRequest", instantRequestSchema);
})(module.exports);