const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getBatchTraceability, getMedicationTraceability } = require('../controllers/traceability.controller');

router.get('/batch/:batchId', authenticate, getBatchTraceability);
router.get('/medication/:medicineId', authenticate, getMedicationTraceability);

module.exports = router;