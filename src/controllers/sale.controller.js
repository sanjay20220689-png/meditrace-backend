const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');
const { getFefosBatch, isExpired } = require('../utils/fefo');
const { v4: uuidv4 } = require('uuid');

const recordSale = async (req, res) => {
  // items: [{ medicineId, quantity }]
  const { items } = req.body;
  const saleId = uuidv4();
  const saleItems = [];
  let totalAmount = 0;

  try {
    for (const item of items) {
      const { medicineId, quantity } = item;

      // Get all available batches for this medication (FEFO)
      const batchSnap = await db.collection('batches')
        .where('medicineId', '==', medicineId)
        .get();

      const batches = batchSnap.docs.map(d => d.data()).filter(b => !isExpired(b.expiryDate));
      const fefo = getFefosBatch(batches);

      if (!fefo) {
        return res.status(400).json({ error: `No available stock for medication ${medicineId}` });
      }

      if (fefo.quantityAvailable < quantity) {
        return res.status(400).json({
          error: `Insufficient stock in batch ${fefo.batchNumber}. Available: ${fefo.quantityAvailable}`
        });
      }

      // Deduct quantity from the FEFO batch
      const newQty = fefo.quantityAvailable - quantity;
      await db.collection('batches').doc(fefo.batchId).update({ quantityAvailable: newQty });

      const lineTotal = fefo.sellingPrice * quantity;
      totalAmount += lineTotal;

      const saleItemId = uuidv4();
      saleItems.push({
        saleItemId,
        medicineId,
        batchId: fefo.batchId,
        batchNumber: fefo.batchNumber,
        quantity,
        unitPrice: fefo.sellingPrice,
        lineTotal,
      });

      // Check if SPC alternative exists and attach suggestion
      const medDoc = await db.collection('medications').doc(medicineId).get();
      const medData = medDoc.data();

      if (!medData.isSPC) {
        const spcSnap = await db.collection('medications')
          .where('genericName', '==', medData.genericName)
          .where('isSPC', '==', true)
          .get();

        if (!spcSnap.empty) {
          saleItems[saleItems.length - 1].spcAlternative = spcSnap.docs[0].data();
        }
      }
    }

    // Save the sale
    const saleData = {
      saleId,
      saleDateTime: new Date().toISOString(),
      processedBy: req.user.uid,
      items: saleItems,
      totalAmount,
    };

    await db.collection('sales').doc(saleId).set(saleData);
    await logAudit(req.user.uid, 'SALE', 'sale', saleId, `Sale recorded. Total: ${totalAmount}`);

    return res.status(201).json({ message: 'Sale recorded', saleId, totalAmount, items: saleItems });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getSales = async (req, res) => {
  try {
    const snapshot = await db.collection('sales').orderBy('saleDateTime', 'desc').limit(50).get();
    return res.json(snapshot.docs.map(d => d.data()));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Sales velocity: units sold per medication in last N days
const getSalesVelocity = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const snapshot = await db.collection('sales').where('saleDateTime', '>=', since).get();
    const velocity = {};

    snapshot.docs.forEach(doc => {
      const sale = doc.data();
      sale.items.forEach(item => {
        if (!velocity[item.medicineId]) {
          velocity[item.medicineId] = { medicineId: item.medicineId, totalSold: 0, salesCount: 0 };
        }
        velocity[item.medicineId].totalSold += item.quantity;
        velocity[item.medicineId].salesCount += 1;
      });
    });

    // Add daily average
    const result = Object.values(velocity).map(v => ({
      ...v,
      dailyAverage: (v.totalSold / days).toFixed(2),
    }));

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Restock recommendations based on velocity
const getRestockRecommendations = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get sales velocity
    const salesSnap = await db.collection('sales').where('saleDateTime', '>=', since).get();
    const velocity = {};

    salesSnap.docs.forEach(doc => {
      doc.data().items.forEach(item => {
        if (!velocity[item.medicineId]) velocity[item.medicineId] = 0;
        velocity[item.medicineId] += item.quantity;
      });
    });

    // Get current stock levels
    const batchSnap = await db.collection('batches').get();
    const stockLevels = {};

    batchSnap.docs.forEach(doc => {
      const b = doc.data();
      if (!stockLevels[b.medicineId]) stockLevels[b.medicineId] = 0;
      stockLevels[b.medicineId] += b.quantityAvailable;
    });

    // Build recommendations
    const recommendations = Object.keys(velocity).map(medicineId => {
      const sold = velocity[medicineId];
      const currentStock = stockLevels[medicineId] || 0;
      const dailyAvg = sold / days;
      const daysOfStockLeft = currentStock > 0 ? (currentStock / dailyAvg).toFixed(1) : 0;
      const recommendedOrder = Math.max(0, Math.round(dailyAvg * 30) - currentStock);

      return {
        medicineId,
        currentStock,
        soldInPeriod: sold,
        dailyAverage: dailyAvg.toFixed(2),
        daysOfStockLeft,
        recommendedOrder,
        priority: daysOfStockLeft < 7 ? 'HIGH' : daysOfStockLeft < 14 ? 'MEDIUM' : 'LOW',
      };
    });

    return res.json(recommendations.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { recordSale, getSales, getSalesVelocity, getRestockRecommendations };