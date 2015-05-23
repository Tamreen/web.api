
// TODO: Libraries required by configurations.
// TODO: Configurations needed.
// TODO: Libraries not related to anything.
// TODO: Services to be used.
// TODO: Routes.

var Promise = require('bluebird');
var using = Promise.using;

var fs = require('fs');
var mysql = require('mysql');

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');

//
var nconf = require('nconf');

// Get the config information.
nconf.argv().env().file({file: './configs/variables.json'});

var https = require('https');
var http = require('http');

// Promisify somethings.
Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

// SSL.
var sslOptions = {
  cert: fs.readFileSync(nconf.get('sslCert')),
  key: fs.readFileSync(nconf.get('sslKey')),
  ca: [fs.readFileSync(nconf.get('sslCa'))],
};

// APN.
var apnOptions = {
	'batchFeedback': true,
	'interval': 1,
	'production': nconf.get('apnProduction'),
	'cert': nconf.get('apnCertPem'),
	'key': nconf.get('apnKeyPem'),
	'passphrase': nconf.get('apnPassphrase'),
};

// var db = mysql.createConnection({
// 	host: nconf.get('databaseHost'),
// 	port: nconf.get('databasePort'),
// 	user: nconf.get('databaseUsername'),
// 	password: nconf.get('databasePassword'),
// 	database: nconf.get('databaseName')
// });

var pool = mysql.createPool({
	host: nconf.get('databaseHost'),
	port: nconf.get('databasePort'),
	user: nconf.get('databaseUsername'),
	password: nconf.get('databasePassword'),
	database: nconf.get('databaseName'),
});

//
var DatabaseService = {

	getConnection: function(){
		return pool.getConnectionAsync().disposer(function(connection){
			return connection.destroy();
		});
	},

	query: function(command){
		return using(DatabaseService.getConnection(), function(connection){
			return connection.queryAsync(command).then(function(results){
				// Return only the rows, no need for fields for now.
				return results[0];
			});
		});
	},

	format: function(query, parameters){
		return mysql.format(query, parameters);
	}
};

//
var uuid = require('node-uuid');
var crypto = require('crypto');

//
var validator = require('validator');

//
var moment = require('moment');

// Require the Twilio module and create a REST client.
// var twilio = require('twilio')(nconf.get('twilioAccountSid'), nconf.get('twilioAuthToken'));

// Nexmo.
var simpleNexmo = require('simple-nexmo');

var nexmo = new simpleNexmo({
	apiKey: nconf.get('nexmoApiKey'),
	apiSecret: nconf.get('nexmoApiSecret'),
});

// Push notification.
var gcm = require('node-gcm');
var apn = require('apn');

//
var router = express.Router();

//
var e164Format = /^\+[0-9]{8,15}$/;

var app = express();
var port = 4000;

// Set the locale of the training.
moment.locale('ar-sa');

// This should be a service.
var SmsService = {

	send: function(to, message){

		if (nconf.get('environment') == 'development'){
			console.log({to: to, message: message});
			return;
		}

		nexmo.sendSMSMessage({
			from: nconf.get('nexmoNumber'),
			to: to,
			type: 'unicode',
			text: message,
		}, function(error, response){
			if (error){
				console.log(error);
			}else{
				console.dir(response);
			}
		});
	},
};

// This should be a service.
var PushNotification = {

	toAndroid: function(message, registrationIds){

		console.log('toAndroid has been called.');

		// Set up the sender with you API key.
		var sender = new gcm.Sender(nconf.get('gcmSender'));

		// Send the message.
		sender.send(message, registrationIds, 4, function(error, result){
			console.log(registrationIds);
			if(error) console.error(error);
			else console.log(result);
		});

	},

	toIos: function(message, registrationIds){

		console.log('toIos has been called.');

		try{

			var apnConnection = new apn.Connection(apnOptions);
			var token = registrationIds[0];
			var device = new apn.Device(token);

			// Set the notification.
			var notification = new apn.Notification();

			notification.expiry = Math.floor(Date.now() / 1000) + 3600;
			notification.badge = 3;
			notification.sound = 'ping.aiff';
			notification.alert = message;
			notification.payload = {'messageFrom': 'Tamreen App'};

			// Send the message.
			apnConnection.pushNotification(notification, device);

		}catch (exception){
			console.log(exception);
		}
	}
};

// Access control allow.
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	next();
});

// All that is related to session.
app.use(session({
	secret: nconf.get('appSalt'),
	resave: false,
	saveUninitialized: true,
}));

// Parse application/x-www-form-urlencoded.
app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json.
app.use(bodyParser.json());


// Handle errors as a RESTful API.
function handleApiErrors(error, response){

	if (error instanceof ApiError){
		return response.status(error.statusCode).send({
			'message': error.message,
		})
	}

	// Otherwise, Log about it.
	console.log(error);

	// Response to the user with something went wrong.
	return response.status(500).send({
		'message': 'Something went wrong.',
	});
}

// Define some errors.
// TODO: Find a better way to define these errors.

function ApiError(message, statusCode){
	this.message = message;
	this.statusCode = statusCode;
}

