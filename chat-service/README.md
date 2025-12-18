# AI Agent Chat Service

Backend service for processing chat messages, parsing intents, and calling midterm APIs.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see `.env.example`)

3. Start the service:
```bash
npm start
```

The service will run on port 3001 (configurable via `CHAT_SERVICE_PORT`).

## API Endpoints

- `POST /api/chat/process` - Process a chat message
- `GET /health` - Health check

## Services

- **messageProcessor**: Main message processing logic
- **llmService**: LLM integration for intent parsing
- **apiClient**: Client for calling midterm APIs
- **firebase**: Firebase Admin SDK integration

## Configuration

See `.env.example` for all configuration options.

Key settings:
- `USE_OPENAI`: Use OpenAI or local model
- `GATEWAY_URL`: URL of the API Gateway
- `CHAT_USERNAME`/`CHAT_PASSWORD`: Credentials for midterm API authentication


