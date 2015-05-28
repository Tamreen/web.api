
//
GroupService = {

	//
	findById: function(id){

		var queryGetGroupById = DatabaseService.format('select * from groups where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetGroupById).then(function(groups){

			if (groups.length == 0){
				return null;
			}

			var group = groups[0];
			return group;
		});
	},

	//
	listForPlayerId: function(playerId){

		var queryListGroupsForPlayerId = DatabaseService.format('select userGroups.*, (select fullname from players where players.id = userGroups.authorId) as author, (select count(id) from groupPlayers where groupPlayers.groupId in (userGroups.id) and groupPlayers.leftAt is null) as playersCount, (select count(id) from activityPlayers where playerId = userGroups.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as activitiesCount, (select max(coalesce(createdAt, modifiedAt)) from activityPlayers where playerId = userGroups.playerId and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as lastActivityAt from (select groups.*, groupPlayers.playerId as playerId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups order by lastActivityAt desc, coalesce(userGroups.createdAt, userGroups.modifiedAt) desc', [playerId]);

		return DatabaseService.query(queryListGroupsForPlayerId);
	},

	//
	findByIdForPlayerId: function(id, playerId){

		var queryFindGroupByIdForPlayerId = DatabaseService.format('select userGroups.*, (select fullname from players where players.id = userGroups.authorId) as author, (select count(id) from groupPlayers where groupPlayers.groupId in (userGroups.id) and groupPlayers.leftAt is null) as playersCount, (select count(id) from activityPlayers where playerId = userGroups.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as activitiesCount from (select groups.*, groupPlayers.playerId as playerId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groupPlayers.groupId = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups', [playerId, id]);

		return DatabaseService.query(queryFindGroupByIdForPlayerId).then(function(groups){

			if (groups.length == 0){
				return null;
			}

			var group = groups[0];
			return group;
		});
	},

	//
	create: function(parameters){

		// Add created at and player id parameters.
		parameters.createdAt = new Date();

		var queryInsertGroup = DatabaseService.format('insert into groups set ?', parameters);

		return DatabaseService.query(queryInsertGroup)

		//
		.then(function(insertGroupResult){

			// Insert a new player to be an admin in the created group.
			var groupId = insertGroupResult.insertId;

			var insertGroupPlayerParameters = {groupId: groupId, playerId: parameters.authorId, role: 'admin', joinedAt: new Date()};
			var queryInsertGroupPlayer = DatabaseService.format('insert into groupPlayers set ?', insertGroupPlayerParameters);

			//
			DatabaseService.query(queryInsertGroupPlayer);

			//
			return GroupService.findById(groupId);
		});
	},

	//
	leaveByIdForPlayerId: function(id, playerId){

		return new Promise(function(resolve, reject){

			// Check if the user is admin or not in that group.
			var queryGetGroupPlayer = DatabaseService.format('select * from groupPlayers where groupId = ? and playerId = ?', [id, playerId]);

			// Execute the query.
			DatabaseService.query(queryGetGroupPlayer)

			//
			.then(function(groupPlayers){

				if (groupPlayers.length == 0){
					return reject(new BadRequestError('لا يُمكن العثور على المجموعة المحدّدة.'));
				}

				// Set the group player.
				var groupPlayer = groupPlayers[0];

				if (groupPlayer.role == 'admin'){
					return reject(new BadRequestError('لا يُمكنك مغادرة المجموعة لكونك مديرًا.'));
				}

				var updateGroupPlayerParameters = {leftAt: new Date()};
				var queryUpdateGroupPlayer = DatabaseService.format('update groupPlayers set ? where groupId = ? and playerId = ?', [updateGroupPlayerParameters, id, playerId]);

				return DatabaseService.query(queryUpdateGroupPlayer);
			})

			//
			.then(function(updateGroupPlayerResult){

				return resolve(updateGroupPlayerResult);

			});

		});
	},

	//
	listPlayersByIdForPlayerId: function(id, playerId){

		var queryListPlayersForGroupIdAndPlayerId = DatabaseService.format('select players.id, players.fullname, groupPlayers.role, groupPlayers.joinedAt from groupPlayers, players where groupPlayers.playerId = players.id and groupPlayers.leftAt is null and groupId in (select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null)', [playerId, id]);

		return DatabaseService.query(queryListPlayersForGroupIdAndPlayerId);
	},

	//
	deleteByIdForPlayerId: function(id, playerId){

		return new Promise(function(resolve, reject){

			// Check if the user is admin or not in that group.
			var queryGetGroupPlayer = DatabaseService.format('select * from groupPlayers where groupId = ? and playerId = ?', [id, playerId]);

			// Execute the query.
			DatabaseService.query(queryGetGroupPlayer)

			//
			.then(function(groupPlayers){

				if (groupPlayers.length == 0){
					return reject(new BadRequestError('لا يُمكن العثور على المجموعة المحدّدة.'));
				}

				// Set the group player.
				var groupPlayer = groupPlayers[0];

				if (groupPlayer.role != 'admin'){
					return reject(new BadRequestError('لا يُمكنك حذف المجموعة لكونك لست مديرًا.'));
				}

				//
				var updateGroupParameters = {deletedAt: new Date()};
				var queryUpdateGroup = DatabaseService.format('update groups set ? where id = ?', [updateGroupParameters, groupPlayer.groupId]);
				
				return DatabaseService.query(queryUpdateGroup);
			})

			//
			.then(function(updateGroupPlayerResult){

				return resolve(updateGroupPlayerResult);

			});

		});
	},

	//
	addPlayerToId: function(e164formattedMobileNumber, fullname, id){

		//
		return UserService.findByE164formattedMobileNumberOrCreate(e164formattedMobileNumber, {fullname: fullname}, true)

		//
		.then(function(user){

			if (!validator.isNull(user.deletedAt)){
				throw new BadRequestError('لا يُمكن إضافة لاعب غير نشط إلى المجموعة.');
			}

			return GroupService.joinByIdForPlayerId(id, user.playerId);
		});
	},

	//
	joinByIdForPlayerId: function(id, playerId){

		//
		return GroupPlayerService.findByGroupIdAndPlayerId(id, playerId)

		//
		.then(function(groupPlayer){

			// Check if the player id never left the group id.
			if (groupPlayer && validator.isNull(groupPlayer.leftAt)){
				throw new BadRequestError('اللاعب في المجموعة مسبقًا.');
			}

			if (!groupPlayer){

				// Create a new one and return.
				return GroupPlayerService.create({groupId: id, playerId: playerId, role: 'member'});
			}

			return groupPlayer;
		})

		.then(function(groupPlayer){

			//
			var updateGroupPlayerParameters = {joinedAt: new Date(), leftAt: null};

			return GroupPlayerService.updateForId(updateGroupPlayerParameters, groupPlayer.id);
		})

		.then(function(groupPlayer){
			return GroupPlayerService.findPlayerGroupById(groupPlayer.id);

		});
	},

	checkIsPlayerIdAdminForIdOrDie: function(playerId, id){

		return new Promise(function(resolve, reject){

			// Check if the user is admin.
			var queryGetGroupPlayer = DatabaseService.format('select groupPlayers.* from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\'', [playerId, id])

			//
			DatabaseService.query(queryGetGroupPlayer)

			//
			.then(function(groupPlayers){

				if (groupPlayers.length == 0){
					return reject(new UnauthorizedError('لا يُمكنك الوصول إلى هذه الواجهة، ربما لكونك لست مديرًا.'));
				}

				var groupPlayer = groupPlayers[0];
				return resolve(groupPlayer);
			});
		});
	},

	//
	deletePlayerIdByAdminPlayerIdInId: function(playerId, adminPlayerId, id){

		var queryFindGroupPlayer = DatabaseService.format('select groupPlayers.id from groupPlayers where groupId in (select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\') and groupPlayers.playerId = ? and groupPlayers.role <> \'admin\' and groupPlayers.leftAt is null', [adminPlayerId, id, playerId]);

		//
		return DatabaseService.query(queryFindGroupPlayer)

		//
		.then(function(groupPlayers){

			if (groupPlayers.length == 0){
				throw new BadRequestError('لا يُمكن حذف اللاعب من المجموعة ربما لكونه ليس عضوًا فيها أو لكونه مديرًا لها.');
			}

			//
			var groupPlayer = groupPlayers[0];

			//
			var updateGroupPlayerParameters = {leftAt: new Date()};
			return GroupPlayerService.updateForId(updateGroupPlayerParameters, groupPlayer.id);
		});
	},

	//
	adminizePlayerIdByAdminPlayerIdInId: function(playerId, adminPlayerId, id){

		var queryFindGroupPlayer = DatabaseService.format('select groupPlayers.id from groupPlayers where groupId in (select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\') and groupPlayers.playerId = ? and groupPlayers.role <> \'admin\' and groupPlayers.leftAt is null', [adminPlayerId, id, playerId]);

		//
		return DatabaseService.query(queryFindGroupPlayer)

		//
		.then(function(groupPlayers){

			if (groupPlayers.length == 0){
				throw new BadRequestError('لا يُمكن إضافة اللاعب إلى المدراء ربما لكونه ليس عضوًا في هذه المجموعة أو لكونه مديرًا لها.');
			}

			//
			var groupPlayer = groupPlayers[0];

			//
			var updateGroupPlayerParameters = {role: 'admin'};
			return GroupPlayerService.updateForId(updateGroupPlayerParameters, groupPlayer.id);
		});
	},
};