function NotFoundError(message){
	this.message = message;
	this.statusCode = 404;
}

function BadRequestError(message){
	this.message = message;
	this.statusCode = 400;
}

// 
ApiError.prototype = Object.create(Error.prototype);

// 
BadRequestError.prototype = Object.create(ApiError.prototype); // 400.
NotFoundError.prototype = Object.create(ApiError.prototype); // 404.

var UserService = {

	//
	findCurrentOrDie: function(request){

		return new Promise(function(resolve, reject){

			// Get the given user token.
			var token = request.get('X-User-Token');

			// Check if the token is invalid, then reject the promise with BadRequestError.
			if (validator.isNull(token)){
				return reject(new BadRequestError('The user token cannot be empty.'));
			}

			// Search for a user with the given token.
			var queryfindCurrentOrDieUser = DatabaseService.format('select * from users where token = ? and token is not null limit 1', [token]);

			DatabaseService.query(queryfindCurrentOrDieUser).then(function(users){
				
				if (users.length == 0){
					return reject(new NotFoundError('The user cannot be found.'));
				}

				// Get the first user.
				var user = users[0];
				return resolve(user);
			});

		});
	},

	//
	findCurrentIfAny: function(request){

		return new Promise(function(resolve, reject){

			UserService.findCurrentOrDie(request)

			.then(function(user){
				return resolve(user);
			})

			.catch(function(error){
				return resolve(null);
			});

		});
	},

	//
	findById: function(id){

		var queryGetUserById = DatabaseService.format('select * from users where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetUserById).then(function(users){

			if (users.length == 0){
				return null;
			}

			var user = users[0];
			return user;
		});
	},

	//
	findByE164formattedMobileNumber: function(e164formattedMobileNumber){

		var queryGetUserByE164formattedMobileNumber = DatabaseService.format('select * from users where e164formattedMobileNumber = ? limit 1', [e164formattedMobileNumber]);
		
		return DatabaseService.query(queryGetUserByE164formattedMobileNumber).then(function(users){

			if (users.length == 0){
				return null;
			}

			var user = users[0];
			return user;
		});
	},

	//
	findByE164formattedMobileNumberOrCreate: function(e164formattedMobileNumber, parameters, invited){
		
		// Find the 
		return UserService.findByE164formattedMobileNumber(e164formattedMobileNumber)
		
		.then(function(user){

			if (!user){

				// 
				parameters.e164formattedMobileNumber = e164formattedMobileNumber;

				// Create the user if does not exist.
				return UserService.create(parameters, invited);
			}

			return user;
		})
	},

	//
	create: function(parameters, invited){

		// Create a player first.
		return PlayerService.create({fullname: parameters.fullname})

		// Create the user.
		.then(function(player){

			// Delete fullname parameter.
			delete parameters.fullname;

			// Add created at and player id parameters.
			// TODO: Maybe the date could be better.
			parameters.createdAt = new Date();
			parameters.playerId = player.id;

			var queryInsertUser = DatabaseService.format('insert into users set ?', parameters);
			
			return DatabaseService.query(queryInsertUser);
		})

		//
		.then(function(insertUserResult){

			if (invited){

				// Send an invited SMS for the created player.
				SmsService.send(parameters.e164formattedMobileNumber, 'تطبيق تمرين - تمت إضافتك إلى مجموعة لعب، تفضّل بتحميل التطبيق من أبل ستور ' + nconf.get('appleStoreUrl') + ' أو قوقل بلاي ' + nconf.get('googlePlayUrl'));
			}

			return UserService.findById(insertUserResult.insertId);
		});

	},

	//
	updateForId: function(parameters, id){

		//
		parameters.modifiedAt = new Date();

		var queryUpdateUserById = DatabaseService.format('update users set ? where id = ?', [parameters, id]);
		
		return DatabaseService.query(queryUpdateUserById)

		.then(function(updateUserByIdResult){
			return UserService.findById(id);
		});
	},

	//
	logout: function(user){
		
		var updateUserParameters = {token: null, modifiedAt: new Date()};
		var queryUpdateUser = DatabaseService.format('update users set ? where token = ?', [updateUserParameters, user.token]);
		return DatabaseService.query(queryUpdateUser);
	},
};

