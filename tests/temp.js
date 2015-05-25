
require('../server');

// UserService.findByE164formattedMobileNumber('+1').then(function(user){
// 	console.log('user is ', user);
// });

// var updateUserParameters = {deviceType: 'android'};

// UserService.updateForId(updateUserParameters, 623).then(function(user){
// 	console.log(user);
// });

// GroupService.listPlayersByIdForPlayerId(118, 330)

// .then(function(players){
// 	console.log(players);
// });

// GroupService.checkIsPlayerIdAdminForIdOrDie(3, 6);

// GroupService.addPlayerToId('+1', 'Hussam Al-Zughaibi', 104).then(function(playerGroup){
// 	console.log(playerGroup);
// });

// TrainingService.listForGroupIdAndPlayerId(104, 1).then(function(trainings){ // 104 => 
// 	console.log(trainings);
// });

// GroupService.deletePlayerIdByAdminPlayerIdInId(1, 3, 1)

// .then(function(groupPlayer){
// 	console.log(groupPlayer);
// });

// GroupService.listForPlayerId(1)

// .then(function(groups){
// 	console.log(groups);
// });

// TrainingService.create({groupId: 6, name: 'Name of Something', status: 'gathering', stadium: 'stadium', startedAt: new Date(), playersCount: 10, subsetPlayersCount: 4, authorId: 1})

// .then(function(training){
// 	console.log(training);
// });

var message = null;

//
TrainingActivityService.findById(892)

//
.then(function(trainingActivity){

	message = trainingActivity;

	TrainingActivityService.listActivitySuggestedRecipientsById(trainingActivity.id)

	//
	.then(function(recipients){

		PushNotificationService.pushMessageToUsers(message, recipients);
		
	});

});



// TrainingActivityService.notifyAboutId(1)
// .then(function(done){
// 	console.log(done);
// });

// TrainingService.findForPlayerIdById(20, 15)
// .then(function(training){
// 	console.log(training);
// });

// TrainingService.listPlayersById(1)
// .then(function(players){
// 	console.log(players);
// });

// TrainingService.detailsByPlayerIdAndId(1, 76)
// .then(function(training){
// 	console.log(training);
// });

// TrainingService.cancelIdByPlayerId(21, 1)
// .then(function(done){
// 	console.log('The promise has been fullfilled.');
// });

// TrainingActivityService.listByTrainingIdAndPlayerId(15, 1)
// .then(function(activities){
// 	console.log(activities);
// });

// TrainingService.decideForPlayerIdToComeToId(1, 1, false)
// .then(function(done){
// 	console.log('The player id has decided to come to the id.');
// });

// TrainingService.decideForPlayerIdToApologizeToId(1, 1)
// .then(function(done){
// 	console.log('The player id has decided to apologize to the id.');
// });

// SmsService.send('+112121', 'This is a message and it should be sent.');