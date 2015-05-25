
// Define some errors.

//
ApiError = function(message, statusCode){
	this.message = message;
	this.statusCode = statusCode;
}

//
NotFoundError = function(message){
	this.message = message;
	this.statusCode = 404;
}

//
BadRequestError = function(message){
	this.message = message;
	this.statusCode = 400;
}

// 
ApiError.prototype = Object.create(Error.prototype);

// TODO: There could be more errors.
BadRequestError.prototype = Object.create(ApiError.prototype); // 400.
NotFoundError.prototype = Object.create(ApiError.prototype); // 404.