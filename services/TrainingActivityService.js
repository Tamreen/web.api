
//
TrainingActivityService = {

	//
	findById: function(id){

		var queryGetTrainingActivity = DatabaseService.format('select trainingActivities.*, trainings.name as trainingName, players.fullname as authorFullname from trainingActivities, trainings, players where trainingActivities.trainingId = trainings.id and trainingActivities.authorId = players.id and trainingActivities.id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTrainingActivity).then(function(trainingActivities){

			if (trainingActivities.length == 0){
				return null;
			}

			//
			var trainingActivity = trainingActivities[0];

			// Elaborate the activity even more.
			trainingActivity = TrainingActivityService.elaborate(trainingActivity);

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
		});
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
				throw new BadRequestError('لا يُمكن العثور على نشاط التمرين.');
			}

			//
			ta = trainingActivity;

			return TrainingActivityService.listActivitySuggestedRecipientsById(ta.id);
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

			// Push the notification, it should display an icon for android devices.
			PushNotificationService.pushMessageToUsers(ta, ar);

			// TODO: There could be another way of notifying the user (e.g. SMS or email).

			return ar;
		});
	},

	//
	listActivitySuggestedRecipientsById: function(id){

		var querylistUsersForTrainingId = DatabaseService.format('select users.*, players.fullname as fullname from trainingActivities, trainingPlayers, players, users where trainingActivities.trainingId = trainingPlayers.trainingId and trainingPlayers.playerId = players.id and users.playerId = players.id and trainingActivities.id = ?', [id]);

		//
		return DatabaseService.query(querylistUsersForTrainingId);
	},

	// TODO: Implement the sound later.
	elaborate: function(trainingActivity){

		//
		trainingActivity.content = null;
		trainingActivity.sound = 'ping.aiff';
		trainingActivity.icon = null;

		switch (trainingActivity.type){

			case 'training-started':
				trainingActivity.icon = '😀';
				trainingActivity.content = 'بدأ التحضير للتمرين';
			break;

			case 'player-decided-to-come':
				trainingActivity.icon = '😍';
				trainingActivity.content = trainingActivity.authorFullname + ' قرّر أن يحضر';
			break;

			case 'player-registered-as-subset':
				trainingActivity.icon = '😁';
				trainingActivity.content = trainingActivity.authorFullname + ' سجّل كاحتياط';
			break;

			case 'player-apologized':
			trainingActivity.icon = '😐';
				trainingActivity.content = trainingActivity.authorFullname + ' اعتذر عن الحضور';
			break;

			case 'training-completed':
				trainingActivity.icon = '😎';
				trainingActivity.content = 'اكتمل التحضير للتمرين';
			break;

			case 'training-canceled':
				trainingActivity.icon = '😡';
				trainingActivity.content = 'أُلغي التمرين';
			break;

			case 'training-not-completed':
				trainingActivity.icon = '😰';
				trainingActivity.content = 'تحضير التمرين غير مُكتمل';
			break;

			case 'player-brought-professional':
				trainingActivity.icon = '😊';
				trainingActivity.content = trainingActivity.authorFullname + ' جلب محترفًا';
			break;

			case 'training-allowed-professional':
				trainingActivity.icon = '😏';
				trainingActivity.content = 'فُتح الباب لجلب المحترفين';
			break;
		}

		//
		return trainingActivity;
	},

	//
	listByTrainingIdAndPlayerId: function(trainingId, playerId){

		return TrainingService.findForPlayerIdById(playerId, trainingId)

		//
		.then(function(training){

			if (!training){
				throw new BadRequestError('لا يُمكن العثور على التمرين.');
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