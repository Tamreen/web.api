`[TOC]`

## How to install?
- Install mysql, node.js, npm.
- Execute the file <code>migrations/create.tamreen.tables.sql</code> in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file <code>configs/variables.json</code> with the appropriate values.
- Run <code>node server.js</code>.

## TODO:

- Make the trainings start and complete (probably by creating a worker).
- Create a worker to make the activities of all players read if a training completed or canceled.
- Remove debugging notes later.
- When adding a new member to a group, make sure that the player joins the current trainings.

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

- [x] GET /trainings/specified

> RESPONSE

```json
[
    {
        "id": 15,
        "name": "الأحد، ٠٥ أبريل ٢٠١٥، ٠٥:٠٠ م",
        "status": "gathering-completed",
        "stadium": "في المرمى",
        "coordinates": null,
        "startedAt": "2015-04-05T14:00:00.000Z",
        "playersCount": 16,
        "professionalized": 0,
        "publicized": 0,
        "createdAt": "2015-04-04T10:21:40.000Z",
        "modifiedAt": "2015-04-05T06:43:35.000Z",
        "percentage": 100
    },
    {
        "id": 21,
        "name": "الأحد، ١٢ أبريل ٢٠١٥، ٠٥:٠٠ م",
        "status": "gathering-completed",
        "stadium": "في المرمى",
        "coordinates": null,
        "startedAt": "2015-04-12T14:00:00.000Z",
        "playersCount": 18,
        "professionalized": 0,
        "publicized": 0,
        "createdAt": "2015-04-11T10:22:01.000Z",
        "modifiedAt": "2015-04-12T10:24:28.000Z",
        "percentage": 100
    }
]
```

- [ ] GET /trainings/around

> REQUEST

```json
{
    "coordinates": {"x": 124.66, "y": 76.89},
}
```
> RESPONSE

```json
[
    # TODO: This response has to be validated.
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
    "id": 6,
    "name": "Hello World",
    "authorId": 1,
    "createdAt": "2015-03-29T00:29:27.000Z",
    "modifiedAt": "2015-10-08T19:25:09.000Z",
    "deletedAt": null
}
```

- [x] POST /groups/:id/players

> REQUEST

```json
{
    "fullname": "Hello World",
    "e164formattedMobileNumber": "+966*******"
}
```
> RESPONSE 201

```json
{
    "id": 1010,
    "fullname": "Hello World",
    "modifiedAt": null,
    "joinedAt": "2015-10-08T19:33:43.000Z",
    "role": "member"
}
```

- [x] DELETE /groups/:id/players/:playerId

> RESPONSE 204

- [x] POST /trainings

> REQUEST

```json
{
    "stadium": "Riyadh",
    "startedAt": "12 Nov 2014 11:11:33",
    "playersCount": 12,
    "publicized": 1,
    "coordinates": {"x": 124.66, "y": 76.89},
    "groups": [6, 104]
}
```
> RESPONSE 201

```json
{
    "id": 177,
    "name": "الأربعاء، ١٢ نوفمبر ٢٠١٤، ١١:١١ ص",
    "status": "gathering",
    "stadium": "Riyadh",
    "coordinates": {
        "x": 124.66,
        "y": 76.89
    },
    "startedAt": "2014-11-12T08:11:33.000Z",
    "playersCount": 12,
    "professionalized": 0,
    "publicized": 1,
    "createdAt": "2015-10-08T19:21:34.000Z",
    "modifiedAt": null,
    "adminable": 1,
    "willcomePlayersCount": 0,
    "apologizePlayersCount": 0,
    "decision": "notyet",
    "percentage": 0
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

- [x] PUT /trainings/:id/willcome

> RESPONSE 204

- [x] PUT /trainings/:id/apologize

> RESPONSE 204

- [x] PUT /trainings/:id

> REQUEST 

```json
{
    "coordinates": {"x": 120.1221212, "y": 56.21}
}
```

> RESPONSE

```json
{
    "id": 177,
    "name": "الأربعاء، ١٢ نوفمبر ٢٠١٤، ١١:١١ ص",
    "status": "gathering",
    "stadium": "Riyadh",
    "coordinates": {
        "x": 120.1221212,
        "y": 56.21
    },
    "startedAt": "2014-11-12T08:11:33.000Z",
    "playersCount": 12,
    "professionalized": 0,
    "publicized": 1,
    "createdAt": "2015-10-08T19:21:34.000Z",
    "modifiedAt": "2015-10-10T00:17:24.000Z",
    "adminable": 1,
    "willcomePlayersCount": 11,
    "apologizePlayersCount": 3,
    "decision": "willcome",
    "percentage": 91.6667,
    "willcomePlayers": [
        {
            "fullname": "وسام الخالد",
            "id": 1
        },
        {
            "fullname": "إبراهيم العبدالرحمن",
            "id": 11
        },
        {
            "fullname": "يونس الحسام",
            "id": 33
        },
    ],
    "apologizePlayers": [
    ],
    "notyetPlayers": [
    ]
}
```

- [x] PUT /trainings/:id/professionalize

> RESPONSE 204

- [x] PUT /trainings/:id/bringprofessional

> REQUEST
```json
{
    "fullname": "Amhad Ali Kli",
    "e164formattedMobileNumber": "+966778890099"
}
```

> RESPONSE 204

- [x] PUT /trainings/:id/publicize

> RESPONSE 204

- [x] PUT /trainings/:id/poke

> RESPONSE 204

- [x] PUT /trainings/:id/cancel

> RESPONSE 204

- [x] PUT /trainings/:id/players/:playerId/willcome

> RESPONSE 204

- [x] PUT /trainings/:id/players/:playerId/apologize

> RESPONSE 204

- [x] DELETE /groups/:id/players/:playerId

> RESPONSE 204

- [ ] PUT /groups/:id/players/:playerId/adminize

> RESPONSE 204
