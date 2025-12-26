const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { processMessage } = require('./services/messageProcessor');
const { initializeFirebase } = require('./services/firebase');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.CHAT_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase Admin
initializeFirebase();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AI Agent Chat Service',
    timestamp: new Date().toISOString()
  });
});

// Process chat message endpoint
app.post('/api/chat/process', async (req, res) => {
  try {
    const { message, timestamp } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    logger.info('Processing message', { message, timestamp });
    console.log('📨 Received message:', message);

    // Process message asynchronously
    // Don't wait for the response to be written to Firestore
    // Add timeout to ensure message is processed
    const timeout = setTimeout(() => {
      console.warn('⚠️ Message processing timeout after 30 seconds');
    }, 30000);

    processMessage(message, timestamp)
      .then(() => {
        clearTimeout(timeout);
        console.log('✅ Message processed successfully');
      })
      .catch(error => {
        clearTimeout(timeout);
        console.error('❌ Error in processMessage:', error.message);
        logger.error('Error processing message', { error: error.message, stack: error.stack });
      });

    // Return immediately
    res.json({
      success: true,
      message: 'Message is being processed'
    });

  } catch (error) {
    logger.error('Error in process endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing message'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('Chat Service started', { port: PORT });
    console.log(`\n🤖 AI Agent Chat Service is running on port ${PORT}`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;


