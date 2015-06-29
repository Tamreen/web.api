
require('colors');
require('../server');

DatabaseService.query('select * from trainings')

.then(function(trainings){

	// Walk up on every training.
	trainings.forEach(function(training){

		var queryGetBestTrainingPlayer = DatabaseService.format('select * from trainingPlayers where trainingId = ? limit 1', [training.id]);

		// Execute the query.
		DatabaseService.query(queryGetBestTrainingPlayer)

		//
		.then(function(trainingPlayers){

			// Get the first training player.
			var trainingPlayer = trainingPlayers[0];

			return trainingPlayer;

		})

		//
		.then(function(trainingPlayer){

			TrainingService.findForPlayerIdById(trainingPlayer.playerId, trainingPlayer.trainingId)

			//
			.then(function(training){

				console.log(training.stadium, training.status, training.playersCount, training.willcomePlayersCount);
				console.log('--------------------------------------'.red);

			});

		});

	});

});