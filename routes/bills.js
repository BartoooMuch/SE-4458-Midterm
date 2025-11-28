const express = require('express');
const router = express.Router();
const { authenticate, requireBanking } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const pagination = require('../middleware/pagination');
const {
  queryBill,
  queryBillDetailed,
  queryUnpaidBills,
  payBill
} = require('../controllers/billController');

/**
 * @swagger
 * /api/v1/bills/query:
 *   get:
 *     summary: Query bill (Mobile Provider App)
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subscriber_no
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bill query successful
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/query', authenticate, rateLimiter, queryBill);

/**
 * @swagger
 * /api/v1/bills/query/detailed:
 *   get:
 *     summary: Query bill detailed (Mobile Provider App)
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subscriber_no
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Detailed bill query successful
 */
router.get('/query/detailed', authenticate, pagination, queryBillDetailed);

/**
 * @swagger
 * /api/v1/bills/unpaid:
 *   get:
 *     summary: Query unpaid bills (Banking App)
 *     tags: [Bills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subscriber_no
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unpaid bills query successful
 */
router.get('/unpaid', authenticate, requireBanking, queryUnpaidBills);

/**
 * @swagger
 * /api/v1/bills/pay:
 *   post:
 *     summary: Pay bill (Web Site)
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriber_no
 *               - month
 *               - amount
 *             properties:
 *               subscriber_no:
 *                 type: string
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment successful
 */
router.post('/pay', payBill);

module.exports = router;

