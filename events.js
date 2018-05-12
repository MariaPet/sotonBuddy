module.exports = {
    isStartPostback: function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "START") {
            return true;
        }
        return false;
    },
    isEventsPostback:  function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload.indexOf("SOTON_EVENTS") === 0) {
            return true;
        }
        return false;
    },
    eventsMorePostback: function(webhookEvent) {
        let payload = webhookEvent.postback.payload.split('_');
        if (payload.length === 3) {
            return parseInt(payload[2]);
        }
        return 0;
    },
    isMenuPostback: function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload.indexOf("SOTON_MENU") === 0) {
            return true;
        }
        return false;
    },
    whichMenuPostback: function(webhookEvent) {
        let payload = webhookEvent.postback.payload.split('_');
        if (payload.length === 3) {
            return ('http://id.southampton.ac.uk/point-of-service/' + payload[2]);
        }
        return false;
    },
    isBuildingsPostback: function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "SOTON_BUILDINGS") {
            return true;
        }
        return false;
    },
    whichBuildingMessage: function(webhookEvent) {
        if (webhookEvent.message && webhookEvent.message.text) {
            console.log(JSON.stringify(webhookEvent.message))
            let building = webhookEvent.message.text.split('-');
            if (building.length === 2 && building[0].toLowerCase().trim() === 'b') {
                return building[1].trim();
            }
            return false;
        }
        return false;
    },
    isBusPostback:  function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "SOTON_BUS") {
            return true;
        }
        return false;
    },
    whichStopMessage: function(webhookEvent) {
        if ((webhookEvent.message && webhookEvent.message.text) || (webhookEvent.postback && webhookEvent.postback.payload)) {
            let stop = webhookEvent.postback ? webhookEvent.postback.payload.split('-') : webhookEvent.message.text.split('-');
            if (stop.length === 2 && stop[0].toLowerCase().trim() === 'stop') {
                return stop[1].trim();
            }
            return false;
        }
        return false;
    },
    withAttachedLocation: function(webhookEvent) {
        if (webhookEvent.message && webhookEvent.message.attachments) {
            if (webhookEvent.message.attachments[0].type === "location") {
                return {
                    lat: webhookEvent.message.attachments[0].payload.coordinates.lat,
                    long: webhookEvent.message.attachments[0].payload.coordinates.long
                }
            }
            else {
                return false
            }
        }
        else {
            return false;
        }
    },
    isEasterEgg: function(webhookEvent) {
        if (webhookEvent.message && webhookEvent.message.text) {
            var text = webhookEvent.message.text
            if (text.toLowerCase() === "ρεζαζαντεχ") {
                return true
            }
            else {
                return false
            }
        }
        else {
            return false
        }
    }
}