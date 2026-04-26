const { db } = require('../config/firebase');

// Full chain: given a batchId → supplier + medication + every sale that used this batch
const getBatchTraceability = async (req, res) => {
  const { batchId } = req.params;

  try {
    // 1. Get the batch
    const batchDoc = await db.collection('batches').doc(batchId).get();
    if (!batchDoc.exists) return res.status(404).json({ error: 'Batch not found' });
    const batch = batchDoc.data();

    // 2. Get the supplier
    const supplierDoc = await db.collection('suppliers').doc(batch.supplierId).get();
    const supplier = supplierDoc.exists ? supplierDoc.data() : { error: 'Supplier not found' };

    // 3. Get the medication
    const medDoc = await db.collection('medications').doc(batch.medicineId).get();
    const medication = medDoc.exists ? medDoc.data() : { error: 'Medication not found' };

    // 4. Find all sales that used this batch
    const salesSnap = await db.collection('sales').get();
    const relatedSales = [];

    salesSnap.docs.forEach(doc => {
      const sale = doc.data();
      const matchingItems = sale.items.filter(item => item.batchId === batchId);
      if (matchingItems.length > 0) {
        relatedSales.push({
          saleId: sale.saleId,
          saleDateTime: sale.saleDateTime,
          processedBy: sale.processedBy,
          itemsSold: matchingItems,
        });
      }
    });

    const totalDispensed = relatedSales.reduce((sum, sale) => {
      return sum + sale.itemsSold.reduce((s, i) => s + i.quantity, 0);
    }, 0);

    return res.json({
      report: {
        generatedAt: new Date().toISOString(),
        batch: {
          batchId: batch.batchId,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          originalQuantity: batch.quantityAvailable + totalDispensed,
          currentStock: batch.quantityAvailable,
          totalDispensed,
        },
        supplier: {
          supplierId: supplier.supplierId,
          name: supplier.name,
          contactNumber: supplier.contactNumber,
          licenseNumber: supplier.licenseNumber,
        },
        medication: {
          medicineId: medication.medicineId,
          name: medication.name,
          genericName: medication.genericName,
          category: medication.category,
        },
        salesHistory: relatedSales,
        totalSalesTransactions: relatedSales.length,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Traceability by medication — shows all batches and their sales history
const getMedicationTraceability = async (req, res) => {
  const { medicineId } = req.params;

  try {
    const medDoc = await db.collection('medications').doc(medicineId).get();
    if (!medDoc.exists) return res.status(404).json({ error: 'Medication not found' });

    const batchSnap = await db.collection('batches')
      .where('medicineId', '==', medicineId)
      .get();

    const salesSnap = await db.collection('sales').get();
    const allSales = salesSnap.docs.map(d => d.data());

    const batches = await Promise.all(batchSnap.docs.map(async doc => {
      const batch = doc.data();

      const supplierDoc = await db.collection('suppliers').doc(batch.supplierId).get();
      const supplier = supplierDoc.exists ? supplierDoc.data() : {};

      const relatedSales = [];
      allSales.forEach(sale => {
        const matchingItems = sale.items.filter(item => item.batchId === batch.batchId);
        if (matchingItems.length > 0) {
          relatedSales.push({
            saleId: sale.saleId,
            saleDateTime: sale.saleDateTime,
            itemsSold: matchingItems,
          });
        }
      });

      const totalDispensed = relatedSales.reduce((sum, s) =>
        sum + s.itemsSold.reduce((a, i) => a + i.quantity, 0), 0);

      return {
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        currentStock: batch.quantityAvailable,
        totalDispensed,
        supplier: {
          name: supplier.name,
          licenseNumber: supplier.licenseNumber,
        },
        salesHistory: relatedSales,
      };
    }));

    return res.json({
      medication: medDoc.data(),
      totalBatches: batches.length,
      batches,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { getBatchTraceability, getMedicationTraceability };