
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
