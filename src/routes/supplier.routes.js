const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { createSupplier, getSuppliers, updateSupplierContact } = require('../controllers/supplier.controller');

router.post('/', authenticate, requireRole('owner', 'pharmacist'), createSupplier);
router.get('/', authenticate, getSuppliers);
router.patch('/:supplierId', authenticate, requireRole('owner', 'pharmacist'), updateSupplierContact);

module.exports = router;