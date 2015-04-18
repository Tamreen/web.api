

// // Push notification.
// var gcm = require('node-gcm');


// // Set up the sender with you API key.
// var sender = new gcm.Sender('AIzaSyBnbd6xkGP7-X-QwoqYXksi_nycz8qevoo');

// // Set the android message.
// var message = new gcm.Message({
// 	collapseKey: 'trainingActivity',
// 	delayWhileIdle: true,
// 	timeToLive: 3,
// 	data: {
// 		message: 'zeee',
// 		title: 'asdsadsadsas',
// 		notId: Math.floor(Math.random()*900000000) + 100000000,
// 	}
// });

// var registrationIds = ['APA91bE511zuhEZkd6mp86jS5kIXhF5AyZiC4F34z2EFee50LbZtiRM0R-SFLk8UUK3cDzSfvPZBImRDI2mEvQW45i9IQhbAhyUNyt547DJzqs2W8lakbEi0nWEh8hayFDN8MogE84wgtzaJgtYx5U4U_JAVCOC2Yw'];

// // Send the message.
// sender.sendNoRetry(message, registrationIds, function(error, result){
// 	if(error) console.error(err);
// 	else console.log(result);
// });

var nconf = require('nconf');

// Get the config information.
nconf.argv().env().file({file: './configs/development.json'});

var gcm = require('node-gcm');

var pushNotification = {

	toAndroid: function(message, registrationIds){

		console.log('toAndroid has been called.');

		// Set up the sender with you API key.
		var sender = new gcm.Sender(nconf.get('gcmSender'));

		console.log(registrationIds);

		// Send the message.
		sender.send(message, registrationIds, 4, function(error, result){
			if(error) console.error(error);
			else console.log(result);
		});
	}
};

// Set the android message.
var androidMessage = new gcm.Message({
	collapseKey: 'trainingActivity',
	timeToLive: 3000,
	data: {
		message: 'testMessage',
		title: 'testTitle',
		notId: Math.floor(Math.random()*900000000) + 100000000,
	}
});

// Done.
pushNotification.toAndroid(androidMessage, ['APA91bE511zuhEZkd6mp86jS5kIXhF5AyZiC4F34z2EFee50LbZtiRM0R-SFLk8UUK3cDzSfvPZBImRDI2mEvQW45i9IQhbAhyUNyt547DJzqs2W8lakbEi0nWEh8hayFDN8MogE84wgtzaJgtYx5U4U_JAVCOC2Yw']);

// pushNotification.toAndroid(androidMessage, ['APA91bF9q8iCdMnsTvoVU_VYI4W1PkT9I11fWCMsaL3RBBsb0amht48ngo1CbsZfSTfE687NKBiYMLnlRerUN0wk7MZStaHmPvcY7Z1yc6xUuuEmqs84I8EZKoEJ0zE8KDla3glOrSFjQximFgMZlcENa1-Qia3Xig']);
