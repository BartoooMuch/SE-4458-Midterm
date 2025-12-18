#!/bin/bash

# Setup script for AI Agent Chat Application
# This script helps set up the chat application components

echo "🚀 Setting up AI Agent Chat Application..."
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found!"
    exit 1
fi
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Install chat service dependencies
echo "📦 Installing chat service dependencies..."
cd ../chat-service
if [ ! -f "package.json" ]; then
    echo "❌ Chat service package.json not found!"
    exit 1
fi
npm install
echo "✅ Chat service dependencies installed"
echo ""

# Check for .env files
echo "📝 Checking environment configuration..."
cd ../frontend
if [ ! -f ".env" ]; then
    echo "⚠️  Frontend .env file not found!"
    echo "   Please copy frontend/.env.example to frontend/.env and configure it"
else
    echo "✅ Frontend .env file found"
fi

cd ../chat-service
if [ ! -f ".env" ]; then
    echo "⚠️  Chat service .env file not found!"
    echo "   Please copy chat-service/.env.example to chat-service/.env and configure it"
else
    echo "✅ Chat service .env file found"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase:"
echo "   - Create a Firebase project"
echo "   - Enable Firestore Database"
echo "   - Get Firebase configuration"
echo ""
echo "2. Configure environment variables:"
echo "   - Copy frontend/.env.example to frontend/.env"
echo "   - Copy chat-service/.env.example to chat-service/.env"
echo "   - Fill in your Firebase and API credentials"
echo ""
echo "3. Start the services:"
echo "   - Terminal 1: npm start (API Server)"
echo "   - Terminal 2: npm run gateway (API Gateway)"
echo "   - Terminal 3: cd chat-service && npm start (Chat Service)"
echo "   - Terminal 4: cd frontend && npm start (Frontend)"
echo ""
echo "📚 See CHAT_APPLICATION_README.md for detailed instructions"


