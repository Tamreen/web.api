
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

	//
	pushMessageToUsers: function(message, users){

		// TODO: If the environment is development, the behavior should be different.

		//
		var androidUsers = [];
		var iosUsers = [];

		//
		return Promise.each(users, function(user){
			
			if (user.deviceType == 'android'){
				return androidUsers.push(user.deviceToken);
			}

			if (user.deviceType == 'ios'){
				return iosUsers.push(user.deviceToken);
			}

		})

		//
		.then(function(){

			//
			var iosNotification = PushNotificationService.createIosNotification(message);
			var androidNotification = PushNotificationService.createAndroidNotification(message);

			//
			// pushToIosChunks();
			console.log(androidUsers);
			PushNotificationService.pushToAndroidChunks(androidNotification, androidUsers);
		});

	},

	//
	createIosNotification: function(message){

		// Set the notification.
		var notification = new apn.Notification();
		var beforeContent = '';

		if (message.icon){
			beforeContent = message.icon + ' ';
		}

		//
		notification.expiry = Math.floor(Date.now() / 1000) + 3600;
		notification.badge = 3;
		notification.sound = message.sound;
		notification.alert = beforeContent + message.content;

		// TODO: No idea about this line.
		notification.payload = {'messageFrom': 'Tamreen App'};

		//
		return notification;
	},

	//
	createAndroidNotification: function(message){

		var beforeContent = '';

		if (message.icon){
			beforeContent = message.icon + ' ';
		}

		// Set the android message.
		var notification = new gcm.Message({
			collapseKey: 'trainingActivity',
			timeToLive: 3000,
			data: {
				message: 'تمرين ' + message.trainingName,
				title: beforeContent + message.content,
				notId: Math.floor(Math.random()*900000000) + 100000000,
			}
		});

		//
		return notification;
	},

	pushToAndroidChunks: function(notification, users){

		//
		var sender = new gcm.Sender(nconf.get('gcmSender'));
		var chunks = users.chunk(200);

		//
		for (i=0; i<chunks.length; i++){

			var registrationIds = chunks[i];

			// Send the message.
			sender.send(notification, registrationIds, 4, function(error, result){

				if(error){
					console.error(error);
				}
				else{
					console.log(result);
				}

			});
		}
	},

	// //
	// toIos: function(message, registrationIds){

	// 	console.log('toIos has been called.');

	// 	try{

	// 		var apnConnection = new apn.Connection(apnOptions);
	// 		var token = registrationIds[0];
	// 		var device = new apn.Device(token);

	// 		// Send the message.
	// 		apnConnection.pushNotification(notification, device);

	// 	}catch (exception){
	// 		console.log(exception);
	// 	}
	// },

};