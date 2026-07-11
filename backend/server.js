require('dotenv').config();
// Validate critical environment variables on startup
require('./src/config/envValidator')();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`PavtiBook Server started successfully on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================\n`);
});

