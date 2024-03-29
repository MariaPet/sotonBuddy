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
            // console.log(JSON.stringify(webhookEvent))
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
                    // console.log("Feed title" +"\n"+JSON.stringify(feed));
                    let order = events.eventsMorePostback(webhookEvent)
                    let items = feed.items;
                    // if (items.length - order )
                    if (items.length - order < 4 && items.length - order > 0) {
                        items = items.slice(order, items.length);
                        sendWebList(sender, items, -1);
                        res.status(200).send('EVENT_RECEIVED');
                    }
                    else if (items.length - order > 4) {
                        items = items.slice(order, order + 4);
                        sendWebList(sender, items, order);
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
            else if (events.isBuildingsPostback(webhookEvent) || events.whichBuildingMessage(webhookEvent)) {
                var requestedBuilding = events.whichBuildingMessage(webhookEvent);
                var buildingsUrl = "http://id.southampton.ac.uk/dataset/places/latest.rdf"
                if (!requestedBuilding) {
                    sendMessage(sender,"You can type eg. \"B-59\" to get information for building 59.");
                }
                else {
                    var buildingsUrl = "http://id.southampton.ac.uk/dataset/places/latest.rdf"
                    var store = $rdf.graph()
                    var timeout = 5000 // 5000 ms timeout
                    var fetcher = new $rdf.Fetcher(store, timeout)
                    try {
                        fetcher.nowOrWhenFetched(buildingsUrl, function(ok, body, xhr) {
                            if (!ok) {
                                console.log("Oops, something happened and couldn't fetch data");
                            }
                            else {
                                try {
                                    console.log(requestedBuilding)
                                    var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
                                    var SKOS = $rdf.Namespace("http://www.w3.org/2004/02/skos/core#");
                                    var GEO = $rdf.Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#");
                                    var BGCODE= $rdf.Namespace("http://id.southampton.ac.uk/ns/building-code-scheme");
                                    var SPACIAL = $rdf.Namespace("http://data.ordnancesurvey.co.uk/ontology/spatialrelations/")
                                    const buildingTriples = store.statementsMatching( 
                                        undefined,
                                        SKOS('notation'),
                                        undefined
                                    );
                                    console.log(buildingTriples.length)
                                    if (buildingTriples.length === 0) {
                                        sendMessage(sender, "I'm sorry, I couldn't find the building you requested");
                                    }
                                    buildingTriples.forEach(function(buildingTriple) {
                                        if (buildingTriple.object.value === requestedBuilding) {
                                            console.log(JSON.stringify(buildingTriple))
                                            var lat = store.any($rdf.sym(buildingTriple.subject.value), GEO('lat'), undefined)
                                            var long = store.any($rdf.sym(buildingTriple.subject.value), GEO('long'), undefined)
                                            var campusUri = store.any($rdf.sym(buildingTriple.subject.value), SPACIAL('within'), undefined)
                                            var campus = store.any($rdf.sym(campusUri.value), RDFS('label'), undefined)
                                            console.log(JSON.stringify(lat))
                                            console.log(JSON.stringify(long))
                                            console.log(JSON.stringify(campus))
                                            sendMapLink(sender, lat.value, long.value, requestedBuilding, campus.value)
                                        }
                                    });
                                }
                                catch (err) {
                                    console.log(err)
                                    res.status(200).send('EVENT_RECEIVED');
                                }
                            }
                        });
                    }
                    catch (err) {
                        console.log(err)
                        res.status(200).send('EVENT_RECEIVED');
                    }
                }
                res.status(200).send('EVENT_RECEIVED');
            }
            else if (events.isMenuPostback(webhookEvent)) {
                try {
                    var menusUrl = 'http://id.southampton.ac.uk/dataset/catering-daily-menu/latest.ttl'
                    var store = $rdf.graph()
                    var timeout = 5000 // 5000 ms timeout
                    var fetcher = new $rdf.Fetcher(store, timeout)
                    var requestedMenu = events.whichMenuPostback(webhookEvent)
                    if (requestedMenu) {
                        try {
                            var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
                            var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
                            var NS0 = $rdf.Namespace("http://purl.org/goodrelations/v1#");
                            fetcher.nowOrWhenFetched(menusUrl, function(ok, body, xhr) {
                                if (!ok) {
                                    console.log("Oops, something happened and couldn't fetch data");
                                } else {
                                    try {
                                        const menuTriples = store.statementsMatching( 
                                            undefined,
                                            NS0('availableAtOrFrom'),
                                            $rdf.sym(requestedMenu)
                                        );
                                        var messageCounter = 0;
                                        menuTriples.forEach(function(menuTriple) {
                                            var label = store.any($rdf.sym(menuTriple.subject.value), RDFS('label'), undefined)
                                            console.log(JSON.stringify(label))
                                            if (label.termType === "Literal" && label.value && messageCounter < 10) {
                                                messageCounter++;
                                                sendMessage(sender,label.value);
                                            }
                                        });
                                    } catch (err) {
                                        console.log(err)
                                    }
                                }
                            })
                        }
                        catch (err) {
                            console.log(err)
                        }
                    }
                    res.status(200).send('EVENT_RECEIVED');
                } catch (err) {
                    console.log(err)
                    res.status(200).send('EVENT_RECEIVED');
                }
            }
            else if (events.isBusPostback(webhookEvent) || events.whichStopMessage(webhookEvent) || events.withAttachedLocation(webhookEvent)) {
                var stop = events.whichStopMessage(webhookEvent);
                var location = events.withAttachedLocation(webhookEvent);
                if (location) {
                    request('https://transportapi.com/v3/uk/bus/stops/near.json?app_id=4c4606af&app_key=413d7ff0e20550f47d4c976f01c0fa39&lat=' +
                     location.lat + '&lon=' + 
                     location.long , function (error, response, body) {
                        var body = JSON.parse(body);
                        sendActionList(sender, body.stops.splice(0,4))
                     });
                }
                else if (stop) {
                    request('https://transportapi.com/v3/uk/bus/stop/'+ stop +'/live.json?app_id=4c4606af&app_key=413d7ff0e20550f47d4c976f01c0fa39&group=route&nextbuses=yes',
                    function (error, response, body) {
                        var body = JSON.parse(body);
                        if (!body.departures) {
                            sendMessage(sender, "Sorry, I couldn't find any departures from " + body.name);
                        }
                        for (var key in body.departures) {
                            var departureTime = body.departures[key][0].aimed_departure_time;
                            var operatorName = body.departures[key][0].operator_name;
                            var direction = body.departures[key][0].direction;
                            var line = body.departures[key][0].line_name;
                            nextBus = "🚌 " + operatorName + " " + line + " 🚌\nBus stop: "  + body.name + "\nDirection: " + direction + "\nDeparture time: "+ departureTime
                            sendMessage(sender, nextBus);
                        }
                    });
                }
                else {
                    // send quick reply for location
                    sendMessage(sender, "Please send your location to find bustops near you or send eg. stop-Giddy Bridge", true)
                }
                res.status(200).send('EVENT_RECEIVED');
            }
            // else if(events.isEasterEgg) {
            //     sendReza(sender);
            //     res.status(200).send('EVENT_RECEIVED');
            // }
            else {
                sendMessage(sender, "Sorry, I didn't understand this. Maybe try again with an option from the menu?")
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

function sendReza(sender) {
    var messageData = {"attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Soton Buddy's best buddy is Reza",
            "image_url": "https://secure.ecs.soton.ac.uk/heights/heights-image.php?id=person_10385&mode=profile"
          }]
        }
      }
    }
    var json = {
        recipient: {id:sender},
        message: messageData,
    }
    postRequest(json);
}
function sendMapLink(sender, lat, long, requestedBuilding, campus) {
    messageData = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": "Building " + requestedBuilding,
              "subtitle": campus,
              "image_url": "https://maps.googleapis.com/maps/api/staticmap?key=AIzaSyAn0wRsT6Ow5GYxfyLRMISATCzGG4Zdgqo" + 
              "&markers=color:red|label:B|" + lat + "," + long + "&size=360x360&zoom=17"
            }]
          }
        }
    }
    var json = {
        recipient: {id:sender},
        message: messageData,
    }
    postRequest(json);
}
function sendWebList(sender, items, order) {
    let elements = []
    for (let i=0; i < items.length; i++) {
        elements.push({
            title: items[i].title,
            subtitle: items[i].pubDate,
            buttons: [
                {
                    "type": "web_url",
                    "url": items[i].link,
                    "title": "Details"
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

function sendActionList(sender, items) {
    let elements = []
    for (let i=0; i < items.length; i++) {
        elements.push({
            title: "Stop " + items[i].name,
            subtitle: items[i].distance + " meters away",
            image_url: "https://maps.googleapis.com/maps/api/staticmap?key=AIzaSyAn0wRsT6Ow5GYxfyLRMISATCzGG4Zdgqo" + 
              "&markers=color:red|label:B|" + items[i].latitude + "," + items[i].longitude + "&size=360x360&zoom=17",
            buttons: [
                {
                    title: "Bus Info",
                    type: "postback",
                    payload: "stop-" + items[i].atcocode
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
                elements: elements
            }
        }
    }
    json= {
        recipient: {id:sender},
        message: messageData,
    }
    postRequest(json);
}
function sendMessage(sender, text, quickReply) {
    var messageData = {text: text}
    if (quickReply) {
        messageData.quick_replies = []
        messageData.quick_replies.push({
            content_type: "location"
        });
    }
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