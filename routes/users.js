
// POST /users/firsthandshake
router.post('/users/firsthandshake', function(request, response){

	// Validate the mobile number.
	if (!e164Format.test(request.body.e164formattedMobileNumber) || validator.isNull(request.get('X-User-Device-Type')) || validator.isNull(request.get('X-User-Device-Token'))){
		return response.status(400).send({
			'message': 'The mobile number and/or device type and/or device token are not valid.',
		});
	}

	// Generate a random number (code) to be sent through an SmsService.
	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;
	var deviceType = request.get('X-User-Device-Type');
	var deviceToken = request.get('X-User-Device-Token');
	var code = Math.floor(Math.random()*9000) + 1000;

	// TODO: (Future) Check if the user has recieved an SMS, then, there is no need for sending a new one.
	
	// Save the generated code in the session.
	request.session.code = code;
	request.session.deviceType = deviceType;
	request.session.deviceToken = deviceToken;

	// Send a success response.
	response.status(204).send('/users/firsthandshake');

	// Send the SMS containing the temporary code.
	return SmsService.send(e164formattedMobileNumber, 'تطبيق تمرين - كلمة المرور المؤقتة ' + code);
});

// POST /users/secondhandshake
router.post('/users/secondhandshake', function(request, response){

	// Validate the mobile number and the code.
	if (!e164Format.test(request.body.e164formattedMobileNumber) || validator.isNull(request.session.code) || !validator.equals(request.body.code, request.session.code)){
		return response.status(400).send({
			'message': 'The mobile number and/or the code are not valid.',
		});
	}

	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;
	var code = request.body.code;

	// Combine the password components.
	var combined = '' + e164formattedMobileNumber + code + uuid.v4();
	var token = crypto.createHmac('sha256', nconf.get('appSalt')).update(combined).digest('hex');

	// Forget about it.
	delete request.session.code;

	// Find a user by the e164 formatted mobile number or create one.
	var createUserParameters = {deviceType: request.session.deviceType, deviceToken: request.session.deviceToken, fullname: 'temp'};

	UserService.findByE164formattedMobileNumberOrCreate(e164formattedMobileNumber, createUserParameters, false)

	// Found or created, then update the token.
	.then(function(user){

		// This means the user logged in.
		return UserService.updateForId({token: token}, user.id);

	})

	// Response about it.
	.then(function(user){

		return response.send(user);

	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /users/logout
router.get('/users/logout', authenticatable, function(request, response){

	// Keep the user information for logging.
	// It is better not to use one letter variables.
	var u = null;

	// Find the current user or die.
	UserService.findCurrentOrDie(request)

	// Logout the user.
	.then(function(user){
		u = user;
		return UserService.logout(user);
	})

	// Response about it.
	.then(function(logoutResult){
		console.log('The user #%d has logged out.', u.id);
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// POST /users/update
router.post('/users/update', authenticatable, function(request, response){

	if (validator.isNull(request.body.fullname)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	// Set the fullname value.
	var fullname = request.body.fullname;

	// Find the current user or die.
	UserService.findCurrentOrDie(request)

	// Update the fullname.
	.then(function(user){
		return PlayerService.updateForId({fullname: fullname}, user.playerId);
	})

	// Response about it.
	.then(function(player){
		response.status(204).send();
		return PlayerService.updateForId({loginable: 1}, player.id);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});