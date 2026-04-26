const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { recordSale, getSales, getSalesVelocity, getRestockRecommendations } = require('../controllers/sale.controller');

router.post('/', authenticate, requireRole('pharmacist', 'owner'), recordSale);
router.get('/', authenticate, requireRole('owner', 'pharmacist'), getSales);
router.get('/velocity', authenticate, getSalesVelocity);              // ?days=30
router.get('/restock-recommendations', authenticate, getRestockRecommendations); // ?days=30

module.exports = router;