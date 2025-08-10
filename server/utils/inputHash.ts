import crypto from "crypto";

/**
 * Creates a SHA-256 hash of key pricing calculation inputs
 * Used to detect when calculation inputs have changed after approval
 */
export function generateInputHash(calculationData: any): string {
  // Key fields that affect approval requirements
  const keyFields = {
    stars: calculationData.stars || 0,
    averagePrice: calculationData.averagePrice || 0,
    voucherPrice: calculationData.voucherPrice || 0,
    profitMargin: calculationData.profitMargin || 0,
    operationalCosts: calculationData.operationalCosts || 0,
    financingVolume: calculationData.financingVolume || 0,
    vatRate: calculationData.vatRate || 0
  };

  // Create deterministic string representation
  const dataString = JSON.stringify(keyFields, Object.keys(keyFields).sort());
  
  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Compares two calculation objects to see if key inputs have changed
 */
export function hasCalculationInputsChanged(oldData: any, newData: any): boolean {
  const oldHash = generateInputHash(oldData);
  const newHash = generateInputHash(newData);
  return oldHash !== newHash;
}

/**
 * Extract normalized euro values from various formats
 * Supports: 60, 60.00, 60,00, 60,00 €, 50.001,00 €
 */
export function parseEuro(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100) / 100; // 2 decimal places
  }

  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove currency symbols and extra spaces
  let cleaned = value.toString().replace(/[€$£¥]/g, '').trim();
  
  // Handle German number format (periods as thousands separators, comma as decimal)
  // Example: 50.001,00 -> 50001.00
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // German format: remove periods (thousands), replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Only comma, treat as decimal separator
    cleaned = cleaned.replace(',', '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

/**
 * Format number as Euro currency
 */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}