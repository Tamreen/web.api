
//
GroupPlayerService = {

	//
	findById: function(id){

		var queryGetGroupPlayerById = DatabaseService.format('select * from groupPlayers where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetGroupPlayerById).then(function(groupPlayers){

			if (groupPlayers.length == 0){
				return null;
			}

			var groupPlayer = groupPlayers[0];
			return groupPlayer;
		});
	},

	//
	findByGroupIdAndPlayerId: function(groupId, playerId){

		var queryFindGroupPlayer = DatabaseService.format('select * from groupPlayers where groupId = ? and playerId = ? limit 1', [groupId, playerId]);

		return DatabaseService.query(queryFindGroupPlayer)

		//
		.then(function(groupPlayers){

			if (groupPlayers.length == 0){
				return null;
			}

			var groupPlayer = groupPlayers[0];
			return groupPlayer;
		});
	},

	//
	findPlayerGroupById: function(id){

		var queryFindPlayerGroup = DatabaseService.format('select players.* from players, groupPlayers where groupPlayers.playerId = players.id and groupPlayers.id = ? limit 1', [id]);

		return DatabaseService.query(queryFindPlayerGroup)

		.then(function(playerGroups){

			if (playerGroups.length == 0){
				return null;
			}

			var playerGroup = playerGroups[0];
			return playerGroup;
		});
	},

	//
	create: function(parameters){

		parameters.joinedAt = new Date();

		var queryInsertGroupPlayer = DatabaseService.format('insert into groupPlayers set ?', parameters);

		return DatabaseService.query(queryInsertGroupPlayer)

		//
		.then(function(insertGroupPlayerResult){
			return GroupPlayerService.findById(insertGroupPlayerResult.insertId);
		});
	},

	//
	updateForId: function(parameters, id){

		var queryUpdateGroupPlayerById = DatabaseService.format('update groupPlayers set ? where id = ?', [parameters, id]);
		
		return DatabaseService.query(queryUpdateGroupPlayerById)

		.then(function(updateGroupPlayerByIdResult){
			return GroupPlayerService.findById(id);
		});
	},
};