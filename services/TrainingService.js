
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

			//
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

			return Promise.each(players, function(player){
				return TrainingPlayerService.findOrCreate({trainingId: id, playerId: player.id, decision: 'notyet', role: player.role});
			});

		});
	},

	// TODO: What about canceled trainings, it would show forever.
	listSpecifiedForPlayerId: function(playerId){

		var queryListSpecifiedTrainings = DatabaseService.format('select *, (select (count(id)/t.playersCount)*100 from trainingPlayers where trainingId = t.id and decision = \'willcome\') as percentage, (select count(id) from activityPlayers where playerId = ? and readable = 0 and activityId in (select id from trainingActivities where trainingId = t.id)) as activitiesCount from trainings t where t.id in (select trainingId from trainingPlayers where playerId = ?) and (t.status <> \'started\' and t.status <> \'completed\') order by activitiesCount desc, coalesce(t.modifiedAt, t.createdAt) desc', [playerId, playerId]);

		return DatabaseService.query(queryListSpecifiedTrainings);
	},

	//
	listAroundForPlayerId: function(playerId, parameters){

		var queryListAroundTrainings = DatabaseService.format('select *, (6371 * acos(cos(radians(?)) * cos(radians(y(coordinates))) * cos(radians(x(coordinates)) - radians(?)) + sin( radians(?)) * sin(radians(y(coordinates))))) as distance, (select (count(id)/t.playersCount)*100 from trainingPlayers where trainingId = t.id and decision = \'willcome\') as percentage, (select count(id) from activityPlayers where playerId = ? and readable = 0 and activityId in (select id from trainingActivities where trainingId = t.id)) as activitiesCount from trainings t where t.id in (select trainingId from trainingPlayers where playerId = ?) and (t.status <> \'started\' and t.status <> \'completed\') and publicized = 1 having distance < ? order by distance asc, activitiesCount desc, coalesce(t.modifiedAt, t.createdAt) desc', [parameters.coordinates.y, parameters.coordinates.x, parameters.coordinates.y, playerId, playerId, nconf.get('trainingMaximumDistance')]);

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
		parameters.name = moment(parameters.startedAt).format('dddd hh:mm a, ') + parameters.stadium;
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

		//
		return DatabaseService.query(queryInsertTraining)

		//
		.then(function(insertTrainingResult){

			//
			id = insertTrainingResult.insertId;

			// If the player is creating a training without groups, that means, the player is the admin.
			if (groups.length == 0){
				return TrainingPlayerService.findOrCreate({trainingId: id, playerId: authorId, decision: 'notyet', role: 'admin'});
			}

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
	// TODO: readAt might cause performance issues.
	// TODO: Not sure about readAt value.
	listPlayersById: function(id){

		var queryListTrainingPlayers = DatabaseService.format('select players.id, players.fullname, trainingPlayers.decision as decision, activityPlayers.modifiedAt as readAt from players, trainingPlayers, trainingActivities, activityPlayers where trainingPlayers.playerId = players.id and trainingPlayers.trainingId = ? and trainingActivities.trainingId = trainingPlayers.trainingId and activityPlayers.activityId = trainingActivities.id and activityPlayers.playerId = players.id group by players.id order by activityPlayers.modifiedAt desc', [id]);

		console.log(queryListTrainingPlayers);

		return DatabaseService.query(queryListTrainingPlayers);
	},

	//
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

				var decision = player.decision;

				delete player.decision;

				if (decision == 'willcome'){
					return t.willcomePlayers.push(player);
				}

				if (decision == 'apologize'){
					return t.apologizePlayers.push(player);
				}

				// Otherwise, the player did not decide.
				return t.notyetPlayers.push(player);
			});
		})

		//
		.then(function(){

			// Read the activities if the user called this methods.
			TrainingActivityService.markActivitiesReadForTrainingIdByPlayerId(id, playerId);

			return t;
		})
	},

	//
	updateForId: function(parameters, id){

		//
		parameters.modifiedAt = new Date();

		var queryUpdateTrainingById = DatabaseService.format('update trainings set ? where id = ?', [parameters, id]);
		
		//
		return DatabaseService.query(queryUpdateTrainingById);
	},

	//
	updateCoordinatesForId: function(y, x, id){

		//
		var modifiedAt = new Date();

		var queryUpdateTrainingById = DatabaseService.format('update trainings set coordinates = geomfromtext(\'point(? ?)\'), modifiedAt = ? where id = ?', [x, y, modifiedAt, id]);
		
		//
		return DatabaseService.query(queryUpdateTrainingById);
	},

	//
	checkIsIdOkayOrDie: function(id){

		return TrainingService.findById(id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (validator.isNull(training)){
				throw new BadRequestError('لم يتم العثور على التمرين.');
			}

			// Check if the training is not okay.
			if (training.status == 'canceled' || training.status == 'started' || training.status == 'completed'){
				throw new BadRequestError('لا يُمكن اتّخاذ الإجراء في الوقت الراهن.');
			}

			return training;
		});
	},

	//
	introducePlayerIdIfIdIsPublicized: function(playerId, id, publicized){

		if (publicized == 1){
			return TrainingPlayerService.findOrCreate({trainingId: id, playerId: playerId});
		}

		return true;
	},

	//
	decideForPlayerIdToComeToId: function(playerId, id){

		//
		var t = null;
		var ta = null;

		//
		return TrainingService.checkIsIdOkayOrDie(id)

		//
		.then(function(training){
			return TrainingService.introducePlayerIdIfIdIsPublicized(playerId, id, training.publicized);
		})

		// Get the training by id.
		.then(function(){
			return TrainingService.findForPlayerIdById(playerId, id)
		})

		// Decide for the player to come.
		.then(function(training){

			//
			t = training;

			// Check if the training is not gathering or the player has decided.
			if (t.status != 'gathering' || t.decision == 'willcome'){
				throw new BadRequestError('التمرين إمّا مُكتمل أو أنّك قد قرّرت مُسبقًا.');
			}

			//
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'player-decided-to-come'});

		})

		// Update the training player decision.
		.then(function(activity){

			//
			ta = activity;
			return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('willcome', t.id, playerId);
		})

		// Check if the training is completed.
		.then(function(){

			// If the training is completed, create activity and notify the players.
			if (t.playersCount == t.willcomePlayersCount + 1){

				// Complete the training.
				// The following two lines could be moved into a function.
				TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-gathering-completed'})

				//
				.then(function(completedActivity){
					return TrainingService.updateForId({status: 'gathering-completed'}, t.id);
				});
			}

			// Just to assure that the promise has been fulfilled.
			return true;
		})
	},

	//
	decideForPlayerIdToApologizeToId: function(playerId, id){

		//
		var t = null;
		var ta = null;

		//
		return TrainingService.checkIsIdOkayOrDie(id)

		//
		.then(function(training){
			return TrainingService.introducePlayerIdIfIdIsPublicized(playerId, id, training.publicized);
		})

		// Get the training by id.
		.then(function(){
			return TrainingService.findForPlayerIdById(playerId, id)
		})

		//
		.then(function(training){

			//
			t = training;

			// Check if the player id has decided.
			if (t.decision == 'apologize'){
				throw new BadRequestError('اللاعب قد قرّر مُسبقًا.');
			}

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

			if (t.decision == 'willcome' && t.status == 'gathering-completed'){

				// Update the status of the training to be 'gathering'.
				TrainingService.updateForId({status: 'gathering'}, t.id)

				// Add an activity saying that the training is not completed with notifying players.
				.then(function(){
					return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-gathering-not-completed'});
				});
			}

			// Just to assure that the promise has been fulfilled.
			return true;
		})
	},

	//
	professionalizeByPlayerForId: function(playerId, id){

		//
		var t = null;

		return TrainingService.checkIsIdOkayOrDie(id)

		//
		.then(function(training){
			return TrainingService.findForPlayerIdById(playerId, id)
		})

		//
		.then(function(training){

			// Check if the player is not an admin, or the training is already professionalized, or the gathering is completed.
			if (training.adminable != 1 || training.professionalized == 1 || training.status == 'gathering-completed'){
				throw new BadRequestError('لا يُمكن فتح الباب لجلب محترفين، قد لا تكون مديرًا أو أنّ الباب مفتوحٌ لجلب المحترفين سلفًا، أو أنّ التحضير مُكتمل.');
			}

			//
			t = training;

			return true;
		})

		//
		.then(function(){
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-professionalized'});
		})

		//
		.then(function(){
			return TrainingService.updateForId({professionalized: 1}, t.id);
		});
	},

	//
	bringProfessionalByPlayerIdForId: function(professionalParameters, playerId, id){

		//
		var t = null;
		var professional = null;

		// Check if the training does exist.
		return TrainingService.checkIsIdOkayOrDie(id)

		// Check if the training is 'professionalized' or 'gathering-completed'.
		.then(function(training){

			if (training.professionalized == 0 || training.status == 'gathering-completed'){
				throw new BadRequestError('باب جلب المحترفين لهذا التمرين ليس مفتوحًا أو أنّ التحضير مُكتمل.');
			}

			// Fulfill the promise.
			return true;
		})

		// Find or create the user.
		.then(function(){
			return UserService.findByE164formattedMobileNumberOrCreate(professionalParameters.e164formattedMobileNumber, {fullname: professionalParameters.fullname}, true);
		})

		// Find the training player or create.
		.then(function(user){
			professional = user;
			return TrainingPlayerService.findByTrainingIdAndPlayerId(id, professional.playerId);
		})

		//
		.then(function(trainingPlayer){

			if (trainingPlayer){
				throw new BadRequestError('اللاعب المحدّد موجود في المجموعة مُسبقًا.');
			}

			// Add the professional.
			return TrainingPlayerService.create({trainingId: id, playerId: professional.playerId, decision: 'notyet'});
		})

		// Create an activity saying that player id has brought a professional.
		.then(function(trainingPlayer){
			return TrainingActivityService.create({trainingId: id, authorId: playerId, type: 'player-brought-professional'});
		})

		// Decide for the professional to come.
		.then(function(trainingActivity){
			return TrainingService.decideForPlayerIdToComeToId(professional.playerId, id);
		});
	},

	//
	publicizeByPlayerForId: function(playerId, id){

		//
		var t = null;

		return TrainingService.checkIsIdOkayOrDie(id)

		//
		.then(function(training){
			return TrainingService.findForPlayerIdById(playerId, id)
		})

		//
		.then(function(training){

			// Check if the player is not an admin, or the training is already publicized, or the gathering is completed.
			if (training.adminable != 1 || training.publicized == 1 || training.status == 'gathering-completed'){
				throw new BadRequestError('لا يُمكن فتح الباب للعموم، قد لا تكون مديرًا أو أنّ الباب مفتوحٌ للعموم سلفًا، أو أنّ التحضير مُكتمل.');
			}

			// Check if the training does not have coordinates.
			if (validator.isNull(training.coordinates)){
				throw new ConflictError('لابدّ من تضمين الإحداثيّات.');
			}

			//
			t = training;

			return true;
		})

		//
		.then(function(){
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-publicized'});
		})

		//
		.then(function(){
			return TrainingService.updateForId({publicized: 1}, t.id);
		});
	},

	//
	pokeByPlayerForId: function(playerId, id){

		//
		return TrainingService.checkIsIdOkayOrDie(id)

		//
		.then(function(training){
			return TrainingService.findForPlayerIdById(playerId, id)
		})

		//
		.then(function(training){

			// Check if the player is not an admin, or the gathering is completed.
			if (training.adminable != 1 || training.status == 'gathering-completed'){
				throw new BadRequestError('لا يُمكن الإرسال، قد لا تكون مديرًا أو أنّ التحضير مُكتمل.');
			}

			//
			return training;
		})

		//
		.then(function(training){
			return TrainingActivityService.create({trainingId: training.id, authorId: playerId, type: 'training-poked'});
		})
	},

	//
	cancelIdByPlayerId: function(id, playerId){

		//
		var t = null;

		//
		return TrainingService.checkIsIdOkayOrDie(id)

		// Get the training by id.
		.then(function(training){
			return TrainingService.findForPlayerIdById(playerId, id);
		})

		//
		.then(function(training){

			//
			t = training;

			//
			if (t.adminable != 1){
				throw new BadRequestError('لا يُمكن إلغاء التمرين لكونك لست مديرًا.');
			}

			//
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-canceled'});
		})

		// Update the status of the training to be 'canceled'.
		.then(function(trainingActivity){
			return TrainingService.updateForId({status: 'canceled'}, t.id);
		});
	},

	//
	completeIdByPlayerId: function(id, playerId){

		//
		var t = null;

		//
		return TrainingService.checkIsIdOkayOrDie(id)

		// Get the training by id.
		.then(function(training){
			return TrainingService.findForPlayerIdById(playerId, id);
		})

		//
		.then(function(training){

			//
			t = training;

			// Check if the user is not an admin or the status of the training is gathering-completed.
			if (t.adminable != 1 || t.status == 'gathering-completed'){
				throw new BadRequestError('لا يُمكن الكتفاء بالعدد الحاليّ قد لا تكون مديرًا أو أنّ التحضير مُكتمل.');
			}

			//
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-gathering-completed'})
		})

		// Update the status of the training to be 'gathering-completed'.
		.then(function(trainingActivity){
			return TrainingService.updateForId({status: 'gathering-completed', playersCount: t.willcomePlayersCount}, t.id);
		});
	},
};