const DiscordRP = require('discord-rich-presence'),
      client = new DiscordRP('436465482111909889'),
      log = require('fancy-log');
      jsdom = require('jsdom'),
      { JSDOM } = jsdom;
const fs = require('fs');

var playback = {
    filename: '',
    position: '',
    duration: '',
    fileSize: '',
    state: '',
    prevState: '',
    prevPosition: '',
};
var updateTimer = 0;

const states = {
    '-1': {
        string: 'Idling',
        stateKey: 'stop'
    },
    '0': {
        string: 'Stopped',
        stateKey: 'stop'
    },
    '1': {
        string: 'Paused',
        stateKey: 'pause'
    },
    '2': {
        string: 'Playing',
        stateKey: 'play'
    }
};

function sendPayload (res) {
    if(!res){
        client.updatePresence({});
    }
    var { document } = new JSDOM(res.body).window;
    var dir = document.getElementById('filedir').textContent;
    var files = fs.readdirSync(dir).sort();
    playback.episodecount = getFirstNumbers(files[files.length-1]) || 1;

    playback.episode      = getFirstNumbers(document.getElementById('file').textContent) || 1;
    playback.state        = document.getElementById('state').textContent;
    playback.position     = parseInt(document.getElementById('position').textContent);
    playback.filename     = getTitle(dir);
    var payload = {
        state: 'Episode',
        startTimestamp: 0,
        details: playback.filename,
        largeImageKey: "default",
        smallImageKey: states[playback.state].stateKey,
        smallImageText: states[playback.state].string,
        partySize: playback.episode,
        partyMax: playback.episodecount
    }

    switch (playback.state) {
        case '-1': // Idling
            payload.details = undefined;
            payload.startTimestamp = undefined;
            payload.state = undefined;
            payload.partyMax = undefined;
            payload.partySize = undefined;
            break;
        case '0': // Stopped
            payload.startTimestamp = undefined;
            payload.state = undefined;
            payload.partyMax = undefined;
            payload.partySize = undefined;
            break;
        case '1': // Paused
            payload.startTimestamp = undefined;
            break;
        case '2': // Playing
            payload.startTimestamp = (Date.now() - playback.position)/1000;
            break;
    }

    var time = Math.abs(playback.position - (playback.prevPosition+1000));

    if ( (playback.state != playback.prevState) || (playback.state == '2' && time > 1000) //1 second tolerance
        || updateTimer >= 60){ //send every miniute a sign of life
        updateTimer = 0;
        client.updatePresence(payload);
        log.info('Presence updated!');
    }
    else{
        updateTimer ++;
    }
    
    playback.prevState = playback.state;
    playback.prevPosition = playback.position;
        
    return true;
}

function getTitle(title){
    var splitArray = title.split('\\');
    var ignoreNames = ['anime','ova', 'web', 'special', 'spezial', 'tv special', 'filme', '2) ger sub (309-xxx)'];

    for(var i = splitArray.length-1; i >= 0; i--){
        if(ignoreNames.indexOf(splitArray[i].toLowerCase()) < 0){
            title = splitArray[i];
            var text = (i < splitArray.length-1 && splitArray[i+1].toLowerCase() != ignoreNames[0] ? splitArray[i+1] : '');
            if(!text){
                var regExp = /\(([^)]+)\)/;
                var matches = regExp.exec(title);
                if(matches){
                    text = matches[1];
                }
                
            }
            text = text ? ' | '+text : '';
            return removeOrder(title) +  text;
        }
    }

    return title;

    function removeOrder(text){
        var number = getFirstNumbers(text);
        if(!isNaN(number)){
            var index, case1 = ') - ', case2= ') ';
            if((index = text.indexOf(case1) )>= 0){
                text = text.substr(index+case1.length);
            }
            else if((index = text.indexOf(case2))>=0){
                text = text.substr(index+case2.length);
            }

        }
        return text;
    }
}

function getFirstNumbers(text){
    return Number(text.replace(/(^\d+)(.+$)/i,'$1'));
}

module.exports = sendPayload;