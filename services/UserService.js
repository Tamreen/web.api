
//
UserService = {

	//
	findCurrentOrDie: function(request){

		return new Promise(function(resolve, reject){

			// Get the given user token.
			var token = request.get('X-User-Token');

			// Check if the token is invalid, then reject the promise with BadRequestError.
			if (validator.isNull(token)){
				return reject(new BadRequestError('الرجاء إدخال معرّف المستخدم.'));
			}

			// Search for a user with the given token.
			var queryfindCurrentOrDieUser = DatabaseService.format('select * from users where token = ? and token is not null limit 1', [token]);

			DatabaseService.query(queryfindCurrentOrDieUser).then(function(users){
				
				if (users.length == 0){
					return reject(new UnauthorizedError('لا يُمكنك الوصول إلى هذه الواجهة.'));
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

		var queryGetUserById = DatabaseService.format('select users.*, players.fullname from users, players where users.playerId = players.id and users.id = ? limit 1', [id]);
		
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
		console.log('UserService.findByE164formattedMobileNumber is about to be called.');
		return UserService.findByE164formattedMobileNumber(e164formattedMobileNumber)
		
		.then(function(user){

			if (!user){

				// 
				parameters.e164formattedMobileNumber = e164formattedMobileNumber;

				// Create the user if does not exist.
				console.log('UserService.create is about to be called.');
				return UserService.create(parameters, invited);
			}

			return user;
		})
	},

	//
	create: function(parameters, invited){

		// Create a player first.
		console.log('PlayerService.create is about to be called.');
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
			
			console.log('DatabaseService.query is about to be called.');
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
