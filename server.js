
var Promise = require('bluebird');
var using = Promise.using;

var fs = require('fs');
var mysql = require('mysql');

var express = require("express");
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

// TODO: This should be service.
var db = {

	getConnection: function(){
		return pool.getConnectionAsync().disposer(function(connection){
			return connection.destroy();
		});
	},

	query: function(command){
		return using(db.getConnection(), function(connection){
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

// This should be a service.
var SMS = {
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
	}
};

// This should be a service.
var pushNotification = {

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

// This should be a service.
var activity = {

	toString: function(type, authorFullname){

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

	notify: function(id){

		console.log('Notify training players has been called.');

		// Get the activity training players.
		db.query('select users.*, trainings.name as trainingName, trainingActivities.type as type, (select players.fullname from players, trainingActivities where trainingActivities.authorId = players.id and trainingActivities.id = ?) as authorFullname from trainingActivities, trainings, groupPlayers, users where trainingActivities.trainingId = trainings.id and trainings.groupId = groupPlayers.groupId and groupPlayers.playerId = users.playerId and groupPlayers.leftAt is null and trainingActivities.id = ?', [id, id], function(error, users){

			if (error){
				console.error(error.stack);
				return;
			}

			if (users.length == 0){
				console.log('No users have been found to recieve this activity.');
				return;
			}

			// var androidIds = [];
			// var iosIds = [];
			var activityAuthor = users[0];

			// Set the android message.
			var androidMessage = new gcm.Message({
				collapseKey: 'trainingActivity',
				timeToLive: 3000,
				data: {
					message: 'تمرين ' + activityAuthor.trainingName,
					title: activity.toString(activityAuthor.type, activityAuthor.authorFullname),
					notId: Math.floor(Math.random()*900000000) + 100000000,
				}
			});

			// Set the ios message.
			var iosMessage = activity.toString(activityAuthor.type, activityAuthor.authorFullname);

			// Add activityPlayers.
			users.forEach(function(user){

				var insertActivityPlayerParameters = {activityId: id, playerId: user.playerId, createdAt: new Date()};
				db.query('insert into activityPlayers set ?', [insertActivityPlayerParameters], function(error, result){

					if (error){
						console.error(error.stack);
						return;
					}

					console.log('Add player #' + user.playerId);

					if (validator.isNull(user.deviceToken)){
						return;
					}

					// Android.
					if (validator.equals(user.deviceType, 'android')){
						pushNotification.toAndroid(androidMessage, [user.deviceToken]);
					}

					// Ios.
					if (validator.equals(user.deviceType, 'ios')){
						pushNotification.toIos(iosMessage, [user.deviceToken]);
					}
				});
			});

			// Check the android devices.
			// androidIds.forEach(function(androidId){
			// 	pushNotification.toAndroid(androidMessage, registrationIds);
			// });

		});		
	}
};

// Access control allow.
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
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
			var queryfindCurrentOrDieUser = db.format('select * from users where token = ? and token is not null limit 1', [token]);

			db.query(queryfindCurrentOrDieUser).then(function(users){
				
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
				console.log('ok happened.');
				return resolve(user);
			})

			.catch(function(error){
				console.log('error happened.', error);
				return resolve(null);
			});

		});
	},

	//
	findById: function(id){

		var queryGetUserById = db.format('select * from users where id = ? limit 1', [id]);
		
		return db.query(queryGetUserById).then(function(users){

			if (users.length == 0){
				return null;
			}

			var user = users[0];
			return user;
		});
	},

	//
	findByE164formattedMobileNumber: function(e164formattedMobileNumber){

		var queryGetUserByE164formattedMobileNumber = db.format('select * from users where e164formattedMobileNumber = ? limit 1', [e164formattedMobileNumber]);
		
		return db.query(queryGetUserByE164formattedMobileNumber).then(function(users){

			if (users.length == 0){
				return null;
			}

			var user = users[0];
			return user;
		});
	},

	//
	findByE164formattedMobileNumberOrCreate: function(e164formattedMobileNumber, parameters){
		
		// Find the 
		return UserService.findByE164formattedMobileNumber(e164formattedMobileNumber)
		
		.then(function(user){

			if (!user){

				// Create the user if it does not exist.
				// return UserService.create(e164formattedMobileNumber, token, deviceType, deviceToken, fullname);
				// It must return the user information not just the user id.
				return UserService.create(parameters);
			}

			return user;
		})
	},

	create: function(parameters){

		// Create a player first.
		return PlayerService.create({fullname: parameters.fullname})

		// Create the user.
		.then(function(player){

			// Delete fullname parameter.
			delete parameters.fullname;

			var queryInsertUser = '';

			return 

		});

	},

	logout: function(user){
		
		var updateUserParameters = {token: null, modifiedAt: new Date()};
		var queryUpdateUser = db.format('update users set ? where token = ?', [updateUserParameters, user.token]);
		return db.query(queryUpdateUser);
	},

};

var FeedbackService = {

	send: function(content, authorId){

		var insertFeedbackParameters = {authorId: authorId, content: content, createdAt: new Date()};
		var queryInsertFeedback = db.format('insert into feedbacks set ?', [insertFeedbackParameters]);
		return db.query(queryInsertFeedback);
	}

};

// Check if the user is logged in or response with a not autherized error.
function authenticatable(request, response, next){

	console.log('Authentication has been called.');

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

		console.log('The user has been found.');

		if (!validator.isNull(deviceType) && !validator.isNull(deviceToken) && !validator.equals(deviceToken, 'null')){

			// Check if the old information is the same.
			if (!validator.equals(deviceType, user.deviceType) || !validator.equals(deviceToken, user.deviceToken)){

				var updateUserParameters = {deviceType: deviceType, deviceToken: deviceToken, modifiedAt: new Date()};
				var queryUpdateUser = db.format('update users set ? where id = ?', [updateUserParameters, user.id]);
				return db.query(queryUpdateUser);
			}
		}

	})

	// Response about it.
	.then(function(done){
		console.log('Go to the next route.');
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

	// Generate a random number (code) to be sent through an SMS.
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
	return SMS.send(e164formattedMobileNumber, "تطبيق تمرين - كلمة المرور المؤقتة " + code);
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
	var createUserParameters = {deviceType: request.session.deviceType, deviceToken: request.session.deviceToken};

	UserService.findByE164formattedMobileNumberOrCreate(e164formattedMobileNumber, createUserParameters)

	// Found or created, then update the token.
	.then(function(user){

		// This means the user logged in.
		return UserService.updateById(user.id, {token: token});

	})

	// Response about it.
	then(function(user){

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

	// Get the current user.
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
	var token = request.get('X-User-Token');
	var fullname = request.body.fullname;

	db.query('select * from users where token = ?', [token], function(error, rows){
		
		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		// Set the user.
		var user = rows[0];

		var updatePlayerParameters = {fullname: fullname, modifiedAt: new Date()};
		db.query('update players set ? where id = ?', [updatePlayerParameters, user.playerId], function(error, result){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error.',
				});
				return;
			}

			response.status(204).send();

			db.query('update users set loginable = 1 where id = ?', [user.id], function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error.',
					});
					return;
				}

				console.log('User has updated the information.');
			});

			return;
		});

	});
});

