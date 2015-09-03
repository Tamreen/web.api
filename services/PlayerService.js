
//
PlayerService = {

	//
	findById: function(id){

		var queryGetPlayerById = DatabaseService.format('select players.*, users.createdAt from players, users where players.id = users.playerId and players.id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetPlayerById).then(function(players){

			if (players.length == 0){
				return null;
			}

			var player = players[0];
			return player;
		});
	},

	create: function(parameters){

		var queryInsertPlayer = DatabaseService.format('insert into players set ?', parameters);
		
		return DatabaseService.query(queryInsertPlayer)

		.then(function(insertPlayerResult){
			return PlayerService.findById(insertPlayerResult.insertId);
		});
	},

	//
	updateForId: function(parameters, id){

		//
		parameters.modifiedAt = new Date();

		var queryUpdatePlayerById = DatabaseService.format('update players set ? where id = ?', [parameters, id]);
		
		return DatabaseService.query(queryUpdatePlayerById)

		.then(function(updatePlayerByIdResult){
			return PlayerService.findById(id);
		});
	},
};