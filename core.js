const log = require('fancy-log');
      jsdom = require('jsdom'),
      { JSDOM } = jsdom;
const fs = require('fs');

var playback = {
    filedir: '',
    position: '',
    duration: '',
    fileSize: '',
    state: '',
    prevState: '',
    prevPosition: '',
};

String.prototype.trimStr = function (length) {
    return this.length > length ? this.substring(0, length - 3) + "..." : this;
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

const updatePresence = (res, rpc) => {
    if(!res){
        rpc.setActivity({})
            .catch((err) => {
                log.error('ERROR: ', err);
            });
            return;
    }
    const { document } = new JSDOM(res.body).window;
    const dir = document.getElementById('filedir').textContent;
    
    if(dir.indexOf('Weiteres') >= 0){
        return false;
    }
    const files = fs.readdirSync(dir).filter(item => !(/(^|\/)\.[^\/\.]/g).test(item)).sort();
    const lastFile = files[files.length-1];
    let eipsode_name = document.getElementById('file').textContent;
    const index = eipsode_name.indexOf(' - ');
    
    playback.episodecount = getFirstNumbers(lastFile) || 1;
    playback.episode      = getFirstNumbers(eipsode_name) || 1;
    playback.state        = document.getElementById('state').textContent;
    playback.position     = parseInt(document.getElementById('position').textContent);
    playback.filedir      = getTitle(dir).trimStr(128);
    eipsode_name          = eipsode_name.substring((index == -1 ? 0 : index+3), eipsode_name.lastIndexOf('.'));
    
    let payload = {
        state: 'Episode',
        startTimestamp: 0,
        details: playback.filedir,
        largeImageKey: "default",
        largeImageText: eipsode_name,
        smallImageKey: states[playback.state].stateKey,
        smallImageText: states[playback.state].string,
        partySize: playback.episode,
        partyMax: playback.episodecount
    }

    

    switch (playback.state) {
        case '-1': //Idling
        case '0': // Stopped
        case '1': // Paused
            payload.startTimestamp = parseInt(Date.now()/1000);
            break;
        case '2': // Playing
            payload.startTimestamp = parseInt((Date.now() - playback.position)/1000);
            break;
        
        default:
            resetInformation(payload);
            payload.startTimestamp = parseInt(Date.now()/1000);
            break;
    }

    const time = Math.abs(playback.position - playback.prevPosition - 5000); //5000: interval is every 5 seconds
    if ( (playback.state != playback.prevState) 
        || (playback.state == '2' && time > 1000) //1 second tolerance
        ){
            rpc.setActivity(payload)
            .catch((err) => {
                log.error('ERROR: ', err);
            });
            log.info('INFO: Presence update sent: ' +
                `${states[playback.state].string} - ${playback.position} / ${playback.duration} - ${playback.filedir}`
            );
        
    }
    
    playback.prevState = playback.state;
    playback.prevPosition = playback.position;
        
    return true;

    function resetInformation(payload){
        payload.paused = payload.details = payload.startTimestamp = payload.state = payload.partyMax = payload.partySize = undefined;
    }
}

function getTitle(title){
    const splitArray = title.split('\\');
    const ignoreNames = ['anime','ova', 'web', 'special', 'spezial', 'tv special', 'filme', '2) ger sub (309-xxx)'];

    for(let i = splitArray.length-1; i >= 0; i--){
        if(ignoreNames.indexOf(splitArray[i].toLowerCase()) < 0 && splitArray[i].indexOf('Staffel') < 0 && splitArray[i].indexOf('Ger Dub') < 0){
            title = splitArray[i];
            let text = (i < splitArray.length-1 && splitArray[i+1].toLowerCase() != ignoreNames[0] ? splitArray[i+1] : '');
            if(!text){
                let matches = (/\(([^)]+)\)/).exec(title);
                if(matches){
                    text = matches[1];
                    if(!isNaN(parseInt(text.replace(/-| - |/,'')))){
                        text = undefined;
                    }
                }
                
            }
            text = text ? ' | '+text : '';
            return removeOrder(title) +  text;
        }
    }

    return title;

    function removeOrder(text){
        const number = getFirstNumbers(text);
        if(!isNaN(number)){
            let index;
            const case1 = ') - ', case2= ') ';
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

module.exports = updatePresence;