import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { initializeFirestore, sendMessage, subscribeToMessages } from './services/firestore';
import { ChatMessage } from './components/ChatMessage';
import { ActionButtons } from './components/ActionButtons';
import { MessageInput } from './components/MessageInput';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initialize Firestore
    const init = async () => {
      try {
        await initializeFirestore();
        setIsInitialized(true);
        
        // Add welcome message
        const welcomeMessage = {
          id: 'welcome',
          text: 'Hello! How can I assist you today?',
          sender: 'agent',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);

        // Subscribe to real-time messages
        subscribeToMessages((newMessages) => {
          setMessages(newMessages);
          scrollToBottom();
        });
      } catch (error) {
        console.error('Failed to initialize Firestore:', error);
        alert('Failed to connect to chat service. Please check your configuration.');
      }
    };

    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      await sendMessage(text.trim());
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'agent',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    let message = '';
    switch (action) {
      case 'query':
        message = 'I want to check my bill';
        break;
      case 'queryDetailed':
        message = 'Show me the breakdown of my bill';
        break;
      case 'pay':
        message = 'I want to pay my bill';
        break;
      default:
        return;
    }
    handleSendMessage(message);
  };

  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to chat service...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="chat-container">
        <header className="chat-header">
          <h1>AI Agent - Billing Actions</h1>
        </header>

        <div className="chat-messages">
          {messages.length === 1 && messages[0].sender === 'agent' && (
            <ActionButtons onActionClick={handleActionClick} />
          )}
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="message agent">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

export default App;


