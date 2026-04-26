const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getInventoryOverview } = require('../controllers/inventory.controller');

router.get('/', authenticate, getInventoryOverview);

module.exports = router;