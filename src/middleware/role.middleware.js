const { db } = require('../config/firebase');

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) return res.status(403).json({ error: 'User not found' });

      const role = userDoc.data().role;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: `Access denied. Required: ${allowedRoles.join(' or ')}` });
      }
      req.userRole = role;
      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};

module.exports = { requireRole };