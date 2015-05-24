
// Define some errors.

//
function ApiError(message, statusCode){
	this.message = message;
	this.statusCode = statusCode;
}

//
function NotFoundError(message){
	this.message = message;
	this.statusCode = 404;
}

//
function BadRequestError(message){
	this.message = message;
	this.statusCode = 400;
}

// 
ApiError.prototype = Object.create(Error.prototype);

// TODO: There could be more errors.
BadRequestError.prototype = Object.create(ApiError.prototype); // 400.
NotFoundError.prototype = Object.create(ApiError.prototype); // 404.