
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

			console.log(recipients.length);

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

			case 'training-gathering-started':
				trainingActivity.icon = '😀';
				trainingActivity.content = 'بدأ التحضير للتمرين';
			break;

			case 'player-decided-to-come':
				trainingActivity.icon = '😍';
				trainingActivity.content = trainingActivity.authorFullname + ' قرّر أن يحضر';
			break;

			case 'player-apologized':
			trainingActivity.icon = '😐';
				trainingActivity.content = trainingActivity.authorFullname + ' اعتذر عن الحضور';
			break;

			case 'training-gathering-completed':
				trainingActivity.icon = '😎';
				trainingActivity.content = 'اكتمل التحضير للتمرين';
			break;

			case 'training-gathering-not-completed':
				trainingActivity.icon = '😰';
				trainingActivity.content = 'تحضير التمرين غير مُكتمل';
			break;

			// TODO:
			case 'training-poked':
				trainingActivity.icon = '😤';
				trainingActivity.content = 'يالله شباب';
			break;

			// TODO:
			case 'training-professionalized':
				trainingActivity.icon = '😏';
				trainingActivity.content = 'فُتح الباب لجلب المحترفين';
			break;

			case 'player-brought-professional':
				trainingActivity.icon = '😊';
				trainingActivity.content = trainingActivity.authorFullname + ' جلب محترفًا';
			break;

			// TODO:
			case 'training-publicized':
				trainingActivity.icon = '😘';
				trainingActivity.content = 'فُتح الباب للعموم';
			break;

			case 'training-canceled':
				trainingActivity.icon = '😡';
				trainingActivity.content = 'أُلغي التمرين';
			break;

			// TODO:
			case 'training-started':
				trainingActivity.icon = '⚽️';
				trainingActivity.content = 'بدأ التمرين';
			break;

			// TODO:
			case 'training-completed':
				trainingActivity.icon = '🏆';
				trainingActivity.content = 'انتهى التمرين';
			break;
		}

		//
		return trainingActivity;
	},

	//
	markActivitiesReadForTrainingIdByPlayerId: function(trainingId, playerId){

		// 
		var updateActivityPlayerParameters = {readable: 1, modifiedAt: new Date()};
		var queryUpdateActivityPlayers = DatabaseService.format('update activityPlayers set ? where playerId = ? and activityId in (select id from trainingActivities where trainingId = ?) and readable = 0', [updateActivityPlayerParameters, playerId, trainingId]);

		//
		return DatabaseService.query(queryUpdateActivityPlayers);
	},
};