var PlayerService = {

	//
	findById: function(id){

		var queryGetPlayerById = DatabaseService.format('select * from players where id = ? limit 1', [id]);
		
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

var GroupService = {

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

	// TODO: The query that is inside should be easier.
	// TODO: This should be ordered by latest activities.
	listForPlayerId: function(playerId){

		var queryListGroupsForPlayerId = DatabaseService.format('select userGroups.*, (select fullname from players where players.id = userGroups.authorId) as author, (select count(id) from groupPlayers where groupPlayers.groupId in (userGroups.id) and groupPlayers.leftAt is null) as playersCount, (select count(id) from activityPlayers where playerId = userGroups.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as activitiesCount from (select groups.*, groupPlayers.playerId as playerId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups', [playerId]);

		return DatabaseService.query(queryListGroupsForPlayerId);
	},

	// TODO: The query that is inside should be easier.
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
			return DatabaseService.query(queryInsertGroupPlayer);
		})

		//
		.then(function(insertGroupPlayerResult){

			return GroupService.findById(insertGroupPlayerResult.insertId);

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
					return reject(new BadRequestError('Cannot find the specified group.'));
				}

				// Set the group player.
				var groupPlayer = groupPlayers[0];

				if (groupPlayer.role == 'admin'){
					return reject(new BadRequestError('Cannot leave a group when admin you are.'));
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
					return reject(new BadRequestError('Cannot find the specified group.'));
				}

				// Set the group player.
				var groupPlayer = groupPlayers[0];

				if (groupPlayer.role != 'admin'){
					return reject(new BadRequestError('Cannot delete a group when admin you are not.'));
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
				throw new BadRequestError('Cannot add an inactive player to the group.');
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
				throw new BadRequestError('Player is already in that group.');
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
					return reject(new BadRequestError('Not authorized to access this method.'));
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

//
var GroupPlayerService = {

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

		var queryFindPlayerGroup = DatabaseService.format('select fullname, groupPlayers.* from players, groupPlayers where groupPlayers.playerId = players.id and groupPlayers.id = ? limit 1', [id]);

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

//
var TrainingService = {

	//
	findForPlayerIdById: function(playerId, id){

		var queryGetTraining = DatabaseService.format('select trainings.*, (select decision from trainingPlayers where trainingId = trainings.id and playerId = tp.playerId) as playerDecision, (select count(groupPlayers.id) > 0 from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = tp.playerId and groups.id = trainings.groupId and users.deletedAt is null and groups.deletedAt is null and groupPlayers.leftAt is null and groupPlayers.role = \'admin\') as adminable, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'willcome\') willcomePlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'register-as-subset\') subsetPlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'apologize\') apologizePlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = trainings.id and trainingPlayers.decision = \'notyet\') as notyetPlayersCount from trainingPlayers tp, trainings where tp.trainingId = trainings.id and tp.playerId = ? and trainings.id = ?;', [playerId, id]);
		
		return DatabaseService.query(queryGetTraining).then(function(trainings){

			if (trainings.length == 0){
				return null;
			}

			var training = trainings[0];
			return training;
		});
	},

	addGroupIdPlayersForPlayerIdToId: function(groupId, playerId, id){

		return GroupService.listPlayersByIdForPlayerId(groupId, playerId)

		.then(function(players){

			return Promise.each(players, function(player){

				return TrainingPlayerService.findOrCreate({trainingId: id, playerId: player.id, decision: 'notyet'});

			});

		});
	},

	listForGroupIdAndPlayerId: function(groupId, playerId){

		var queryListTrainingsForGroupIdAndPlayerId = DatabaseService.format('select userTrainings.id, userTrainings.name, userTrainings.status, (select count(id) from activityPlayers where playerId = userTrainings.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId = userTrainings.id)) as activitiesCount from (select trainings.*, users.playerId as playerId from groupPlayers, users, groups, trainings where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.playerId = ? and groupPlayers.groupId = ? and groupPlayers.leftAt is null and groups.deletedAt is null and trainings.groupId = groups.id) as userTrainings order by coalesce(userTrainings.modifiedAt, userTrainings.createdAt) desc', [playerId, groupId]);

		return DatabaseService.query(queryListTrainingsForGroupIdAndPlayerId);
	},

	//
	create: function(parameters){

		//
		var authorId = parameters.authorId;

		//
		parameters.name = moment(parameters.startedAt).format('dddd، DD MMMM YYYY، hh:mm a');
		parameters.createdAt = new Date();

		//
		delete parameters.authorId;

		//
		var queryInsertTraining = DatabaseService.format('insert into trainings set ?', parameters);

		//
		return DatabaseService.query(queryInsertTraining)

		//
		.then(function(insertTrainingResult){

			var id = insertTrainingResult.insertId;

			//
			TrainingService.addGroupIdPlayersForPlayerIdToId(parameters.groupId, authorId, id)

			//
			.then(function(){
				return TrainingActivityService.create({trainingId: id, authorId: authorId, type: 'training-started'});
			});

			// Find the training by id.
			return TrainingService.findForPlayerIdById(authorId, id);
		});
	},

	//
	listPlayersById: function(id){

		var queryListTrainingPlayers = DatabaseService.format('select players.fullname, players.id, trainingPlayers.decision as decision from trainingPlayers, players where trainingPlayers.playerId = players.id and trainingPlayers.trainingId = ?', [id]);

		return DatabaseService.query(queryListTrainingPlayers);
	},

	detailsByPlayerIdAndId: function(playerId, id){

		var t = null;

		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			if (!training){
				throw new BadRequestError('Training cannot be found.');
			}

			// Take a copy to be remembered.
			t = training;

			return TrainingService.listPlayersById(training.id);
		})

		//
		.then(function(players){

			// Set the sub arrays.
			t.willcomePlayers = [];
			t.subsetPlayers = [];
			t.apologizePlayers = [];
			t.notyetPlayers = [];

			return Promise.each(players, function(player){

				if (player.decision == 'willcome'){
					return t.willcomePlayers.push(player);
				}

				if (player.decision == 'apologize'){
					return t.apologizePlayers.push(player);
				}

				if (player.decision == 'register-as-subset'){
					return t.subsetPlayers.push(player);
				}

				// Otherwise, the player did not decide.
				return t.notyetPlayers.push(player);
			});
		})

		//
		.then(function(){
			return t;
		})
	},

	//
	cancelIdByPlayerId: function(id, playerId){

		//
		var t = null;

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (!training){
				throw new BadRequestError('The training cannot be found.');
			}

			//
			t = training;

			// Check if the player id is not admin.
			if (training.adminable == 0){
				throw new BadRequestError('The training cannot be canceled when the player is not admin.');
			}

			// Check if the training is already canceled.
			if (training.status == 'canceled'){
				throw new BadRequestError('The training is already canceled.');
			}

			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-canceled'});
		})

		// Update the status of the training to be 'canceled'.
		.then(function(trainingActivity){
			return TrainingService.updateForId({status: 'canceled'}, t.id);
		});
	},

	//
	updateForId: function(parameters, id){

		//
		parameters.modifiedAt = new Date();

		var queryUpdateTrainingById = DatabaseService.format('update trainings set ? where id = ?', [parameters, id]);
		
		return DatabaseService.query(queryUpdateTrainingById);

		// TODO: This could be fixed in a better way.
	},

	//
	decideForPlayerIdToComeToId: function(playerId, id, evenIfWasSubset){

		//
		var t = null;
		var ta = null;

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (!training){
				throw new BadRequestError('The training cannot be found.');
			}

			//
			t = training;

			// Check if the training is already canceled.
			if (t.status == 'canceled'){
				throw new BadRequestError('The training is already canceled.');
			}

			// TODO: Check if the attending time for the training has ended.

			// Check if the player id has decided.
			if (t.playerDecision == 'willcome' || (t.playerDecision == 'register-as-subset' && evenIfWasSubset == false)){
				throw new BadRequestError('The player id already has decided.');
			}

			// Check if the training is already completed.
			if (t.playersCount == t.willcomePlayersCount && t.subsetPlayersCount == t.registerAsSubsetPlayersCount){
				throw new BadRequestError('The training is already completed.');
			}

			// Check if there is enough space for attending as a major player.
			if (t.playersCount > t.willcomePlayersCount){
				return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'player-decided-to-come'});
			}

			// Check if there is no enough space for that.
			if (t.subsetPlayersCount > t.registerAsSubsetPlayersCount){
				return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'register-as-subset'});
			}
		})

		// Update the training player decision.
		.then(function(activity){

			//
			ta = activity;

			if (activity.type == 'player-decided-to-come'){
				return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('willcome', t.id, playerId);
			}

			if (activity.type == 'register-as-subset'){
				return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('register-as-subset', t.id, playerId);
			}
		})

		// Check if the training now is completed.
		.then(function(){

			if (ta.type == 'player-decided-to-come'){

				// If the training is completed, create activity and notify the players.
				if (t.playersCount == t.willcomePlayersCount + 1){

					console.log('The training is now completed.');

					// Complete the training.
					TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-completed'})

					//
					.then(function(completedActivity){
						return TrainingService.updateForId({status: 'completed'});
					});
				}
			}

			// Just to assure that the promise has been fullfilled.
			return true;
		})
	},

	//
	decideForPlayerIdToApologizeToId: function(playerId, id){

		//
		var t = null;
		var ta = null;

		// Get the training by id.
		return TrainingService.findForPlayerIdById(playerId, id)

		//
		.then(function(training){

			// Check if the training is valid.
			if (!training){
				throw new BadRequestError('The training cannot be found.');
			}

			//
			t = training;

			// Check if the training is already canceled.
			if (t.status == 'canceled'){
				throw new BadRequestError('The training is already canceled.');
			}

			// TODO: Check if the attending time for the training has ended.

			// Check if the player id has decided.
			if (t.playerDecision == 'apologize'){
				throw new BadRequestError('The player id already has decided.');
			}

			// TODO: If it is too late then it is too late.

			//
			return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'player-apologized'});
		})

		// Update the training player decision.
		.then(function(activity){

			//
			ta = activity;

			//
			return TrainingPlayerService.updateDecisionByTrainingIdAndPlayerId('apologize', t.id, playerId);
		})

		//
		.then(function(){

			if (t.playerDecision == 'willcome' && t.status == 'completed'){

				// Update the status of the training to be 'gathering'.
				TrainingService.updateForId({status: 'gathering'})

				// Add an activity saying that the training is not completed w/ notifying players.
				.then(function(){
					return TrainingActivityService.create({trainingId: t.id, authorId: playerId, type: 'training-not-completed'});
				})

				// Subset the best player if any.
				.then(function(activity){
					return TrainingService.subsetBestPlayerForId(t.id);
				});
			}

			// Just to assure that the promise has been fullfilled.
			return true;
		})
	},

	//
	subsetBestPlayerForId: function(id){

		//
		var queryGetTrainingSubsetPlayers = DatabaseService.format('select * from trainingPlayers where trainingId = ? and decision = \'register-as-subset\' order by coalesce(modifiedAt, createdAt)', [id]);

		//
		return DatabaseService.query(queryGetTrainingSubsetPlayers)

		//
		.then(function(subsetPlayers){

			//
			if (subsetPlayers.length == 0){
				console.log('No subset players have been found.');
				return true;
			}

			//
			var subsetPlayer = subsetPlayers[0];

			//
			return TrainingService.decideForPlayerIdToComeToId(subsetPlayer.playerId, id, true);
		});
	}
};

