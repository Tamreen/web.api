
// GET /activities
router.get('/activities', authenticatable, function(request, response){

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return ActivityPlayerService.countNotReadForPlayerId(user.playerId);
	})

	// Response about it.
	.then(function(count){
		return response.send({
			'count': count,
		});
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});

});