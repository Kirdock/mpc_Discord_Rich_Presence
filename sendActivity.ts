import { Logger } from './models/logger';
import { JSDOM } from 'jsdom';
import { config } from './config';
import { Client, Presence } from 'discord-rpc';
import { readdirSync } from 'fs';
import { StateKeys, StateOptions } from './interfaces/playback';
import { Playback } from './models/playback';

const log = new Logger(config.logLevel);
const isWatching = true;
const special_regex = /^\d+(\.\d+)?\) \(([^)]+)\)/;
const special_regex_title = /^\d+(\.\d+)? \(([^)]+)\)/;
const special_index = 2;
const numberTitleSeparator = ' - ';
const ignoreNames = ['anime', '2) ger sub (309-xxx)', 'Gesehen', 'Neu', 'Other'];
const skippedFolders = ['Staffel', 'Ger Dub'];
const category = ['ova', 'oad', 'web', 'special', 'tv special', 'specials', 'filme', 'extras', 'movie', 'bonus'];
const playback = new Playback(log, config.useStartTimeStamp);
const states: Record<StateOptions, {string: string, stateKey: StateKeys}> = {
    [StateOptions.IDLE]: {
        string: 'Idling',
        stateKey: 'stop'
    },
    [StateOptions.STOPPED]: {
        string: 'Stopped',
        stateKey: 'stop'
    },
    [StateOptions.PAUSED]: {
        string: 'Paused',
        stateKey: 'pause'
    },
    [StateOptions.PLAYING]: {
        string: 'Playing',
        stateKey: 'play'
    }
};

export const updatePresence = async (rpc: Client, htmlText: string): Promise<void> => {
    if(!htmlText){
        rpc.clearActivity();
        return;
    }
    const { document } = new JSDOM(htmlText).window;
    const dir = document.getElementById('filedir')?.textContent;
    
    if(!dir || dir.includes('Weiteres')){
        return;
    }
    const state = document.getElementById('state')?.textContent as StateOptions | undefined | null;
    const position = document.getElementById('position')?.textContent;
    const episodeName = document.getElementById('file')?.textContent;
    const duration = document.getElementById('duration')?.textContent;
    const differenceLastCheckMs = Math.abs(playback.position - playback.prevPosition - 5000); //5000: interval is every 5 seconds

    if(!state || !position || !episodeName || !duration) {
        log.error('Invalid parameters received', {
            state,
            position,
            episodeName,
            duration
        });
        await rpc.clearActivity();
    } else if ((state !== playback.prevState) || (state === '2' && differenceLastCheckMs > 1000)) {
        const files = getFileNames(dir);
        const lastFile = files[files.length-1];
        const episode = getEpisodeInformation(episodeName.substring(0,episodeName.lastIndexOf('.')));
        const lastNumber = getFirstNumbers(lastFile) || files.length;

        playback.state = state;
        playback.position = +position;
        playback.duration = parseInt(duration);
        playback.filedir = trimStr(getTitle(dir, files.length > 1), 128);
        playback.episode = getFirstNumbers(episodeName) || files.findIndex(file => file === episodeName) + 1 || 1;
        playback.episodeCount = lastNumber < playback.episode ? playback.episode : lastNumber;
        
        const payload: Presence = {
            state: isWatching ? `Episode ${playback.episode} of ${playback.episodeCount}` : 'Episode',
            startTimestamp: 0,
            details: playback.filedir + (episode.category ? ' | '+episode.category.toString() : ''),
            largeImageKey: 'default',
            largeImageText: episode.name.includes('1080p') ? undefined : episode.name,
            smallImageKey: states[playback.state].stateKey,
            smallImageText: states[playback.state].string,
            partySize: playback.episode,
            partyMax: playback.episodeCount,
            type: 3,
            // buttons: [
            //     {
            //         label: 'Anisearch Profile',
            //         url: 'https://www.anisearch.de/member/22752,kirdock/anime?char=all&vtype=1,2,3,4,5&sort=updated&order=desc&view=2&title=&titlex='
            //     }
            // ]
        };

        playback.setStartTimestamp(payload);

        try {
            console.log('send', payload)
            await rpc.setActivity(payload);
        }
        catch(error) {
            log.error('', error);
        }
        log.info('Presence update sent: ',`${states[playback.state].string} - ${playback.position} / ${playback.duration} - ${playback.filedir}`);
    }
    
    playback.prevState = playback.state;
    playback.prevPosition = playback.position;
}

function getFileNames(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true })
        .filter(item => item.isFile() && !(/(^|\/)\.[^\/\.]/g).test(item.name))
        .map(item => item.name)
        .sort((a,b) => a.localeCompare(b));
}

function getTitle(title: string, moreThanOneFile: boolean): string {
    const splitArray = title.split('\\');

    let subtitle = '';
    for(let i = splitArray.length - 1; i >= 0; i--){
        if (ignoreNames.includes(splitArray[i].toLowerCase()) || skippedFolders.some(item => splitArray[i].includes(item))) {
            continue;
        }
        title = splitArray[i];
        const text = splitArray[i];

        //#region get category; example: 1.1) (OVA) - myTitle
        const matches = special_regex.exec(title);
        if(matches && !ignoreNames.includes(matches[special_index])){
            let temp = ' | '+ matches[special_index];
            if(moreThanOneFile){
                temp = temp.toString() + (' | ' + getEpisodeInformation(text).name);
            }
            subtitle = temp + subtitle;
            
            continue;
        }
        //#endregion

        if(i > 0 && category.includes(splitArray[i-1].toLowerCase()) || category.includes(splitArray[i].toLowerCase())){
            subtitle = (text ? ' | '+text : '') + subtitle;
        }
        else{
            return removeOrder(title) +  subtitle;
        }
    }

    return title;
}

function removeOrder(text: string): string {
    const number = getFirstNumbers(text);
    if(isNaN(number)) {
        return text;
    }
    let index;
    const case1 = ') - ';
    const case2= ') ';
    if ((index = text.indexOf(case1)) !== -1) {
        return text.substring(index + case1.length);
    }

    if ((index = text.indexOf(case2)) !== -1) {
        return text.substring(index + case2.length)
    }

    return text;
}

function getEpisodeInformation(text: string): {name: string, category?: string} {
    const subtext_index = text.indexOf(numberTitleSeparator);

    if(subtext_index === -1) {
        return {name: text};
    }

    const textBefore = text.substring(0, subtext_index);
    const matches = special_regex_title.exec(textBefore);
    return {
        name: text.substring(subtext_index + numberTitleSeparator.length),
        ...(matches && {category: matches[special_index]})
    };
}

function getFirstNumbers(text: string): number {
    return Number(text.replace(/(^\d+)(.+$)/i,'$1'));
}

function trimStr (text: string, length: number): string {
    return text.length > length ? text.substring(0, length - 3) + '...' : text;
};