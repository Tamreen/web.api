
// GET /trainings/specified
router.get('/trainings/specified', authenticatable, function(request, response){

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.listSpecifiedForPlayerId(user.playerId);
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

// TODO: I used PUT and I do not want to use it.
// PUT /trainings/around
router.put('/trainings/around', authenticatable, function(request, response){

	//
	if (validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.y) || validator.isNull(request.body.coordinates.x)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من تفعيل الموقع الجغرافيّ الحاليّ.',
		});
	}

	//
	var coordinates = request.body.coordinates;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.listAroundForPlayerId(user.playerId, {coordinates: coordinates});
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

// POST /trainings
router.post('/trainings', authenticatable, function(request, response){

	//
	var u = null;

	//
	if (validator.isNull(request.body.stadium) || !validator.isDate(request.body.startedAt) || !validator.isNumeric(request.body.playersCount) || request.body.playersCount <= 0 || validator.isNull(request.body.publicized) || !request.body.groups instanceof Array){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من تعبئة الحقول المطلوبة.',
		});
	}

	//
	if (request.body.publicized == 1 && (validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.y) || validator.isNull(request.body.coordinates.x))){
		return response.status(400).send({
			'message': 'الرجاء تحديد موقع الملعب الجغرافيّ.',
		});
	}

	//
	var stadium = request.body.stadium;
	var startedAt = validator.toDate(request.body.startedAt);
	var playersCount = request.body.playersCount;
	var publicized = request.body.publicized;
	var groups = request.body.groups;
	var coordinates = request.body.coordinates;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){

		u = user;

		if (publicized == 1){
			return true;
		}

		return GroupService.checkIsPlayerIdAdminForIdsOrDie(u.playerId, groups);
	})

	//
	.then(function(groupPlayers){
		return TrainingService.create({groups: groups, status: 'gathering', stadium: stadium, coordinates: coordinates, startedAt: startedAt, playersCount: playersCount, publicized: publicized, authorId: u.playerId});
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

// GET /trainings/:id
router.get('/trainings/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'Bad request.',
		});
	}

	//
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

// PUT /trainings/:id/willcome
router.put('/trainings/:id/willcome', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرين صحيح.',
		});
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToComeToId(user.playerId, id);
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

// PUT /trainings/:id/apologize
router.put('/trainings/:id/apologize', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرين صحيح.',
		});
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

// PUT /trainings/:id
// TODO: Most of the code here must actually move to the services.
router.put('/trainings/:id', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id) || validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.y) || validator.isNull(request.body.coordinates.x)){
		return response.status(400).send({
			'message': 'Please make sure everything is valid.',
		});
	}

	//
	var id = request.params.id;
	var coordinates = request.body.coordinates;
	var u = null;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		u = user;
		return TrainingService.findForPlayerIdById(user.playerId, id);
	})

	//
	.then(function(training){

		if (training.adminable != 1){
			throw new UnauthorizedError('لا يُمكنك تحديث التمرين لكونك لست مديرًا.');
		}

		return TrainingService.updateCoordinatesForId(coordinates.y, coordinates.x, id)
	})

	//
	.then(function(user){
		return TrainingService.detailsByPlayerIdAndId(u.playerId, id);
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

// PUT /trainings/:id/professionalize
router.put('/trainings/:id/professionalize', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'Please make sure that the training id is valid.',
		});
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.professionalizeByPlayerForId(user.playerId, id);
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

// PUT /trainings/:id/bringprofessional
router.put('/trainings/:id/bringprofessional', authenticatable, function(request, response){

	// Validate the inputs.
	if (!validator.isNumeric(request.params.id) || validator.isNull(request.body.fullname) || !e164Format.test(request.body.e164formattedMobileNumber)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من توفّر المعلومات الكاملة الخاصّة باللاعب.',
		});
	}

	// Define variables to be used.
	var id = request.params.id;
	var fullname = request.body.fullname;
	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.bringProfessionalByPlayerIdForId({e164formattedMobileNumber: e164formattedMobileNumber, fullname: fullname}, user.playerId, id);
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

// PUT /trainings/:id/publicize
router.put('/trainings/:id/publicize', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'Please make sure that the training id is valid.',
		});
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.publicizeByPlayerForId(user.playerId, id);
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

// PUT /trainings/:id/poke
router.put('/trainings/:id/poke', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'Please make sure that the training id is valid.',
		});
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.pokeByPlayerForId(user.playerId, id);
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

// PUT /trainings/:id/complete
router.put('/trainings/:id/complete', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرين صحيح.',
		});
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.completeIdByPlayerId(id, user.playerId);
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

// PUT /trainings/:id/cancel
router.put('/trainings/:id/cancel', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرين صحيح.',
		});
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

// PUT /trainings/:id/players/:playerId/willcome
router.put('/trainings/:id/players/:playerId/willcome', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id) || !validator.isNumeric(request.params.playerId)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرينٍ و لاعبٍ صحيحين.',
		});
	}

	//
	var id = request.params.id;
	var playerId = request.params.playerId;

	//
	UserService.findCurrentOrDie(request)

	// TODO: The user must be an admin.

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToComeToId(playerId, id);
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

// PUT /trainings/:id/players/:playerId/apologize
router.put('/trainings/:id/players/:playerId/apologize', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id) || !validator.isNumeric(request.params.playerId)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار تمرينٍ و لاعبٍ صحيحين.',
		});
	}

	//
	var id = request.params.id;
	var playerId = request.params.playerId;

	//
	UserService.findCurrentOrDie(request)

	// TODO: The user must be an admin.

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToApologizeToId(playerId, id);
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

// TODO: Enable the user to complete the gatherig manually.