// GET /groups
router.get('/groups', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	db.query('select userGroups.*, (select fullname from players where players.id = userGroups.authorId) as author, (select count(id) from groupPlayers where groupPlayers.groupId in (userGroups.id) and groupPlayers.leftAt is null) as playersCount, (select count(id) from activityPlayers where playerId = userGroups.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as activitiesCount from (select groups.*, groupPlayers.playerId as playerId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups', [token], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		response.send(rows);
		return;
	});
});

// GET /groups/latest
router.get('/groups/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups');
});

// GET /groups
router.get('/groups/:id', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	db.query('select userGroups.*, (select fullname from players where players.id = userGroups.authorId) as author, (select count(id) from groupPlayers where groupPlayers.groupId in (userGroups.id) and groupPlayers.leftAt is null) as playersCount, (select count(id) from activityPlayers where playerId = userGroups.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId in (select id from trainings where groupId in (userGroups.id)))) as activitiesCount from (select groups.*, groupPlayers.playerId as playerId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.groupId = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this group.',
			});
			return;
		}

		// Done.
		response.send(rows[0]);
		return;
	});
});

// POST /groups/add
router.post('/groups/add', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (validator.isNull(request.body.name)){
		response.status(400).send({
			'message': 'Bad request.'
		});
		return;
	}

	// Get the name and have it in a variable.
	var name = request.body.name;

	db.query('select * from users where token = ?', [token], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		console.log('Found ' + rows.length);

		// Get the user information.
		var user = rows[0];

		var insertGroupParameters = {name: name, authorId: user.playerId, createdAt: new Date()};
		db.query('insert into groups set ?', insertGroupParameters, function(error, result){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error.',
				});
				return;
			}

			// Insert a new player to be an admin in the created group.
			var groupId = result.insertId;

			var insertGroupPlayerParameters = {groupId: groupId, playerId: user.playerId, role: 'admin', joinedAt: new Date()};
			db.query('insert into groupPlayers set ?', insertGroupPlayerParameters, function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error.',
					});
					return;
				}

				// Done.
				response.status(201).send({
					'id': groupId,
				});
				return;

			});
		});
	});
});

