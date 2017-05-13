(function(iosNotification){
    var apn = require('apn');

// Set up apn with the APNs Auth Key
    var apnProvider = new apn.Provider({
        token: {
            key: 'PozbeeBE.helpers/notification/apns.p8', // Path to the key p8 file
            keyId: '99QEN644EW', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
            teamId: '5795G8WNZT' // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
        },
        production: false // Set to true if sending a notification to a production iOS app
    });

    var deviceToken = 'F5A86856C8F8A4FB58A255EA76465D9233F8B53740040C40DA9F03FF346DF55E';

// Prepare a new notification
    var notification = new apn.Notification();

// Specify your iOS app's Bundle ID (accessible within the project editor)
    notification.topic = 'com.ca.Pozbee';

// Set expiration to 1 hour from now (in case device is offline)
    notification.expiry = Math.floor(Date.now() / 1000) + 3600;

// Set app badge indicator
    notification.badge = 3;

// Play ping.aiff sound when the notification is received
    notification.sound = 'ping.aiff';

// Display the following message (the actual notification text, supports emoji)
    notification.alert = 'Hello World \u270C';

// Send any extra payload data with the notification which will be accessible to your app in didReceiveRemoteNotification
    notification.payload = {id: 123};

// Actually send the notification
    apnProvider.send(notification, deviceToken).then(function(result) {
        // Check the result for any failed devices
        console.log(result);
    });

})(module.exports);