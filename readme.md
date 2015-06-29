
## How to install?
- Install mysql, node.js, npm.
- Execute the file migrations/create.tamreen.tables.sql in mysql.
- In the application root directory (tamreen-api), run the command <code>npm install</code>.
- In the directory <code>configs</code>, duplicate the file <code>variables.template.json</code> and give the new file the name <code>variables.json</code>. Do the same with all files in the directory certificates.
- Update the variables in the file configs/variables.json with the appropriate values.
- Run <code>node server.js</code>.