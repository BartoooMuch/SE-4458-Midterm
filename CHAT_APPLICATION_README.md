# AI Agent Chat Application - Setup Guide

This document provides detailed setup instructions for the AI Agent Chat Application.

## Quick Start

1. **Prerequisites:**
   - Node.js v18 or higher
   - Firebase account
   - Running API Gateway and API Server (from main project)

2. **Firebase Setup:**
   - Create a Firebase project
   - Enable Firestore Database
   - Get Firebase configuration

3. **Install Dependencies:**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Chat Service
   cd ../chat-service && npm install
   ```

4. **Configure Environment Variables:**
   - Copy `.env.example` files and fill in your values
   - See detailed configuration below

5. **Start Services:**
   ```bash
   # Terminal 1: API Server
   npm start
   
   # Terminal 2: API Gateway
   npm run gateway
   
   # Terminal 3: Chat Service
   cd chat-service && npm start
   
   # Terminal 4: Frontend
   cd frontend && npm start
   ```

## Detailed Configuration

### Firebase Configuration

#### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard

#### Step 2: Enable Firestore
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in "test mode" (for development)
4. Choose a location

#### Step 3: Get Frontend Configuration
1. Go to Project Settings > General
2. Scroll to "Your apps"
3. Click the web icon (`</>`)
4. Register app and copy the config object

#### Step 4: Get Service Account Key (for Chat Service)
1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Use the values in your `.env` file

### Frontend Configuration

Create `frontend/.env`:
```env
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_BACKEND_URL=http://localhost:3001
```

### Chat Service Configuration

Create `chat-service/.env`:
```env
# Service Port
CHAT_SERVICE_PORT=3001

# Gateway URL (must match your gateway)
GATEWAY_URL=http://localhost:8080

# Authentication for Midterm APIs
CHAT_USERNAME=user
CHAT_PASSWORD=password123
DEFAULT_SUBSCRIBER_NO=5551234567

# LLM Configuration - Choose one:

# Option 1: OpenAI
USE_OPENAI=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# Option 2: Local Model (Ollama)
USE_OPENAI=false
LOCAL_LLM_URL=http://localhost:11434/api/generate
LOCAL_MODEL_NAME=mistral

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Logging
LOG_LEVEL=info
```

## LLM Setup Options

### Option 1: OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Set in `chat-service/.env`:
   ```env
   USE_OPENAI=true
   OPENAI_API_KEY=sk-your-key
   ```

### Option 2: Local Model (Ollama)

1. Install Ollama: https://ollama.ai/
2. Pull a model:
   ```bash
   ollama pull mistral
   # or
   ollama pull llama2
   ```
3. Start Ollama (usually runs automatically)
4. Set in `chat-service/.env`:
   ```env
   USE_OPENAI=false
   LOCAL_LLM_URL=http://localhost:11434/api/generate
   LOCAL_MODEL_NAME=mistral
   ```

## Firestore Security Rules

For development, use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{document=**} {
      allow read, write: if true; // Development only!
    }
  }
}
```

**For production**, implement proper authentication and authorization rules.

## Troubleshooting

### Frontend Issues

**Problem:** "Failed to connect to chat service"
- **Solution:** Ensure chat service is running on port 3001
- Check `REACT_APP_BACKEND_URL` in `.env`

**Problem:** "Firebase not initialized"
- **Solution:** Check all Firebase config values in `.env`
- Ensure Firestore is enabled in Firebase Console

### Chat Service Issues

**Problem:** "Firebase Admin not initialized"
- **Solution:** Check Firebase Admin credentials in `.env`
- Ensure private key is properly formatted with `\n` for newlines

**Problem:** "LLM API error"
- **Solution:** 
  - For OpenAI: Check API key is valid and has credits
  - For Local: Ensure Ollama is running and model is pulled

**Problem:** "Authentication failed"
- **Solution:** Check `CHAT_USERNAME` and `CHAT_PASSWORD` match a user in your database
- Ensure API Gateway is running

### API Gateway Issues

**Problem:** "Cannot connect to gateway"
- **Solution:** Ensure gateway is running on port 8080
- Check `GATEWAY_URL` in chat service `.env`

## Testing the Application

1. **Start all services** (see Quick Start)
2. **Open frontend** at `http://localhost:3000`
3. **Try these queries:**
   - "I want to check my bill for January"
   - "Show me the breakdown of my bill"
   - "I want to pay 50 TL for January"

## Architecture Flow

```
User Message
    ↓
React Frontend
    ↓
Firestore (saves message)
    ↓
Chat Service API (/api/chat/process)
    ↓
LLM Service (parse intent)
    ↓
API Client (call midterm API via gateway)
    ↓
Firestore (save response)
    ↓
React Frontend (real-time update)
```

## Development Notes

- The chat service processes messages asynchronously
- Responses are written back to Firestore
- Frontend listens to Firestore changes for real-time updates
- All API calls go through the gateway as required

## Production Considerations

1. **Security:**
   - Implement proper Firestore security rules
   - Use environment variables for all secrets
   - Enable Firebase App Check

2. **Performance:**
   - Consider caching LLM responses
   - Implement rate limiting on chat service
   - Use Firebase Cloud Functions for scalability

3. **Monitoring:**
   - Set up logging aggregation
   - Monitor LLM API usage
   - Track API gateway metrics