// GET /groups/:id/leave
router.get('/groups/:id/leave', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var id = request.params.id;

	db.query('select * from users where token = ?', [token], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		// Set the user.
		var user = rows[0];

		// Check if the user is admin or not in that group.
		db.query('select * from groupPlayers where groupId = ? and playerId = ?', [id, user.playerId], function(error, rows){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error.',
				});
				return;
			}

			if (rows.length == 0){
				response.status(400).send({
					'message': 'Cannot find the specified group.',
				});
				return;
			}

			// Set the group player.
			var groupPlayer = rows[0];

			if (groupPlayer.role == 'admin'){
				response.status(400).send({
					'message': 'Cannot leave a group when admin you are.',
				});
				return;
			}

			// Everything is okay, now you might leave.
			var updateGroupPlayerParameters = {leftAt: new Date()};
			db.query('update groupPlayers set ? where groupId = ? and playerId = ?', [updateGroupPlayerParameters, id, user.playerId], function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error.',
					});
					return;
				}

				// Done.
				response.status(204).send();
				return;

			});
		});
	});
});

// GET /groups/:id/delete
router.get('/groups/:id/delete', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	// Set the id of the group.
	var id = request.params.id;

	db.query('select * from users where token = ?', [token], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		// Set the user.
		var user = rows[0];

		// Check if the user is admin or not in that group.
		db.query('select * from groupPlayers where groupId = ? and playerId = ?', [id, user.playerId], function(error, rows){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error.',
				});
				return;
			}

			if (rows.length == 0){
				response.status(400).send({
					'message': 'Cannot find the specified group.',
				});
				return;
			}

			// Set the group player.
			var groupPlayer = rows[0];

			if (groupPlayer.role != 'admin'){
				response.status(400).send({
					'message': 'Cannot delete a group when admin you are not.',
				});
				return;
			}

			// Everything is okay, now you might delete the group.
			var updateGroupParameters = {deletedAt: new Date()};
			db.query('update groups set ? where id = ?', [updateGroupParameters, groupPlayer.groupId], function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error.',
					});
					return;
				}

				// Done.
				response.status(204).send();
				return;

			});

		});
	});
});

// GET /groups/:groupId/players
router.get('/groups/:groupId/players', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var groupId = request.params.groupId;

	db.query('select players.id, players.fullname, groupPlayers.joinedAt from groupPlayers, players where groupPlayers.playerId = players.id and groupPlayers.leftAt is null and groupId in (select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null)', [token, groupId], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		// Done.
		response.send(rows);
		return;
	});
});

// GET /groups/:groupId/players/latest
router.get('/groups/:groupId/players/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/players');
});

// POST /groups/:groupId/players/add
router.post('/groups/:groupId/players/add', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

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

	// Check if the user is admin.
	db.query('select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\'', [token, groupId], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Cannot add a player when not admin you are.',
			});
			return;
		}

		// Now, check if the player is not in the desired group.
		db.query('select players.fullname, groupPlayers.playerId, groupPlayers.leftAt from players, users, groupPlayers where users.playerId = groupPlayers.playerId and users.playerId = players.id and groupPlayers.groupId = ? and users.e164formattedMobileNumber = ?', [groupId, e164formattedMobileNumber], function(error, rows){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error 2.',
				});
				return;
			}

			if (rows.length > 0){

				// Get the group player.
				var groupPlayer = rows[0];

				if (validator.isNull(groupPlayer.leftAt)){
					response.status(400).send({
						'message': 'Player is already in that group.'
					});
					return;
				}

				var updateGroupPlayerParameters = {joinedAt: new Date(), leftAt: null};
				db.query('update groupPlayers set ? where groupId = ? and playerId = ?', [updateGroupPlayerParameters, groupId, groupPlayer.playerId], function(error, result){

					if (error){
						console.error(error.stack);
						response.status(500).send({
							'message': 'Internal server error 3.',
						});
						return;
					}

					response.status(201).send({
						id: groupPlayer.playerId,
						fullname: groupPlayer.fullname,
						joinedAt: updateGroupPlayerParameters.joinedAt,
					});
					return;

				});
				return;
			}

			// Do insert a new player to the specific group.
			db.query('select players.fullname, users.* from players, users where users.playerId = players.id and users.e164formattedMobileNumber = ?', [e164formattedMobileNumber], function(error, rows){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error 4.',
					});
					return;
				}

				if (rows.length > 0){
					
					var playerUser = rows[0];

					if (!validator.isNull(playerUser.deletedAt)){
						response.status(401).send({
							'message': 'Cannot add an inactive player to the group.',
						});
						return;
					}

					// Insert the player in the group.
					var insertGroupPlayerParameters = {playerId: playerUser.playerId, groupId: groupId, role: 'member', joinedAt: new Date()};
					db.query('insert into groupPlayers set ?', [insertGroupPlayerParameters], function(error, result){

						if (error){
							console.error(error.stack);
							response.status(500).send({
								'message': 'Internal server error 5.',
							});
							return;
						}

						response.status(201).send({
							id: result.insertId,
							fullname: fullname,
							joinedAt: insertGroupPlayerParameters.joinedAt,
						});

						return;
					});

					return;
				}

				// Insert a player.
				var insertPlayerParameters = {fullname: fullname};
				db.query('insert into players set ?', [insertPlayerParameters], function(error, result){

					if (error){
						console.error(error.stack);
						response.status(500).send({
							'message': 'Internal server error 6.',
						});
						return;
					}

					var insertUserParameters = {playerId: result.insertId, e164formattedMobileNumber: e164formattedMobileNumber, createdAt: new Date()};

					// Insert a user.
					db.query('insert into users set ?', [insertUserParameters], function(error, result){

						if (error){
							console.error(error.stack);
							response.status(500).send({
								'message': 'Internal server error 7.',
							});
							return;
						}

						// Insert a relation.
						var insertGroupPlayerParameters = {playerId: insertUserParameters.playerId, groupId: groupId, role: 'member', joinedAt: new Date()};

						db.query('insert into groupPlayers set ?', [insertGroupPlayerParameters, groupId], function(error, result){

							if (error){
								console.error(error.stack);
								response.status(500).send({
									'message': 'Internal server error 8.',
								});
								return;
							}

							// Done.
							response.status(201).send({
								id: result.insertId,
								fullname: fullname,
								joinedAt: insertGroupPlayerParameters.joinedAt,
							});

							// TODO: Notify the new player.
							// twilio.messages.create({ 
							// 	to: e164formattedMobileNumber, 
							// 	from: nconf.get('twilioNumber'), 
							// 	body: "تطبيق تمرين - تمت إضافتك إلى مجموعة لعب، تفضّل بتحميل التطبيق من المتجر.",   
							// }, function(error, message){ 
							// 	//console.log(message.sid); 
							// });

							SMS.send(e164formattedMobileNumber, "تطبيق تمرين - تمت إضافتك إلى مجموعة لعب، تفضّل بتحميل التطبيق من أبل ستور " + nconf.get('appleStoreUrl') + " أو قوقل بلاي " + nconf.get('googlePlayUrl'));

							return;
						});
					});
				});
			});
		});
	});
});

