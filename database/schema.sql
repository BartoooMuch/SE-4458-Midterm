-- Mobile Provider Bill Payment System Database Schema

-- Subscribers Table
CREATE TABLE IF NOT EXISTS subscribers (
    subscriber_no VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills Table
CREATE TABLE IF NOT EXISTS bills (
    bill_id SERIAL PRIMARY KEY,
    subscriber_no VARCHAR(20) NOT NULL REFERENCES subscribers(subscriber_no),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    paid_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_no, month, year)
);

-- Bill Details Table
CREATE TABLE IF NOT EXISTS bill_details (
    detail_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    subscriber_no VARCHAR(20) NOT NULL REFERENCES subscribers(subscriber_no),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate Limits Table (for daily limit tracking)
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    subscriber_no VARCHAR(20) NOT NULL REFERENCES subscribers(subscriber_no),
    endpoint VARCHAR(100) NOT NULL,
    call_count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_no, endpoint, date)
);

-- Users Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'banking')),
    subscriber_no VARCHAR(20) REFERENCES subscribers(subscriber_no),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_subscriber ON bills(subscriber_no);
CREATE INDEX IF NOT EXISTS idx_bills_month_year ON bills(month, year);
CREATE INDEX IF NOT EXISTS idx_bills_paid_status ON bills(paid_status);
CREATE INDEX IF NOT EXISTS idx_bill_details_bill_id ON bill_details(bill_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bill_id ON transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscriber ON transactions(subscriber_no);
CREATE INDEX IF NOT EXISTS idx_rate_limits_subscriber_date ON rate_limits(subscriber_no, date);

-- Insert sample data
INSERT INTO subscribers (subscriber_no, name, phone_number, email) VALUES
('5551234567', 'Ahmet Yılmaz', '5551234567', 'ahmet@example.com'),
('5559876543', 'Ayşe Demir', '5559876543', 'ayse@example.com'),
('5551112233', 'Mehmet Kaya', '5551112233', 'mehmet@example.com')
ON CONFLICT (subscriber_no) DO NOTHING;

-- Insert sample bills
INSERT INTO bills (subscriber_no, month, year, total_amount, paid_amount, paid_status) VALUES
('5551234567', 10, 2024, 150.00, 0, false),
('5551234567', 11, 2024, 175.50, 0, false),
('5559876543', 10, 2024, 200.00, 200.00, true),
('5559876543', 11, 2024, 180.00, 0, false)
ON CONFLICT (subscriber_no, month, year) DO NOTHING;

-- Insert sample bill details
INSERT INTO bill_details (bill_id, service_type, description, amount) VALUES
(1, 'voice', 'Dakika kullanımı', 80.00),
(1, 'sms', 'SMS paketi', 20.00),
(1, 'data', 'İnternet paketi', 50.00),
(2, 'voice', 'Dakika kullanımı', 90.50),
(2, 'sms', 'SMS paketi', 25.00),
(2, 'data', 'İnternet paketi', 60.00)
ON CONFLICT DO NOTHING;

-- Insert sample users (password: password123)
-- Note: For production, use scripts/create-user.js to create users with properly hashed passwords
-- These default passwords work for demo purposes only
INSERT INTO users (username, password_hash, role, subscriber_no) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NULL),
('banking', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'banking', NULL),
('user1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', '5551234567')
ON CONFLICT (username) DO NOTHING;

