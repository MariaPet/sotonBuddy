const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());


app.get('/', (req, res) => {
    res.send('Hello automatic deployment');
})

app.listen(app.get('port'), () => console.log('App is listening to ' + app.get('port')));

