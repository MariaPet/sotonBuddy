module.exports = {
    isStartPostback: function(webhookEvent) {
        if (webhookEvent.postback && webhookEvent.postback.payload === "START") {
            return true;
        }
        return false;
    },
    isMessage: function(webhookEvent) {

    }
}