var TrainingPlayerService = {

	//
	findById: function(id){
		var queryGetTrainingPlayer = DatabaseService.format('select * from trainingPlayers where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTrainingPlayer).then(function(trainingPlayers){

			if (trainingPlayers.length == 0){
				return null;
			}

			var trainingPlayer = trainingPlayers[0];
			return trainingPlayer;
		});
	},

	//
	findOrCreate: function(parameters){

		var queryGetTrainingPlayer = DatabaseService.format('select * from trainingPlayers where trainingId = ? and playerId = ? limit 1', [parameters.trainingId, parameters.playerId]);

		return DatabaseService.query(queryGetTrainingPlayer)

		.then(function(trainingPlayers){

			if (trainingPlayers.length == 0){
				return TrainingPlayerService.create(parameters);
			}

			//
			var trainingPlayer = trainingPlayers[0];
			return trainingPlayer;
		});
	},

	//
	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertTrainingPlayer = DatabaseService.format('insert into trainingPlayers set ?', [parameters]);
		return DatabaseService.query(queryInsertTrainingPlayer)

		//
		.then(function(insertTrainingPlayerResult){
			return TrainingPlayerService.findById(insertTrainingPlayerResult.insertId);
		});
	},

	//
	updateDecisionByTrainingIdAndPlayerId: function(decision, trainingId, playerId){

		//
		var updateTrainingPlayerParameters = {decision: decision, modifiedAt: new Date()};
		var queryUpdateTrainingPlayerDecision = DatabaseService.format('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, trainingId, playerId]);
		
		// 
		return DatabaseService.query(queryUpdateTrainingPlayerDecision);
	}
};

