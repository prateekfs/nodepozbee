(function(accessToken){

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

// AccessToken
    var accessTokenSchema = new Schema({
        userId: {
            type: String
        },
        clientId: {
            type: String,
            required: true
        },
        token: {
            type: String,
            unique: true,
            required: true
        },
        created: {
            type: Date,
            default: Date.now
        },
        deviceId : {
            type : String
        },
        deviceModel : {
            type : String
        },
        isMerchant : {
            type : Boolean,
            default : false
        },
        isCustomer : {
            type : Boolean,
            default : false
        },
        socialUserAccountId : {
            type : Schema.Types.ObjectId
        }
    },{collection : "accessToken"});

    accessToken.Model = mongoose.model('AccessToken', accessTokenSchema);
})(module.exports);