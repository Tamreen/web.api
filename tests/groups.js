
require('../server');

GroupService.findByIdForPlayerId(6, 1)

.then(function(group){

	console.log(group);

});