var ActivityPlayerService = {

	//
	findById: function(id){

		var queryGetActivityPlayer = DatabaseService.format('select * from activityPlayers where id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetActivityPlayer).then(function(activityPlayers){

			if (activityPlayers.length == 0){
				return null;
			}

			var activityPlayer = activityPlayers[0];
			return activityPlayer;
		});
	},

	findOrCreate: function(parameters){

		var queryGetActivityPlayer = DatabaseService.format('select * from activityPlayers where activityId = ? and playerId = ? limit 1', [parameters.activityId, parameters.playerId]);

		return DatabaseService.query(queryGetActivityPlayer)

		.then(function(activityPlayers){

			if (activityPlayers.length == 0){
				return ActivityPlayerService.create(parameters);
			}

			//
			var activityPlayer = activityPlayers[0];
			return activityPlayer;
		});

	},

	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertActivityPlayer = DatabaseService.format('insert into activityPlayers set ?', [parameters]);
		return DatabaseService.query(queryInsertActivityPlayer)

		//
		.then(function(insertActivityPlayerResult){
			return ActivityPlayerService.findById(insertActivityPlayerResult.insertId);
		});
	},

	//
	markAsReadManyByPlayerId: function(activities, playerId){

		// Extract the ids only from the activities.
		ids = [];

		//
		return Promise.each(activities, function(activity){
			return ids.push(activity.id);
		})

		//
		.then(function(){

			// Make all activities for this training read.
			var updateActivityPlayerParameters = {readable: 1, modifiedAt: new Date()};

			//
			var queryUpdateActivityPlayer = DatabaseService.format('update activityPlayers set ? where activityId in (?) and readable = 0 and playerId = ?', [updateActivityPlayerParameters, ids, playerId]);

			//
			return DatabaseService.query(queryUpdateActivityPlayer);
		});
	},

	// TODO: Update parameters by id.
};

