/**
 * envValidator.js
 * Startup validation of required environment variables.
 * Prevents execution with unsafe defaults or missing parameters.
 */
function validateEnv() {
  const requiredVars = [
    'NODE_ENV',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_DATABASE',
    'JWT_SECRET'
  ];

  const missing = [];

  for (const name of requiredVars) {
    if (!process.env[name] || process.env[name].trim() === '') {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    console.error('\n==================================================');
    console.error('CRITICAL ERROR: Missing Required Environment Configuration');
    console.error('The application cannot start because of missing variables:');
    missing.forEach((name) => console.error(`  - ${name}`));
    console.error('\nPlease check your .env file or host environment settings.');
    console.error('==================================================\n');
    process.exit(1);
  }
}

module.exports = validateEnv;
