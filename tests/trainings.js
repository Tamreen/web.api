
require('../server');

// TrainingService.listSpecifiedForPlayerId(1)

// .then(function(trainings){

// 	//
// 	console.log(trainings);

// });

// TrainingService.listAroundForPlayerId(1, {coordinates: [124, 432]})

// .then(function(trainings){

// 	console.log(trainings);

// });

// TrainingService.findForPlayerIdById(1, 177)

// .then(function(training){

// 	console.log(training);

// });

// TrainingService.detailsByPlayerIdAndId(65, 19)

// .then(function(training){

// 	console.log(training);

// });

// TrainingService.create({groups: [6, 104], status: 'gathering', stadium: 'Riyadh', coordinates: {x: 124.5, y: 56.4}, startedAt: new Date(), playersCount: 20, publicized: 0, authorId: 1})

// .then(function(training){

// 	console.log(training);

// });

TrainingService.checkIsPlayerIdAdminForIdOrDie(1, 177)

.then(function(trainingPlayer){
	console.log(trainingPlayer);
});
