require('dotenv').config();
const pool = require('../config/database');

async function resetRateLimit() {
  try {
    const args = process.argv.slice(2);
    const subscriberNo = args[0] || '5551234567';
    
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Resetting rate limits for subscriber: ${subscriberNo} on date: ${today}`);
    
    // Delete rate limit records for today
    const deleteQuery = `
      DELETE FROM rate_limits 
      WHERE subscriber_no = @param1 AND date = @param2
    `;
    
    const result = await pool.query(deleteQuery, [subscriberNo, today]);
    
    console.log(`✅ Rate limits reset for subscriber ${subscriberNo}`);
    console.log(`Deleted records for date: ${today}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting rate limit:', error.message);
    process.exit(1);
  }
}

resetRateLimit();

