/**
 * logger.js
 * Production-grade structured logger for PavtiBook.
 * Outputs JSON format in production (for container log parsers) and
 * human-readable, colorized output in development/local mode.
 */
const isProduction = process.env.NODE_ENV === 'production';

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    console.log(
      JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      })
    );
  } else {
    const colors = {
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m'
    };

    const color = colors[level] || colors.RESET;
    const metaStr = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] ${color}${level}${colors.RESET}: ${message}${metaStr}`);
  }
}

module.exports = {
  info: (message, meta) => log('INFO', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  error: (message, meta) => log('ERROR', message, meta),
};
