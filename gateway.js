/**
 * API Gateway Implementation
 * This is the entry point for all API requests
 * Handles: Rate limiting, Logging, Request routing
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { requestLogger, logger } = require('./config/logger');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

// Import the main API application
const apiApp = require('./server');

const gateway = express();
const GATEWAY_PORT = process.env.GATEWAY_PORT || 8080;
const API_PORT = process.env.PORT || 3000;

// Gateway Middleware
gateway.use(cors());
gateway.use(express.json());
gateway.use(express.urlencoded({ extended: true }));

// Gateway-level Rate Limiting
// Global rate limit: 100 requests per 15 minutes per IP
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Gateway rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limit for authentication endpoints
// Increased limit for chat service and internal services
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased limit for chat service and internal services
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  // Skip rate limiting for localhost/internal services
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    return ip === '::1' || ip === '127.0.0.1' || ip === 'localhost';
  }
});

// Gateway-level request logging (before routing)
gateway.use((req, res, next) => {
  // Enhanced logging for gateway
  const startTime = Date.now();
  req.gatewayStartTime = startTime;
  req.sourceIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  logger.info('Gateway Request', {
    timestamp: new Date().toISOString(),
    method: req.method,
    fullPath: req.protocol + '://' + req.get('host') + req.originalUrl,
    path: req.originalUrl || req.path,
    sourceIP: req.sourceIP,
    userAgent: req.get('user-agent'),
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? 'Bearer ***' : 'none',
      'accept': req.get('accept')
    },
    requestSize: req.get('content-length') || 0
  });

  // Track response
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    const responseSize = res.get('content-length') || 
                        (res.locals.responseSize ? res.locals.responseSize.toString() : 0);
    
    logger.info('Gateway Response', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      latency: latency,
      responseSize: responseSize,
      sourceIP: req.sourceIP,
      authStatus: req.authStatus || (req.get('authorization') ? 'attempted' : 'none'),
      mappingTemplateFailure: res.locals.mappingTemplateFailure || false
    });
  });

  next();
});

// Apply rate limiting
gateway.use('/api/v1/auth/login', authRateLimiter);
gateway.use('/api', globalRateLimiter);

// Health check endpoint
gateway.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    apiStatus: 'operational'
  });
});

// API Documentation (Swagger) - Gateway URL points here
gateway.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Mobile Provider Bill Payment API - Gateway'
}));

// Route all API requests to the main application
// Mount server.js at root, it will handle /api/v1 routes internally
// In production, this could route to multiple backend services
// Note: server.js has routes starting with /api/v1, so mounting at root is correct
gateway.use(apiApp);

// Gateway root endpoint
gateway.get('/', (req, res) => {
  res.json({
    service: 'Mobile Provider Bill Payment API Gateway',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      api: '/api/v1',
      docs: '/api-docs',
      health: '/health'
    }
  });
});

// 404 handler for gateway
gateway.use((req, res) => {
  logger.warn('Gateway 404', {
    method: req.method,
    path: req.originalUrl,
    ip: req.sourceIP
  });
  
  res.status(404).json({
    success: false,
    message: 'Endpoint not found in API Gateway. Please check the API documentation at /api-docs',
    gateway: true
  });
});

// Gateway error handler
gateway.use((err, req, res, next) => {
  logger.error('Gateway Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.sourceIP
  });

  // Mark as mapping template failure if it's a transformation error
  if (err.message && err.message.includes('mapping')) {
    res.locals.mappingTemplateFailure = true;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Gateway error occurred',
    gateway: true,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Gateway
if (require.main === module) {
  gateway.listen(GATEWAY_PORT, () => {
    logger.info('API Gateway started', {
      port: GATEWAY_PORT,
      apiPort: API_PORT,
      environment: process.env.NODE_ENV || 'development'
    });
    console.log(`\n🚀 API Gateway is running on port ${GATEWAY_PORT}`);
    console.log(`📚 API Documentation: http://localhost:${GATEWAY_PORT}/api-docs`);
    console.log(`❤️  Health Check: http://localhost:${GATEWAY_PORT}/health`);
    console.log(`🔗 API Endpoints: http://localhost:${GATEWAY_PORT}/api/v1`);
    console.log(`\n⚠️  Note: Backend API should be running on port ${API_PORT}`);
  });
}

module.exports = gateway;

