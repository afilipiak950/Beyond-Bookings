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
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
