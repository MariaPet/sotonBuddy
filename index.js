const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());
app.listen(app.get('port'), () => console.log('App is listening to ' + app.get('port')));

app.get('/', (req, res) => {
    res.send('Hello automatic deployment');
})

//token verification
app.get('/webhook', (req, res) => {
    //arbitrary random string
    let TOKEN = "1dc3117d-188e-48ae-b1b8-1ba9e44f48ca";
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
    }
    else {
        res.sendStatus(403);
    }
})