// GET /groups/:groupId/players/:id/delete
router.get('/groups/:groupId/players/:id/delete', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.groupId) || !validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Invalid inputs.',
		});
		return;
	}

	// Define variables to be used.
	var groupId = request.params.groupId; 
	var id = request.params.id;

	// Check if the user is an admin.
	db.query('select groupPlayers.playerId from groupPlayers where groupId in (select groups.id from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groups.id = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\') and groupPlayers.playerId = ? and groupPlayers.role <> \'admin\'', [token, groupId, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(400).send({
				'message': 'Cannot find the specified group or player.',
			});
			return;
		}

		var updateGroupPlayerParameters = {leftAt: new Date()};
		db.query('update groupPlayers set ? where groupId = ? and playerId = ?', [updateGroupPlayerParameters, groupId, id], function(error, result){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error 1.',
				});
				return;
			}

			// Done.
			response.status(204).send();
			return;
		});

	});
});

// GET /groups/:groupId/trainings
router.get('/groups/:groupId/trainings', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.groupId)){
		response.status(400).send({
			'message': 'Cannot understand the value of group id.',
		});
		return;
	}

	var groupId = request.params.groupId;

	db.query('select userTrainings.id, userTrainings.name, userTrainings.status, (select count(id) from activityPlayers where playerId = userTrainings.playerId and readable = 0 and activityId in (select id from trainingActivities where trainingId = userTrainings.id)) as activitiesCount from (select trainings.*, users.playerId as playerId from groupPlayers, users, groups, trainings where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.groupId = ? and groupPlayers.leftAt is null and groups.deletedAt is null and trainings.groupId = groups.id) as userTrainings order by coalesce(userTrainings.modifiedAt, userTrainings.createdAt) desc', [token, groupId], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		response.send(rows);
		return;
	});
});

// GET /groups/:groupId/trainings/latest
router.get('/groups/:groupId/trainings/latest', authenticatable, function(request, response){
	response.redirect('/api/v1/groups/' + request.params.groupId + '/trainings');
});

