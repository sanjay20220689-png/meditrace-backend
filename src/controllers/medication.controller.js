const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

const createMedication = async (req, res) => {
  const { name, genericName, category, isSPC } = req.body;
  const medicineId = uuidv4();

  try {
    await db.collection('medications').doc(medicineId).set({
      medicineId,
      name,
      genericName,
      category,
      isSPC: isSPC || false, // true if this is an SPC/Osusala medicine
      createdAt: new Date().toISOString(),
    });

    await logAudit(req.user.uid, 'CREATE', 'medication', medicineId, `Added medication: ${name}`);
    return res.status(201).json({ message: 'Medication created', medicineId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getMedications = async (req, res) => {
  try {
    const snapshot = await db.collection('medications').get();
    const meds = snapshot.docs.map(doc => doc.data());
    return res.json(meds);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getMedicationById = async (req, res) => {
  const { medicineId } = req.params;
  try {
    const doc = await db.collection('medications').doc(medicineId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Medication not found' });
    return res.json(doc.data());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Get SPC alternatives for a given generic name
const getSPCAlternatives = async (req, res) => {
  const { genericName } = req.query;
  try {
    const snapshot = await db.collection('medications')
      .where('genericName', '==', genericName)
      .where('isSPC', '==', true)
      .get();

    const alternatives = snapshot.docs.map(doc => doc.data());
    return res.json(alternatives);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { createMedication, getMedications, getMedicationById, getSPCAlternatives };