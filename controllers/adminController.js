const pool = require('../config/database');
const { logger } = require('../config/logger');
const csv = require('csv-parser');
const fs = require('fs');

/**
 * Add Bill - Admin
 * POST /api/v1/admin/bills
 * Parameters: subscriber_no, month, year, total_amount, details (optional)
 * Auth: Required (Admin)
 * Paging: No
 */
const addBill = async (req, res) => {
  try {
    const { subscriber_no, month, year, total_amount, details } = req.body;

    if (!subscriber_no || !month || !year || !total_amount) {
      return res.status(400).json({
        success: false,
        message: 'subscriber_no, month, year, and total_amount are required parameters.'
      });
    }

    // Validate month
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be a number between 1 and 12.'
      });
    }

    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000) {
      return res.status(400).json({
        success: false,
        message: 'Year must be a valid number (>= 2000).'
      });
    }

    // Validate total_amount
    const amount = parseFloat(total_amount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'total_amount must be a valid positive number.'
      });
    }

    // Check if subscriber exists
    const subscriberCheck = await pool.query(
      'SELECT subscriber_no FROM subscribers WHERE subscriber_no = $1',
      [subscriber_no]
    );

    if (subscriberCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found.'
      });
    }

    // Check if bill already exists
    const existingBill = await pool.query(
      'SELECT bill_id FROM bills WHERE subscriber_no = $1 AND month = $2 AND year = $3',
      [subscriber_no, monthNum, yearNum]
    );

    if (existingBill.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bill already exists for this subscriber, month, and year.'
      });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      // Insert bill
      const billQuery = `
        INSERT INTO bills (subscriber_no, month, year, total_amount, paid_amount, paid_status)
        OUTPUT INSERTED.bill_id
        VALUES (@param1, @param2, @param3, @param4, 0, 0)
      `;

      const billResult = await client.query(billQuery, [
        subscriber_no,
        monthNum,
        yearNum,
        amount
      ]);

      const billId = billResult.rows[0].bill_id;

      // Insert bill details if provided
      if (details && Array.isArray(details) && details.length > 0) {
        for (const detail of details) {
          await client.query(
            `INSERT INTO bill_details (bill_id, service_type, description, amount)
             VALUES ($1, $2, $3, $4)`,
            [
              billId,
              detail.service_type || 'other',
              detail.description || '',
              detail.amount || 0
            ]
          );
        }
      } else {
        // Create default detail if none provided
        await client.query(
          `INSERT INTO bill_details (bill_id, service_type, description, amount)
           VALUES ($1, $2, $3, $4)`,
          [billId, 'general', 'Bill amount', amount]
        );
      }

      await client.commit();

      res.status(201).json({
        success: true,
        data: {
          bill_id: billId,
          subscriber_no: subscriber_no,
          month: monthNum,
          year: yearNum,
          total_amount: amount,
          transaction_status: 'success'
        }
      });

    } catch (error) {
      await client.rollback();
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Add bill error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the bill.'
    });
  }
};

/**
 * Add Bill Batch - Admin
 * POST /api/v1/admin/bills/batch
 * Parameters: CSV file with subscriber_no, month, year, total_amount
 * Auth: Required (Admin)
 * Paging: No
 */
const addBillBatch = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required.'
      });
    }

    const filePath = req.file.path;
    const bills = [];
    const errors = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.subscriber_no || !row.month || !row.year || !row.total_amount) {
            errors.push({
              row: JSON.stringify(row),
              error: 'Missing required fields: subscriber_no, month, year, total_amount'
            });
            return;
          }

          bills.push({
            subscriber_no: row.subscriber_no.trim(),
            month: parseInt(row.month),
            year: parseInt(row.year),
            total_amount: parseFloat(row.total_amount),
            service_type: row.service_type || 'general',
            description: row.description || ''
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (bills.length === 0) {
      // Clean up file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'No valid bills found in CSV file.',
        errors: errors
      });
    }

    // Process bills in transaction
    const client = await pool.connect();
    let successCount = 0;
    let failCount = 0;
    const failedBills = [];

    try {
      for (const bill of bills) {
        try {
          // Validate
          if (bill.month < 1 || bill.month > 12) {
            failedBills.push({ bill, error: 'Invalid month' });
            failCount++;
            continue;
          }

          if (bill.year < 2000) {
            failedBills.push({ bill, error: 'Invalid year' });
            failCount++;
            continue;
          }

          if (bill.total_amount < 0) {
            failedBills.push({ bill, error: 'Invalid total_amount' });
            failCount++;
            continue;
          }

          // Check if subscriber exists
          const subscriberCheck = await client.query(
            'SELECT subscriber_no FROM subscribers WHERE subscriber_no = $1',
            [bill.subscriber_no]
          );

          if (subscriberCheck.rows.length === 0) {
            failedBills.push({ bill, error: 'Subscriber not found' });
            failCount++;
            continue;
          }

          // Check if bill already exists
          const existingBill = await client.query(
            'SELECT bill_id FROM bills WHERE subscriber_no = $1 AND month = $2 AND year = $3',
            [bill.subscriber_no, bill.month, bill.year]
          );

          if (existingBill.rows.length > 0) {
            failedBills.push({ bill, error: 'Bill already exists' });
            failCount++;
            continue;
          }

          // Insert bill
          const billResult = await client.query(
            `INSERT INTO bills (subscriber_no, month, year, total_amount, paid_amount, paid_status)
             OUTPUT INSERTED.bill_id
             VALUES (@param1, @param2, @param3, @param4, 0, 0)`,
            [bill.subscriber_no, bill.month, bill.year, bill.total_amount]
          );

          const billId = billResult.rows[0].bill_id;

          // Insert bill detail
          await client.query(
            `INSERT INTO bill_details (bill_id, service_type, description, amount)
             VALUES ($1, $2, $3, $4)`,
            [billId, bill.service_type, bill.description, bill.total_amount]
          );

          successCount++;

        } catch (error) {
          failedBills.push({ bill, error: error.message });
          failCount++;
        }
      }

      // If all failed, rollback
      if (successCount === 0 && failCount > 0) {
        await client.rollback();
        // Clean up file
        fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: 'All bills failed to process.',
          transaction_status: 'failed',
          errors: failedBills,
          success_count: 0,
          fail_count: failCount
        });
      }

      await client.commit();

      // Clean up file
      fs.unlinkSync(filePath);

      res.json({
        success: true,
        data: {
          transaction_status: failCount > 0 ? 'partial_success' : 'success',
          total_bills: bills.length,
          success_count: successCount,
          fail_count: failCount,
          errors: failedBills.length > 0 ? failedBills : undefined
        }
      });

    } catch (error) {
      await client.rollback();
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Add bill batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing batch bills.'
    });
  }
};

module.exports = {
  addBill,
  addBillBatch
};

