const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { addBill, addBillBatch } = require('../controllers/adminController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    require('fs').mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * @swagger
 * /api/v1/admin/bills:
 *   post:
 *     summary: Add bill (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriber_no
 *               - month
 *               - year
 *               - total_amount
 *             properties:
 *               subscriber_no:
 *                 type: string
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               total_amount:
 *                 type: number
 *               details:
 *                 type: array
 *     responses:
 *       201:
 *         description: Bill added successfully
 */
router.post('/bills', authenticate, requireAdmin, addBill);

/**
 * @swagger
 * /api/v1/admin/bills/batch:
 *   post:
 *     summary: Add bills from CSV (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Batch bills processed
 */
router.post('/bills/batch', authenticate, requireAdmin, upload.single('file'), addBillBatch);

module.exports = router;

