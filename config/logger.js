const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mobile-provider-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  req.requestId = requestId;

  // Log request details
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl || req.path,
    fullPath: req.protocol + '://' + req.get('host') + req.originalUrl,
    query: req.query,
    params: req.params,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    headers: {
      'content-type': req.get('content-type'),
      'authorization': req.get('authorization') ? 'Bearer ***' : 'none',
      'accept': req.get('accept'),
      'user-agent': req.get('user-agent')
    },
    requestSize: req.get('content-length') ? parseInt(req.get('content-length')) : (req.body ? JSON.stringify(req.body).length : 0),
    authenticated: !!req.user,
    authStatus: req.user ? 'succeeded' : (req.get('authorization') ? 'failed' : 'none')
  };

  logger.info('Incoming Request', requestLog);

  // Log response details after response is sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Calculate actual response size if not set
    let responseSize = 0;
    const contentLength = res.get('content-length');
    if (contentLength) {
      responseSize = parseInt(contentLength);
    } else if (res.locals.responseBody) {
      responseSize = JSON.stringify(res.locals.responseBody).length;
    }
    
    const responseLog = {
      requestId,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      latency: duration, // Response latency in ms
      responseSize: responseSize, // Response size in bytes
      authenticated: !!req.user,
      authStatus: req.user ? 'succeeded' : (req.get('authorization') ? 'failed' : 'none'),
      mappingTemplateFailure: res.locals.mappingTemplateFailure || false
    };

    if (res.statusCode >= 400) {
      logger.error('Request Error', { ...requestLog, ...responseLog });
    } else {
      logger.info('Request Completed', { ...requestLog, ...responseLog });
    }
  });

  next();
};

module.exports = { logger, requestLogger };

