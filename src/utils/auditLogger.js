const { db } = require('../config/firebase');

const logAudit = async (userId, actionType, entityType, entityId, description) => {
  try {
    await db.collection('auditLogs').add({
      logId: db.collection('auditLogs').doc().id,
      timestamp: new Date().toISOString(),
      userId,
      actionType,   // CREATE, UPDATE, DELETE, DEACTIVATE, SALE, etc.
      entityType,   // user, batch, medication, sale
      entityId,
      description,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAudit };