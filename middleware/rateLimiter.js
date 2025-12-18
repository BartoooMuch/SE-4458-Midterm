const pool = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Rate limiting middleware for subscriber-based daily limits
 * Limits API calls per subscriber per day
 */
const rateLimiter = async (req, res, next) => {
  try {
    const subscriberNo = req.query.subscriber_no || req.body.subscriber_no || req.params.subscriber_no;
    const endpoint = req.path;
    
    if (!subscriberNo) {
      return res.status(400).json({
        success: false,
        message: 'Subscriber number is required for rate limiting.'
      });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check current count for today
    const checkQuery = `
      SELECT call_count 
      FROM rate_limits 
      WHERE subscriber_no = $1 AND endpoint = $2 AND date = $3
    `;
    
    const checkResult = await pool.query(checkQuery, [subscriberNo, endpoint, today]);
    
    let currentCount = 0;
    if (checkResult.rows.length > 0) {
      currentCount = checkResult.rows[0].call_count;
    }

    // Check if limit exceeded (increased to 100 for testing/development)
    const LIMIT = 100;
    if (currentCount >= LIMIT) {
      logger.warn('Rate limit exceeded', { subscriberNo, endpoint, count: currentCount });
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Maximum ${LIMIT} calls per subscriber per day.`,
        limit: LIMIT,
        remaining: 0
      });
    }

    // Update or insert rate limit record
    if (checkResult.rows.length > 0) {
      await pool.query(
        'UPDATE rate_limits SET call_count = call_count + 1 WHERE subscriber_no = $1 AND endpoint = $2 AND date = $3',
        [subscriberNo, endpoint, today]
      );
    } else {
      await pool.query(
        'INSERT INTO rate_limits (subscriber_no, endpoint, call_count, date) VALUES ($1, $2, 1, $3)',
        [subscriberNo, endpoint, today]
      );
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': LIMIT,
      'X-RateLimit-Remaining': Math.max(0, LIMIT - currentCount - 1),
      'X-RateLimit-Reset': new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    });

    next();
  } catch (error) {
    logger.error('Rate limiter error', { error: error.message });
    // Don't block request on rate limiter error, just log it
    next();
  }
};

module.exports = rateLimiter;

