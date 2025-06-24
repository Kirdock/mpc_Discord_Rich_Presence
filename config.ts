import { LogLevel } from './models/logger';

const level = process.env.LOG_LEVEL ? +process.env.LOG_LEVEL : LogLevel.DEBUG;
const parsedLevel = isNaN(level) ? LogLevel.DEBUG : Math.min(level, LogLevel.ERROR);

console.log('Log level', parsedLevel);

export const config = {
    port: 13579,
    useStartTimeStamp: true,
    logLevel: parsedLevel,
}