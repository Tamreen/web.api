
// PUT /players
router.put('/players', authenticatable, function(request, response){

	if (validator.isNull(request.body.fullname)){
		return response.status(400).send({
			'message': 'الرجاء التأكّد من إدخال الاسم الكامل بشكلٍ صحيحٍ.',
		});
	}

	// Set the fullname value.
	var fullname = request.body.fullname;
	var u = null;

	// Find the current user or die.
	UserService.findCurrentOrDie(request)

	// Update the fullname.
	.then(function(user){
		u = user;
		return PlayerService.updateForId({fullname: fullname}, user.playerId);
	})

	// Response about it.
	.then(function(player){
		return UserService.updateForId({loginable: 1}, u.id);
	})

	//
	.then(function(user){
		response.send(user);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});