
//
https = require('https');
http = require('http');

// SSL.
sslOptions = {
  cert: fs.readFileSync(nconf.get('sslCert')),
  key: fs.readFileSync(nconf.get('sslKey')),
  ca: [fs.readFileSync(nconf.get('sslCa'))],
};

//
router = express.Router();

// Access control allow.
app.use(function(request, response, next) {
	response.header('Access-Control-Allow-Origin', '*');
	response.header('Access-Control-Allow-Headers', 'X-Requested-With');
	next();
});

// Handle errors as a RESTful API.
handleApiErrors = function(error, response){

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

// Check if the user is logged in or response with a not autherized error.
authenticatable = function(request, response, next){

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