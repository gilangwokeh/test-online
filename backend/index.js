const express  = require('express');
const port     = 5001;
const hostname = 'localhost';
const cors     =  require('cors');
const body     = require('body-parser');
const app      = express();
const mysql    = require('mysql2');

app.use(express.json());

app.use(cors());

app.use(body.json());

app.use("/api/route", require('./route/routing'))

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

app.listen(port,hostname,()=> {
    console.log(`server menyala di ${hostname}:${port}`);
})