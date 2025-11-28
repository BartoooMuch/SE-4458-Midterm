const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { requestLogger } = require('./config/logger');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Mobile Provider Bill Payment API'
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes (when accessed through gateway, /api prefix is already handled)
// So we need to handle both /api/v1 and /v1 paths
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/admin', adminRoutes);

// Also support direct access without /api prefix (for gateway routing)
app.use('/v1/auth', authRoutes);
app.use('/v1/bills', billRoutes);
app.use('/v1/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Mobile Provider Bill Payment API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found. Please check the API documentation at /api-docs'
  });
});

// Error handler
app.use((err, req, res, next) => {
  const { logger } = require('./config/logger');
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server only if this file is run directly
// If imported by gateway.js, don't start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;

