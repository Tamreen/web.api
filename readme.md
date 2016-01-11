
`[TOC]`

## How to install?
- Install mysql, node.js, npm.
- Execute the file <code>migrations/create.tamreen.tables.sql</code> in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file <code>configs/variables.json</code> with the appropriate values.
- Run <code>node server.js</code>.

## TODO:
- Validate the time when adding a training, it must be future.
- Remove debugging notes later.
- When adding a new member to a group, make sure that the player joins the current trainings.
- When sending an invalid JSON, the API should response differently.
- Fix the headers of the API too.
- Make all errors and exceptions in Arabic.
- Move the HTTPS logs to separated files.
- Update the API documentation or make it automatic.

## https://tamreen-app.com:5000/api/v2

- [x] GET /hellos
- [x] PUT /users/firsthandshake
- [x] PUT /users/secondhandshake
- [x] PUT /users/logout
- [x] PUT /players
- [x] GET /players/:id
- [x] GET /groups
- [x] POST /groups
- [x] GET /groups/:id
- [x] PUT /groups/:id
- [x] PUT /groups/:id/leave
- [x] DELETE /groups/:id
- [x] POST /groups/:id/players
- [x] DELETE /groups/:id/players/:playerId
- [x] PUT /groups/:id/players/:playerId/adminize
- [x] GET /trainings/specified
- [x] PUT /trainings/around
- [x] POST /trainings
- [x] GET /trainings/:id
- [x] PUT /trainings/:id/willcome
- [x] PUT /trainings/:id/apologize
- [x] PUT /trainings/:id
- [x] PUT /trainings/:id/professionalize
- [x] PUT /trainings/:id/bringprofessional
- [x] PUT /trainings/:id/publicize
- [x] PUT /trainings/:id/poke
- [x] PUT /trainings/:id/complete
- [x] PUT /trainings/:id/cancel
- [x] PUT /trainings/:id/players/:playerId/willcome
- [x] PUT /trainings/:id/players/:playerId/apologize
- [x] GET /activities
- [x] POST /feedbacks/add
