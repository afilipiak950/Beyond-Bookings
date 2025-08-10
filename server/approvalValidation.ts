/**
 * Business rules validation for pricing calculations
 * Determines if a calculation needs admin approval based on defined thresholds
 */

export interface PricingInput {
  stars: number; // Star category (3, 4, 5)
  realistischerHotelverkaufspreis: number; // Hotel VK - neu (realistic hotel sale price)
  gutscheinwertFuerHotel: number; // Voucher value for hotel
  margeNachSteuern: number; // Margin after taxes (as percentage)
  finanzierungProjektkosten: number; // Financing: Project costs gross
}

export interface ValidationResult {
  needsApproval: boolean;
  reasons: string[];
}

// Star category dependent caps from "Annahmen" table
const STAR_CAPS = {
  3: { maxVK: 50.00, maxGutschein: 30.00 },
  4: { maxVK: 60.00, maxGutschein: 35.00 },
  5: { maxVK: 75.00, maxGutschein: 45.00 }
} as const;

// Business rule thresholds
const THRESHOLDS = {
  MIN_MARGIN_PERCENT: 27, // Minimum margin after taxes (%)
  MAX_FINANCING_AMOUNT: 50000 // Maximum project costs (€)
} as const;

/**
 * Pure function to validate pricing inputs against business rules
 * @param input - The pricing calculation inputs
 * @returns Validation result with approval requirement and reasons
 */
export function validatePricing(input: PricingInput): ValidationResult {
  const reasons: string[] = [];
  let needsApproval = false;

  // Rule 1: Check if star category is valid (3, 4, 5)
  if (![3, 4, 5].includes(input.stars)) {
    needsApproval = true;
    reasons.push(`Sterne-Kategorie ${input.stars} ist nicht gültig. Nur 3★, 4★ und 5★ Hotels sind ohne Genehmigung erlaubt.`);
  } else {
    const caps = STAR_CAPS[input.stars as keyof typeof STAR_CAPS];
    
    // Rule 2: VK > star-cap (strict comparison)
    if (input.realistischerHotelverkaufspreis > caps.maxVK) {
      needsApproval = true;
      reasons.push(`Realistischer Hotelverkaufspreis ${input.realistischerHotelverkaufspreis.toFixed(2)} € überschreitet das ${input.stars}★ Limit von ${caps.maxVK.toFixed(2)} €`);
    }

    // Rule 3: Gutschein > star-cap (strict comparison)
    if (input.gutscheinwertFuerHotel > caps.maxGutschein) {
      needsApproval = true;
      reasons.push(`Gutscheinwert ${input.gutscheinwertFuerHotel.toFixed(2)} € überschreitet das ${input.stars}★ Limit von ${caps.maxGutschein.toFixed(2)} €`);
    }
  }

  // Rule 4: Marge nach Steuern < 27% (strict comparison)
  if (input.margeNachSteuern < THRESHOLDS.MIN_MARGIN_PERCENT) {
    needsApproval = true;
    reasons.push(`Marge nach Steuern ${input.margeNachSteuern.toFixed(2)}% ist unter dem Mindestlimit von ${THRESHOLDS.MIN_MARGIN_PERCENT}%`);
  }

  // Rule 5: Finanzierung: Projektkosten brutto > 50.000€ (strict comparison)
  if (input.finanzierungProjektkosten > THRESHOLDS.MAX_FINANCING_AMOUNT) {
    needsApproval = true;
    reasons.push(`Finanzierung Projektkosten ${input.finanzierungProjektkosten.toLocaleString('de-DE')} € überschreitet das Limit von ${THRESHOLDS.MAX_FINANCING_AMOUNT.toLocaleString('de-DE')} €`);
  }

  return {
    needsApproval,
    reasons
  };
}

/**
 * Extract pricing inputs from workflow form data
 * Maps workflow form fields to validation input format
 */
export function extractPricingInputFromWorkflow(workflowData: any): PricingInput {
  return {
    stars: workflowData.stars || 0,
    realistischerHotelverkaufspreis: parseFloat(workflowData.averagePrice || "0"),
    gutscheinwertFuerHotel: parseFloat(workflowData.voucherPrice || "0"),
    margeNachSteuern: parseFloat(workflowData.profitMargin || "0") / parseFloat(workflowData.totalPrice || "1") * 100,
    finanzierungProjektkosten: parseFloat(workflowData.projectCosts || "0")
  };
}