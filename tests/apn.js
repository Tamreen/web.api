
var apn = require('apn');

var options = {
   "batchFeedback": true,
   "interval": 1,
   "production": true,
   "cert": 'cert.pem',
   "key": 'key.pem',
   "passphrase":'12441244'
};

var apnConnection = new apn.Connection(options);

var token = 'aa5ac8895bd11447dbc2a61584814b4ac5a9d3be49d611886c06e1b30efeed52';

var myDevice = new apn.Device(token);

var note = new apn.Notification();

note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
note.badge = 3;
note.sound = "ping.aiff";
note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
note.payload = {'messageFrom': 'Caroline'};

apnConnection.pushNotification(note, myDevice);


