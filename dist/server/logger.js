export function createLogger() {
    const logger = {
        hasWarned: false,
        hasErrorLogged(error) {
            return false;
        },
        info(msg, options) {
            console.log(msg);
        },
        warn(msg, options) {
            console.warn(msg);
            this.hasWarned = true;
        },
        warnOnce(msg, options) {
            if (!this.hasWarned) {
                console.warn(msg);
                this.hasWarned = true;
            }
        },
        error(msg, options) {
            console.error(msg);
        },
        clearScreen(type) {
            // Do nothing
        }
    };
    return logger;
}
