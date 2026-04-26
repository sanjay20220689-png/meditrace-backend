// Given a list of batches for a medication, return the one to dispense first (earliest expiry)
const getFefosBatch = (batches) => {
  const available = batches.filter(b => b.quantityAvailable > 0 && !b.isExpired);
  if (available.length === 0) return null;

  return available.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
};

// Check if a batch is near expiry (within thresholdDays)
const isNearExpiry = (expiryDate, thresholdDays = 90) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  return diffDays <= thresholdDays && diffDays > 0;
};

const isExpired = (expiryDate) => new Date(expiryDate) < new Date();

module.exports = { getFefosBatch, isNearExpiry, isExpired };