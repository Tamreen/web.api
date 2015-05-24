
//
mysql = require('mysql');

// Promisify some mysql libraries.
Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

// Have a new connection pool.
pool = mysql.createPool({
	host: nconf.get('databaseHost'),
	port: nconf.get('databasePort'),
	user: nconf.get('databaseUsername'),
	password: nconf.get('databasePassword'),
	database: nconf.get('databaseName'),
});

//
DatabaseService = {

	getConnection: function(){
		return pool.getConnectionAsync().disposer(function(connection){
			return connection.destroy();
		});
	},

	query: function(command){
		return using(DatabaseService.getConnection(), function(connection){
			return connection.queryAsync(command).then(function(results){
				// Return only the rows, no need for fields for now.
				return results[0];
			});
		});
	},

	format: function(query, parameters){
		return mysql.format(query, parameters);
	}
};