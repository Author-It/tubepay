import * as fs from 'fs';
import moment from 'moment-timezone';

/**
 * @CONFIG
 */
function dateNow(): string {
    return moment().tz('Asia/Calcutta').format('DD-MM-YY ~ H:m:s');
}

function fileName(): string {
    return moment().tz('Asia/Calcutta').format('DD-MM-YY');
}

const fileExtension = `.log`;
const logPath = `./logs/`;
const logTranscript = true;
const logTypes = ['log', 'info', 'success', 'error', 'warn', 'event', 'debug'];

const Colors = {
    log: '\u001b[37;1m',
    info: '\u001b[96m',
    success: '\u001b[32;1m',
    error: '\u001b[31;1m',
    warn: '\u001b[33;1m',
    event: '\u001b[34;1m',
    debug: '\u001b[35;1m',
    timestamp: '\u001b[34;1m',
    logType: '\u001b[34;1m',
    fileName: '\u001b[36;1m',
    reset: '\u001b[0m',
};

/**
 * @END @CONFIG
 */

function log_color(type: string): string {
    let color: string;
    switch (type) {
        case 'log':
            color = Colors.log;
            break;
        case 'info':
            color = Colors.info;
            break;
        case 'success':
            color = Colors.success;
            break;
        case 'error':
            color = Colors.error;
            break;
        case 'warn':
            color = Colors.warn;
            break;
        case 'event':
            color = Colors.event;
            break;
        default:
            color = Colors.debug;
            break;
    }
    return color;
}

function transcript(msg: string, type: string): void {
    if (!logTranscript) return;
    const content = `[${dateNow()}] - [${type}] ~ ${msg}`;

    try {
        fs.writeFileSync(logPath + fileName() + fileExtension, `${content}\n`, { flag: 'a+' });
    } catch (err) {
        console.error('Error creating new file:', err);
    }
}

/**
 * @function Functions Just Making Some Functions UwU
 */
export const log = async (msg: string, type = 'log'): Promise<void> => {
    if (msg === '' || typeof msg !== 'string') {
        throw new Error('[Logger] Invalid Logging Content.');
    }

    if (!logTypes.includes(type.toLowerCase())) {
        throw new Error('[Logger] Invalid Logging Type.');
    }

    function _filename(): string {
        try {
            const err = new Error();
            const callerStack = err.stack || '';

            if (callerStack) {
                const callerLine = callerStack.split('\n')[3]; // 3rd element contains the caller info
                const match = /\s\((.*):\d+:\d+\)/.exec(callerLine);

                if (match && match[1]) {
                    const fullPath = match[1];
                    const parts = fullPath.split(/[\\/]/);
                    const fileName = parts.pop();
                    if (fileName) {
                        return `[${fileName}]`;
                    }
                }
            }
        } catch (err) {
            // Handle any errors or exceptions that may occur during the process
            console.error('Error in _filename:', err);
        }

        return ''; // Return an empty string if an error occurs
    }

    console.log(
        `${Colors.timestamp}[${dateNow()}]${Colors.reset} - ${Colors.logType}[${type}]${Colors.reset} ~ ${Colors.fileName}${_filename()}${Colors.reset} ${log_color(
            type
        )}${msg}${Colors.reset}`
    );

    transcript(msg, type);
    return Promise.resolve();
};

export const info = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'info');
};

export const success = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'success');
};

export const error = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'error');
};

export const warn = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'warn');
};

export const event = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'event');
};

export const debug = async (...args: any[]): Promise<void> => {
    return log(args.join(' '), 'debug');
};
