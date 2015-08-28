
## How to install?
- Install mysql, node.js, npm.
- Execute the file <code>migrations/create.tamreen.tables.sql</code> in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file <code>configs/variables.json</code> with the appropriate values.
- Run <code>node server.js</code>.

## /api/v2

##### GET /hellos
> RESPONSE 
```json
{
	"name": "tamreen", "version": "2.0.0"
}
```

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
RESPONSE {"id": 134, "name": "Lega", "createdAt": "12 Nov 2015", "adminable": true, "players": [{"fullname": "Zee", "joinedAt": "12 Nov 2015"}, ]}

PUT /groups/:id
REQUEST {"name": "Whatever"}
RESPONSE {} # TODO: The response must be a group.

POST /groups/:id/players
REQUEST {"fullname": "Ali Khalid", "e164formattedMobileNumber": "+96655*******"}
RESPONSE {} # TODO: The response must be a player.

DELETE /groups/:id/players/:playerId
RESPONSE 204

POST /trainings
REQUEST {"stadium": "Lega", "coordinates": "", "startedAt": "12 Nov 2015", "groups": [1, 5], "publicable": true, "playersCount": 20}
RESPONSE {} # TODO: The response must be a training.

GET /trainings/:id
RESPONSE {"id": 12, "name": "Related Date Name", "stadium": "Lega", "coordinates": "", "startedAt": "12 Nov 2015", "decision": "willcome", "adminable": true, "status": "gathering", "percentage": 89, "willcomePlayers": [], "apologizePlayers": [], "notyetPlayers": []}

PUT /trainings/:id/willcome
RESPONSE 204

PUT /trainings/:id/apologize
RESPONSE 204

PUT /trainings/:id
REQUEST {"coordinates": "", }
RESPONSE {} # TODO: The response must be a training.

PUT /trainings/:id/professionalize
RESPONSE 204

PUT /trainings/:id/publicize
RESPONSE 204

PUT /trainings/:id/poke
RESPONSE 204

PUT /trainings/:id/cancel
RESPONSE 204

PUT /trainings/:id/players/:playerId/willcome
RESPONSE 204

PUT /trainings/:id/players/:playerId/apologize
RESPONSE 204

DELETE /groups/:id/players/:playerId
RESPONSE 204

PUT /groups/:id/players/:playerId/adminable
RESPONSE 204
