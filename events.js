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
        if (payload.lenght === 3 && !isNaN(payload[2])) {
            return parseInt(payload.split('_')[2]);
        }
        return 0;
    },
    isMenuPostback:  function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "SOTON_MENU") {
            return true;
        }
        return false;
    },
    isBuildingsPostback:  function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "SOTON_BUILDINGS") {
            return true;
        }
        return false;
    },
    isBusPostback:  function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "SOTON_BUS") {
            return true;
        }
        return false;
    },
    isMessage: function(webhookEvent) {

    }
}