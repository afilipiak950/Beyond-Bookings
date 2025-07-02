import { apiRequest } from "./queryClient";

export interface ExportOptions {
  calculationId: number;
  format: 'pdf' | 'excel';
  filename?: string;
}

export async function exportCalculation(options: ExportOptions): Promise<void> {
  const { calculationId, format, filename } = options;
  
  try {
    const endpoint = format === 'pdf' ? '/api/export/pdf' : '/api/export/excel';
    const response = await apiRequest(endpoint, 'POST', { calculationId });
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Set filename
    const defaultFilename = format === 'pdf' 
      ? `pricing-calculation-${calculationId}.pdf`
      : `pricing-calculation-${calculationId}.xlsx`;
    
    link.download = filename || defaultFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to export ${format}: ${error.message}`);
  }
}

export async function exportMultipleCalculations(
  calculationIds: number[],
  format: 'pdf' | 'excel'
): Promise<void> {
  // For multiple exports, we'll export each one individually
  // In a real implementation, you might want to create a ZIP file
  for (const id of calculationIds) {
    await exportCalculation({
      calculationId: id,
      format,
      filename: `pricing-calculation-${id}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    });
  }
}

export function validateExportData(calculation: any): string[] {
  const errors: string[] = [];
  
  if (!calculation.hotelName) {
    errors.push("Hotel name is required for export");
  }
  
  if (!calculation.voucherPrice || calculation.voucherPrice <= 0) {
    errors.push("Valid voucher price is required for export");
  }
  
  if (!calculation.averagePrice || calculation.averagePrice <= 0) {
    errors.push("Valid average price is required for export");
  }
  
  if (!calculation.operationalCosts || calculation.operationalCosts < 0) {
    errors.push("Valid operational costs are required for export");
  }
  
  return errors;
}

export function generateExportFilename(
  calculation: any,
  format: 'pdf' | 'excel'
): string {
  const hotelName = calculation.hotelName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  const extension = format === 'pdf' ? 'pdf' : 'xlsx';
  
  return `${hotelName}-pricing-${date}.${extension}`;
}

export interface ExportPreviewData {
  hotelName: string;
  calculationDate: string;
  voucherPrice: number;
  totalPrice: number;
  profitMargin: number;
  vatAmount: number;
}

export function generateExportPreview(calculation: any): ExportPreviewData {
  return {
    hotelName: calculation.hotelName,
    calculationDate: new Date(calculation.createdAt).toLocaleDateString(),
    voucherPrice: parseFloat(calculation.voucherPrice),
    totalPrice: parseFloat(calculation.totalPrice),
    profitMargin: parseFloat(calculation.profitMargin),
    vatAmount: parseFloat(calculation.vatAmount),
  };
}
