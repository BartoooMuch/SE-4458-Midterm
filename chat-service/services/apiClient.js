const axios = require('axios');
const { logger } = require('../utils/logger');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';

/**
 * Call midterm APIs through gateway based on intent
 */
const callMidtermAPI = async (intentData, authToken) => {
  try {
    const { intent, subscriber_no, month, year, amount } = intentData;

    logger.info('Calling midterm API', { intent, subscriber_no, month, year });

    let response;

    switch (intent) {
      case 'query_bill':
        response = await callQueryBillAPI(subscriber_no, month, year, authToken);
        break;

      case 'query_bill_detailed':
        response = await callQueryBillDetailedAPI(subscriber_no, month, year, authToken);
        break;

      case 'query_unpaid_bills':
        response = await callQueryUnpaidBillsAPI(subscriber_no, authToken);
        break;

      case 'pay_bill':
        response = await callPayBillAPI(subscriber_no, month, year, amount, authToken);
        break;

      default:
        throw new Error(`Unknown intent: ${intent}`);
    }

    return response;
  } catch (error) {
    logger.error('Error calling midterm API', { 
      error: error.message, 
      intentData 
    });
    
    // Return error response instead of throwing
    return {
      success: false,
      message: error.message || 'Unable to process your request'
    };
  }
};

/**
 * Call Query Bill API
 */
const callQueryBillAPI = async (subscriber_no, month, year, authToken) => {
  try {
    const url = `${GATEWAY_URL}/api/v1/bills/query`;
    const params = {
      subscriber_no: subscriber_no,
      month: month,
      year: year || new Date().getFullYear()
    };

    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      logger.info('Adding Authorization header', { 
        hasToken: true, 
        tokenLength: authToken.length 
      });
    } else {
      logger.warn('No auth token provided for Query Bill API call');
    }

    const response = await axios.get(url, { params, headers });
    return response.data;
  } catch (error) {
    // Handle 404 as a valid response (bill not found)
    if (error.response?.status === 404) {
      logger.info('Bill not found for query', { subscriber_no, month, year });
      return {
        success: false,
        message: error.response?.data?.message || 'Bill not found for the specified subscriber and month.'
      };
    }
    
    logger.error('Query Bill API error', { 
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Return error response instead of throwing
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Unable to retrieve bill information'
    };
  }
};

/**
 * Call Query Bill Detailed API
 */
const callQueryBillDetailedAPI = async (subscriber_no, month, year, authToken) => {
  try {
    const url = `${GATEWAY_URL}/api/v1/bills/query/detailed`;
    const params = {
      subscriber_no: subscriber_no,
      month: month,
      year: year || new Date().getFullYear(),
      page: 1,
      limit: 10
    };

    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.get(url, { params, headers });
    return response.data;
  } catch (error) {
    // Handle 404 as a valid response (bill not found)
    if (error.response?.status === 404) {
      logger.info('Bill not found for detailed query', { subscriber_no, month, year });
      return {
        success: false,
        message: error.response?.data?.message || 'Bill not found for the specified subscriber and month.'
      };
    }
    
    logger.error('Query Bill Detailed API error', { 
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Return error response instead of throwing
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Unable to retrieve detailed bill information'
    };
  }
};

/**
 * Call Query Unpaid Bills API
 */
const callQueryUnpaidBillsAPI = async (subscriber_no, authToken) => {
  try {
    const url = `${GATEWAY_URL}/api/v1/bills/unpaid`;
    const params = {
      subscriber_no: subscriber_no
    };

    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      logger.info('Adding Authorization header for Unpaid Bills API', { 
        hasToken: true, 
        tokenLength: authToken.length 
      });
    } else {
      logger.warn('No auth token provided for Unpaid Bills API call');
    }

    const response = await axios.get(url, { params, headers });
    return response.data;
  } catch (error) {
    logger.error('Query Unpaid Bills API error', { 
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Return error response instead of throwing
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Unable to retrieve unpaid bills'
    };
  }
};

/**
 * Call Pay Bill API (no auth required)
 */
const callPayBillAPI = async (subscriber_no, month, year, amount, authToken) => {
  try {
    // If amount not specified, first query the bill to get total amount
    let paymentAmount = amount;
    if (!paymentAmount || paymentAmount <= 0) {
      // Query bill to get total amount
      const billUrl = `${GATEWAY_URL}/api/v1/bills/query`;
      const billParams = {
        subscriber_no: subscriber_no,
        month: month,
        year: year || new Date().getFullYear()
      };
      
      const billHeaders = {};
      if (authToken) {
        billHeaders['Authorization'] = `Bearer ${authToken}`;
      }
      
      try {
        const billResponse = await axios.get(billUrl, { params: billParams, headers: billHeaders });
        if (billResponse.data.success && billResponse.data.data) {
          paymentAmount = billResponse.data.data.bill_total;
          logger.info('Using bill total as payment amount', { amount: paymentAmount });
        } else {
          throw new Error('Could not retrieve bill information to determine payment amount');
        }
      } catch (billError) {
        logger.error('Error querying bill for payment amount', { error: billError.message });
        // If rate limit error, provide helpful message
        if (billError.response?.status === 429) {
          throw new Error('Rate limit reached. Please specify the payment amount directly (e.g., "pay 150 TL for my October bill") or try again later.');
        }
        throw new Error('Please specify the payment amount, or the bill could not be found');
      }
    }

    const url = `${GATEWAY_URL}/api/v1/bills/pay`;
    const data = {
      subscriber_no: subscriber_no,
      month: month,
      year: year || new Date().getFullYear(),
      amount: paymentAmount
    };

    const response = await axios.post(url, data);
    return response.data;
  } catch (error) {
    logger.error('Pay Bill API error', { 
      error: error.response?.data || error.message 
    });
    throw error;
  }
};

module.exports = {
  callMidtermAPI
};

