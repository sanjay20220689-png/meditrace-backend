const { db } = require('../config/firebase');
const { isExpired, isNearExpiry } = require('../utils/fefo');

const getInventoryOverview = async (req, res) => {
  try {
    const [medsSnap, batchesSnap] = await Promise.all([
      db.collection('medications').get(),
      db.collection('batches').get(),
    ]);

    const batches = batchesSnap.docs.map(d => d.data());

    const inventory = medsSnap.docs.map(doc => {
      const med = doc.data();
      const medBatches = batches.filter(b => b.medicineId === med.medicineId);

      const activeBatches = medBatches.filter(b => !isExpired(b.expiryDate));
      const totalStock = activeBatches.reduce((sum, b) => sum + b.quantityAvailable, 0);
      const nearExpiryBatches = medBatches.filter(b => isNearExpiry(b.expiryDate) && b.quantityAvailable > 0);
      const expiredBatches = medBatches.filter(b => isExpired(b.expiryDate) && b.quantityAvailable > 0);

      return {
        medicineId: med.medicineId,
        name: med.name,
        genericName: med.genericName,
        category: med.category,
        isSPC: med.isSPC,
        totalStock,
        totalBatches: medBatches.length,
        activeBatches: activeBatches.length,
        nearExpiryBatches: nearExpiryBatches.length,
        expiredBatches: expiredBatches.length,
        stockStatus: totalStock === 0 ? 'OUT_OF_STOCK' : totalStock < 10 ? 'LOW_STOCK' : 'IN_STOCK',
      };
    });

    const summary = {
      totalMedications: inventory.length,
      outOfStock: inventory.filter(i => i.stockStatus === 'OUT_OF_STOCK').length,
      lowStock: inventory.filter(i => i.stockStatus === 'LOW_STOCK').length,
      inStock: inventory.filter(i => i.stockStatus === 'IN_STOCK').length,
      withNearExpiryBatches: inventory.filter(i => i.nearExpiryBatches > 0).length,
    };

    return res.json({ summary, inventory });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getInventoryOverview };