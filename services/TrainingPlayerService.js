
//
TrainingPlayerService = {

	//
	findById: function(id){
		var queryGetTrainingPlayer = DatabaseService.format('select * from trainingPlayers where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTrainingPlayer).then(function(trainingPlayers){

			if (trainingPlayers.length == 0){
				return null;
			}

			var trainingPlayer = trainingPlayers[0];
			return trainingPlayer;
		});
	},

	//
	findOrCreate: function(parameters){

		var queryGetTrainingPlayer = DatabaseService.format('select * from trainingPlayers where trainingId = ? and playerId = ? limit 1', [parameters.trainingId, parameters.playerId]);

		return DatabaseService.query(queryGetTrainingPlayer)

		.then(function(trainingPlayers){

			if (trainingPlayers.length == 0){
				return TrainingPlayerService.create(parameters);
			}

			//
			var trainingPlayer = trainingPlayers[0];
			return trainingPlayer;
		});
	},

	//
	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertTrainingPlayer = DatabaseService.format('insert into trainingPlayers set ?', [parameters]);
		return DatabaseService.query(queryInsertTrainingPlayer)

		//
		.then(function(insertTrainingPlayerResult){
			return TrainingPlayerService.findById(insertTrainingPlayerResult.insertId);
		});
	},

	//
	updateDecisionByTrainingIdAndPlayerId: function(decision, trainingId, playerId){

		//
		var updateTrainingPlayerParameters = {decision: decision, modifiedAt: new Date()};
		var queryUpdateTrainingPlayerDecision = DatabaseService.format('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, trainingId, playerId]);
		
		// 
		return DatabaseService.query(queryUpdateTrainingPlayerDecision);
	}
};