// POST /groups/:groupId/trainings/add
router.post('/groups/:groupId/trainings/add', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.groupId) || validator.isNull(request.body.stadium) || !validator.isDate(request.body.startedAt) || !validator.isNumeric(request.body.playersCount) || request.body.playersCount <= 0 || !validator.isNumeric(request.body.subsetPlayersCount) || request.body.subsetPlayersCount <= 0){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var groupId = request.params.groupId;
	var stadium = request.body.stadium;
	var startedAt = validator.toDate(request.body.startedAt);
	var playersCount = request.body.playersCount;
	var subsetPlayersCount = request.body.subsetPlayersCount;

	db.query('select groups.*, users.playerId from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.groupId = ? and groupPlayers.leftAt is null and groupPlayers.role = \'admin\' and groups.deletedAt is null', [token, groupId], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to add a training.',
			});
			return;
		}

		// Set the locale of the training.
		moment.locale('ar-sa');

		// Define the group.
		var group = rows[0];
		var name = moment(startedAt).format('dddd، DD MMMM YYYY، hh:mm a');
		
		var insertTrainingParameters = {groupId: group.id, name: name, status: 'gathering', stadium: stadium, startedAt: startedAt, playersCount: playersCount, subsetPlayersCount: subsetPlayersCount, createdAt: new Date()};
		db.query('insert into trainings set ?', [insertTrainingParameters], function(error, insertTrainingResult){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error.',
				});
				return;
			}

			console.log('Training #' + insertTrainingResult.insertId + ' has been created successfully.');

			response.send({
				'id': insertTrainingResult.insertId,
			});

			// Add a new activity and send it to all training active members.
			var insertTrainingActivityParameters = {trainingId: insertTrainingResult.insertId, authorId: group.playerId, type: 'training-started', createdAt: new Date()};
			db.query('insert into trainingActivities set ?', [insertTrainingActivityParameters], function(error, insertTrainingActivityResult){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error.',
					});
					return;
				}

				console.log('Training activity #' + insertTrainingActivityResult.insertId + ' has been created successfully.');

				// Notify training players about it.
				activity.notify(insertTrainingActivityResult.insertId);
			});
		});
	});
});

// GET /trainings/:id
router.get('/trainings/:id', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	db.query('select trainings.*, userGroups.adminable from trainings, (select groups.id as groupId, (groupPlayers.role = \'admin\') as adminable from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups where userGroups.groupId in (trainings.groupId) and trainings.id = ?', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this route.'
			});
			return;
		}

		// Define the training.
		var training = rows[0];

		db.query('select players.fullname, players.id, if(trainingPlayers.decision is null, \'notyet\', trainingPlayers.decision) as decision from players, groupPlayers left join trainingPlayers on groupPlayers.playerId = trainingPlayers.playerId and trainingPlayers.trainingId = ? where groupPlayers.groupId = ? and players.id = groupPlayers.playerId  and not (groupPlayers.leftAt is not null and decision is null)', [training.id, training.groupId], function(error, rows){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error 1.',
				});
				return;
			}

			// Set the sub arrays.
			training.willcomePlayers = [];
			training.subsetPlayers = [];
			training.apologizePlayers = [];
			training.notyetPlayers = [];

			rows.forEach(function(row){

				if (row.decision == 'willcome'){
					training.willcomePlayers.push(row);
					return;
				}

				if (row.decision == 'apologize'){
					training.apologizePlayers.push(row);
					return;
				}

				if (row.decision == 'register-as-subset'){
					training.subsetPlayers.push(row);
					return;
				}

				// Otherwise, the player did not decide.
				training.notyetPlayers.push(row);
			});

			// Done.
			response.send(training);
			return;
		});
	});
});

