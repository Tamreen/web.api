
require('../server');

// findById.

UserService.findById(1)

.then(function(user){
	console.log(user);
});

