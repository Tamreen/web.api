
//
var nconf = require('nconf');

// Get the config information.
nconf.argv().env().file({file: './configs/variables.json'});

//
var mysql = require('mysql');

var db = mysql.createConnection({
	host: nconf.get('databaseHost'),
	port: nconf.get('databasePort'),
	user: nconf.get('databaseUsername'),
	password: nconf.get('databasePassword'),
	database: nconf.get('databaseName')
});

var players = [
	{fullname: 'محمد خالد', e164formattedMobileNumber: '+966553085500'},
	{fullname: 'صالح ماجد', e164formattedMobileNumber: '+966553085501'},
	{fullname: 'خالد فهد', e164formattedMobileNumber: '+966553085502'},
	{fullname: 'علي عبدالرحمن', e164formattedMobileNumber: '+966553085503'},
	{fullname: 'فهد سالم', e164formattedMobileNumber: '+966553085504'},
	{fullname: 'فؤاد صالح', e164formattedMobileNumber: '+966553085505'},
	{fullname: 'عبدالعزيز محمد', e164formattedMobileNumber: '+966553085506'},
	{fullname: 'إبراهيم سليمان', e164formattedMobileNumber: '+966553085507'},
	{fullname: 'عبدالرحمن عبدالله', e164formattedMobileNumber: '+966553085508'},
	{fullname: 'هشام علي', e164formattedMobileNumber: '+966553085509'},
	{fullname: 'مالك عبدالرحمن', e164formattedMobileNumber: '+966553085510'},
	{fullname: 'خالد علي', e164formattedMobileNumber: '+966553085520'},
	{fullname: 'عبدالحكيم محمد', e164formattedMobileNumber: '+966553085530'},
	{fullname: 'فيصل سليمان', e164formattedMobileNumber: '+966553085540'},
	{fullname: 'منصور حسن', e164formattedMobileNumber: '+966553085550'},
	{fullname: 'زكريا حمود', e164formattedMobileNumber: '+966553085560'},
	{fullname: 'إبراهيم عبدالله', e164formattedMobileNumber: '+966553085570'},
	{fullname: 'أيوب محمد', e164formattedMobileNumber: '+966553085580'},
];

// console.log(players);

players.forEach(function(player){

	// Insert a player.
	var insertPlayerParameters = {fullname: player.fullname};

	db.query('insert into players set ?', [insertPlayerParameters], function(error, result){

		if (error){
			console.error(error.stack);
			return;
		}

		var insertUserParameters = {playerId: result.insertId, e164formattedMobileNumber: player.e164formattedMobileNumber, createdAt: new Date()};

		// Insert a user.
		db.query('insert into users set ?', [insertUserParameters], function(error, result){

			if (error){
				console.error(error.stack);
				return;
			}

			console.log('Done');

		});
	});

});