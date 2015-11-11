
var server = require('../server');
var assert = require('assert');

describe('Training service', function(){

	//
	it('Fetches a training that is publicized and the player is not in.', function(){

		return TrainingService.findForPlayerIdById(869, 212)

		.then(function(training){
			assert.equal(training.decision, 'notyet');
		});
	});

	//
	it('Fetches a training that the player is in and is admin.', function(){
		return TrainingService.findForPlayerIdById(1, 212)
		.then(function(training){
			assert.equal(training.adminable, 1);
		});
	});

	//
	it('Fetches a training that the player is in and is not admin.', function(){
		return TrainingService.findForPlayerIdById(869, 212)
		.then(function(training){
			assert.equal(training.adminable, 0);
		});
	});

	//
	it('Fetches a training that is not publicized and the player is not in.', function(){

		return TrainingService.findForPlayerIdById(869, 204)

		.then(function(training){
			assert.equal(training, null);
		});
	});

	//
	it('Fetches a training that is not publicized and the player is in.', function(){

		return TrainingService.findForPlayerIdById(717, 204)

		.then(function(training){
			assert.notEqual(training, null);
		});
	});

	//
	it('Fetches a training that does not exist but the player does.', function(){

		return TrainingService.findForPlayerIdById(1, 4444444)

		.then(function(training){
			assert.equal(training, null);
		});

	});

});

// TrainingService.listSpecifiedForPlayerId(1)

// .then(function(trainings){

// 	//
// 	console.log(trainings);

// });

// TrainingService.listAroundForPlayerId(1, {coordinates: {x: 124, y: 432}})

// .then(function(trainings){

// 	console.log(trainings);

// });

// TrainingService.detailsByPlayerIdAndId(65, 19)

// .then(function(training){

// 	console.log(training);

// });

// TrainingService.create({groups: [6, 104], status: 'gathering', stadium: 'Riyadh', coordinates: {x: 124.5, y: 56.4}, startedAt: new Date(), playersCount: 20, publicized: 0, authorId: 1})

// .then(function(training){

// 	console.log(training);

// });

// TrainingService.checkIsPlayerIdAdminForIdOrDie(1, 177)

// .then(function(trainingPlayer){
// 	console.log(trainingPlayer);
// });

// TrainingService.professionalizeByPlayerForId(1, 177)

// //
// .then(function(result){
// 	// console.log(result);

// 	return TrainingService.detailsByPlayerIdAndId(1, 177)

// })

// //
// .then(function(training){

// 	console.log(training);

// });

// TrainingService.completeIdByPlayerId(182, 1)

// .then(function(training){
// 	console.log(training);
// })

// TrainingService.listPlayersById(200)

// .then(function(players){
// 	console.log(players);
// });
