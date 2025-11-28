/**
 * Script to create a user with hashed password
 * Usage: node scripts/create-user.js <username> <password> <role> [subscriber_no]
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/database');
require('dotenv').config();

async function createUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node scripts/create-user.js <username> <password> <role> [subscriber_no]');
    console.log('Roles: user, admin, banking');
    process.exit(1);
  }

  const [username, password, role, subscriberNo] = args;

  if (!['user', 'admin', 'banking'].includes(role)) {
    console.error('Invalid role. Must be: user, admin, or banking');
    process.exit(1);
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Insert user
    const query = subscriberNo
      ? 'INSERT INTO users (username, password_hash, role, subscriber_no) VALUES ($1, $2, $3, $4) RETURNING user_id, username, role'
      : 'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role';

    const values = subscriberNo
      ? [username, passwordHash, role, subscriberNo]
      : [username, passwordHash, role];

    const result = await pool.query(query, values);

    console.log('User created successfully:');
    console.log(result.rows[0]);

    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.error('Error: Username already exists');
    } else {
      console.error('Error creating user:', error.message);
    }
    process.exit(1);
  }
}

createUser();

