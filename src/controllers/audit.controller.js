const { db } = require('../config/firebase');

const getAuditLogs = async (req, res) => {
  try {
    let query = db.collection('auditLogs').orderBy('timestamp', 'desc');
    if (req.query.entityType) query = query.where('entityType', '==', req.query.entityType);
    const snapshot = await query.limit(100).get();
    return res.json(snapshot.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getAuditLogs };