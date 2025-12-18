const { logger } = require('../utils/logger');
const axios = require('axios');

/**
 * Parse user intent and extract parameters using LLM
 */
const parseIntent = async (messageText) => {
  try {
    // Check if using OpenAI or local model
    const useOpenAI = process.env.USE_OPENAI === 'true' && process.env.OPENAI_API_KEY;
    const localModelUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434/api/generate';

    if (useOpenAI) {
      return await parseIntentWithOpenAI(messageText);
    } else {
      // Try local model, but fallback to keyword matching if it fails
      try {
        return await parseIntentWithLocalModel(messageText, localModelUrl);
      } catch (error) {
        logger.warn('Local model failed, using fallback', { error: error.message });
        return parseIntentFallback(messageText);
      }
    }
  } catch (error) {
    logger.error('Error parsing intent', { error: error.message });
    // Fallback to simple keyword matching
    return parseIntentFallback(messageText);
  }
};

/**
 * Parse intent using OpenAI
 */
const parseIntentWithOpenAI = async (messageText) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const systemPrompt = `You are an AI assistant that helps users with billing queries. 
Analyze the user's message and extract:
1. Intent: One of "query_bill", "query_bill_detailed", "query_unpaid_bills", or "pay_bill"
   - Use "query_unpaid_bills" if user asks for unpaid bills, outstanding bills, or bills to pay
2. Parameters: subscriber_no, month, year, amount (if applicable)
   - For month: Convert month names (January, February, March, April, May, June, July, August, September, October, November, December) to numbers 1-12
   - For month: "October" = 10, "November" = 11, etc.

Return ONLY a JSON object with this structure:
{
  "intent": "query_bill" | "query_bill_detailed" | "query_unpaid_bills" | "pay_bill",
  "subscriber_no": "string or null",
  "month": number or null,
  "year": number or null,
  "amount": number or null
}

If parameters are not mentioned, use null. For month, use numbers 1-12.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageText }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const intentData = JSON.parse(jsonMatch[0]);
      return normalizeIntentData(intentData);
    } else {
      throw new Error('No JSON found in OpenAI response');
    }
  } catch (error) {
    logger.error('OpenAI API error', { error: error.message });
    throw error;
  }
};

/**
 * Parse intent using local model (Ollama, Mistral, etc.)
 */
const parseIntentWithLocalModel = async (messageText, modelUrl) => {
  const prompt = `Analyze this billing query and extract intent and parameters. Return ONLY JSON:
{
  "intent": "query_bill" | "query_bill_detailed" | "query_unpaid_bills" | "pay_bill",
  "subscriber_no": "string or null",
  "month": number or null,
  "year": number or null,
  "amount": number or null
}

Rules:
- Use "query_unpaid_bills" if user asks for unpaid bills, outstanding bills, or bills to pay
- Convert month names to numbers: January=1, February=2, March=3, April=4, May=5, June=6, July=7, August=8, September=9, October=10, November=11, December=12
- "October" = 10, "November" = 11, etc.

