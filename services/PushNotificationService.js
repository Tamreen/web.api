
// APN.
apnOptions = {
	'batchFeedback': true,
	'interval': 1,
	'production': nconf.get('apnProduction'),
	'cert': nconf.get('apnCertPem'),
	'key': nconf.get('apnKeyPem'),
	'passphrase': nconf.get('apnPassphrase'),
};

// Push notification.
gcm = require('node-gcm');
apn = require('apn');

// 
PushNotificationService = {

	toAndroid: function(message, registrationIds){

		console.log('toAndroid has been called.');

		// Set up the sender with you API key.
		var sender = new gcm.Sender(nconf.get('gcmSender'));

		// Send the message.
		sender.send(message, registrationIds, 4, function(error, result){
			console.log(registrationIds);
			if(error) console.error(error);
			else console.log(result);
		});
	},

	toIos: function(message, registrationIds){

		console.log('toIos has been called.');

		try{

			var apnConnection = new apn.Connection(apnOptions);
			var token = registrationIds[0];
			var device = new apn.Device(token);

			// Set the notification.
			var notification = new apn.Notification();

			notification.expiry = Math.floor(Date.now() / 1000) + 3600;
			notification.badge = 3;
			notification.sound = 'ping.aiff';
			notification.alert = message;
			notification.payload = {'messageFrom': 'Tamreen App'};

			// Send the message.
			apnConnection.pushNotification(notification, device);

		}catch (exception){
			console.log(exception);
		}
	},

	test: function(){
		console.log('This is a test to make something beautiful.');
	}
};