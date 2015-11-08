
//
require('./main');

// Require the needed services.
require('./services');

// Require the needed routes.
require('./routes');

// Require the needed workers.
require('./workers');

// Attach all previous routes under /api/v2.
app.use('/api/v2', router);

// Start listening to the specified port.
// app.listen(port);

var port = nconf.get('appPort');

// Uncomment this before anything.
if (nconf.get('environment') == 'development'){
	http.createServer(app).listen(port);
}else{
	https.createServer(sslOptions, app).listen(port);
}
//http.createServer(app).listen(port);

console.log('App active on localhost:' + port);