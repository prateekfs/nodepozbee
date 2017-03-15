(function(user){

    var mongoose = require('mongoose'),
        crypto = require('crypto'),

        Schema = mongoose.Schema,

        userSchema = new Schema({
            email: {
                type: String,
                unique: true,
                required: true
            },
            created: {
                type: Date,
                default: Date.now
            },
            roles : {
                type : [String],
                required : true
            },
            name : {
                type : String,
                required : false
            },
            isApproved : {
                type : Boolean,
                required:  true
            },
            phoneNumber : {
                type : String,
                required : true
            },
            phoneActivation : {
                type : Schema.Types.ObjectId,
                required : true,
                ref : "PhoneActivation"
            },
            updated : {
                type : Date
            }
        },{collection : "user"});
    userSchema.pre("validate", function(next){
        this.created = new Date();
        this.isApproved = false;
        this.roles = ["customer"];
        next();
    });
    userSchema.pre("update", function(){
        this.update({}, {$set : {updated : new Date() } } );
    });

    user.Schema = userSchema;
    user.Model = mongoose.model("User", userSchema);
})(module.exports)