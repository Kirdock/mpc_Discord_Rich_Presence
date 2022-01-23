export class Logger {
    public info(title: string, message?: unknown): void {
        if(message) {
            console.info(title, message && {message});
        } else {
            console.info(title);
        }
    }

    public error(title: string, message: unknown): void {
        if(message) {
            console.error(title, message && {message});
        } else {
            console.error(title);
        }
    }

    public warn(title: string, message?: unknown): void {
        if(message) {
            console.warn(title, message && {message});
        } else {
            console.warn(title);
        }
    }
}