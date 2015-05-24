
//
require('./main');

// Require the needed services.
require('./services');

// Require the needed routes.
require('./routes');

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

// GET /groups
router.get('/groups', authenticatable, function(request, response){

	UserService.findCurrentOrDie(request)

	// List all groups that the user in.
	.then(function(user){
		return GroupService.listForPlayerId(user.playerId);
	})

	// Response about it.
	.then(function(groups){
		return response.send(groups);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/latest
router.get('/groups/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups');
});

// GET /groups
router.get('/groups/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var id = request.params.id;

	UserService.findCurrentOrDie(request)

	// Find the given group.
	.then(function(user){
		return GroupService.findByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(group){
		return response.send(group);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// POST /groups/add
router.post('/groups/add', authenticatable, function(request, response){

	if (validator.isNull(request.body.name)){
		response.status(400).send({
			'message': 'Bad request.'
		});
		return;
	}

	var name = request.body.name;

	//
	UserService.findCurrentOrDie(request)

	// Add a group.
	.then(function(user){
		return GroupService.create({name: name, authorId: user.playerId});
	})

	// Response about it.
	.then(function(group){
		return response.status(201).send(group);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:id/leave
router.get('/groups/:id/leave', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.leaveByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(done){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:id/delete
router.get('/groups/:id/delete', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	// Set the id of the group.
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.deleteByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(done){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players
router.get('/groups/:groupId/players', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var groupId = request.params.groupId;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.listPlayersByIdForPlayerId(groupId, user.playerId);
	})

	// Response about it.
	.then(function(players){
		return response.send(players);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/latest
router.get('/groups/:groupId/players/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/players');
});

// POST /groups/:groupId/players/add
router.post('/groups/:groupId/players/add', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || validator.isNull(request.body.fullname) || !e164Format.test(request.body.e164formattedMobileNumber)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId;
	var fullname = request.body.fullname;
	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.checkIsPlayerIdAdminForIdOrDie(user.playerId, groupId);
	})

	//
	.then(function(){
		return GroupService.addPlayerToId(e164formattedMobileNumber, fullname, groupId);
	})

	// Response about it.
	.then(function(playerGroup){
		return response.status(201).send(playerGroup);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/:id/delete
router.get('/groups/:groupId/players/:id/delete', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || !validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId; 
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.deletePlayerIdByAdminPlayerIdInId(id, user.playerId, groupId);
	})

	// Response about it.
	.then(function(groupPlayer){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/:id/adminize
router.get('/groups/:groupId/players/:id/adminize', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || !validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId; 
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.adminizePlayerIdByAdminPlayerIdInId(id, user.playerId, groupId);
	})

	// Response about it.
	.then(function(groupPlayer){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/trainings
router.get('/groups/:groupId/trainings', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	//
	var groupId = request.params.groupId;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.listForGroupIdAndPlayerId(groupId, user.playerId);
	})

	// Response about it.
	.then(function(trainings){
		return response.send(trainings);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/trainings/latest
router.get('/groups/:groupId/trainings/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/trainings');
});

// POST /groups/:groupId/trainings/add
router.post('/groups/:groupId/trainings/add', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || validator.isNull(request.body.stadium) || !validator.isDate(request.body.startedAt) || !validator.isNumeric(request.body.playersCount) || request.body.playersCount <= 0 || !validator.isNumeric(request.body.subsetPlayersCount) || request.body.subsetPlayersCount <= 0){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var groupId = request.params.groupId;
	var stadium = request.body.stadium;
	var startedAt = validator.toDate(request.body.startedAt);
	var playersCount = request.body.playersCount;
	var subsetPlayersCount = request.body.subsetPlayersCount;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.checkIsPlayerIdAdminForIdOrDie(user.playerId, groupId);
	})

	//
	.then(function(groupPlayer){

		return TrainingService.create({groupId: groupPlayer.groupId, status: 'gathering', stadium: stadium, startedAt: startedAt, playersCount: playersCount, subsetPlayersCount: subsetPlayersCount, authorId: user.playerId});

	})

	// Response about it.
	.then(function(createTrainingResult){
		return response.send({'id': createTrainingResult.insertId});
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id
router.get('/trainings/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.detailsByPlayerIdAndId(user.playerId, id);
	})

	// Response about it.
	.then(function(training){
		return response.send(training);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/willcome
router.get('/trainings/:id/willcome', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToComeToId(user.playerId, id, false);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/apologize
router.get('/trainings/:id/apologize', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToApologizeToId(user.playerId, id);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/cancel
router.get('/trainings/:id/cancel', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.cancelIdByPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/activities
router.get('/trainings/:id/activities', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	// Set the request.
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingActivityService.listByTrainingIdAndPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(activities){
		return response.send(activities);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:trainingId/activities/latest
router.get('/trainings/:trainingId/activities/latest', authenticatable, function(request, response){
	response.redirect('api/v1/trainings/' + request.params.trainingId + '/activities');
});

// POST /feedbacks/add
// TODO: Promises and the route name should be /feedbacks/send.
router.post('/feedbacks/add', function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	// Normalize the token.
	if (validator.isNull(token)){
		token = null;
	}

	// Validate the content of the feedback.
	if (validator.isNull(request.body.content)){
		response.status(400).send({
			'message': 'Content of the feedback cannot be empty.'
		});
		return;
	}

	// Get the content and have it in a variable.
	var content = request.body.content;

	// Get the current user if any.
	UserService.findCurrentIfAny(request)

	.then(function(user){

		// Set the default value of the author.
		var authorId = null;

		if (user){
			authorId = user.id;
		}

		// Send the feedback.
		return FeedbackService.send(content, authorId);
	})

	// Response about it.
	.then(function(){
		return response.status(201).send({
			'message': 'The feedback has been sent.'
		});
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// Attach all previous routes under /api/v1.
app.use('/api/v1', router);

// Start listening to the specified port.
// app.listen(port);

var port = nconf.get('appPort');


if (nconf.get('environment') == 'development'){
	http.createServer(app).listen(port);
}else{
	https.createServer(sslOptions, app).listen(port);
}

console.log('App active on localhost:' + port);
