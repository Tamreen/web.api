
require('colors');
require('../server');

// Walk into users and set the device token of each empty.
DatabaseService.query('update users set token = null, deviceToken = null')

//
.then(function(){
	console.log('Done'.green);
});

// TODO: Walk into players and set the names to different ones.
DatabaseService.query('select * from players')

//
.then(function(players){

	players.forEach(function(player){

		var suggestedPlayerName = suggestPlayerName(player.name);
		
		var updatePlayerParameters = {fullname: suggestedPlayerName};
		var queryUpdatePlayer = DatabaseService.format('update players set ? where id = ?', [updatePlayerParameters, player.id]);

		DatabaseService.query(queryUpdatePlayer)

		//
		.then(function(){
			console.log(suggestedPlayerName.magenta);
		});
	})

});

//
var names = [
	'إبراهيم', 'صالح', 'محمد', 'يوسف', 'يونس', 'يعقوب',
	'يحيى', 'حمد', 'خالد', 'فيصل', 'عبدالعزيز',
	'عبدالرحمن', 'وائل', 'أيمن', 'حسام', 'سليمان', 'ناصر',
];

//
var suggestPlayerName = function(playerName){

	var randomFirstName = names[Math.floor(Math.random() * names.length)];
	var randomSecondName = 'ال' + names[Math.floor(Math.random() * names.length)];

	//
	return randomFirstName + ' ' + randomSecondName;
}