
// http://stackoverflow.com/questions/8495687/split-array-into-chunks
Array.prototype.chunk = function(chunkSize){

    var chunksArray = [];

    for (var i=0; i<this.length; i+=chunkSize){
        chunksArray.push(this.slice(i, i+chunkSize));
    }

    return chunksArray;
}

Promise = require('bluebird');
using = Promise.using;
nconf = require('nconf');

// Get the config information.
nconf.argv().env().file({file: './configs/variables.json'});

//
require('../services/PushNotificationService');
require('../services/DatabaseService');

var message = {
	icon: '',
	content: 'تحديث خُرافي متوفّر الآن في المتجر',
	sound: 'ping.aiff',
	trainingName: '',
};

// Get the users
DatabaseService.query('select * from users where deviceToken is not null')

//
.then(function(users){
	return PushNotificationService.pushMessageToUsers(message, users);
});

// console.log(message);