const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { getAuditLogs } = require('../controllers/audit.controller');

router.get('/', authenticate, requireRole('owner'), getAuditLogs);

module.exports = router;