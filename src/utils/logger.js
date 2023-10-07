const fs = require('fs')
const moment_time = require("moment-timezone")
/**
 * @CONFIG
*/
function dateNow() {
    return moment_time().tz("Asia/Calcutta").format("DD-MM-YY ~ H:m:s")
}
function fileName() {
    return moment_time().tz("Asia/Calcutta").format('DD-MM-YY')
} // file name, used to create an fileName with this formatt | Default: <day>-<month>-<year> ~ <time>

const fileExtension = `.log` // file extension for fileName | Default: .log
const logPath = `./logs/` // transcripting path, make a directory call "logs" in the root of the current project
const logTranscript = true  // if should transcript
const logTypes = ['log', 'info', 'success', 'error', 'warn', 'event', 'debug'] // DO NOT EDIT IF DON'T KNOW WHAT IS THIS. | DEFAULT: ['log', 'info', 'success', 'error', 'warn', 'event', 'debug']

const Colors = {
    // colors of loging text
    log: '\u001b[37;1m',        // white
    info: '\u001b[96m',         // cyan
    success: '\u001b[32;1m',    // green
    error: '\u001b[31;1m',      // red
    warn: '\u001b[33;1m',       // yellow
    event: '\u001b[34;1m',      // blue
    debug: '\u001b[35;1m',      // purple

    // colors of logging timestamp, type, fileName(), reset
    timestamp: '\u001b[34;1m',  // blue
    logType: '\u001b[34;1m',    // blue
    fileName: '\u001b[36;1m',   // cyan
    
    reset: '\u001b[0m',

}
/**
 * @END @CONFIG
*/

// Exporting All 
exports.log = async (msg, type = 'log') => {
    /**
     * @function Functions Just Making Some Functions UwU
    */
    if (msg === "" || typeof msg !== "string") throw new Error("[Logger] Invalid Logging Content.") // check if msg is a string and not em-pty
    if (!logTypes.includes(type.toLowerCase())) throw new Error("[Logger] Invalid Logging Type.") // check if logger is valid

    function _filename() {
        var filename;
        var _pst = Error.prepareStackTrace;
        Error.prepareStackTrace = function (err, stack) { return stack; };
        try {
            var err = new Error();
            var callerfile;
            var currentfile;

            currentfile = err.stack.shift().getFileName();

            while (err.stack.length) {
                callerfile = err.stack.shift().getFileName();

                if (currentfile !== callerfile) {
                    filename = callerfile;
                    break;
                }
            }
        } catch (err) { }
        Error.prepareStackTrace = _pst;

        filename = `[` + filename
            .split(/[\\/]/).pop()
            + `]` // add [] to filename and remove the tree
        return filename; // return filename with []
    }

    function _fullFilename() {
        var filename;
        var _pst = Error.prepareStackTrace;
        Error.prepareStackTrace = function (err, stack) { return stack; };
        try {
            var err = new Error();
            var callerfile;
            var currentfile;

            currentfile = err.stack.shift().getFileName();

            while (err.stack.length) {
                callerfile = err.stack.shift().getFileName();

                if (currentfile !== callerfile) {
                    filename = callerfile;
                    break;
                }
            }
        } catch (err) { }
        Error.prepareStackTrace = _pst;

        filename = `[` + filename.slice(25) // this returns the whole file path so replace 25 according to what u need
            + `]` // add [] to filename and remove the tree
        return filename; // return filename with []
    }

    function transcript() { // make transcript
        if (logTranscript !== true) return;
        content = `[${dateNow()}] - [${type}] ~ ${_fullFilename()} ${msg}`
        fs.writeFileSync(logPath + fileName() + fileExtension, `${content}\n`, { flag: "a+" }, function(err) {"New file created."})
    } // transcript function that transcript it to a file if set to true


    function log_color() {
        let color;
        type === "log" ? color = Colors.log : type === "info" ? color = Colors.info : type === "success" ? color = Colors.success : type === "error" ? color = Colors.error : type === "warn" ? color = Colors.warn : type === "event" ? color = Colors.event : color = Colors.debug
        return color;
    }

    console.log(`${Colors.timestamp}[${dateNow()}]${Colors.reset} - ${Colors.logType}[${type}]${Colors.reset} ~ ${Colors.fileName}${_filename()}${Colors.reset} ${log_color()}${msg}${Colors.reset}`)
    transcript()
}

exports.info = (...args) => this.log(...args, 'info');
exports.success = (...args) => this.log(...args, 'success');
exports.error = (...args) => this.log(...args, 'error');
exports.warn = (...args) => this.log(...args, 'warn');
exports.event = (...args) => this.log(...args, 'event');
exports.debug = (...args) => this.log(...args, 'debug');