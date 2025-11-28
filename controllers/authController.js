const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { logger } = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Login endpoint
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT user_id, username, password_hash, role, subscriber_no FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const user = result.rows[0];

    // Verify password (in production, use hashed passwords)
    // For demo purposes, we'll accept 'password123' as plain text
    // In production, use: const isValid = await bcrypt.compare(password, user.password_hash);
    const isValid = password === 'password123' || await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        subscriberNo: user.subscriber_no
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token: token,
        user: {
          username: user.username,
          role: user.role,
          subscriber_no: user.subscriber_no
        }
      }
    });

  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
};

module.exports = {
  login
};

