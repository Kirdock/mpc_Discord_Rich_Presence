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
    playback.duration     = sanitizeTime(document.getElementById('durationstring').textContent);
    playback.position     = sanitizeTime(document.getElementById('positionstring').textContent);
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
            // payload.state = states[playback.state].string
            payload.details = undefined;
            payload.startTimestamp = undefined;
            break;
        case '0': // Stopped
            payload.startTimestamp = undefined;
            break;
        case '1': // Paused
            payload.startTimestamp = undefined;
            break;
        case '2': // Playing
            payload.startTimestamp = (Date.now() / 1000) - convert(playback.position);
            break;
    }

    var time = convert(playback.position) - (convert(playback.prevPosition)+1);
    time = time < 0 ? time * (-1) : time;

    if ( (playback.state != playback.prevState) || (playback.state == '2' && time > 2)){ //2 seconds
        client.updatePresence(payload);
        log.info('Presence updated!');
    }
    
    playback.prevState = playback.state;
    playback.prevPosition = playback.position;
    // log.warn(
    //     'CONNECTED - ' +
    //     states[playback.state].string + ' - ' +
    //     playback.position + ' / ' + playback.duration + ' - ' +
    //     playback.filename);
        
    return true;

    function convert (time) {
        let parts = time.split(':');
            seconds = parseInt(parts[parts.length-1]),
            minutes = parseInt(parts[parts.length-2]),
            hours = (parts.length > 2) ? parseInt(parts[0]) : 0
        return ((hours * 60 * 60) + (minutes * 60) + seconds);
    }
    
    function sanitizeTime (time) {
        if (time.split(':')[0] == '00') {
            return time.substr(3, time.length-1);
        }
        return time;
    }
}

function getTitle(title){
    var splitArray = title.split('\\');
    var ignoreNames = ['anime','ova', 'web', 'special', 'spezial', 'tv special', 'filme', '2) ger sub (309-xxx)'];

    for(var i = splitArray.length-1; i >= 0; i--){
        if(ignoreNames.indexOf(splitArray[i].toLowerCase()) < 0){
            title = splitArray[i];
            return removeOrder(title) + (i < splitArray.length-1 && splitArray[i+1].toLowerCase() != ignoreNames[0] ? ' | '+splitArray[i+1] : '') ;
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