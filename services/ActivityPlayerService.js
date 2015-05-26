
//
ActivityPlayerService = {

	//
	findById: function(id){

		var queryGetActivityPlayer = DatabaseService.format('select * from activityPlayers where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetActivityPlayer).then(function(activityPlayers){

			if (activityPlayers.length == 0){
				return null;
			}

			var activityPlayer = activityPlayers[0];
			return activityPlayer;
		});
	},

	findOrCreate: function(parameters){

		var queryGetActivityPlayer = DatabaseService.format('select * from activityPlayers where activityId = ? and playerId = ? limit 1', [parameters.activityId, parameters.playerId]);

		return DatabaseService.query(queryGetActivityPlayer)

		.then(function(activityPlayers){

			if (activityPlayers.length == 0){
				return ActivityPlayerService.create(parameters);
			}

			//
			var activityPlayer = activityPlayers[0];
			return activityPlayer;
		});
	},

	//
	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertActivityPlayer = DatabaseService.format('insert into activityPlayers set ?', [parameters]);
		return DatabaseService.query(queryInsertActivityPlayer)

		//
		.then(function(insertActivityPlayerResult){
			return ActivityPlayerService.findById(insertActivityPlayerResult.insertId);
		});
	},

	//
	markAsReadManyByPlayerId: function(activities, playerId){

		// Extract the ids only from the activities.
		ids = [];

		//
		return Promise.each(activities, function(activity){
			return ids.push(activity.id);
		})

		//
		.then(function(){

			// Make all activities for this training read.
			var updateActivityPlayerParameters = {readable: 1, modifiedAt: new Date()};

			//
			var queryUpdateActivityPlayer = DatabaseService.format('update activityPlayers set ? where activityId in (?) and readable = 0 and playerId = ?', [updateActivityPlayerParameters, ids, playerId]);

			//
			return DatabaseService.query(queryUpdateActivityPlayer);
		});
	},
};