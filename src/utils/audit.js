const { db } = require("../../server");

async function writeAudit({
  userId,
  actionType,
  entityType,
  entityId,
  description,
}) {
  await db.collection("auditLogs").add({
    timestamp: new Date(),
    userId,
    actionType,
    entityType,
    entityId,
    description,
  });
}

module.exports = { writeAudit };