// GET /trainings/:id/willcome
router.get('/trainings/:id/willcome', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	// Execute the main query.
	db.query('select userTrainings.*, (select count(id) from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.decision = \'willcome\') willcomePlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.decision = \'register-as-subset\') registerAsSubsetPlayersCount, (select count(id) > 0 as decided from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.playerId = userTrainings.playerId and (trainingPlayers.decision = \'willcome\' or trainingPlayers.decision = \'register-as-subset\')) as decided from (select trainings.*, userGroups.playerId from trainings, (select groups.id as groupId, groupPlayers.playerId from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups where userGroups.groupId in (trainings.groupId) and trainings.id = ? and trainings.status <> \'canceled\') as userTrainings;', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this route.'
			});
			return;
		}

		// Define the training.
		var training = rows[0];

		// Check if the user has decided.
		if (training.decided == true){
			response.status(400).send({
				'message': 'You already have decided.'
			});
			return;
		}

		// Check if the training is full.
		if (training.playersCount == training.willcomePlayersCount && training.subsetPlayersCount == training.registerAsSubsetPlayersCount){
			response.status(400).send({
				'message': 'The training is completed.',
			});
			return;
		}

		// Player.
		if (training.playersCount > training.willcomePlayersCount){

			var insertTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'player-decided-to-come', createdAt: new Date()};

			db.query('insert into trainingActivities set ?', [insertTrainingActivityParameters], function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error in trainingActivities.',
					});
					return;
				}

				db.query('select * from trainingPlayers where trainingId = ? and playerId = ?', [training.id, training.playerId], function(error, trainingPlayerRows){

					if (error){
						console.error(error.stack);
						response.status(500).send({
							'message': 'Internal server error in trainingPlayers.',
						});
						return;
					}

					if (trainingPlayerRows.length == 0){

						// Insert it then.
						var insertTrainingPlayerParameters = {trainingId: training.id, playerId: training.playerId, decision: 'willcome', createdAt: new Date()};

						db.query('insert into trainingPlayers set ?', [insertTrainingPlayerParameters], function(error, insertTrainingPlayerResult){

							if (error){
								console.error(error.stack);
								response.status(500).send({
									'message': 'Internal server error in trainingPlayers.',
								});
								return;
							}

							// Done.
							response.status(204).send();

							// Do tell.
							console.log('Training activity #' + result.insertId + ' has been created successfully.');

							// Notify training players about it.
							activity.notify(result.insertId);

							// Check if the training is complete.
							if (training.playersCount == training.willcomePlayersCount + 1){

								// Insert training is completed activity.
								var insertCompletedTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'training-completed', createdAt: new Date()};

								db.query('insert into trainingActivities set ?', [insertCompletedTrainingActivityParameters], function(error, insertCompletedTrainingActivityResult){

									if (error){
										console.error(error.stack);
										return;
									}

									// Training is completed.
									var updateTrainingCompletedParameters = {status: 'completed', modifiedAt: new Date()};

									db.query('update trainings set ? where id = ?', [updateTrainingCompletedParameters, training.id], function(error, updateTrainingCompletedResult){

										if (error){
											console.error(error.stack);
											return;
										}

										console.log('Training has been completed.');
									});

									// Do tell about it, notify.
									console.log('Training activity #' + insertCompletedTrainingActivityResult.insertId + ' has been created successfully.');

									// Notify training players about it.
									activity.notify(insertCompletedTrainingActivityResult.insertId);
								});
							}
						});

						return;
					}

					// Update it then.
					var updateTrainingPlayerParameters = {decision: 'willcome', modifiedAt: new Date()};

					db.query('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, training.id, training.playerId], function(error, updateTrainingPlayerResult){

						if (error){
							console.error(error.stack);
							response.status(500).send({
								'message': 'Internal server error in trainingPlayers.',
							});
							return;
						}

						// Done.
						response.status(204).send();

						// Do tell.
						console.log('Training activity #' + result.insertId + ' has been created successfully.');

						// Notify training players about it.
						activity.notify(result.insertId);

						// Check if the training is complete.
						if (training.playersCount == training.willcomePlayersCount + 1){

							// Insert training is completed activity.
							var insertCompletedTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'training-completed', createdAt: new Date()};

							db.query('insert into trainingActivities set ?', [insertCompletedTrainingActivityParameters], function(error, insertCompletedTrainingActivityResult){

								if (error){
									console.error(error.stack);
									return;
								}

								// Training is completed.
								var updateTrainingCompletedParameters = {status: 'completed', modifiedAt: new Date()};

								db.query('update trainings set ? where id = ?', [updateTrainingCompletedParameters, training.id], function(error, updateTrainingCompletedResult){

									if (error){
										console.error(error.stack);
										return;
									}

									console.log('Training has been completed.');
								});

								// Do tell about it, notify.
								console.log('Training activity #' + insertCompletedTrainingActivityResult.insertId + ' has been created successfully.');

								// Notify training players about it.
								activity.notify(insertCompletedTrainingActivityResult.insertId);
							});
						}
					});
				});
			});
			return;
		}

		// Subset player.
		if (training.subsetPlayersCount > training.registerAsSubsetPlayersCount){

			var insertTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'player-registered-as-subset', createdAt: new Date()};

			db.query('insert into trainingActivities set ?', [insertTrainingActivityParameters], function(error, result){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error in trainingActivities.',
					});
					return;
				}

				db.query('select * from trainingPlayers where trainingId = ? and playerId = ?', [training.id, training.playerId], function(error, trainingPlayerRows){

					if (error){
						console.error(error.stack);
						response.status(500).send({
							'message': 'Internal server error in trainingPlayers.',
						});
						return;
					}

					if (trainingPlayerRows.length == 0){

						// Insert it then.
						var insertTrainingPlayerParameters = {trainingId: training.id, playerId: training.playerId, decision: 'register-as-subset', createdAt: new Date()};

						db.query('insert into trainingPlayers set ?', [insertTrainingPlayerParameters], function(error, insertTrainingPlayerResult){

							if (error){
								console.error(error.stack);
								response.status(500).send({
									'message': 'Internal server error in trainingPlayers.',
								});
								return;
							}

							// Done.
							response.status(204).send();

							// Do tell.
							console.log('Training activity #' + result.insertId + ' has been created successfully.');

							// Notify training players about it.
							activity.notify(result.insertId);
						});
						return;
					}

					// Update it then.
					var updateTrainingPlayerParameters = {decision: 'register-as-subset', modifiedAt: new Date()};

					db.query('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, training.id, training.playerId], function(error, updateTrainingPlayerResult){

						if (error){
							console.error(error.stack);
							response.status(500).send({
								'message': 'Internal server error in trainingPlayers.',
							});
							return;
						}

						// Done.
						response.status(204).send();

						// Do tell.
						console.log('Training activity #' + result.insertId + ' has been created successfully.');

						// Notify training players about it.
						activity.notify(result.insertId);
					});
				});
			});
		}
	});
});

