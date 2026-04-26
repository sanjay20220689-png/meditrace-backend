const express = require('express');
const router  = express.Router();
const { authenticate }  = require('../middleware/auth.middleware');
const { requireRole }   = require('../middleware/role.middleware');
const {
  createUser,
  getUsers,
  changeRole,
  deactivateUser,
  updateUser,
  deleteUser,
  changeOwnPassword,
} = require('../controllers/user.controller');

// ── Existing routes (unchanged) ───────────────────────────────────────────────
router.post('/',                        authenticate, requireRole('owner'), createUser);
router.get('/',                         authenticate, requireRole('owner'), getUsers);
router.patch('/:userId/role',           authenticate, requireRole('owner'), changeRole);
router.patch('/:userId/deactivate',     authenticate, requireRole('owner'), deactivateUser);

// ── New routes ────────────────────────────────────────────────────────────────
// IMPORTANT: /me/password must be declared BEFORE /:uid
// otherwise Express treats the string "me" as a uid parameter
router.patch('/me/password',            authenticate,                       changeOwnPassword);
router.patch('/:uid',                   authenticate, requireRole('owner'), updateUser);
router.delete('/:uid',                  authenticate, requireRole('owner'), deleteUser);

module.exports = router;