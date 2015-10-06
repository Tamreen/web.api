
require('../server');

// A player in that group.
// GroupService.findByIdForPlayerId(6, 1)

// .then(function(group){

// 	console.log(group);

// });

// // A player is not in that group.
// GroupService.findByIdForPlayerId(1, 1)

// .then(function(group){

// 	console.log(group);

// });

// // Update a group.
// GroupService.updateForId({name: 'Arsenal'}, 1)

// .then(function(group){

// 	console.log(group);

// });

// GroupService.checkIsPlayerIdAdminForIdsOrDie(1, [6, 104])

// .then(function(result){

// 	//
// 	console.log('Result is reached', result);

// });

GroupService.listPlayersByIdsForPlayerId([6, 104], 1)

//
.then(function(players){
	console.log('Number of players', players.length);
});