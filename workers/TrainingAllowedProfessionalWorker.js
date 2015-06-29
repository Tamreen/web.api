
//
TrainingAllowedProfessionalWorker = function(){
	
	// List trainings that should allow professional players.
	console.log('TrainingAllowedProfessionalWorker started.');

	var queryListNotProfessionalableTrainings = DatabaseService.format('select id, (select authorId from trainingActivities where trainingId = trainings.id and type = \'training-started\') as authorId from trainings where status = \'gathering\' and startedAt > now() and now() > createdAt + interval ? minute and (select count(id) > 0 from trainingActivities where trainingId = trainings.id and type = \'training-allowed-professional\') = false', nconf.get('trainingMinutesForProfessional'));

	//
	return DatabaseService.query(queryListNotProfessionalableTrainings)

	//
	.then(function(trainings){

		console.log(trainings);

		//
		trainings.forEach(function(training){
			return TrainingActivityService.create({trainingId: training.id, authorId: training.authorId, type: 'training-allowed-professional'});
		});

	});

};

// The worker runs every minute (1m 60s 1000ms).
setInterval(TrainingAllowedProfessionalWorker, 1*60*1000);

// For testing purposes only.
// TrainingAllowedProfessionalWorker();