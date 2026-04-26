const { admin, db } = require('../config/firebase');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // ── Attach role from Firestore so req.user.role works everywhere ──────
    // Firebase token only contains uid/email — role lives in Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User not registered in system.' });
    }

    const userData = userDoc.data();

    if (!userData.active) {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    // Merge Firestore fields onto req.user so all controllers can use req.user.role
    req.user = {
      ...decoded,
      uid:      decoded.uid,
      email:    decoded.email || userData.email,
      role:     userData.role,
      username: userData.username,
      active:   userData.active,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };