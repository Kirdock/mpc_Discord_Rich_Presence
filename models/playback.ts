import { Payload } from '../interfaces/payload.js';
import { IPlayback, StateOptions } from '../interfaces/playback.js';
import { Logger } from './logger.js';

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
    private timeMethod: (payload: Payload) => void;

    constructor(private readonly log: Logger, useStartTimeStamp: boolean) {
        this.timeMethod = useStartTimeStamp ? this.setStartTimeStamp : this.setEndTimeStamp
    }

    public setStartTimestamp(payload: Payload): void {
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

    private setEndTimeStamp(payload: Payload){
        payload.startTimestamp = undefined;
        payload.endTimestamp = Math.floor((Date.now() + this.duration - this.position)/1000);
    }
    
    private setStartTimeStamp(payload: Payload){
        payload.startTimestamp = Math.floor((Date.now() - this.position)/1000);
    }
}