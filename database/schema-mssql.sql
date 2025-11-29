-- Mobile Provider Bill Payment System Database Schema (Azure SQL)

-- Subscribers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'subscribers')
BEGIN
    CREATE TABLE subscribers (
        subscriber_no NVARCHAR(20) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        phone_number NVARCHAR(20),
        email NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE()
    );
END;

-- Bills Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bills')
BEGIN
    CREATE TABLE bills (
        bill_id INT IDENTITY(1,1) PRIMARY KEY,
        subscriber_no NVARCHAR(20) NOT NULL,
        month INT NOT NULL CHECK (month >= 1 AND month <= 12),
        year INT NOT NULL CHECK (year >= 2000),
        total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
        paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
        paid_status BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_bills_subscribers FOREIGN KEY (subscriber_no) REFERENCES subscribers(subscriber_no),
        CONSTRAINT UQ_bills_subscriber_month_year UNIQUE(subscriber_no, month, year)
    );
END;

-- Bill Details Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bill_details')
BEGIN
    CREATE TABLE bill_details (
        detail_id INT IDENTITY(1,1) PRIMARY KEY,
        bill_id INT NOT NULL,
        service_type NVARCHAR(50) NOT NULL,
        description NVARCHAR(MAX),
        amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_bill_details_bills FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
    );
END;

-- Transactions Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'transactions')
BEGIN
    CREATE TABLE transactions (
        transaction_id INT IDENTITY(1,1) PRIMARY KEY,
        bill_id INT NOT NULL,
        subscriber_no NVARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        payment_date DATETIME2 DEFAULT GETDATE(),
        status NVARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_transactions_bills FOREIGN KEY (bill_id) REFERENCES bills(bill_id),
        CONSTRAINT FK_transactions_subscribers FOREIGN KEY (subscriber_no) REFERENCES subscribers(subscriber_no)
    );
END;

-- Rate Limits Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rate_limits')
BEGIN
    CREATE TABLE rate_limits (
        id INT IDENTITY(1,1) PRIMARY KEY,
        subscriber_no NVARCHAR(20) NOT NULL,
        endpoint NVARCHAR(100) NOT NULL,
        call_count INT DEFAULT 1,
        date DATE DEFAULT CAST(GETDATE() AS DATE),
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_rate_limits_subscribers FOREIGN KEY (subscriber_no) REFERENCES subscribers(subscriber_no),
        CONSTRAINT UQ_rate_limits_subscriber_endpoint_date UNIQUE(subscriber_no, endpoint, date)
    );
END;

-- Users Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'banking')),
        subscriber_no NVARCHAR(20) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_users_subscribers FOREIGN KEY (subscriber_no) REFERENCES subscribers(subscriber_no)
    );
END;

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bills_subscriber')
    CREATE INDEX idx_bills_subscriber ON bills(subscriber_no);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bills_month_year')
    CREATE INDEX idx_bills_month_year ON bills(month, year);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bills_paid_status')
    CREATE INDEX idx_bills_paid_status ON bills(paid_status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bill_details_bill_id')
    CREATE INDEX idx_bill_details_bill_id ON bill_details(bill_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_transactions_bill_id')
    CREATE INDEX idx_transactions_bill_id ON transactions(bill_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_transactions_subscriber')
    CREATE INDEX idx_transactions_subscriber ON transactions(subscriber_no);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rate_limits_subscriber_date')
    CREATE INDEX idx_rate_limits_subscriber_date ON rate_limits(subscriber_no, date);

-- Sample data
IF NOT EXISTS (SELECT 1 FROM subscribers WHERE subscriber_no = '5551234567')
BEGIN
    INSERT INTO subscribers (subscriber_no, name, phone_number, email) VALUES
    ('5551234567', N'Ahmet Yılmaz', '5551234567', 'ahmet@example.com'),
    ('5559876543', N'Ayşe Demir', '5559876543', 'ayse@example.com'),
    ('5551112233', N'Mehmet Kaya', '5551112233', 'mehmet@example.com');
END;

IF NOT EXISTS (SELECT 1 FROM bills WHERE subscriber_no = '5551234567' AND month = 10 AND year = 2024)
BEGIN
    INSERT INTO bills (subscriber_no, month, year, total_amount, paid_amount, paid_status) VALUES
    ('5551234567', 10, 2024, 150.00, 0, 0),
    ('5551234567', 11, 2024, 175.50, 0, 0),
    ('5559876543', 10, 2024, 200.00, 200.00, 1),
    ('5559876543', 11, 2024, 180.00, 0, 0);
END;

IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, password_hash, role, subscriber_no) VALUES
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NULL),
    ('banking', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'banking', NULL),
    ('user1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', '5551234567');
END;

