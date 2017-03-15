(function (device) {
    var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        deviceSchema = new Schema({
            createdDate : {
                type : Date,
                required : true
            },
            pushNotificationToken : {
                type : String
            },
            location : {
                type : {
                    type : String
                },
                coordinates : {
                    type : [Number]
                }
            },
            lastUpdateDate : {
                type : Date
            },
            isActive : {
                type : Boolean,
                required : true,
                default : true
            },
            activeUserId : {
                type : Schema.Types.ObjectId,
                required : false
            },
            activeSocialUserAccountId : {
                type : Schema.Types.ObjectId,
                required : false
            }
        },{collection : "device"});
        deviceSchema.pre("validate", function(next){
            this.createdDate = new Date();
            this.isActive = true;
            next();
        });
        deviceSchema.pre("update", function(next){
            this.lastUpdateDate = new Date();
            next();
        });
    device.Model = mongoose.model("Device", deviceSchema);
})(module.exports)