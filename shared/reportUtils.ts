// Shared computation module for pricing calculations and reports
// Single source of truth for all calculations

export interface NormalizedInputs {
  hotelName: string;
  hotelUrl?: string;
  avgRoomPrice: number;
  occupancyRate: number;
  seasonalMultiplier: number;
  discountRate: number;
  operationalCosts: number;
  stars: number;
  roomCount: number;
  vatRate: number;
  contractDuration: number;
}

export interface PricingAnalysis {
  basePrice: number;
  seasonalPrice: number;
  discountedPrice: number;
  vatAmount: number;
  totalPrice: number;
  profitMargin: number;
  marginPercentage: number;
  roi: number;
  contractVolume: number;
  requiresApproval: boolean;
  approvalReason?: string;
}

export interface BusinessMetrics {
  portfolioValue: number;
  totalProfit: number;
  profitabilityRate: number;
  averagePrice: number;
  medianPrice: number;
  highPerformingCount: number;
  standardPerformingCount: number;
  underPerformingCount: number;
  priceDistribution: {
    budget: number;
    midRange: number;
    luxury: number;
  };
}

// Normalize inputs with proper Euro parsing
export function normalizeInputs(calculation: any): NormalizedInputs {
  const parseEuro = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Handle various Euro formats: 60, 60,00, 60.00, 50.001,00 €
    const cleanValue = value.toString()
      .replace(/[€\s]/g, '') // Remove € and spaces
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.'); // Convert decimal comma to dot
    
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  return {
    hotelName: calculation.hotelName || calculation.hotel_name || 'Unnamed Hotel',
    hotelUrl: calculation.hotelUrl || calculation.hotel_url || undefined,
    avgRoomPrice: parseEuro(calculation.averageRoomPrice || calculation.avgRoomPrice || calculation.roomPrice),
    occupancyRate: parseFloat(calculation.occupancyRate?.toString() || calculation.occupancy_rate?.toString() || '0'),
    seasonalMultiplier: parseFloat(calculation.seasonalMultiplier?.toString() || calculation.seasonal_multiplier?.toString() || '1'),
    discountRate: parseFloat(calculation.discountRate?.toString() || calculation.discount_rate?.toString() || '0'),
    operationalCosts: parseEuro(calculation.operationalCosts || calculation.operational_costs),
    stars: parseInt(calculation.stars?.toString() || '0'),
    roomCount: parseInt(calculation.roomCount?.toString() || calculation.room_count?.toString() || '1'),
    vatRate: parseFloat(calculation.vatRate?.toString() || calculation.vat_rate?.toString() || '19'),
    contractDuration: parseInt(calculation.contractDuration?.toString() || calculation.contract_duration?.toString() || '12')
  };
}

// Core pricing computation matching the app's logic
export function computePricing(inputs: NormalizedInputs): PricingAnalysis {
  const basePrice = inputs.avgRoomPrice * inputs.roomCount;
  const seasonalPrice = basePrice * inputs.seasonalMultiplier;
  const discountAmount = seasonalPrice * (inputs.discountRate / 100);
  const discountedPrice = seasonalPrice - discountAmount;
  
  const vatAmount = discountedPrice * (inputs.vatRate / 100);
  const totalPrice = discountedPrice + vatAmount;
  const profitMargin = totalPrice - inputs.operationalCosts - vatAmount;
  const marginPercentage = totalPrice > 0 ? (profitMargin / totalPrice) * 100 : 0;
  const roi = inputs.operationalCosts > 0 ? (profitMargin / inputs.operationalCosts) * 100 : 0;
  const contractVolume = totalPrice * inputs.contractDuration;

  // Business rules for approval requirements
  let requiresApproval = false;
  let approvalReason = '';

  // Star category limits
  if (inputs.stars >= 5 && totalPrice > 100000) {
    requiresApproval = true;
    approvalReason = '5-star property with high contract value';
  } else if (inputs.stars >= 4 && totalPrice > 75000) {
    requiresApproval = true;
    approvalReason = '4-star property with elevated contract value';
  } else if (inputs.stars >= 3 && totalPrice > 50000) {
    requiresApproval = true;
    approvalReason = '3-star property with significant contract value';
  }

  // Profit margin requirements
  if (marginPercentage < 27) {
    requiresApproval = true;
    approvalReason = approvalReason ? `${approvalReason}; Low profit margin (<27%)` : 'Low profit margin (<27%)';
  }

  // Financing amount threshold
  if (contractVolume > 50000) {
    requiresApproval = true;
    approvalReason = approvalReason ? `${approvalReason}; High financing amount (>€50k)` : 'High financing amount (>€50k)';
  }

  return {
    basePrice,
    seasonalPrice,
    discountedPrice,
    vatAmount,
    totalPrice,
    profitMargin,
    marginPercentage,
    roi,
    contractVolume,
    requiresApproval,
    approvalReason: approvalReason || undefined
  };
}

// Compute business metrics for portfolio analysis
export function computeBusinessMetrics(calculations: any[]): BusinessMetrics {
  const analyses = calculations.map(calc => {
    const inputs = normalizeInputs(calc);
    return computePricing(inputs);
  });

  const portfolioValue = analyses.reduce((sum, analysis) => sum + analysis.contractVolume, 0);
  const totalProfit = analyses.reduce((sum, analysis) => sum + analysis.profitMargin, 0);
  const profitableCount = analyses.filter(a => a.profitMargin > 0).length;
  const profitabilityRate = calculations.length > 0 ? (profitableCount / calculations.length) * 100 : 0;

  const prices = analyses.map(a => a.totalPrice).sort((a, b) => a - b);
  const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;

  // Performance categories based on profit margin in Euros
  const highPerformingCount = analyses.filter(a => a.profitMargin > 10000).length;
  const standardPerformingCount = analyses.filter(a => a.profitMargin >= 1000 && a.profitMargin <= 10000).length;
  const underPerformingCount = analyses.filter(a => a.profitMargin < 1000).length;

  // Price distribution based on total price
  const priceDistribution = {
    budget: analyses.filter(a => a.totalPrice < 10000).length,
    midRange: analyses.filter(a => a.totalPrice >= 10000 && a.totalPrice < 50000).length,
    luxury: analyses.filter(a => a.totalPrice >= 50000).length
  };

  return {
    portfolioValue,
    totalProfit,
    profitabilityRate,
    averagePrice,
    medianPrice,
    highPerformingCount,
    standardPerformingCount,
    underPerformingCount,
    priceDistribution
  };
}

// German locale number formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export function formatNumber(number: number, decimals: number = 0): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(percentage / 100);
}

// Safe value display - shows "n/a" for missing data instead of €0,00
export function displayValue(value: any, formatter: (v: number) => string): string {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
    return 'n/a';
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString());
  if (isNaN(numValue)) return 'n/a';
  return formatter(numValue);
}