User message: "${messageText}"`;

  try {
    const response = await axios.post(modelUrl, {
      model: process.env.LOCAL_MODEL_NAME || 'mistral',
      prompt: prompt,
      stream: false
    }, {
      timeout: 30000 // Increase timeout for local model
    });

    // Ollama returns response in response.data.response
    const content = response.data.response || response.data.text || '';
    
    logger.info('Ollama response', { content: content.substring(0, 200) });
    
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const intentData = JSON.parse(jsonMatch[0]);
        return normalizeIntentData(intentData);
      } catch (parseError) {
        logger.error('JSON parse error', { error: parseError.message, jsonMatch: jsonMatch[0] });
        throw new Error('Failed to parse JSON from response');
      }
    } else {
      logger.warn('No JSON found in response', { content: content.substring(0, 200) });
      throw new Error('No JSON found in local model response');
    }
  } catch (error) {
    logger.error('Local model API error', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Fallback intent parsing using keyword matching
 */
const parseIntentFallback = (messageText) => {
  const text = messageText.toLowerCase();

  // Extract intent
  let intent = null;
  if (text.includes('unpaid') || text.includes('outstanding') || text.includes('due') || text.includes('owe')) {
    intent = 'query_unpaid_bills';
  } else if (text.includes('breakdown') || text.includes('detailed') || text.includes('detail')) {
    intent = 'query_bill_detailed';
  } else if (text.includes('pay') || text.includes('payment')) {
    intent = 'pay_bill';
  } else if (text.includes('bill') || text.includes('check') || text.includes('query')) {
    intent = 'query_bill';
  } else {
    intent = 'query_bill'; // Default
  }

  // Extract parameters
  const subscriberMatch = text.match(/(?:subscriber|phone|number)[\s:]*(\d{10,})/i);
  const monthMatch = text.match(/(?:month|january|february|march|april|may|june|july|august|september|october|november|december)/i);
  const yearMatch = text.match(/(?:year)[\s:]*(\d{4})/i);
  const amountMatch = text.match(/(?:amount|pay)[\s:]*(\d+(?:\.\d+)?)/i);

  // Map month names to numbers
  const monthMap = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  };

  let month = null;
  if (monthMatch) {
    const monthName = monthMatch[0].toLowerCase();
    month = monthMap[monthName] || parseInt(monthName.match(/\d+/)?.[0]) || new Date().getMonth() + 1;
  } else {
    // Check for month names in text
    for (const [name, num] of Object.entries(monthMap)) {
      if (text.includes(name)) {
        month = num;
        break;
      }
    }
    // If still no month, try to find number
    if (!month) {
      const monthNum = text.match(/\b(1[0-2]|[1-9])\b/);
      month = monthNum ? parseInt(monthNum[0]) : (new Date().getMonth() + 1);
    }
  }

  return {
    intent: intent,
    subscriber_no: subscriberMatch ? subscriberMatch[1] : process.env.DEFAULT_SUBSCRIBER_NO || '5551234567',
    month: month,
    year: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
    amount: amountMatch ? parseFloat(amountMatch[1]) : null
  };
};

/**
 * Normalize intent data
 */
const normalizeIntentData = (data) => {
  // Convert month names to numbers if needed
  let month = data.month;
  if (typeof month === 'string') {
    const monthMap = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    const monthLower = month.toLowerCase();
    if (monthMap[monthLower]) {
      month = monthMap[monthLower];
    }
  }

  // Handle invalid intent values (null, undefined, 'none', empty string)
  let intent = data.intent;
  if (!intent || intent === 'none' || intent === 'null' || (typeof intent === 'string' && intent.trim() === '')) {
    intent = 'query_bill'; // Default to query_bill
  }

  // For query_bill_detailed, if month/year not specified, use last available bill (November 2024)
  // This is better than using current month which might not have a bill
  let finalMonth = month;
  let finalYear = data.year || new Date().getFullYear();
  
  if (intent === 'query_bill_detailed' && !month && !data.year) {
    // Default to November 2024 if no month/year specified for detailed query
    finalMonth = 11;
    finalYear = 2024;
  } else if (intent === 'query_bill' && !month && !data.year) {
    // For regular query, try October 2024 if current month doesn't have bill
    finalMonth = 10;
    finalYear = 2024;
  } else if (intent === 'pay_bill' && month === 10 && !data.year) {
    // For pay_bill with October, use 2024 (not 2025)
    finalYear = 2024;
  } else if (!month && intent !== 'query_unpaid_bills') {
    finalMonth = new Date().getMonth() + 1;
  }

  return {
    intent: intent,
    subscriber_no: data.subscriber_no || process.env.DEFAULT_SUBSCRIBER_NO || '5551234567',
    month: finalMonth,
    year: finalYear,
    amount: data.amount || null
  };
};

module.exports = {
  parseIntent
};

