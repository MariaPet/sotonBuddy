const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');

app.set('port', (process.env.port || 5000));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello automatic deployment');
})

