(function(oauth2){
    var oauth2orize = require('oauth2orize');
    var passport = require('passport');
    var crypto = require('crypto');
    var config = require('../config');
    var User = require('../PozbeeBE.data/collections/user').Model;
    var Client = require("../PozbeeBE.data/collections/client").Model;
    var AccessToken = require('../PozbeeBE.data/collections/accessToken').Model;
    var RefreshToken = require('../PozbeeBE.data/collections/refreshToken').Model;

// create OAuth 2.0 server
    var aserver = oauth2orize.createServer();

// Generic error handler
    var errFn = function (cb, err) {
        if (err) {
            return cb(err);
        }
    };

    aserver.serializeClient(function(client, callback) {
        return callback(null, client._id);
    });

// Register deserialization function
    aserver.deserializeClient(function(id, callback) {
        Client.findOne({ _id: id }, function (err, client) {
            if (err) { return callback(err); }
            return callback(null, client);
        });
    });
// Destroys any old tokens and generates a new access and refresh token
    var generateTokens = function (data, user, done) {

        // curries in `done` callback so we don't need to pass it
        var errorHandler = errFn.bind(undefined, done),
            refreshToken,
            refreshTokenValue,
            token,
            tokenValue;
        RefreshToken.remove(data, function(err,res){
            AccessToken.remove(data, function(acRes){

                tokenValue = crypto.randomBytes(32).toString('hex');
                refreshTokenValue = crypto.randomBytes(32).toString('hex');

                data.token = tokenValue;
                token = new AccessToken(data);

                data.token = refreshTokenValue;
                refreshToken = new RefreshToken(data);

                refreshToken.save(errorHandler);

                token.save(function (err,token) {
                    if (err != null) {

                        log.error(err);
                        return done(err);
                    }
                    var usr = user.toObject();
                    delete usr.hashedPassword;
                    delete usr.salt;

                    done(null, tokenValue, refreshTokenValue, {
                        'expires_in': config.get('security:tokenLife'),
                        "user" : usr
                    });
                });
            });
        });
    };

// Exchange username & password for access token.
    aserver.exchange(oauth2orize.exchange.password(function(params, username, password, scope, done) {
        Client.findOne({clientId : params.client.clientId}).exec(function(err, client){
            if(err || !client){
                var err = new oauth2orize.TokenError(
                    'client not found'
                );
                return done(err);
            }
            var phoneNumber = params.phoneNumber;
            var activationCode = params.activationCode;
            User.findOne({phoneNumber : phoneNumber}).populate("phoneActivation").exec(function(err,user){
                if (err) {
                    var err = new oauth2orize.TokenError(
                        'Invalid scope: you provided an empty set of scopes',
                        'invalid_scope'
                    );

                    return done(err);
                }
                if(!user || user.phoneActivation.activationCode != activationCode){
                    var err = new oauth2orize.TokenError(
                        'Yanlış Kullanıcı Adı veya Şifre'
                    );

                    return done(false);
                }

                var model = {
                    userId: user._id,
                    clientId: params.client.clientId,
                    deviceId : params.deviceId
                };
                generateTokens(model,user,done);
            });
        })


    }));

// Exchange refreshToken for access token.
    aserver.exchange(oauth2orize.exchange.refreshToken(function(params, refreshToken, scope, done) {

        RefreshToken.findOne({ token: refreshToken, clientId: params.client.clientId }, function(err, token) {
            if (err) {
                return done(err);
            }

            if (!token) {
                return done(null, false);
            }

            User.findById(token.userId, function(err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false); }

                var model = {
                    userId: user.userId,
                    clientId: params.client.clientId,
                    deviceId : params.deviceId,
                    deviceModel : params.deviceModel
                };

                generateTokens(model,user, done);
            });
        });
    }));

// token endpoint
//
// `token` middleware handles client requests to exchange authorization grants
// for access tokens.  Based on the grant type being exchanged, the above
// exchange middleware will be invoked to handle the request.  Clients must
// authenticate when making requests to this endpoint.

    oauth2.token = [
        passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
        aserver.token(),
        aserver.errorHandler()
    ];

})(module.exports)