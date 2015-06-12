
//
phoneUtil = require('google-libphonenumber').phoneUtil;

//
twilio = require('twilio')(nconf.get('twilioAccountSid'), nconf.get('twilioAuthToken'));
simpleNexmo = require('simple-nexmo');

//
nexmo = new simpleNexmo({
	apiKey: nconf.get('nexmoApiKey'),
	apiSecret: nconf.get('nexmoApiSecret'),
});

// 
SmsService = {

	send: function(to, message){

		if (nconf.get('environment') == 'development'){
			console.log({to: to, message: message});
			return;
		}

		// Check if the number is a US number.
		var toNumber = phoneUtil.parse(to, '');
		var regionCode = phoneUtil.getRegionCodeForNumber(toNumber).toLowerCase();

		//
		if (regionCode == 'us'){
			return SmsService.sendByTwilio(to, message);
		}

		//
		return SmsService.sendByNexmo(to, message);
	},

	//
	sendByNexmo: function(to, message){

		nexmo.sendSMSMessage({

			from: SmsService.normalizeNumber(nconf.get('nexmoNumber')),
			to: SmsService.normalizeNumber(to),
			type: 'unicode',
			text: message,

		}, function(error, response){

			if (error){
				return console.log(error);
			}

			console.log(response);
		});

	},

	sendByTwilio: function(to, message){

		//
		twilio.sendMessage({

			to: to,
			from: nconf.get('twilioNumber'),
			body: message,

		}, function(error, responseData){

			//
			if (error){
				return console.log(error);
			}

			console.log(responseData);
		});
	},

	normalizeNumber: function(number){
		return number.replace('+', '');
	},
};