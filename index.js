const http = require('http');
const port = 3001;
const hostname = 'localhost';
const mysql = require('mysql');

const server = http.createServer(function (request,response){
    response.end('Hello Bro')
});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'gilang',
    password: 'password123',
    database: 'test'
});

connection.connect((error) => {
    if (error) {
      console.error('Error connecting to the database:', error);
      return;
    }
  
    console.log('Connected to the database!');
  });



server.listen(port,hostname,()=> {
    console.log(`server menyala di ${hostname}:${port}`);
})