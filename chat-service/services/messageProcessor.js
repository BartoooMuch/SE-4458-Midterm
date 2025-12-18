// Load environment variables
require('dotenv').config();

const { parseIntent } = require('./llmService');
const { callMidtermAPI } = require('./apiClient');
const { addMessage, initializeFirebase, getDb } = require('./firebase');
const { logger } = require('../utils/logger');
const axios = require('axios');

// Constants for authentication (as per requirements)
const DEFAULT_USERNAME = process.env.CHAT_USERNAME || 'user';
const DEFAULT_PASSWORD = process.env.CHAT_PASSWORD || 'password123';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

// Log environment variables on module load
console.log('Chat Service Auth Config:', {
  username: DEFAULT_USERNAME,
  passwordLength: DEFAULT_PASSWORD ? DEFAULT_PASSWORD.length : 0,
  gatewayUrl: GATEWAY_URL
});

let authToken = null;

/**
 * Get authentication token
 */
const getAuthToken = async () => {
  if (authToken) {
    return authToken;
  }

  try {
    // Ensure we have valid credentials
    if (!DEFAULT_USERNAME || !DEFAULT_PASSWORD) {
      throw new Error('Missing username or password in environment variables');
    }
    
    const loginData = {
      username: String(DEFAULT_USERNAME).trim(),
      password: String(DEFAULT_PASSWORD).trim()
    };
    
    // Validate data
    if (!loginData.username || !loginData.password) {
      throw new Error('Username or password is empty after trimming');
    }
    
    logger.info('Attempting to get auth token', { 
      gatewayUrl: GATEWAY_URL, 
      username: loginData.username,
      passwordLength: loginData.password.length,
      requestBodySize: JSON.stringify(loginData).length
    });
    
    const response = await axios.post(
      `${GATEWAY_URL}/api/v1/auth/login`, 
      loginData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      logger.info('Authentication token obtained');
      return authToken;
    } else {
      throw new Error('Failed to get authentication token');
    }
  } catch (error) {
    logger.error('Error getting auth token', { 
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    // Return null and continue without auth for endpoints that don't require it
    return null;
  }
};

/**
 * Process incoming message
 */
const processMessage = async (messageText, timestamp) => {
  try {
    console.log('🔵 Processing message:', messageText);
    logger.info('Processing message', { messageText });

    // Step 1: Parse intent and extract parameters using LLM
    const intentData = await parseIntent(messageText);
    console.log('🟢 Intent parsed:', JSON.stringify(intentData));
    logger.info('Intent parsed', { intentData });

    // Step 2: Get auth token and call appropriate midterm API based on intent
    const token = await getAuthToken();
    logger.info('Auth token status', { 
      hasToken: !!token, 
      tokenLength: token ? token.length : 0 
    });
    const apiResponse = await callMidtermAPI(intentData, token);
    logger.info('API response received', { apiResponse });

    // Step 3: Format response for user
    const formattedResponse = formatResponse(intentData.intent, apiResponse);
    console.log('🟡 Formatted response:', formattedResponse);

    // Step 4: Ensure Firebase is initialized and write response back to Firestore
    if (!getDb()) {
      console.log('⚠️ Firebase not initialized, initializing now...');
      initializeFirebase();
    }
    const docId = await addMessage(formattedResponse, 'agent', {
      intent: intentData.intent,
      apiResponse: apiResponse
    });
    console.log('✅ Message written to Firestore, docId:', docId);

    logger.info('Message processing completed');

  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    console.error('Stack:', error.stack);
    logger.error('Error processing message', { 
      error: error.message, 
      stack: error.stack 
    });

    // Send error message to user - ALWAYS write to Firestore
    try {
      // Ensure Firebase is initialized
      if (!getDb()) {
        console.log('⚠️ Firebase not initialized, initializing now...');
        initializeFirebase();
      }
      
      // Provide more specific error messages
      let errorMessage = 'Sorry, I encountered an error processing your request. Please try again or rephrase your question.';
      
      if (error.message.includes('Rate limit')) {
        errorMessage = 'I apologize, but the rate limit has been exceeded. Please try again in a moment.';
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        errorMessage = 'I couldn\'t find the information you requested. Please check your query and try again.';
      } else if (error.message.includes('Authentication') || error.message.includes('401')) {
        errorMessage = 'I\'m having trouble authenticating. Please try again in a moment.';
      }
      
      await addMessage(errorMessage, 'agent', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log('✅ Error message written to Firestore');
    } catch (firestoreError) {
      console.error('Failed to write error message to Firestore:', firestoreError);
      logger.error('Failed to write error message to Firestore', { 
        error: firestoreError.message 
      });
      // Even if Firestore fails, we should not throw - the request was already processed
    }
  }
};

/**
 * Format API response for user
 */
const formatResponse = (intent, apiResponse) => {
  if (!apiResponse) {
    return 'I apologize, but I was unable to retrieve the information. Please try again.';
  }
  
  // Handle API errors with meaningful messages
  if (!apiResponse.success) {
    const errorMessage = apiResponse.message || 'Unable to retrieve the information';
    
    // Check for specific error cases
    if (errorMessage.includes('not found') || errorMessage.includes('Bill not found')) {
      return 'I couldn\'t find a bill for the specified period. Please check the month and year, or try a different period.';
    }
    
    if (errorMessage.includes('Authentication required') || errorMessage.includes('401')) {
      return 'I\'m having trouble authenticating. Please try again in a moment.';
    }
    
    return `I apologize, but I encountered an issue: ${errorMessage}. Please try again.`;
  }

  switch (intent) {
    case 'query_bill':
      return formatQueryBillResponse(apiResponse.data);
    
    case 'query_bill_detailed':
      return formatQueryBillDetailedResponse(apiResponse.data);
    
    case 'query_unpaid_bills':
      return formatQueryUnpaidBillsResponse(apiResponse.data);
    
    case 'pay_bill':
      return formatPayBillResponse(apiResponse.data);
    
    default:
      return 'I understand you want to interact with billing services. Could you please be more specific?';
  }
};

/**
 * Format query bill response
 */
const formatQueryBillResponse = (data) => {
  if (!data) {
    return 'No bill information found.';
  }

  const amount = data.bill_total || 0;
  const status = data.paid_status ? 'Paid' : 'Unpaid';
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15); // Example: 15 days from now

  return `Here's your bill information:\n\n` +
         `Amount Due: ${amount.toFixed(2)} TL\n` +
         `Due Date: ${dueDate.toISOString().split('T')[0]}\n` +
         `Status: ${status}`;
};

/**
 * Format query bill detailed response
 */
const formatQueryBillDetailedResponse = (data) => {
  if (!data) {
    return 'No detailed bill information found.';
  }

  let response = `Here's the breakdown of your bill:\n\n`;
  response += `Total Amount: ${(data.bill_total || 0).toFixed(2)} TL\n\n`;

  if (data.bill_details && data.bill_details.length > 0) {
    response += `Details:\n`;
    data.bill_details.forEach((detail, index) => {
      response += `${index + 1}. ${detail.service_type || 'Service'}: ${detail.description || 'N/A'} - ${(detail.amount || 0).toFixed(2)} TL\n`;
    });
  } else {
    response += `Note: Detailed breakdown is not available for this bill.\n`;
    response += `Total amount: ${(data.bill_total || 0).toFixed(2)} TL`;
  }

  if (data.pagination) {
    response += `\n(Showing page ${data.pagination.page} of ${data.pagination.totalPages})`;
  }

  return response;
};

/**
 * Format query unpaid bills response
 */
const formatQueryUnpaidBillsResponse = (data) => {
  if (!data || !data.unpaid_bills || data.unpaid_bills.length === 0) {
    return 'You have no unpaid bills. Great job!';
  }

  let response = `Here are your unpaid bills:\n\n`;
  response += `Subscriber: ${data.subscriber_no}\n\n`;

  data.unpaid_bills.forEach((bill, index) => {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[bill.month] || `Month ${bill.month}`;
    
    response += `${index + 1}. ${monthName} ${bill.year}\n`;
    response += `   Total: ${(bill.total_amount || 0).toFixed(2)} TL\n`;
    response += `   Paid: ${(bill.paid_amount || 0).toFixed(2)} TL\n`;
    response += `   Remaining: ${(bill.remaining_amount || 0).toFixed(2)} TL\n\n`;
  });

  const totalRemaining = data.unpaid_bills.reduce((sum, bill) => sum + (bill.remaining_amount || 0), 0);
  response += `Total Amount Due: ${totalRemaining.toFixed(2)} TL`;

  return response;
};

/**
 * Format pay bill response
 */
const formatPayBillResponse = (data) => {
  if (!data) {
    return 'Payment could not be processed. Please try again.';
  }

  return `Payment processed successfully!\n\n` +
         `Transaction ID: ${data.transaction_id}\n` +
         `Amount Paid: ${(data.amount_paid || 0).toFixed(2)} TL\n` +
         `Remaining Amount: ${(data.remaining_amount || 0).toFixed(2)} TL\n` +
         `Bill Status: ${data.bill_status || 'Unknown'}`;
};

module.exports = {
  processMessage
};

