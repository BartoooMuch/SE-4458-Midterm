const pool = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Query Bill - Mobile Provider App
 * GET /api/v1/bills/query
 * Parameters: subscriber_no, month
 * Auth: Required
 * Paging: No
 * Rate Limit: 3 per subscriber per day
 */
const queryBill = async (req, res) => {
  try {
    const { subscriber_no, month } = req.query;

    if (!subscriber_no || !month) {
      return res.status(400).json({
        success: false,
        message: 'subscriber_no and month are required parameters.'
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

    // Get current year if not provided
    const year = req.query.year || new Date().getFullYear();

    const query = `
      SELECT 
        bill_id,
        subscriber_no,
        month,
        year,
        total_amount,
        paid_amount,
        paid_status,
        created_at
      FROM bills
      WHERE subscriber_no = $1 AND month = $2 AND year = $3
      LIMIT 1
    `;

    const result = await pool.query(query, [subscriber_no, monthNum, year]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found for the specified subscriber and month.'
      });
    }

    const bill = result.rows[0];

    res.json({
      success: true,
      data: {
        bill_total: parseFloat(bill.total_amount),
        paid_status: bill.paid_status
      }
    });

  } catch (error) {
    logger.error('Query bill error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while querying the bill.'
    });
  }
};

/**
 * Query Bill Detailed - Mobile Provider App
 * GET /api/v1/bills/query/detailed
 * Parameters: subscriber_no, month
 * Auth: Required
 * Paging: Yes
 */
const queryBillDetailed = async (req, res) => {
  try {
    const { subscriber_no, month } = req.query;

    if (!subscriber_no || !month) {
      return res.status(400).json({
        success: false,
        message: 'subscriber_no and month are required parameters.'
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

    // Get current year if not provided
    const year = req.query.year || new Date().getFullYear();

    // Get bill
    const billQuery = `
      SELECT 
        bill_id,
        subscriber_no,
        month,
        year,
        total_amount,
        paid_amount,
        paid_status,
        created_at
      FROM bills
      WHERE subscriber_no = $1 AND month = $2 AND year = $3
      LIMIT 1
    `;

    const billResult = await pool.query(billQuery, [subscriber_no, monthNum, year]);

    if (billResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found for the specified subscriber and month.'
      });
    }

    const bill = billResult.rows[0];

    // Get bill details with pagination
    const { page, limit, offset } = req.pagination;

    const detailsQuery = `
      SELECT 
        detail_id,
        service_type,
        description,
        amount,
        created_at
      FROM bill_details
      WHERE bill_id = $1
      ORDER BY detail_id
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM bill_details
      WHERE bill_id = $1
    `;

    const [detailsResult, countResult] = await Promise.all([
      pool.query(detailsQuery, [bill.bill_id, limit, offset]),
      pool.query(countQuery, [bill.bill_id])
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        bill_total: parseFloat(bill.total_amount),
        bill_details: detailsResult.rows.map(row => ({
          service_type: row.service_type,
          description: row.description,
          amount: parseFloat(row.amount)
        }))
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Query bill detailed error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while querying the detailed bill.'
    });
  }
};

/**
 * Query Unpaid Bills - Banking App
 * GET /api/v1/bills/unpaid
 * Parameters: subscriber_no
 * Auth: Required
 * Paging: No
 */
const queryUnpaidBills = async (req, res) => {
  try {
    const { subscriber_no } = req.query;

    if (!subscriber_no) {
      return res.status(400).json({
        success: false,
        message: 'subscriber_no is required parameter.'
      });
    }

    const query = `
      SELECT 
        bill_id,
        subscriber_no,
        month,
        year,
        total_amount,
        paid_amount,
        (total_amount - paid_amount) as remaining_amount,
        paid_status,
        created_at
      FROM bills
      WHERE subscriber_no = $1 AND paid_status = false
      ORDER BY year DESC, month DESC
    `;

    const result = await pool.query(query, [subscriber_no]);

    const unpaidBills = result.rows.map(bill => ({
      month: bill.month,
      year: bill.year,
      total_amount: parseFloat(bill.total_amount),
      paid_amount: parseFloat(bill.paid_amount),
      remaining_amount: parseFloat(bill.remaining_amount),
      bill_id: bill.bill_id
    }));

    res.json({
      success: true,
      data: {
        subscriber_no: subscriber_no,
        unpaid_bills: unpaidBills
      }
    });

  } catch (error) {
    logger.error('Query unpaid bills error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while querying unpaid bills.'
    });
  }
};

/**
 * Pay Bill - Web Site
 * POST /api/v1/bills/pay
 * Parameters: subscriber_no, month, amount
 * Auth: Not required
 * Paging: No
 */
const payBill = async (req, res) => {
  try {
    const { subscriber_no, month, amount } = req.body;

    if (!subscriber_no || !month) {
      return res.status(400).json({
        success: false,
        message: 'subscriber_no and month are required parameters.'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount is required and must be greater than 0.'
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

    // Get current year if not provided
    const year = req.body.year || new Date().getFullYear();

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get bill
      const billQuery = `
        SELECT 
          bill_id,
          subscriber_no,
          month,
          year,
          total_amount,
          paid_amount,
          paid_status
        FROM bills
        WHERE subscriber_no = $1 AND month = $2 AND year = $3
        FOR UPDATE
        LIMIT 1
      `;

      const billResult = await client.query(billQuery, [subscriber_no, monthNum, year]);

      if (billResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Bill not found for the specified subscriber and month.'
        });
      }

      const bill = billResult.rows[0];
      const paymentAmount = parseFloat(amount);
      const newPaidAmount = parseFloat(bill.paid_amount) + paymentAmount;
      const totalAmount = parseFloat(bill.total_amount);
      const isFullyPaid = newPaidAmount >= totalAmount;
      const finalPaidAmount = Math.min(newPaidAmount, totalAmount);

      // Update bill
      const updateQuery = `
        UPDATE bills
        SET paid_amount = $1,
            paid_status = $2
        WHERE bill_id = $3
      `;

      await client.query(updateQuery, [finalPaidAmount, isFullyPaid, bill.bill_id]);

      // Create transaction record
      const transactionQuery = `
        INSERT INTO transactions (bill_id, subscriber_no, amount, status)
        VALUES ($1, $2, $3, 'completed')
        RETURNING transaction_id, payment_date
      `;

      const transactionResult = await client.query(transactionQuery, [
        bill.bill_id,
        subscriber_no,
        paymentAmount
      ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          transaction_id: transactionResult.rows[0].transaction_id,
          transaction_status: 'completed',
          bill_id: bill.bill_id,
          amount_paid: paymentAmount,
          remaining_amount: isFullyPaid ? 0 : (totalAmount - finalPaidAmount),
          bill_status: isFullyPaid ? 'fully_paid' : 'partially_paid'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Pay bill error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing the payment.'
    });
  }
};

module.exports = {
  queryBill,
  queryBillDetailed,
  queryUnpaidBills,
  payBill
};

