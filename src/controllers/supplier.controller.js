const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

const createSupplier = async (req, res) => {
  const { name, contactNumber, licenseNumber } = req.body;
  const supplierId = uuidv4();

  try {
    await db.collection('suppliers').doc(supplierId).set({
      supplierId, name, contactNumber, licenseNumber,
      createdAt: new Date().toISOString(),
    });

    await logAudit(req.user.uid, 'CREATE', 'supplier', supplierId, `Added supplier: ${name}`);
    return res.status(201).json({ message: 'Supplier created', supplierId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const snapshot = await db.collection('suppliers').get();
    return res.json(snapshot.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const updateSupplierContact = async (req, res) => {
  const { supplierId } = req.params;
  const { contactNumber } = req.body;
  try {
    await db.collection('suppliers').doc(supplierId).update({ contactNumber });
    await logAudit(req.user.uid, 'UPDATE', 'supplier', supplierId, 'Updated contact number');
    return res.json({ message: 'Supplier updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { createSupplier, getSuppliers, updateSupplierContact };