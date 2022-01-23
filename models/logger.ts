export enum LogLevel {
    ERROR = 3,
    WARN = 2,
    INFO = 1,
    DEBUG = 0
}

export class Logger {

    constructor(private readonly logLevel: LogLevel) {}

    public info(title: string, message?: unknown): void {
        if(LogLevel.INFO >= this.logLevel) {
            if(message) {
                console.info('INFO:', title, message && {message});
            } else {
                console.info('INFO:', title);
            }
        }
    }

    public error(title: string, message?: unknown): void {
        if(LogLevel.ERROR >= this.logLevel) {
            if(message) {
                console.error('ERROR:', title, message && {message});
            } else {
                console.error('ERROR:', title);
            }
        }
    }

    public warn(title: string, message?: unknown): void {
        if(LogLevel.WARN >= this.logLevel) {
            if(message) {
                console.warn('WARN:', title, message && {message});
            } else {
                console.warn('WARN:', title);
            }
        }
    }

    public debug(title: string, message?: unknown): void {
        if(LogLevel.DEBUG >= this.logLevel) {
            if(message) {
                console.debug('DEBUG:', title, message && {message});
            } else {
                console.debug('DEBUG:', title);
            }
        }
    }
}