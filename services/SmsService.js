
// Nexmo.
// TODO: Simplify the name or something.
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

		nexmo.sendSMSMessage({
			from: nconf.get('nexmoNumber'),
			to: to,
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
};