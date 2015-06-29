
require('colors');
require('../server');

// Walk into users and set the device token of each empty.
DatabaseService.query('update users set token = null, deviceToken = null')

//
.then(function(){
	console.log('Done'.green);
});

// Walk into players and set the names to different ones.
DatabaseService.query('select * from players')

//
.then(function(players){

	players.forEach(function(player){

		var suggestedPlayerName = suggestPlayerName();
		
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
DatabaseService.query('select * from groups')

.then(function(groups){

	groups.forEach(function(group){

		var suggestedGroupName = suggestGroupName();

		var updateGroupParameters = {name: suggestedGroupName};
		var queryUpdateGroup = DatabaseService.format('update groups set ? where id = ?', [updateGroupParameters, group.id]);

		DatabaseService.query(queryUpdateGroup)

		//
		.then(function(){
			console.log(suggestedGroupName.magenta);
		});

	});

});

//
var names = [
	'إبراهيم', 'صالح', 'محمد', 'يوسف', 'يونس', 'يعقوب',
	'يحيى', 'حمد', 'خالد', 'فيصل', 'عبدالعزيز',
	'عبدالرحمن', 'وائل', 'أيمن', 'حسام', 'سليمان', 'ناصر',
];

var groups = [
	'شمال الرياض', 'شرق الرياض', 'جنوب الرياض', 
];

//
var suggestPlayerName = function(){

	var randomFirstName = names[Math.floor(Math.random() * names.length)];
	var randomSecondName = 'ال' + names[Math.floor(Math.random() * names.length)];

	//
	return randomFirstName + ' ' + randomSecondName;
}

var suggestGroupName = function(){
	return groups[Math.floor(Math.random() * groups.length)];
}
