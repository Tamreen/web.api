
## How to install?
- Install mysql, node.js, npm.
- Execute the file <code>migrations/create.tamreen.tables.sql</code> in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file <code>configs/variables.json</code> with the appropriate values.
- Run <code>node server.js</code>.

## /api/v2

GET /hellos
RESPONSE {"name": "tamreen", "version": 2.0.0}

PUT /users/firsthandshake
REQUEST {"e164formattedMobileNumber": "+966*********"}
RESPONSE 204

PUT /users/secondhandshake
REQUEST {"e164formattedMobileNumber": "+966*********", "code": "1234"}
RESPONSE {} # TODO: The response must be a user player.

PUT /players
REQUEST {"fullname": "Hussam Zee"}
RESPONSE {} # TODO: The response must be a user player.

GET /notifications
RESPONSE {"trainingsCount": 12, "groupsCount": 5, "profilesCount": 9}

GET /profiles/:id
RESPONSE {"fullname": "Hossam Zee", "location": "Riyadh"}

PUT /users/logout
RESPONSE 204

GET /groups
RESPONSE [{"name": "Lega", "playersCount": 30}, ]

GET /trainings/[specified|around]
REQUEST {"coordinates": [12.4, 67.3]}
RESPONSE [{"name": "Mon 2015", "startedAt": "12 Dec 2015", "status": "gathering", "percentage": 15}, ]

POST /groups
REQUEST {"name": "Hello"}
RESPONSE {"id": 134, "name": "Hello", "playersCount": 10}

GET /groups/:id
RESPONSE 
