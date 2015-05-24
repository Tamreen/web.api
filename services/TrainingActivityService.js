
//
TrainingActivityService = {

	//
	findById: function(id){

		var queryGetTrainingActivity = DatabaseService.format('select trainingActivities.*, trainings.name as trainingName, players.fullname as authorFullname from trainingActivities, trainings, players where trainingActivities.trainingId = trainings.id and trainingActivities.authorId = players.id and trainingActivities.id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTrainingActivity).then(function(trainingActivities){

			if (trainingActivities.length == 0){
				return null;
			}

			var trainingActivity = trainingActivities[0];

			// Add the description of the activity.
			trainingActivity.description = TrainingActivityService.describe({type: trainingActivity.type, authorFullname: trainingActivity.authorFullname});

			return trainingActivity;
		});
	},

	//
	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertTrainingActivity = DatabaseService.format('insert into trainingActivities set ?', [parameters]);
		
		return DatabaseService.query(queryInsertTrainingActivity)

		//
		.then(function(insertTrainingActivityResult){

			var id = insertTrainingActivityResult.insertId;

			// Notify every one in the training about this activity.
			TrainingActivityService.notifyAboutId(id);

			//
			return TrainingActivityService.findById(id);
		})
	},

	//
	notifyAboutId: function(id){

		var ta = null;
		var ar = null;

		// Get activity information.
		return TrainingActivityService.findById(id)

		// Get the activity receivers.
		.then(function(trainingActivity){

			if (!trainingActivity){
				throw new BadRequestError('Training activity cannot be found.');
			}

			//
			ta = trainingActivity;

			return TrainingActivityService.listActivityRecipientsById(ta.id);
		})

		// Create/Find the recipients to/in activityPlayers table.
		.then(function(recipients){

			// Slice.
			ar = recipients.slice();

			return Promise.each(recipients, function(recipient){

				return ActivityPlayerService.findOrCreate({activityId: ta.id, playerId: recipient.playerId});

			});
		})

		//
		.then(function(){

			// TODO: Push the notification, it should display an icon for android devices.
			// TODO: There could be another way of notifying the user (e.g. SMS or email).

			console.log('I am trying to push notifications to the recipients.');

			return ar;
		});
	},

	//
	listActivityRecipientsById: function(id){

		var querylistUsersForTrainingId = DatabaseService.format('select users.*, players.fullname as fullname from trainingPlayers, users, players where trainingPlayers.playerId = users.playerId and players.id = users.playerId and trainingPlayers.trainingId = ?', [id]);

		//
		return DatabaseService.query(querylistUsersForTrainingId);
	},

	// TODO: This should return the description and the icon too.
	describe: function(parameters){

		//
		var type = parameters.type;
		var authorFullname = parameters.authorFullname;

		switch (type){

			case 'training-started':
				return 'بدأ التحضير للتمرين';
			break;

			case 'player-decided-to-come':
				return authorFullname + ' قرّر أن يحضر';
			break;

			case 'player-registered-as-subset':
				return authorFullname + ' سجّل كاحتياط';
			break;

			case 'player-apologized':
				return authorFullname + ' اعتذر عن الحضور';
			break;

			case 'training-completed':
				return 'اكتمل التحضير للتمرين';
			break;

			case 'training-canceled':
				return 'أُلغي التمرين';
			break;

			case 'training-not-completed':
				return 'تحضير التمرين غير مُكتمل';
			break;
		}
	},

	//
	listByTrainingIdAndPlayerId: function(trainingId, playerId){

		return TrainingService.findForPlayerIdById(playerId, trainingId)

		//
		.then(function(training){

			if (!training){
				throw new BadRequestError('The training cannot be found.');
			}

			var queryGetTrainingActivities = DatabaseService.format('select trainingActivities.*, players.fullname as author from trainingActivities, players where trainingActivities.authorId = players.id and trainingActivities.trainingId = ? order by trainingActivities.createdAt asc', [training.id]);

			//
			return DatabaseService.query(queryGetTrainingActivities);
		})

		//
		.then(function(activities){

			// Set that the activity is read by player id.
			ActivityPlayerService.markAsReadManyByPlayerId(activities, playerId);

			return activities;
		});
	},
};