var TrainingActivityService = {

	//
	findById: function(id){

		var queryGetTrainingActivity = DatabaseService.format('select trainingActivities.*, trainings.name as trainingName, players.fullname as authorFullname from trainingActivities, trainings, players where trainingActivities.trainingId = trainings.id and trainingActivities.authorId = players.id and trainingActivities.id = ? limit 1', [id]);
		
		return DatabaseService.query(queryGetTrainingActivity).then(function(trainingActivities){

			if (trainingActivities.length == 0){
				return null;
			}

			var trainingActivity = trainingActivities[0];

			// Add the description of the activity.
			trainingActivity.description = TrainingActivityService.describe({type: trainingActivity.type, authorFullname: trainingActivity.authorFullname});

			return trainingActivity;
		});
	},

	//
	create: function(parameters){

		//
		parameters.createdAt = new Date();

		//
		var queryInsertTrainingActivity = DatabaseService.format('insert into trainingActivities set ?', [parameters]);
		
		return DatabaseService.query(queryInsertTrainingActivity)

		//
		.then(function(insertTrainingActivityResult){

			var id = insertTrainingActivityResult.insertId;

			// Notify every one in the training about this activity.
			TrainingActivityService.notifyAboutId(id);

			//
			return TrainingActivityService.findById(id);
		})
	},

	//
	notifyAboutId: function(id){

		var ta = null;
		var ar = null;

		// Get activity information.
		return TrainingActivityService.findById(id)

		// Get the activity receivers.
		.then(function(trainingActivity){

			if (!trainingActivity){
				throw new BadRequestError('Training activity cannot be found.');
			}

			//
			ta = trainingActivity;

			return TrainingActivityService.listActivityRecipientsById(ta.id);
		})

		// Create/Find the recipients to/in activityPlayers table.
		.then(function(recipients){

			// Slice.
			ar = recipients.slice();

			return Promise.each(recipients, function(recipient){

				return ActivityPlayerService.findOrCreate({activityId: ta.id, playerId: recipient.playerId});

			});
		})

		//
		.then(function(){

			// TODO: Push the notification, it should display an icon for android devices.
			// TODO: There could be another way of notifying the user (e.g. SMS or email).

			console.log('I am trying to push notifications to the recipients.');

			return ar;
		});
	},

	//
	listActivityRecipientsById: function(id){

		var querylistUsersForTrainingId = DatabaseService.format('select users.*, players.fullname as fullname from trainingPlayers, users, players where trainingPlayers.playerId = users.playerId and players.id = users.playerId and trainingPlayers.trainingId = ?', [id]);

		//
		return DatabaseService.query(querylistUsersForTrainingId);
	},

	// TODO: This should return the description and the icon too.
	describe: function(parameters){

		//
		var type = parameters.type;
		var authorFullname = parameters.authorFullname;

		switch (type){

			case 'training-started':
				return 'بدأ التحضير للتمرين';
			break;

			case 'player-decided-to-come':
				return authorFullname + ' قرّر أن يحضر';
			break;

			case 'player-registered-as-subset':
				return authorFullname + ' سجّل كاحتياط';
			break;

			case 'player-apologized':
				return authorFullname + ' اعتذر عن الحضور';
			break;

			case 'training-completed':
				return 'اكتمل التحضير للتمرين';
			break;

			case 'training-canceled':
				return 'أُلغي التمرين';
			break;

			case 'training-not-completed':
				return 'تحضير التمرين غير مُكتمل';
			break;
		}
	},

	//
	listByTrainingIdAndPlayerId: function(trainingId, playerId){

		return TrainingService.findForPlayerIdById(playerId, trainingId)

		//
		.then(function(training){

			if (!training){
				throw new BadRequestError('The training cannot be found.');
			}

			var queryGetTrainingActivities = DatabaseService.format('select trainingActivities.*, players.fullname as author from trainingActivities, players where trainingActivities.authorId = players.id and trainingActivities.trainingId = ? order by trainingActivities.createdAt asc', [training.id]);

			//
			return DatabaseService.query(queryGetTrainingActivities);
		})

		//
		.then(function(activities){

			// Set that the activity is read by player id.
			ActivityPlayerService.markAsReadManyByPlayerId(activities, playerId);

			return activities;
		});
	},
};

//
var FeedbackService = {

	send: function(content, authorId){

		var insertFeedbackParameters = {authorId: authorId, content: content, createdAt: new Date()};
		var queryInsertFeedback = DatabaseService.format('insert into feedbacks set ?', [insertFeedbackParameters]);
		return DatabaseService.query(queryInsertFeedback);
	},
};

// Check if the user is logged in or response with a not autherized error.
function authenticatable(request, response, next){

	if (validator.isNull(request.get('X-User-Token'))){
		return response.status(401).send({
			'message': 'Not authorized to access this resource.',
		});
	}

	// Get the token of user and other information.
	var token = request.get('X-User-Token');
	var deviceType = request.get('X-User-Device-Type');
	var deviceToken = request.get('X-User-Device-Token');

	// Get the current user from request.
	UserService.findCurrentOrDie(request)

	// Update the device type and token if given.
	.then(function(user){

		if (!validator.isNull(deviceType) && !validator.isNull(deviceToken) && !validator.equals(deviceToken, 'null')){

			// Check if the old information is the same.
			if (!validator.equals(deviceType, user.deviceType) || !validator.equals(deviceToken, user.deviceToken)){

				var updateUserParameters = {deviceType: deviceType, deviceToken: deviceToken, modifiedAt: new Date()};
				var queryUpdateUser = DatabaseService.format('update users set ? where id = ?', [updateUserParameters, user.id]);
				return DatabaseService.query(queryUpdateUser);
			}
		}

	})

	// Response about it.
	.then(function(done){
		return next();
	})

	// Otherwise.
	.catch(function(error){

		// Log about it.
		console.log(error);

		// Not authorized.
		return response.status(401).send({
			'message': 'Not authorized to access this resource.',
		});

	});
}

