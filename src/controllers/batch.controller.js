const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');
const { isNearExpiry, isExpired } = require('../utils/fefo');
const { v4: uuidv4 } = require('uuid');

const addBatch = async (req, res) => {
  const { batchNumber, medicineId, supplierId, expiryDate, quantityAvailable, costPrice, sellingPrice } = req.body;
  const batchId = uuidv4();

  try {
    const medDoc = await db.collection('medications').doc(medicineId).get();
    if (!medDoc.exists) return res.status(404).json({ error: 'Medication not found' });

    const supDoc = await db.collection('suppliers').doc(supplierId).get();
    if (!supDoc.exists) return res.status(404).json({ error: 'Supplier not found' });

    const batchData = {
      batchId,
      batchNumber,
      medicineId,
      supplierId,
      expiryDate,
      quantityAvailable,
      costPrice,
      sellingPrice,
      isExpired: isExpired(expiryDate),
      isNearExpiry: isNearExpiry(expiryDate),
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    };

    await db.collection('batches').doc(batchId).set(batchData);
    await logAudit(req.user.uid, 'CREATE', 'batch', batchId, `Batch ${batchNumber} added for med ${medicineId}`);

    return res.status(201).json({ message: 'Batch added', batchId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getBatchesForMedication = async (req, res) => {
  const { medicineId } = req.params;
  try {
    const snapshot = await db.collection('batches')
      .where('medicineId', '==', medicineId)
      .get();

    const batches = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        isExpired: isExpired(data.expiryDate),
        isNearExpiry: isNearExpiry(data.expiryDate),
      };
    });

    batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    return res.json(batches);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getNearExpiryStock = async (req, res) => {
  const thresholdDays = parseInt(req.query.days) || 90;
  try {
    const snapshot = await db.collection('batches').get();
    const nearExpiry = snapshot.docs
      .map(doc => doc.data())
      .filter(b => isNearExpiry(b.expiryDate, thresholdDays) && b.quantityAvailable > 0);

    return res.json(nearExpiry);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getExpiredStock = async (req, res) => {
  try {
    const snapshot = await db.collection('batches').get();
    const expired = snapshot.docs
      .map(doc => doc.data())
      .filter(b => isExpired(b.expiryDate) && b.quantityAvailable > 0);

    return res.json(expired);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateStockQuantity = async (req, res) => {
  const { batchId } = req.params;
  const { quantityAvailable } = req.body;
  try {
    await db.collection('batches').doc(batchId).update({ quantityAvailable });
    await logAudit(req.user.uid, 'UPDATE', 'batch', batchId, `Stock updated to ${quantityAvailable}`);
    return res.json({ message: 'Stock updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const writeOffBatch = async (req, res) => {
  const { batchId } = req.params;
  const { reason, quantityWrittenOff } = req.body;

  try {
    const batchDoc = await db.collection('batches').doc(batchId).get();
    if (!batchDoc.exists) return res.status(404).json({ error: 'Batch not found' });

    const batch = batchDoc.data();

    if (quantityWrittenOff > batch.quantityAvailable) {
      return res.status(400).json({
        error: `Cannot write off ${quantityWrittenOff}. Only ${batch.quantityAvailable} available.`
      });
    }

    const newQty = batch.quantityAvailable - quantityWrittenOff;
    const financialLoss = quantityWrittenOff * batch.costPrice;

    await db.collection('batches').doc(batchId).update({
      quantityAvailable: newQty,
      lastWriteOff: {
        quantity: quantityWrittenOff,
        reason,
        writtenOffAt: new Date().toISOString(),
        writtenOffBy: req.user.uid,
        financialLoss,
      }
    });

    await db.collection('writeOffs').add({
      batchId,
      batchNumber: batch.batchNumber,
      medicineId: batch.medicineId,
      supplierId: batch.supplierId,
      quantityWrittenOff,
      reason,
      financialLoss,
      writtenOffAt: new Date().toISOString(),
      writtenOffBy: req.user.uid,
    });

    await logAudit(
      req.user.uid, 'WRITE_OFF', 'batch', batchId,
      `Wrote off ${quantityWrittenOff} units from batch ${batch.batchNumber}. Loss: ${financialLoss}. Reason: ${reason}`
    );

    return res.json({
      message: 'Write-off recorded',
      batchId,
      quantityWrittenOff,
      remainingStock: newQty,
      financialLoss,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getWriteOffReport = async (req, res) => {
  try {
    const snapshot = await db.collection('writeOffs')
      .orderBy('writtenOffAt', 'desc')
      .get();

    const writeOffs = snapshot.docs.map(d => d.data());
    const totalLoss = writeOffs.reduce((sum, w) => sum + w.financialLoss, 0);

    return res.json({
      totalWriteOffs: writeOffs.length,
      totalFinancialLoss: totalLoss.toFixed(2),
      writeOffs,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateShelfNumber = async (req, res) => {
  const { batchId } = req.params;
  const { shelfNumber } = req.body;   // string like "A-12" or null to clear
 
  try {
    const batchRef = db.collection('batches').doc(batchId);
    const snap     = await batchRef.get();
 
    if (!snap.exists) {
      return res.status(404).json({ error: "Batch not found" });
    }
 
    // Allow null/empty to clear the shelf number
    const update = shelfNumber && shelfNumber.trim()
      ? { shelfNumber: shelfNumber.trim(), updatedAt: new Date().toISOString() }
      : { shelfNumber: null,              updatedAt: new Date().toISOString() };
 
    await batchRef.update(update);
 
    await logAudit(
      req.user.uid,
      'UPDATE',
      'batch',
      batchId,
      shelfNumber
        ? `Shelf number set to "${shelfNumber}" for batch ${batchId}`
        : `Shelf number cleared for batch ${batchId}`
    );
 
    return res.status(200).json({
      message:     "Shelf number updated",
      batchId,
      shelfNumber: update.shelfNumber,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { 
  addBatch, 
  getBatchesForMedication, 
  getNearExpiryStock, 
  getExpiredStock, 
  updateStockQuantity, 
  writeOffBatch, 
  getWriteOffReport ,
  updateShelfNumber,
};