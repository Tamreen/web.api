
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
UnauthorizedError = function(message){
	this.message = message;
	this.statusCode = 401;
}

ConflictError  = function(message){
	this.message = message;
	this.statusCode = 409;
}

// 
ApiError.prototype = Object.create(Error.prototype);

// TODO: There could be more errors.
NotFoundError.prototype = Object.create(ApiError.prototype); // 404.
BadRequestError.prototype = Object.create(ApiError.prototype); // 400.
UnauthorizedError.prototype = Object.create(ApiError.prototype); // 401.
ConflictError.prototype = Object.create(ApiError.prototype); // 409.