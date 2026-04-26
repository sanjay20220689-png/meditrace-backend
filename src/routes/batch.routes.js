const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { 
  addBatch, getBatchesForMedication, getNearExpiryStock, 
  getExpiredStock, updateStockQuantity, writeOffBatch, getWriteOffReport, updateShelfNumber 
} = require('../controllers/batch.controller');

router.post('/', authenticate, requireRole('owner', 'pharmacist', 'assistant'), addBatch);
router.get('/near-expiry', authenticate, getNearExpiryStock);       // ?days=90
router.get('/expired', authenticate, getExpiredStock);
router.get('/medication/:medicineId', authenticate, getBatchesForMedication);
router.patch('/:batchId/quantity', authenticate, requireRole('owner', 'pharmacist'), updateStockQuantity);
router.patch('/:batchId/shelf',    authenticate, requireRole('owner','pharmacist'), updateShelfNumber);
router.post('/:batchId/write-off', authenticate, requireRole('owner', 'pharmacist'), writeOffBatch);
router.get('/write-offs', authenticate, requireRole('owner'), getWriteOffReport);

module.exports = router;