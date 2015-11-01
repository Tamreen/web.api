
//
// TODO: This function has to be validated.
updateTrainingStatuses = function(){

	console.log('updateTrainingStatuses');

	// Update the trainings that started.
	// TODO: Notify the users about the trainings.
	DatabaseService.query('update trainings set status = \'started\' where now() > startedAt and (status <> \'canceled\' and status <> \'completed\' and status <> \'started\')');

	// Update the trainings that completed.
	// TODO: Notify the users about the trainings.
	// TODO: Make the value of the hours in config rather than in here.
	DatabaseService.query('update trainings set status = \'completed\' where now() > date_add(startedAt, interval 2 hour) and (status <> \'canceled\' and status <> \'completed\')');
};

// The worker runs every minute (1m 60s 1000ms).
setInterval(updateTrainingStatuses, 1*60*1000);

// For testing purposes only.
// updateTrainingStatuses();