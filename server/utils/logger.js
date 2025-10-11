const DEBUG = process.env.DEBUG === 'true';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function timestamp() {
  return new Date().toISOString();
}

function info(message, ...args) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
}

function debug(message, ...args) {
  if (DEBUG) {
    console.log(`${colors.yellow}[DEBUG]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  }
}

function warn(message, ...args) {
  console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
}

module.exports = { info, error, debug, warn };
