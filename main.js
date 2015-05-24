
//
Promise = require('bluebird');
using = Promise.using;

fs = require('fs');

//
express = require('express');
session = require('express-session');
bodyParser = require('body-parser');

//
nconf = require('nconf');

// Get the config information.
nconf.argv().env().file({file: './configs/variables.json'});

//
uuid = require('node-uuid');
crypto = require('crypto');

//
validator = require('validator');

//
moment = require('moment');

//
e164Format = /^\+[0-9]{8,15}$/;

// Set the locale of the training.
moment.locale('ar-sa');

//
app = express();
port = 4000;

// All that is related to session.
app.use(session({
	secret: nconf.get('appSalt'),
	resave: false,
	saveUninitialized: true,
}));

// Parse application/x-www-form-urlencoded.
app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json.
app.use(bodyParser.json());