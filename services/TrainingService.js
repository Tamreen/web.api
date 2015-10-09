
//
TrainingService = {

	//
	findById: function(id){

		var queryGetTraining = DatabaseService.format('select * from trainings where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTraining).then(function(trainings){

			if (trainings.length == 0){
				return null;
			}

			var training = trainings[0];
			return training;
		});
	},

	//
	findForPlayerIdById: function(playerId, id){
		
		var queryGetTraining = DatabaseService.format('select trainings.*, (trainingPlayers.role = \'admin\') as adminable, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'willcome\') willcomePlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'apologize\') apologizePlayersCount, trainingPlayers.decision, (select (count(id)/trainings.playersCount)*100 from trainingPlayers where trainingId = trainings.id and decision = \'willcome\') as percentage from trainings, trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.playerId = ? and trainings.id = ?', [playerId, id]);

		return DatabaseService.query(queryGetTraining).then(function(trainings){

			if (trainings.length == 0){
				return null;
			}

			var training = trainings[0];
			return training;
		});
	},

	//
	addGroupIdsPlayersForPlayerIdToId: function(groups, playerId, id){

		return GroupService.listPlayersByIdsForPlayerId(groups, playerId)

		.then(function(players){

			console.log('Number of players', players.length);

			return Promise.each(players, function(player){

				console.log(player.role);

				return TrainingPlayerService.findOrCreate({trainingId: id, playerId: player.id, decision: 'notyet', role: player.role});

			});

		});
	},

	// TODO: What about canceled trainings, it would show forever.
	listSpecifiedForPlayerId: function(playerId){

		var queryListSpecifiedTrainings = DatabaseService.format('select *, (select (count(id)/t.playersCount)*100 from trainingPlayers where trainingId = t.id and decision = \'willcome\') as percentage from trainings t where t.id in (select id from trainingPlayers where playerId = ?) and (t.status <> \'started\' and t.status <> \'completed\')', [playerId]);

		return DatabaseService.query(queryListSpecifiedTrainings);

	},

	// TODO: The method to be completed.
	listAroundForPlayerId: function(playerId, parameters){

		var queryListAroundTrainings = DatabaseService.format('select *, st_distance(coordinates, point(?,?)) as distance, (select (count(id)/t.playersCount)*100 from trainingPlayers where trainingId = t.id and decision = \'willcome\') as percentage from trainings t where t.id in (select id from trainingPlayers where playerId = ?) and (t.status <> \'started\' and t.status <> \'completed\') and st_distance(coordinates, point(?,?)) is not null', [parameters.coordinates.x, parameters.coordinates.y, playerId, parameters.coordinates.x, parameters.coordinates.y]);

		return DatabaseService.query(queryListAroundTrainings);
	},

	//
	create: function(parameters){

		//
		var id = null;
		var authorId = parameters.authorId;
		var groups = parameters.groups;
		var coordinates = null;

		//
		parameters.name = moment(parameters.startedAt).format('dddd، DD MMMM YYYY، hh:mm a');
		parameters.createdAt = new Date();

		//
		delete parameters.authorId;
		delete parameters.groups;

		//
		if (!validator.isNull(parameters.coordinates)){
			coordinates = parameters.coordinates;
			delete parameters.coordinates;
		}

		//
		var queryInsertTraining = DatabaseService.format('insert into trainings set ?', parameters);

		//
		if (!validator.isNull(coordinates)){
			queryInsertTraining = queryInsertTraining + ', coordinates = geomfromtext(?)';
			queryInsertTraining = DatabaseService.format(queryInsertTraining, 'point(' + coordinates.x + ' ' + coordinates.y + ')');
		}

		console.log(queryInsertTraining);

		//
		return DatabaseService.query(queryInsertTraining)

		//
		.then(function(insertTrainingResult){

			//
			id = insertTrainingResult.insertId;

			//
			return TrainingService.addGroupIdsPlayersForPlayerIdToId(groups, authorId, id)
		})

		//
		.then(function(){

			//
			TrainingActivityService.create({trainingId: id, authorId: authorId, type: 'training-gathering-started'});

			// Find the training by id.
			return TrainingService.findForPlayerIdById(authorId, id);

		});
	},

	//
	listPlayersById: function(id){

		var queryListTrainingPlayers = DatabaseService.format('select players.fullname, players.id, trainingPlayers.decision as decision from trainingPlayers, players where trainingPlayers.playerId = players.id and trainingPlayers.trainingId = ?', [id]);

		return DatabaseService.query(queryListTrainingPlayers);
	},

	detailsByPlayerIdAndId: function(playerId, id){

		var t = null;

		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			if (!training){
				throw new BadRequestError('لا يُمكن العثور على التمرين.');
			}

			// Take a copy to be remembered.
			t = training;

			return TrainingService.listPlayersById(training.id);
		})

		//
		.then(function(players){

			// Set the sub arrays.
			t.willcomePlayers = [];
			t.apologizePlayers = [];
			t.notyetPlayers = [];

			return Promise.each(players, function(player){

				if (player.decision == 'willcome'){
					return t.willcomePlayers.push(player);
				}

				if (player.decision == 'apologize'){
					return t.apologizePlayers.push(player);
				}

				// Otherwise, the player did not decide.
				return t.notyetPlayers.push(player);
			});
		})

		//
		.then(function(){
			return t;
		})
	},

	//
	cancelIdByPlayerId: function(id, playerId){

		//
		var t = null;

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (!training){
				throw new BadRequestError('لا يُمكن العثور على التمرين.');
			}

			//
			t = training;

			// Check if the player id is not admin.
			if (training.adminable == 0){
				throw new BadRequestError('لا يُمكن إلغاء التمرين إلا بواسطة مدير المجموعة.');
			}

			// Check if the training is already canceled.
			if (training.status == 'canceled'){
				throw new BadRequestError('التمرين قد أُلغي مُسبقًا.');
			}

			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-canceled'});
		})

		// Update the status of the training to be 'canceled'.
		.then(function(trainingActivity){
			return TrainingService.updateForId({status: 'canceled'}, t.id);
		});
	},

	//
	updateForId: function(parameters, id){

		//
		parameters.modifiedAt = new Date();

		var queryUpdateTrainingById = DatabaseService.format('update trainings set ? where id = ?', [parameters, id]);
		
		// TODO: This could be fixed in a better way.
		return DatabaseService.query(queryUpdateTrainingById);
	},

	//
	findBestIdForPlayerIdOrDie: function(id, playerId){

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (validator.isNull(training)){
				throw new BadRequestError('لا يُمكن العثور على التمرين.');
			}

			// Check if the training is not gathering.
			if (training.status != 'gathering'){
				throw new BadRequestError('The training is not gathering.');
			}

			// Check if the player id has decided.
			if (training.playerDecision == 'willcome'){
				throw new BadRequestError('اللاعب قد قرّر مُسبقًا.');
			}

			//
			return training;

		});
	},

	//
	decideForPlayerIdToComeToId: function(playerId, id){

		//
		var t = null;
		var ta = null;

		// Get the training by id.
		return TrainingService.findBestIdForPlayerIdOrDie(id, playerId)

		// TODO: Decide for the player to come.
		// TODO: Update the player decision.
		// TODO: Check if the training is completed.

		//
		.then(function(training){

			//
			t = training;

			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'player-decided-to-come'});

		})

		// Update the training player decision.
		.then(function(activity){

			//
			ta = activity;

			if (ta.type == 'player-decided-to-come'){
				return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('willcome', t.id, playerId);
			}

			if (ta.type == 'player-registered-as-subset'){
				return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('register-as-subset', t.id, playerId);
			}
		})

		// Check if the training now is completed.
		.then(function(){

			if (ta.type == 'player-decided-to-come'){

				// If the training is completed, create activity and notify the players.
				if (t.playersCount == t.willcomePlayersCount + 1){

					// Complete the training.
					TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-completed'})

					//
					.then(function(completedActivity){
						return TrainingService.updateForId({status: 'completed'}, t.id);
					});
				}
			}

			// Just to assure that the promise has been fullfilled.
			return true;
		})
	},

	//
	decideForPlayerIdToApologizeToId: function(playerId, id){

		//
		var t = null;
		var ta = null;

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (!training){
				throw new BadRequestError('لا يُمكن العثور على التمرين.');
			}

			//
			t = training;

			// Check if the training is already canceled.
			if (t.status == 'canceled'){
				throw new BadRequestError('التمرين قد أُلغي مُسبقًا.');
			}

			// Check if the attending time for the training has ended.
			if (new Date() > t.startedAt){
				throw new BadRequestError('التمرين قد انتهى مُسبقًا.');
			}

			// Check if the player id has decided.
			if (t.playerDecision == 'apologize'){
				throw new BadRequestError('اللاعب قد قرّر مُسبقًا.');
			}

			// TODO: If it is too late then it is too late.

			//
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'player-apologized'});
		})

		// Update the training player decision.
		.then(function(activity){

			//
			ta = activity;

			//
			return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('apologize', t.id, playerId);
		})

		//
		.then(function(){

			if (t.playerDecision == 'willcome' && t.status == 'completed'){

				// Update the status of the training to be 'gathering'.
				TrainingService.updateForId({status: 'gathering'}, t.id)

				// Add an activity saying that the training is not completed w/ notifying players.
				.then(function(){
					return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-not-completed'});
				})

				// Subset the best player if any.
				.then(function(activity){
					return TrainingService.subsetBestPlayerForId(t.id);
				});
			}

			// Just to assure that the promise has been fullfilled.
			return true;
		})
	},

	//
	subsetBestPlayerForId: function(id){

		//
		var queryGetTrainingSubsetPlayers = DatabaseService.format('select * from trainingPlayers where trainingId = ? and decision = \'register-as-subset\' order by coalesce(modifiedAt, createdAt)', [id]);

		//
		return DatabaseService.query(queryGetTrainingSubsetPlayers)

		//
		.then(function(subsetPlayers){

			// No subset players have been found.
			if (subsetPlayers.length == 0){
				return true;
			}

			//
			var subsetPlayer = subsetPlayers[0];

			//
			return TrainingService.decideForPlayerIdToComeToId(subsetPlayer.playerId, id, true, false);
		});
	},

	//
	bringProfessionalByPlayerIdForId: function(professionalParameters, playerId, id){

		var professional = null;

		// Create the user.
		return UserService.findByE164formattedMobileNumberOrCreate(professionalParameters.e164formattedMobileNumber, {fullname: professionalParameters.fullname}, true)

		// Find the training.
		.then(function(user){
			professional = user;
			return TrainingService.findById(id);
		})

		//
		.then(function(training){
			return TrainingPlayerService.findByTrainingIdAndPlayerId(training.id, professional.playerId);
		})

		// Check if the user is already in the training.
		.then(function(trainingPlayer){

			if (trainingPlayer){
				throw new BadRequestError('اللاعب المحدّد موجود في المجموعة مُسبقًا.');
			}

			// Add the professional.
			return TrainingPlayerService.create({trainingId: id, playerId: professional.playerId, decision: 'notyet'});
		})

		//
		.then(function(trainingPlayer){
			return TrainingService.findBestIdForPlayerIdOrDie(professional.playerId, id, false, true);
		})

		// Add a new activity of bringing a professional.
		.then(function(training){
			return TrainingActivityService.create({trainingId: id, authorId: playerId, type: 'player-brought-professional'});
		})

		// Decide for the professional to come.
		.then(function(trainingActivity){
			return TrainingService.decideForPlayerIdToComeToId(professional.playerId, id, false, true);
		});
	},
};