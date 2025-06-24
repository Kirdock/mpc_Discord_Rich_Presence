import { Presence } from 'discord-rpc';
import { IPlayback, StateOptions } from '../interfaces/playback';
import { Logger } from './logger';

export class Playback implements IPlayback {
    filedir: string = '';
    position: number = 0;
    duration: number = 0;
    fileSize: number = 0;
    state: StateOptions = StateOptions.IDLE;
    prevState: StateOptions = StateOptions.IDLE;
    prevPosition: number = 0;
    episode: number = 0;
    episodeCount: number = 0;
    private timeMethod: (payload: Presence) => void;

    constructor(private readonly log: Logger, useStartTimeStamp: boolean) {
        this.timeMethod = useStartTimeStamp ? this.setStartTimeStamp : this.setEndTimeStamp
    }

    public setStartTimestamp(payload: Presence): void {
        switch (this.state) {
            case StateOptions.IDLE:
            case StateOptions.STOPPED:
            case StateOptions.PAUSED:
                payload.startTimestamp = Math.floor(Date.now()/1000);
                break;
            case StateOptions.PLAYING:
                this.timeMethod(payload);
                break;
            default:
                this.log.error('Invalid state', this.state);
                return;
        }
    }

    private setEndTimeStamp(payload: Presence){
        payload.startTimestamp = undefined;
        payload.endTimestamp = Math.floor((Date.now() + this.duration - this.position)/1000);
    }
    
    private setStartTimeStamp(payload: Presence){
        payload.startTimestamp = Math.floor((Date.now() - this.position)/1000);
    }
}