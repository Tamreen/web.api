
// Nexmo.
simpleNexmo = require('simple-nexmo');
phoneUtil = require('google-libphonenumber').phoneUtil;

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

		//
		var from = nconf.get('nexmoNumber');

		// Check if the number is a US number.
		var toNumber = phoneUtil.parse(to, '');
		var regionCode = phoneUtil.getRegionCodeForNumber(toNumber).toLowerCase();

		if (regionCode == 'us'){
			from = nconf.get('nexmoNumberUs');
		}

		console.log(SmsService.normalizeNumber(from));

		//
		nexmo.sendSMSMessage({
			from: SmsService.normalizeNumber(from),
			to: SmsService.normalizeNumber(to),
			type: 'unicode',
			text: message,
		}, function(error, response){
			if (error){
				console.log(error);
			}else{
				console.dir(response);
			}
		});
	},

	normalizeNumber: function(number){
		return number.replace('+', '');
	}
};