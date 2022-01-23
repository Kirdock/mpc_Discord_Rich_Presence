export type StateKeys = 'stop' | 'pause' | 'play';

export enum StateOptions {
    IDLE = '-1',
    STOPPED = '0',
    PAUSED = '1',
    PLAYING = '2'
}

export interface IPlayback {
    filedir: string;
    position: number;
    duration: number;
    fileSize: number;
    state: StateOptions;
    prevState: StateOptions;
    prevPosition: number;
    episode: number;
    episodeCount: number;
}