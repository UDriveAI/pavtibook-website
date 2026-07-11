const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRouter = require('./routes');
const { generalLimiter } = require('./middlewares/rateLimiter');
const db = require('./config/db');
const logger = require('./utils/logger');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Global rate limiting — 200 req/min per IP
app.use(generalLimiter);

// Register modular APIs under /api
app.use('/api', apiRouter);

// Health check endpoint (database-aware)
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'PavtiBook API',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'PavtiBook API',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  res.status(err.status || 500).json({
    message: err.message || 'An internal server error occurred.',
    error: process.env.NODE_ENV !== 'production' ? err.message : {},
  });
});

module.exports = app;
