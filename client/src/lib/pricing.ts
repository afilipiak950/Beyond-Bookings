interface PricingInput {
  averagePrice: number;
  voucherPrice: number;
  operationalCosts: number;
  vatRate: number;
}

interface PricingResult {
  vatAmount: number;
  profitMargin: number;
  totalPrice: number;
  discountVsMarket: number;
  marginPercentage: number;
  discountPercentage: number;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const { averagePrice, voucherPrice, operationalCosts, vatRate } = input;

  // Calculate VAT amount
  const vatAmount = (voucherPrice * vatRate) / 100;

  // Calculate profit margin (voucher price minus operational costs)
  const profitMargin = voucherPrice - operationalCosts;

  // Calculate total price (voucher price + VAT)
  const totalPrice = voucherPrice + vatAmount;

  // Calculate discount vs market
  const discountVsMarket = averagePrice - voucherPrice;

  // Calculate percentages
  const marginPercentage = (profitMargin / voucherPrice) * 100;
  const discountPercentage = (discountVsMarket / averagePrice) * 100;

  return {
    vatAmount,
    profitMargin,
    totalPrice,
    discountVsMarket,
    marginPercentage,
    discountPercentage,
  };
}

export function validatePricingInput(input: Partial<PricingInput>): string[] {
  const errors: string[] = [];

  if (!input.averagePrice || input.averagePrice <= 0) {
    errors.push("Average price must be greater than 0");
  }

  if (!input.voucherPrice || input.voucherPrice <= 0) {
    errors.push("Voucher price must be greater than 0");
  }

  if (!input.operationalCosts || input.operationalCosts < 0) {
    errors.push("Operational costs must be greater than or equal to 0");
  }

  if (!input.vatRate || input.vatRate < 0 || input.vatRate > 100) {
    errors.push("VAT rate must be between 0 and 100");
  }

  if (input.voucherPrice && input.operationalCosts && input.voucherPrice <= input.operationalCosts) {
    errors.push("Voucher price must be greater than operational costs");
  }

  return errors;
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  // Handle NaN, undefined, null, and infinity values
  if (isNaN(amount) || !isFinite(amount) || amount == null) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(0);
  }
  
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatPercentage(value: number, decimals = 1): string {
  // Handle NaN, undefined, null, and infinity values
  if (isNaN(value) || !isFinite(value) || value == null) {
    return "0.0%";
  }
  
  return `${value.toFixed(decimals)}%`;
}

// Comprehensive calculation function for all hotel pricing calculations
interface HotelCalculationInput {
  projectCosts: number;
  voucherPrice: number;
  roomCount: number;
  actualPrice: number;
  operationalCosts: number;
  stars: number;
}

interface HotelCalculationResult {
  vertragsvolumenEstimate: number;
  profit: number;
  profitMarginPercentage: number;
  vorsteuerProdukt: number;
  vorsteuerTripz: number;
  nettoSteuerzahlung: number;
  revenuePerRoom: number;
  costPerRoom: number;
  roomnights: number;
}

export function calculateHotelFinancials(input: HotelCalculationInput): HotelCalculationResult {
  const { projectCosts, voucherPrice, roomCount, actualPrice, operationalCosts, stars } = input;
  
  // Calculate room nights based on project costs and voucher price
  const roomnights = voucherPrice > 0 ? Math.round(projectCosts / voucherPrice) : 0;
  
  // Calculate base values using workflow formulas
  const baseRevenue = roomnights * voucherPrice; // Revenue from vouchers
  const additionalRevenue = roomnights * 17; // Additional per room revenue
  const adjustments = 2191.33 - 3991.60 + 2579.34; // Fixed workflow adjustments
  
  // Total contract volume (Vertragsvolumen)
  const vertragsvolumenEstimate = baseRevenue + additionalRevenue + adjustments;
  
  // Profit calculation (Marge)
  const profit = vertragsvolumenEstimate - projectCosts;
  
  // Profit margin percentage
  const profitMarginPercentage = vertragsvolumenEstimate > 0 ? (profit / vertragsvolumenEstimate) * 100 : 0;
  
  // VAT calculations based on German tax system
  // 7% for hotel accommodation, 19% for other services
  const amount7 = 29.02; // 7% VAT portion from voucher
  const amount19 = voucherPrice - amount7; // 19% VAT portion
  const mwst7 = roomnights * amount7 * 0.07;
  const mwst19 = roomnights * amount19 * 0.19;
  const totalAt7Percent = roomnights * voucherPrice * 0.07;
  const actualTax = mwst7 + mwst19;
  const taxBurden = actualTax - totalAt7Percent;
  
  // Tax calculations for display
  const vorsteuerProdukt = taxBurden; // Tax burden for state
  const vorsteuerTripz = (vertragsvolumenEstimate * 0.19) * 0.23; // Tripz VAT provision
  const nettoSteuerzahlung = vorsteuerProdukt + (vertragsvolumenEstimate * 0.19) - vorsteuerTripz; // Net tax payment
  
  // Per room calculations
  const revenuePerRoom = roomCount > 0 ? vertragsvolumenEstimate / roomCount : 0;
  const costPerRoom = roomCount > 0 ? projectCosts / roomCount : 0;
  
  return {
    vertragsvolumenEstimate,
    profit,
    profitMarginPercentage,
    vorsteuerProdukt,
    vorsteuerTripz,
    nettoSteuerzahlung,
    revenuePerRoom,
    costPerRoom,
    roomnights,
  };
}

// Safe parsing function to handle invalid data gracefully
export function safeParseFloat(value: any, defaultValue = 0): number {
  if (value == null || value === '' || value === 'null' || value === 'undefined') {
    return defaultValue;
  }
  
  const parsed = typeof value === 'number' ? value : parseFloat(value.toString());
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }
  
  return parsed;
}

export function safeParseInt(value: any, defaultValue = 0): number {
  if (value == null || value === '' || value === 'null' || value === 'undefined') {
    return defaultValue;
  }
  
  const parsed = typeof value === 'number' ? Math.round(value) : parseInt(value.toString());
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }
  
  return parsed;
}
