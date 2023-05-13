const express = require('express');
const port = 3001;
const hostname = 'localhost';
const cors =  require('cors');
const body = require('body-parser');
const app = express();
app.use(express.json());

app.use(cors());

app.use(body.json());

app.use("/api/route", require('./route/routing'))


app.listen(port,hostname,()=> {
    console.log(`server menyala di ${hostname}:${port}`);
})