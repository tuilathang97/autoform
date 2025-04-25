/**
 * Logger utility for consistent logging across the application
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

/**
 * Log a message with the specified level and optional data
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Optional data to include in the log
 */
export function log(level, message, data = {}) {
  if (LOG_LEVEL === 'silent') return;

  const timestamp = new Date().toISOString();
  const logEntry = {timestamp, level, message, ...data};

  if (level === 'debug') {
    console.debug(JSON.stringify(logEntry));
  } else if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export default {
  debug: (message, data) => log('debug', message, data),
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data)
};