// GET /trainings/:id/apologize
router.get('/trainings/:id/apologize', authenticatable, function(request, response){

	// Get the user token.

	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	// Check if the training is canceled and the user is a player in it.
	db.query('select userTrainings.*, (select count(id) from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.decision = \'willcome\') willcomePlayersCount, (select count(id) from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.decision = \'register-as-subset\') registerAsSubsetPlayersCount, (select count(id) > 0 as decided from trainingPlayers where trainingPlayers.trainingId = userTrainings.id and trainingPlayers.playerId = userTrainings.playerId and trainingPlayers.decision = \'apologize\') as decided from (select trainings.*, userGroups.playerId from trainings, (select groups.id as groupId, groupPlayers.playerId from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups where userGroups.groupId in (trainings.groupId) and trainings.id = ? and trainings.status <> \'canceled\') as userTrainings;', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error in userTrainings.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this route.'
			});
			return;
		}

		// Define the training.
		var training = rows[0];

		// Check if the user already apologized.
		if (training.decided == true){
			response.status(400).send({
				'message': 'You already have decided.'
			});
			return;
		}

		var insertTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'player-apologized', createdAt: new Date()};

		db.query('insert into trainingActivities set ?', [insertTrainingActivityParameters], function(error, insertTrainingActivityResult){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error in trainingActivities.',
				});
				return;
			}

			// Check if the user apologized for the first time, nothing after.
			db.query('select * from trainingPlayers where trainingId = ? and playerId = ?', [training.id, training.playerId], function(error, trainingPlayerRows){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error in trainingPlayers.',
					});
					return;
				}

				// Done.
				response.status(204).send();

				// Do tell.
				console.log('Training activity #' + insertTrainingActivityResult.insertId + ' has been created successfully.');

				// Notify training players about it.
				activity.notify(insertTrainingActivityResult.insertId);

				if (trainingPlayerRows.length == 0){

					var insertTrainingPlayerParameters = {trainingId: training.id, playerId: training.playerId, decision: 'apologize', createdAt: new Date()};

						db.query('insert into trainingPlayers set ?', [insertTrainingPlayerParameters], function(error, insertTrainingPlayerResult){

							if (error){
								console.error(error.stack);
								return;
							}
						});

					return;
				}

				// Get a training player.
				trainingPlayer = trainingPlayerRows[0];

				// Check if the user apologized for the second time and is registered as a subset, nothing after.
				if (trainingPlayer.decision == 'register-as-subset'){

					// Update it then.
					var updateTrainingPlayerParameters = {decision: 'apologize', modifiedAt: new Date()};

					db.query('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, training.id, training.playerId], function(error, updateTrainingPlayerResult){

						if (error){
							console.error(error.stack);
							return;
						}
					});

					return;
				}

				// Check if the user apologized for the second time and is willcome, notify that the training is not completed.
				if (trainingPlayer.decision == 'willcome'){

					// Update training player to apologize.
					var updateTrainingPlayerParameters = {decision: 'apologize', modifiedAt: new Date()};

					db.query('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerParameters, training.id, training.playerId], function(error, updateTrainingPlayerResult){

						if (error){
							console.error(error.stack);
							return;
						}

						// Update the training status to gathering.
						var updateTrainingParameters = {status: 'gathering', modifiedAt: new Date()};

						db.query('update trainings set ? where id = ?', [updateTrainingParameters, training.id], function(error, updateTrainingResult){

							if (error){
								console.error(error.stack);
								return;
							}

							if (training.status == 'completed'){

								// Insert an activity saying training is not complete.
								var insertTrainingNotCompleteActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'training-not-completed', createdAt: new Date()};

								db.query('insert into trainingActivities set ?', [insertTrainingNotCompleteActivityParameters], function(error, insertTrainingNotCompleteActivityResult){

									if (error){
										console.error(error.stack);
										return;
									}

									// Do tell.
									console.log('Training activity #' + insertTrainingNotCompleteActivityResult.insertId + ' has been created successfully.');

									// Notify training players about it.
									activity.notify(insertTrainingNotCompleteActivityResult.insertId);

									// Check if there is a near by subset player.
									db.query('select * from trainingPlayers where trainingId = ? and decision = \'register-as-subset\' order by coalesce(modifiedAt, createdAt)', [training.id], function(error, trainingSubsetPlayerRows){

										if (error){
											console.error(error.stack);
											return;
										}

										if (trainingSubsetPlayerRows.length == 0){
											console.log('No subset players have been found.');
											return;
										}

										trainingSubsetPlayer = trainingSubsetPlayerRows[0];

										// Let the first subset player decides to come.
										var insertTrainingActivityWillcomeParameters = {trainingId: training.id, authorId: trainingSubsetPlayer.playerId, type: 'player-decided-to-come', createdAt: new Date()};

										db.query('insert into trainingActivities set ?', [insertTrainingActivityWillcomeParameters], function(error, insertTrainingActivityWillcomeResult){

											if (error){
												console.error(error.stack);
												return;
											}

											// TrainingPlayer.
											var updateTrainingPlayerWillcomeParameters = {decision: 'willcome', modifiedAt: new Date()};

											db.query('update trainingPlayers set ? where trainingId = ? and playerId = ?', [updateTrainingPlayerWillcomeParameters, training.id, trainingSubsetPlayer.playerId], function(error, updateTrainingPlayerWillcomeResult){

												// Notify that the player will come.
												activity.notify(insertTrainingActivityWillcomeResult.insertId);

												// Activity, training is completed.
												var insertCompletedTrainingActivityParameters = {trainingId: training.id, authorId: trainingSubsetPlayer.playerId, type: 'training-completed', createdAt: new Date()};

												db.query('insert into trainingActivities set ?', [insertCompletedTrainingActivityParameters], function(error, insertCompletedTrainingActivityResult){

													if (error){
														console.error(error.stack);
														return;
													}

													// Training is completed.
													var updateTrainingCompletedParameters = {status: 'completed', modifiedAt: new Date()};

													db.query('update trainings set ? where id = ?', [updateTrainingCompletedParameters, training.id], function(error, updateTrainingCompletedResult){

														// Notify.
														activity.notify(insertCompletedTrainingActivityResult.insertId);
													});
												});
											});
										});
									});
								});	
							}
						});
					});
				}
			});
		});
	});
});

