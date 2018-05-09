const events = require("./events.js");
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const Parser = require('rss-parser');
const parser = new Parser();
$rdf = require('rdflib');

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
                sendMessage(sender,"Hello buddy! Choose an option from the menu.");
                res.status(200).send('EVENT_RECEIVED');
            }
            else if (events.isEventsPostback(webhookEvent) !== false) {
                var now = new Date();
                //Convert date to ISO format and strip time zone info
                now = now.toISOString().slice(0, now.toISOString().indexOf('T'));
                parser.parseURL('http://data.southampton.ac.uk/dumps/events-diary/'+now+'/events-diary.rss').then(function(feed){
                    console.log("Feed title" +"\n"+JSON.stringify(feed));
                    let order = events.eventsMorePostback(webhookEvent)
                    let items = feed.items;
                    // if (items.length - order )
                    if (items.length - order < 4 && items.length - order > 0) {
                        items = items.slice(order, items.length);
                        sendList(sender, items, -1);
                        res.status(200).send('EVENT_RECEIVED');
                    }
                    else if (items.length - order > 4) {
                        items = items.slice(order, order + 4);
                        sendList(sender, items, order);
                        res.status(200).send('EVENT_RECEIVED');
                    }
                    else {
                        sendMessage(sender,"That's all the events for the next days.");
                        res.status(200).send('EVENT_RECEIVED');
                    }
                    
                }, function(error) {
                    console.log("error ", JSON.stringify(error))
                    sendMessage(sender,"error");
                    res.status(200).send('EVENT_RECEIVED');
                });
            }
            else if (events.isBuildingsPostback(webhookEvent)) {
                
            }
            else if (events.isMenuPostback(webhookEvent)) {
                try {
                    var menus_url = 'http://id.southampton.ac.uk/dataset/catering-daily-menu/latest.ttl'
                    var store = $rdf.graph()
                    var timeout = 5000 // 5000 ms timeout
                    var fetcher = new $rdf.Fetcher(store, timeout)
                    fetcher.nowOrWhenFetched(menus_url, function(ok, body, xhr) {
                        if (!ok) {
                            console.log("Oops, something happened and couldn't fetch data");
                        } else {
                            // do something with the data in the store
                            // console.log(xhr)
                            // var mimeType = 'application/rdf+xml'
                            // var menuUri = 'http://id.southampton.ac.uk/dataset/catering-daily-menu'
                            try {
                                // store.serialize(menuUri, format='application/json-ld')
                                // $rdf.parse(xhr, store, menuUri, mimeType)
                                // var me = $rdf.sym('http://data.southampton.ac.uk/dumps/catering-daily-menu/2018-05-09/catering-daily-menu.nt');
                                // console.log(store.statements) // shows the parsed statements
                                // console.log(me)

                                var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
                                var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
                                var NS0 = $rdf.Namespace("http://purl.org/goodrelations/v1#");
                                const allTriples = store.statementsMatching( 
                                    undefined,
                                    NS0('availableAtOrFrom'),
                                    $rdf.sym("http://id.southampton.ac.uk/point-of-service/42-piazza"));
                                allTriples.forEach(function(triple) {
                                    console.log(triple.subject.value)
                                    var label = store.any($rdf.sym(triple.subject.value), NS0('label'), undefined)
                                    console.log(JSON.stringify(label))
                                    // if(triple.object.termType === "NamedNode") {
                                    //     // console.log(JSON.stringify(triple))
                                        
                                    // }
                                    // else  {
                                    //     console.log('hollaaaa \'' + triple.object.value + '\'');
                                    // }
                                });
                            } catch (err) {
                                console.log(err)
                            }
                            sendMessage(sender,"test rdf");
                        }
                    })
                    res.status(200).send('EVENT_RECEIVED');
                } catch (err) {
                    console.log(err)
                    res.status(200).send('EVENT_RECEIVED');
                }
            }
            else if (events.isBusPostback(webhookEvent)) {
            }
        });
    }
    else {
        console.log('Unknown event')
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
})

function sendList(sender, items, order) {
    let elements = []
    for (let i=0; i < items.length; i++) {
        elements.push({
            title: items[i].pubDate+" "+items[i].title,
            buttons: [
                {
                    title: "Details "+ items[i].title,
                    type: "postback",
                    payload: "EVENT_DETAILS_"+ items[i].title
                }
            ]
        })
    }
  
    messageData = {
        attachment : {
            type: "template",
            payload: {
                template_type: "list",
                top_element_style: "compact",
                elements: elements,
                buttons: order === -1? []: [
                    {
                      "title": "View More",
                      "type": "postback",
                      "payload": "SOTON_EVENTS_" + (order + 4)           
                    }
                  ]
            }
        }
    }
    json= {
        recipient: {id:sender},
        message: messageData,
    }
    postRequest(json);
}
function sendMessage(sender, text) {
    var messageData = {text: text}
    var json = {
        recipient: {id:sender},
        message: messageData,
    }
    postRequest(json);
}

function postRequest(json) {
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
        else {
            console.log('Message response')
        }
    });
}



