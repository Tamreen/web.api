
//
//	
updateTrainingStatuses = function(){

	console.log('updateTrainingStatuses');

	// Update the trainings that started.
	var queryGetStartedTrainings = DatabaseService.format('select trainings.id, trainingActivities.authorId from trainings, trainingActivities where trainingActivities.trainingId = trainings.id and trainingActivities.type = \'training-gathering-started\' and now() > trainings.startedAt and (trainings.status <> \'canceled\' and trainings.status <> \'completed\' and trainings.status <> \'started\')');

	DatabaseService.query(queryGetStartedTrainings)

	//
	.then(function(trainings){

		console.log(trainings);

		return Promise.each(trainings, function(training){

			return TrainingActivityService.create({trainingId: training.id, authorId: training.authorId, type: 'training-started'})

			//
			.then(function(trainingActivity){
				return TrainingService.updateForId({status: 'started'}, training.id);
			});
		});
	})

	// Update the trainings that completed.
	.then(function(){

		var queryGetCompletedTrainings = DatabaseService.format('select trainings.id, trainingActivities.authorId from trainings, trainingActivities where trainingActivities.trainingId = trainings.id and trainingActivities.type = \'training-gathering-started\' and now() > date_add(trainings.startedAt, interval ? hour) and (trainings.status <> \'canceled\' and trainings.status <> \'completed\')', [nconf.get('trainingInterval')]);

		return DatabaseService.query(queryGetCompletedTrainings);
	})

	//
	.then(function(trainings){

		console.log(trainings);

		return Promise.each(trainings, function(training){

			return TrainingActivityService.create({trainingId: training.id, authorId: training.authorId, type: 'training-completed'})

			//
			.then(function(trainingActivity){
				return TrainingService.updateForId({status: 'completed'}, training.id);
			});
		});
	});

};

// The worker runs every minute (1m 60s 1000ms).
setInterval(updateTrainingStatuses, 1*60*1000);

// For testing purposes only.
// updateTrainingStatuses();