// GET /trainings/:id/cancel
router.get('/trainings/:id/cancel', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	var id = request.params.id;

	db.query('select trainings.id, userGroups.playerId from trainings, (select groups.id as groupId, groupPlayers.playerId from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null and groupPlayers.role = \'admin\') as userGroups where userGroups.groupId in (trainings.groupId) and trainings.id = ? and trainings.status <> \'canceled\'', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this route.'
			});
			return;
		}

		// Define the training.
		var training = rows[0];

		// Insert a new training activity.
		var insertTrainingActivityParameters = {trainingId: training.id, authorId: training.playerId, type: 'training-canceled', createdAt: new Date()};
		db.query('insert into trainingActivities set ?', [insertTrainingActivityParameters], function(error, result){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error 1.',
				});
				return;
			}

			var updateTrainingParameters = {status: 'canceled', modifiedAt: new Date()};
			db.query('update trainings set ? where id = ?', [updateTrainingParameters, training.id], function(error, updateTrainingResult){

				if (error){
					console.error(error.stack);
					response.status(500).send({
						'message': 'Internal server error 1.',
					});
					return;
				}

				// Done.
				response.status(204).send();

				console.log('Training activity #' + result.insertId + ' has been created successfully.');

				// Notify training players about it.
				activity.notify(result.insertId);
			});
		});
	});
});

// GET /trainings/:id/activities
router.get('/trainings/:id/activities', authenticatable, function(request, response){

	// Get the user token.
	var token = request.get('X-User-Token');

	if (!validator.isNumeric(request.params.id)){
		response.status(400).send({
			'message': 'Bad request.',
		});
		return;
	}

	// Set the request.
	var id = request.params.id;

	db.query('select trainings.id, userGroups.playerId as playerId from trainings, (select users.playerId as playerId, groups.id as groupId from groupPlayers, users, groups where groupPlayers.playerId = users.playerId and groupPlayers.groupId = groups.id and users.token = ? and groupPlayers.leftAt is null and groups.deletedAt is null) as userGroups where userGroups.groupId in (trainings.groupId) and trainings.id = ?', [token, id], function(error, rows){

		if (error){
			console.error(error.stack);
			response.status(500).send({
				'message': 'Internal server error 1.',
			});
			return;
		}

		if (rows.length == 0){
			response.status(401).send({
				'message': 'Not authorized to access this route.'
			});
			return;
		}

		// Define the training.
		var training = rows[0];

		db.query('select trainingActivities.*, players.fullname as author from trainingActivities, players where trainingActivities.authorId = players.id and trainingActivities.trainingId = ? order by trainingActivities.createdAt asc', [training.id], function(error, rows){

			if (error){
				console.error(error.stack);
				response.status(500).send({
					'message': 'Internal server error 1.',
				});
				return;
			}

			response.send(rows);

			// Set the ids, in other words, the activities.
			ids = [];

			rows.forEach(function(item){
				ids.push(item.id);
			});

			// Make all activities for this training read.
			var updateActivityPlayerParameters = {readable: 1, modifiedAt: new Date()};
			db.query('update activityPlayers set ? where activityId in (?) and readable = 0 and playerId = ?', [updateActivityPlayerParameters, ids, training.playerId], function(error, result){

				if (error){
					console.error(error.stack);
					return;
				}

				console.log('Activities have been read.');

			});

			return;
		});
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

console.log("App active on localhost:" + port);

UserService.findByE164formattedMobileNumber('+966553572').then(function(user){
	console.log('user is ', user);
});