// POST /users/firsthandshake
router.post('/users/firsthandshake', function(request, response){

	// Validate the mobile number.
	if (!e164Format.test(request.body.e164formattedMobileNumber) || validator.isNull(request.get('X-User-Device-Type')) || validator.isNull(request.get('X-User-Device-Token'))){
		return response.status(400).send({
			'message': 'The mobile number and/or device type and/or device token are not valid.',
		});
	}

	// Generate a random number (code) to be sent through an SmsService.
	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;
	var deviceType = request.get('X-User-Device-Type');
	var deviceToken = request.get('X-User-Device-Token');
	var code = Math.floor(Math.random()*9000) + 1000;

	// TODO: (Future) Check if the user has recieved an SMS, then, there is no need for sending a new one.
	
	// Save the generated code in the session.
	request.session.code = code;
	request.session.deviceType = deviceType;
	request.session.deviceToken = deviceToken;

	// Send a success response.
	response.status(204).send('/users/firsthandshake');

	// Send the SMS containing the temporary code.
	return SmsService.send(e164formattedMobileNumber, 'تطبيق تمرين - كلمة المرور المؤقتة ' + code);
});

// POST /users/secondhandshake
router.post('/users/secondhandshake', function(request, response){

	// Validate the mobile number and the code.
	if (!e164Format.test(request.body.e164formattedMobileNumber) || validator.isNull(request.session.code) || !validator.equals(request.body.code, request.session.code)){
		return response.status(400).send({
			'message': 'The mobile number and/or the code are not valid.',
		});
	}

	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;
	var code = request.body.code;

	// Combine the password components.
	var combined = '' + e164formattedMobileNumber + code + uuid.v4();
	var token = crypto.createHmac('sha256', nconf.get('appSalt')).update(combined).digest('hex');

	// Forget about it.
	delete request.session.code;

	// Find a user by the e164 formatted mobile number or create one.
	var createUserParameters = {deviceType: request.session.deviceType, deviceToken: request.session.deviceToken, fullname: 'temp'};

	UserService.findByE164formattedMobileNumberOrCreate(e164formattedMobileNumber, createUserParameters, false)

	// Found or created, then update the token.
	.then(function(user){

		// This means the user logged in.
		return UserService.updateForId({token: token}, user.id);

	})

	// Response about it.
	.then(function(user){

		return response.send(user);

	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /users/logout
router.get('/users/logout', authenticatable, function(request, response){

	// Keep the user information for logging.
	// It is better not to use one letter variables.
	var u = null;

	// Find the current user or die.
	UserService.findCurrentOrDie(request)

	// Logout the user.
	.then(function(user){
		u = user;
		return UserService.logout(user);
	})

	// Response about it.
	.then(function(logoutResult){
		console.log('The user #%d has logged out.', u.id);
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// POST /users/update
router.post('/users/update', authenticatable, function(request, response){

	if (validator.isNull(request.body.fullname)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	// Set the fullname value.
	var fullname = request.body.fullname;

	// Find the current user or die.
	UserService.findCurrentOrDie(request)

	// Update the fullname.
	.then(function(user){
		return PlayerService.updateForId({fullname: fullname}, user.playerId);
	})

	// Response about it.
	.then(function(player){
		response.status(204).send();
		return PlayerService.updateForId({loginable: 1}, player.id);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups
router.get('/groups', authenticatable, function(request, response){

	UserService.findCurrentOrDie(request)

	// List all groups that the user in.
	.then(function(user){
		return GroupService.listForPlayerId(user.playerId);
	})

	// Response about it.
	.then(function(groups){
		return response.send(groups);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/latest
router.get('/groups/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups');
});

// GET /groups
router.get('/groups/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var id = request.params.id;

	UserService.findCurrentOrDie(request)

	// Find the given group.
	.then(function(user){
		return GroupService.findByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(group){
		return response.send(group);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// POST /groups/add
router.post('/groups/add', authenticatable, function(request, response){

	if (validator.isNull(request.body.name)){
		response.status(400).send({
			'message': 'Bad request.'
		});
		return;
	}

	var name = request.body.name;

	//
	UserService.findCurrentOrDie(request)

	// Add a group.
	.then(function(user){
		return GroupService.create({name: name, authorId: user.playerId});
	})

	// Response about it.
	.then(function(group){
		return response.status(201).send(group);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:id/leave
router.get('/groups/:id/leave', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.leaveByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(done){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:id/delete
router.get('/groups/:id/delete', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	// Set the id of the group.
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.deleteByIdForPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(done){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players
router.get('/groups/:groupId/players', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var groupId = request.params.groupId;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.listPlayersByIdForPlayerId(groupId, user.playerId);
	})

	// Response about it.
	.then(function(players){
		return response.send(players);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/latest
router.get('/groups/:groupId/players/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/players');
});

// POST /groups/:groupId/players/add
router.post('/groups/:groupId/players/add', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || validator.isNull(request.body.fullname) || !e164Format.test(request.body.e164formattedMobileNumber)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId;
	var fullname = request.body.fullname;
	var e164formattedMobileNumber = request.body.e164formattedMobileNumber;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.checkIsPlayerIdAdminForIdOrDie(user.playerId, groupId);
	})

	//
	.then(function(){
		return GroupService.addPlayerToId(e164formattedMobileNumber, fullname, groupId);
	})

	// Response about it.
	.then(function(playerGroup){
		return response.status(201).send(playerGroup);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/:id/delete
router.get('/groups/:groupId/players/:id/delete', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || !validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId; 
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.deletePlayerIdByAdminPlayerIdInId(id, user.playerId, groupId);
	})

	// Response about it.
	.then(function(groupPlayer){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/players/:id/adminize
router.get('/groups/:groupId/players/:id/adminize', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || !validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId; 
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.adminizePlayerIdByAdminPlayerIdInId(id, user.playerId, groupId);
	})

	// Response about it.
	.then(function(groupPlayer){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/trainings
router.get('/groups/:groupId/trainings', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	//
	var groupId = request.params.groupId;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.listForGroupIdAndPlayerId(groupId, user.playerId);
	})

	// Response about it.
	.then(function(trainings){
		return response.send(trainings);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /groups/:groupId/trainings/latest
router.get('/groups/:groupId/trainings/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/trainings');
});

// POST /groups/:groupId/trainings/add
router.post('/groups/:groupId/trainings/add', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.groupId) || validator.isNull(request.body.stadium) || !validator.isDate(request.body.startedAt) || !validator.isNumeric(request.body.playersCount) || request.body.playersCount <= 0 || !validator.isNumeric(request.body.subsetPlayersCount) || request.body.subsetPlayersCount <= 0){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var groupId = request.params.groupId;
	var stadium = request.body.stadium;
	var startedAt = validator.toDate(request.body.startedAt);
	var playersCount = request.body.playersCount;
	var subsetPlayersCount = request.body.subsetPlayersCount;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return GroupService.checkIsPlayerIdAdminForIdOrDie(user.playerId, groupId);
	})

	//
	.then(function(groupPlayer){

		return TrainingService.create({groupId: groupPlayer.groupId, status: 'gathering', stadium: stadium, startedAt: startedAt, playersCount: playersCount, subsetPlayersCount: subsetPlayersCount, authorId: user.playerId});

	})

	// Response about it.
	.then(function(createTrainingResult){
		return response.send({'id': createTrainingResult.insertId});
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id
router.get('/trainings/:id', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.detailsByPlayerIdAndId(user.playerId, id);
	})

	// Response about it.
	.then(function(training){
		return response.send(training);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/willcome
router.get('/trainings/:id/willcome', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToComeToId(user.playerId, id, false);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});

});

// GET /trainings/:id/apologize
router.get('/trainings/:id/apologize', authenticatable, function(request, response){

	//
	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	//
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.decideForPlayerIdToApologizeToId(user.playerId, id);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});

});

// GET /trainings/:id/cancel
router.get('/trainings/:id/cancel', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingService.cancelIdByPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(){
		return response.status(204).send();
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:id/activities
router.get('/trainings/:id/activities', authenticatable, function(request, response){

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	// Set the request.
	var id = request.params.id;

	//
	UserService.findCurrentOrDie(request)

	//
	.then(function(user){
		return TrainingActivityService.listByTrainingIdAndPlayerId(id, user.playerId);
	})

	// Response about it.
	.then(function(activities){
		return response.send(activities);
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// GET /trainings/:trainingId/activities/latest
router.get('/trainings/:trainingId/activities/latest', authenticatable, function(request, response){
	response.redirect('api/v1/trainings/' + request.params.trainingId + '/activities');
});

// POST /feedbacks/add
// TODO: Promises and the route name should be /feedbacks/send.
router.post('/feedbacks/add', function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	// Normalize the token.
	if (validator.isNull(token)){
		token = null;
	}

	// Validate the content of the feedback.
	if (validator.isNull(request.body.content)){
		response.status(400).send({
			'message': 'Content of the feedback cannot be empty.'
		});
		return;
	}

	// Get the content and have it in a variable.
	var content = request.body.content;

	// Get the current user if any.
	UserService.findCurrentIfAny(request)

	.then(function(user){

		// Set the default value of the author.
		var authorId = null;

		if (user){
			authorId = user.id;
		}

		// Send the feedback.
		return FeedbackService.send(content, authorId);
	})

	// Response about it.
	.then(function(){
		return response.status(201).send({
			'message': 'The feedback has been sent.'
		});
	})

	// Catch the error if any.
	.catch(function(error){
		return handleApiErrors(error, response);
	});
});

// Attach all previous routes under /api/v1.
app.use('/api/v1', router);

// Start listening to the specified port.
// app.listen(port);

var port = nconf.get('appPort');


if (nconf.get('environment') == 'development'){
	http.createServer(app).listen(port);
}else{
	https.createServer(sslOptions, app).listen(port);
}

console.log('App active on localhost:' + port);

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
