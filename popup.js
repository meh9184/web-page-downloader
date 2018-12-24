'use strict';

window.onload = function() {

    $("#start").on("click", sendToBackground);

    function sendToBackground () {
        chrome.runtime.sendMessage({greeting: "hello"}, function(response) {

        });
    }
};
