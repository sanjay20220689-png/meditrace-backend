const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { createMedication, getMedications, getMedicationById, getSPCAlternatives } = require('../controllers/medication.controller');

router.post('/', authenticate, requireRole('owner', 'pharmacist'), createMedication);
router.get('/', authenticate, getMedications);
router.get('/spc-alternatives', authenticate, getSPCAlternatives); // ?genericName=Paracetamol
router.get('/:medicineId', authenticate, getMedicationById);

module.exports = router;