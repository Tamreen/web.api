
require('../server');

// Walk into groups and walk into each training to set trainingPlayers.

DatabaseService.query('select * from groups')

//
.then(function(groups){

	groups.forEach(function(group){

		var queryGetGroupTrainings = DatabaseService.format('select * from trainings where groupId = ?', [group.id]);

		DatabaseService.query(queryGetGroupTrainings)

		//
		.then(function(trainings){

			trainings.forEach(function(training){

				var queryGetTrainingPlayers = DatabaseService.format('select ? as trainingId, groupPlayers.playerId from groupPlayers left join trainingPlayers on groupPlayers.playerId = trainingPlayers.playerId and trainingPlayers.trainingId = ? where groupPlayers.groupId = ? and trainingPlayers.decision is null and groupPlayers.leftAt is null', [training.id, training.id, training.groupId]);

				DatabaseService.query(queryGetTrainingPlayers)

				//
				.then(function(neverDecidePlayers){

					neverDecidePlayers.forEach(function(neverDecidePlayer){

						var insertTrainingPlayerParameters = {playerId: neverDecidePlayer.playerId, trainingId: neverDecidePlayer.trainingId, decision: 'notyet', createdAt: new Date()};

						var queryInsertTrainingPlayer = DatabaseService.format('insert into trainingPlayers set ?', insertTrainingPlayerParameters);

						DatabaseService.query(queryInsertTrainingPlayer)

						//
						.then(function(){
							console.log('done');
						});

					});

				});

			});

		})

	});
});
