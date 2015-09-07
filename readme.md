`[TOC]`

## How to install?
- Install mysql, node.js, npm.
- Execute the file <code>migrations/create.tamreen.tables.sql</code> in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file <code>configs/variables.json</code> with the appropriate values.
- Run <code>node server.js</code>.

## TODO:

- Make the trainings start and complete (Probably by creating a worker).
- Create a worker to make the activities of all players read if a training completed or canceled.
- Remove debugging notes later.

## /api/v2
- [x] GET /hellos

> RESPONSE 200

```json
{
	"name": "tamreen", "version": "2.0.0"
}
```

- [x] PUT /users/firsthandshake

> REQUEST

```json
{
	"e164formattedMobileNumber": "+966*********"
}
```

> RESPONSE 204

- [x] PUT /users/secondhandshake

> REQUEST

```json
{
	"e164formattedMobileNumber": "+966*********",
	"code": "1234"
}
```

> RESPONSE 200

```json
{
	"id": 1,
	"playerId": 1,
	"e164formattedMobileNumber": "+966*********",
	"token": "3c57d95eca55efdefe8c1aa58bd855e7d476a49ba744f0e7a966428fa099374f",
	"deviceType": "android",
	"deviceToken": null,
	"loginable": 1,
	"createdAt": "2015-03-27T14:43:56.000Z",
	"modifiedAt": "2015-09-03T06:18:30.000Z",
	"deletedAt": null,
	"fullname": "وسام الخالد"
}
```

- [x] PUT /players

> REQUEST

```json
{
	"fullname": "Hussam Zee"
}
```
> RESPONSE 200

```json
{
    "id": 1,
    "playerId": 1,
    "e164formattedMobileNumber": "+966*********",
    "token": "3c57d95eca55efdefe8c1aa58bd855e7d476a49ba744f0e7a966428fa099374f",
    "deviceType": "android",
    "deviceToken": null,
    "loginable": 1,
    "createdAt": "2015-03-27T14:43:56.000Z",
    "modifiedAt": "2015-09-03T06:18:30.000Z",
    "deletedAt": null,
    "fullname": "وسام الخالد"
}
```

- [x] GET /activities

> RESPONSE 200

```json
{
	"count": 12
}
```

- [x] GET /players/:id

> RESPONSE 200

```json
{
    "id": 1,
    "fullname": "وسام الخالد",
    "modifiedAt": "2015-09-03T06:19:49.000Z",
    "createdAt": "2015-03-27T14:43:56.000Z"
}
```

- [x] PUT /users/logout

> RESPONSE 204

- [x] GET /groups

> RESPONSE

```json
[
	{"name": "Lega", "playersCount": 30}, 
]
```

- [ ] GET /trainings/[specified|around]

> REQUEST

```json
{
	"coordinates": [12.4, 67.3]
}
```
> RESPONSE

```json
[
	{
		"name": "Mon 2015", "startedAt": "12 Dec 2015",
		"status": "gathering", "percentage": 15
	},
]
```

- [x] POST /groups

> REQUEST

```json
{
	"name": "Hello"
}
```
> RESPONSE

```json
{
	"id": 134, "name": "Hello", "playersCount": 10
}
```

- [x] GET /groups/:id

> RESPONSE

```json
{
	"id": 134, "name": "Lega",
	"createdAt": "12 Nov 2015", "adminable": true, 
	"players": [
		{
			"fullname": "Zee", "joinedAt": "12 Nov 2015"
		}, 
	]
}
```

- [x] PUT /groups/:id

> REQUEST

```json
{
	"name": "Whatever"
}
```
> RESPONSE 200

```json
{
	# TODO: The response must be a group (maybe with the players).
}
```

- [x] POST /groups/:id/players

> REQUEST

```json
{
	"fullname": "Ali Khalid", "e164formattedMobileNumber": "+96655*******"
}
```
> RESPONSE 201

```json
{
	# TODO: The response must be a player.
}
```

- [x] DELETE /groups/:id/players/:playerId

> RESPONSE 204

- [ ] POST /trainings

> REQUEST

```json
{
	"stadium": "Lega", "coordinates": "", "startedAt": "12 Nov 2015",
	"groups": [1, 5], "publicable": true, "playersCount": 20
}
```
> RESPONSE

```json
{
	# TODO: The response must be a training.
}
```

- [ ] GET /trainings/:id

> RESPONSE

```json
{
	"id": 12, "name": "Related Date Name", "stadium": "Lega",
	"coordinates": "", "startedAt": "12 Nov 2015", "decision": "willcome",
	"adminable": true, "status": "gathering", "percentage": 89,
	"willcomePlayers": [],
	"apologizePlayers": [],
	"notyetPlayers": []
}
```

- [ ] PUT /trainings/:id/willcome

> RESPONSE 204

- [ ] PUT /trainings/:id/apologize

> RESPONSE 204

- [ ] PUT /trainings/:id

> REQUEST 

```json
{
	"coordinates": "", 
}
```
> RESPONSE

```json
{
	# TODO: The response must be a training.
}
```

- [ ] PUT /trainings/:id/professionalize

> RESPONSE 204

- [ ] PUT /trainings/:id/publicize

> RESPONSE 204

- [ ] PUT /trainings/:id/poke

> RESPONSE 204

- [ ] PUT /trainings/:id/cancel

> RESPONSE 204

- [ ] PUT /trainings/:id/players/:playerId/willcome

> RESPONSE 204

- [ ] PUT /trainings/:id/players/:playerId/apologize

> RESPONSE 204

- [ ] DELETE /groups/:id/players/:playerId

> RESPONSE 204

- [ ] PUT /groups/:id/players/:playerId/adminable

> RESPONSE 204
