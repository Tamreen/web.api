
var server = require('../server');
var assert = require('assert');

describe('User service', function(){

	it('fetches the user #1', function(){
		UserService.findById(1).then(function(user){
			assert.equal(user.id, 1);
		});
	});

});