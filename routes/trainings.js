
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

// GET /trainings/around
router.get('/trainings/around', authenticatable, function(request, response){

	//
	if (validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.x) || validator.isNull(request.body.coordinates.y)){
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

	// TODO: Add the coordinates checking when publicized.
	if (validator.isNull(request.body.stadium) || !validator.isDate(request.body.startedAt) || !validator.isNumeric(request.body.playersCount) || request.body.playersCount <= 0 || validator.isNull(request.body.publicized) || !request.body.groups instanceof Array){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من تعبئة الحقول المطلوبة.',
		});
	}

	if (request.body.publicized == 1 && (validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.x) || validator.isNull(request.body.coordinates.y))){
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
router.put('/trainings/:id', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id) || validator.isNull(request.body.coordinates) || validator.isNull(request.body.coordinates.x) || validator.isNull(request.body.coordinates.y)){
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
		return TrainingService.checkIsPlayerIdAdminForIdOrDie(user.playerId, id);
	})

	//
	.then(function(trainingPlayer){
		return TrainingService.updateCoordinatesForId(coordinates.x, coordinates.y, id)
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

// POST /trainings/:id/professionals/bring
router.post('/trainings/:id/professionals/bring', authenticatable, function(request, response){

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

// GET /trainings/:id/cancel
router.get('/trainings/:id/cancel', authenticatable, function(request, response){

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

// GET /trainings/:id/players/:playerId/willcome
router.get('/trainings/:id/players/:playerId/willcome', authenticatable, function(request, response){

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

	//
	.then(function(user){
		return TrainingService.findForPlayerIdById(user.playerId, id);
	})

	//
	.then(function(training){

		//
		if (!training){
			throw new BadRequestError('لا يُمكن العثور على التمرين.');
		}

		//
		if (!training.adminable){
			throw new BadRequestError('لا يُمكن اتخذا هذا القرار لكونك لست مديرًا.');
		}

		//
		return TrainingService.decideForPlayerIdToComeToId(playerId, id, false, false);
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

// GET /trainings/:id/players/:playerId/apologize
router.get('/trainings/:id/players/:playerId/apologize', authenticatable, function(request, response){

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

	//
	.then(function(user){
		return TrainingService.findForPlayerIdById(user.playerId, id);
	})

	//
	.then(function(training){

		//
		if (!training){
			throw new BadRequestError('لا يُمكن العثور على التمرين.');
		}

		//
		if (!training.adminable){
			throw new BadRequestError('لا يُمكن اتخذا هذا القرار لكونك لست مديرًا.');
		}

		//
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
