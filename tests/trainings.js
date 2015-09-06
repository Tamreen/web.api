
require('../server');

TrainingService.listSpecifiedForPlayerId(1)

.then(function(trainings){

	//
	console.log(trainings);

});

// TrainingService.listAroundForPlayerId(1, {coordinates: [124, 432]})

// .then(function(trainings){

// 	console.log(trainings);

// });