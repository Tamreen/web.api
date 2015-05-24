
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