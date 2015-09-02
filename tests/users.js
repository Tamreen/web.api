
require('../server.js');

// findById.

UserService.findById(1)

.then(function(user){
	console.log(user);
});

