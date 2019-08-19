const log = require('fancy-log');
      jsdom = require('jsdom'),
      { JSDOM } = jsdom;
const fs = require('fs');
const special_regex = /^\d+(\.\d+)?\) \(([^)]+)\)/;
const special_index = 2;
const search = ' - ';

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
    
    playback.episodecount = getFirstNumbers(lastFile) || 1;
    playback.episode      = getFirstNumbers(eipsode_name) || 1;
    playback.state        = document.getElementById('state').textContent;
    playback.position     = parseInt(document.getElementById('position').textContent);
    playback.filedir      = getTitle(dir, files.length > 1).trimStr(128);
    
    let payload = {
        state: 'Episode',
        startTimestamp: 0,
        details: playback.filedir,
        largeImageKey: "default",
        largeImageText: get_episode_name(eipsode_name.substring(0,eipsode_name.indexOf('.'))),
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

function getTitle(title, moreThanOneFile){
    const splitArray = title.split('\\');
    const ignoreNames = ['anime', '2) ger sub (309-xxx)', 'Gesehen', 'Neu', 'Other'];
    const category = ['ova', 'web', 'special', 'tv special', 'specials', 'filme', 'extras', 'movie', 'bonus'];

    let subtitle = '';
    for(let i = splitArray.length-1; i >= 0; i--){
        if(ignoreNames.indexOf(splitArray[i].toLowerCase()) < 0 && splitArray[i].indexOf('Staffel') < 0 && splitArray[i].indexOf('Ger Dub') < 0){
            title = splitArray[i];

            let text = splitArray[i];

            //#region get category; example: 1.1) (OVA) - myTitle
            let matches = special_regex.exec(title);
            if(matches && ignoreNames.indexOf(matches[special_index]) == -1){
                let temp = ' | '+ matches[special_index];
                if(moreThanOneFile){
                    temp = temp.toString() + (' | ' + get_episode_name(text));
                }
                subtitle = temp + subtitle;
                
                continue;
            }
            //#endregion

            if(i > 0 && category.indexOf(splitArray[i-1].toLowerCase()) > -1 || category.indexOf(splitArray[i].toLowerCase()) > -1){
                subtitle = (text ? ' | '+text : '') + subtitle;
            }
            else{
                return removeOrder(title) +  subtitle;
            }
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

function get_episode_name(text){
    let subtext_index = text.indexOf(search);
    return subtext_index > -1 && isNaN(text.substring(0,subtext_index)) ? text : text.substring(subtext_index + search.length);
}

function getFirstNumbers(text){
    return Number(text.replace(/(^\d+)(.+$)/i,'$1'));
}

module.exports = updatePresence;