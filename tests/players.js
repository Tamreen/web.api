
require('../server.js');
require('colors');

//
request = require('supertest');

console.log('YOU CALLED ME!');

//
request('http://localhost:4000/api/v2')

.put('/players')

.expect(401, function(error){
	console.log(error);
});

// .end(function(error, response){
// 	console.log(error);
// 	console.log(response);
// });