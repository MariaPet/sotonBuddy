const events = require("./events.js");
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
        console.log('WEBHOOK_NOT_VERIFIED');
        res.sendStatus(403);
    }
});

//endpoint to handle response
app.post('/webhook', (req, res) => {
    let body = req.body;
    console.log('Message received')
    let eventOrigin = body.object;
    
    if (eventOrigin === "page") {
        
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Gets the message. entry.messaging is an array, but 
            // will only ever contain one message, so we get index 0
            let webhookEvent = entry.messaging[0];
            let sender = webhookEvent.sender.id;
            if (events.isStartPostback(webhookEvent)) {
                sendMessage(sender,"Hello buddy!");
                console.log('Message response')
                res.status(200).send('EVENT_RECEIVED');
            }
        });
    }
    else {
        console.log('Unknown event')
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
})

function sendMessage(sender, text) {
    var messageData = {text: text}
    var json = {
        recipient: {id:sender},
        message: messageData,
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: json
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        }
        else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    });
}



