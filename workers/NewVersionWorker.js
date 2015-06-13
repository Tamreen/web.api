
require('../server');

//
NewVersionWorker = function(){

	//
	var queryListUsersWithDeviceTokens = DatabaseService.format('select * from users where deviceToken is not null and id = 1');

	//
	return DatabaseService.query(queryListUsersWithDeviceTokens)

	//
	.then(function(users){

		//
		console.log(users);

	});
}