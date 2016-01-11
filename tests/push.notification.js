
require('../server');

var message = {
	icon: '',
	content: 'تحديث خُرافي متوفّر الآن في المتجر',
	sound: 'AngelChoir.aif',
	trainingName: '',
};

var users = [
	{deviceType: 'ios', deviceToken: ''},
];

//
PushNotificationService.pushMessageToUsers(message, users);

// // Get the users
// DatabaseService.query('select * from users where deviceToken is not null')

// //
// .then(function(users){
// 	//console.log(users);
// 	return PushNotificationService.pushMessageToUsers(message, users);
// });

// 

// console.log(message);