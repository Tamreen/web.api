
require('../server');

// console.log(router.stack);
Promise.each(router.stack, function(layer){

	var route = layer.route; var path = route.path;
	var method = Object.keys(route.methods)[0].toUpperCase();

	console.log(method, path);
});