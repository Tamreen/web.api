
//
require('./main');

// Require the needed services.
require('./services');

// Require the needed routes.
require('./routes');

// Require the needed workers.
require('./workers');

// Attach all previous routes under /api/v1.
app.use('/api/v1', router);

// Start listening to the specified port.
// app.listen(port);

var port = nconf.get('appPort');

if (nconf.get('environment') == 'development'){
	http.createServer(app).listen(port);
}else{
	https.createServer(sslOptions, app).listen(port);
}

console.log('App active on localhost:' + port);
