
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
// TODO: Consider deleting the route.
router.get('/groups/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups');
});

// POST /groups
router.post('/groups', authenticatable, function(request, response){

	if (validator.isNull(request.body.name)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من تعبئة اسم المجموعة.'
		});
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

// GET /groups/:id
router.get('/groups/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجء التأكّد من اختيار مجموعة صحيحة.',
		});
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

// PUT /groups/:id
router.put('/groups/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجء التأكّد من اختيار مجموعة صحيحة.',
		});
	}

	if (validator.isNull(request.body.name)){
		return response.status(400).send({
			'message': 'الرجء التأكّد من تعبئة الحقول المطلوبة.',
		});
	}

	var id = request.params.id;
	var name = request.body.name;

	UserService.findCurrentOrDie(request)

	// Find the given group.
	.then(function(user){
		return GroupService.findByIdForPlayerId(id, user.playerId);
	})

	// Update the group with the specified parameters.
	.then(function(group){
		return GroupService.updateForId({name: name}, id);
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

// GET /groups/:id/leave
router.get('/groups/:id/leave', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		return response.status(400).send({
			'message': 'الرجء التأكّد من اختيار مجموعة صحيحة.',
		});
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
		return response.status(400).send({
			'message': 'الرجء التأكّد من اختيار مجموعة صحيحة.',
		});
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

// TODO: Consider deleting the route.
// GET /groups/:groupId/players/latest
router.get('/groups/:groupId/players/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/players');
});

// POST /groups/:id/players
router.post('/groups/:id/players', authenticatable, function(request, response){

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
		console.log('GroupService.checkIsPlayerIdAdminForIdOrDie is about to be called.');
		return GroupService.checkIsPlayerIdAdminForIdOrDie(user.playerId, id);
	})

	//
	.then(function(){
		console.log('GroupService.addPlayerToId is about to be called.', id);
		return GroupService.addPlayerToId({e164formattedMobileNumber: e164formattedMobileNumber, fullname: fullname}, id);
	})

	// Response about it.
	.then(function(playerGroup){
		console.log('response.status(201).send is about to be called.');
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
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار اللاعب الصحيح في المجموعة الصحيحة.',
		});
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
		return response.status(400).send({
			'message': 'الرجاء التأكّد من اختيار اللاعب الصحيح في المجموعة الصحيحة.',
		});
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