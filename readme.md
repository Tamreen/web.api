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

- [x] GET /trainings/[specified|around]

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
	"stadium": "Lega", "coordinates": [x: 124, y: 123], "startedAt": "12 Nov 2015",
	"groups": [1, 5], "publicized": true, "playersCount": 20
}
```
> RESPONSE 201

```json
{
	# TODO: The response must be a training.
}
```

- [x] GET /trainings/:id

> RESPONSE 200

```json
{
    "id": 15,
    "name": "الأحد، ٠٥ أبريل ٢٠١٥، ٠٥:٠٠ م",
    "status": "gathering-completed",
    "stadium": "في المرمى",
    "coordinates": null,
    "startedAt": "2015-04-05T16:00:00.000Z",
    "playersCount": 16,
    "professionalized": 0,
    "publicized": 0,
    "createdAt": "2015-04-04T12:21:40.000Z",
    "modifiedAt": "2015-04-05T08:43:35.000Z",
    "adminable": 0,
    "willcomePlayersCount": 16,
    "apologizePlayersCount": 9,
    "decision": "willcome",
    "percentage": 100,
    "willcomePlayers": [
        {
            "fullname": "عبدالعزيز الصالح",
            "id": 20,
            "decision": "willcome"
        },
        {
            "fullname": "يوسف اليحيى",
            "id": 25,
            "decision": "willcome"
        },
        {
            "fullname": "حسام اليحيى",
            "id": 13,
            "decision": "willcome"
        },
        {
            "fullname": "عبدالعزيز اليونس",
            "id": 27,
            "decision": "willcome"
        },
        {
            "fullname": "محمد الخالد",
            "id": 18,
            "decision": "willcome"
        },
        {
            "fullname": "يعقوب السليمان",
            "id": 12,
            "decision": "willcome"
        },
        {
            "fullname": "وسام الخالد",
            "id": 1,
            "decision": "willcome"
        },
        {
            "fullname": "صالح اليونس",
            "id": 8,
            "decision": "willcome"
        },
        {
            "fullname": "حسام الخالد",
            "id": 28,
            "decision": "willcome"
        },
        {
            "fullname": "يونس الحسام",
            "id": 33,
            "decision": "willcome"
        },
        {
            "fullname": "إبراهيم العبدالرحمن",
            "id": 9,
            "decision": "willcome"
        },
        {
            "fullname": "إبراهيم العبدالرحمن",
            "id": 11,
            "decision": "willcome"
        },
        {
            "fullname": "خالد الأيمن",
            "id": 35,
            "decision": "willcome"
        },
        {
            "fullname": "يونس السليمان",
            "id": 36,
            "decision": "willcome"
        },
        {
            "fullname": "إبراهيم اليوسف",
            "id": 37,
            "decision": "willcome"
        },
        {
            "fullname": "إبراهيم الفيصل",
            "id": 17,
            "decision": "willcome"
        }
    ],
    "apologizePlayers": [
        {
            "fullname": "عبدالرحمن الصالح",
            "id": 15,
            "decision": "apologize"
        },
        {
            "fullname": "ناصر الحمد",
            "id": 24,
            "decision": "apologize"
        },
        {
            "fullname": "حمد الخالد",
            "id": 38,
            "decision": "apologize"
        },
        {
            "fullname": "إبراهيم السليمان",
            "id": 10,
            "decision": "apologize"
        },
        {
            "fullname": "وائل الوائل",
            "id": 56,
            "decision": "apologize"
        },
        {
            "fullname": "خالد الأيمن",
            "id": 22,
            "decision": "apologize"
        },
        {
            "fullname": "وائل المحمد",
            "id": 19,
            "decision": "apologize"
        },
        {
            "fullname": "عبدالرحمن الأيمن",
            "id": 34,
            "decision": "apologize"
        },
        {
            "fullname": "سليمان الحسام",
            "id": 21,
            "decision": "apologize"
        }
    ],
    "notyetPlayers": [
        {
            "fullname": "حسام المحمد",
            "id": 14,
            "decision": "notyet"
        },
        {
            "fullname": "صالح العبدالعزيز",
            "id": 32,
            "decision": "notyet"
        },
        {
            "fullname": "محمد الحسام",
            "id": 29,
            "decision": "notyet"
        },
        {
            "fullname": "يحيى الناصر",
            "id": 16,
            "decision": "notyet"
        },
        {
            "fullname": "حسام اليونس",
            "id": 43,
            "decision": "notyet"
        },
        {
            "fullname": "يوسف الحسام",
            "id": 639,
            "decision": "notyet"
        },
        {
            "fullname": "يوسف الصالح",
            "id": 655,
            "decision": "notyet"
        }
    ]
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
