const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mobile Provider Bill Payment API',
      version: '1.0.0',
      description: 'REST API for Mobile Provider Bill Payment System - Group 1',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'API Gateway Server (Recommended)',
        variables: {}
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/v1/auth/login'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication endpoints'
      },
      {
        name: 'Bills',
        description: 'Bill query and payment endpoints'
      },
      {
        name: 'Admin',
        description: 'Admin endpoints for bill management'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'] // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec
};

