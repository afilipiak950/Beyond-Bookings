import {
  users,
  hotels,
  pricingCalculations,
  feedback,
  ocrAnalyses,
  priceIntelligence,
  aiLearningSessions,
  documentUploads,
  documentAnalyses,
  documentInsights,
  type User,
  type UpsertUser,
  type CreateUser,
  type Hotel,
  type InsertHotel,
  type PricingCalculation,
  type InsertPricingCalculation,
  type Feedback,
  type InsertFeedback,
  type OcrAnalysis,
  type InsertOcrAnalysis,
  type InsertPriceIntelligence,
  type PriceIntelligence,
  type AiLearningSession,
  type DocumentUpload,
  type InsertDocumentUpload,
  type DocumentAnalysis,
  type InsertDocumentAnalysis,
  type DocumentInsight,
  type InsertDocumentInsight,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for local authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUserByAdmin(user: CreateUser): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  canCreateUsers(userEmail: string): Promise<boolean>;

  // Hotel operations
  getHotels(): Promise<Hotel[]>;
  getHotel(id: number): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: number): Promise<boolean>;
  scrapeHotelData(url: string): Promise<any>;

  // Pricing calculation operations
  getPricingCalculations(userId: number): Promise<PricingCalculation[]>;
  getPricingCalculation(id: number, userId: number): Promise<PricingCalculation | undefined>;
  createPricingCalculation(calculation: InsertPricingCalculation): Promise<PricingCalculation>;
  updatePricingCalculation(id: number, userId: number, calculation: Partial<InsertPricingCalculation>): Promise<PricingCalculation | undefined>;
  deletePricingCalculation(id: number, userId: number): Promise<boolean>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(calculationId: number): Promise<Feedback[]>;

  // Export operations
  exportToPDF(calculationId: number, userId: string): Promise<Buffer>;
  exportToExcel(calculationId: number, userId: string): Promise<Buffer>;

  // OCR Analysis operations
  getOcrAnalyses(userId: string): Promise<OcrAnalysis[]>;
  getOcrAnalysis(id: number, userId: string): Promise<OcrAnalysis | undefined>;
  createOcrAnalysis(analysis: InsertOcrAnalysis): Promise<OcrAnalysis>;
  updateOcrAnalysis(id: number, userId: string, analysis: Partial<InsertOcrAnalysis>): Promise<OcrAnalysis | undefined>;
  deleteOcrAnalysis(id: number, userId: string): Promise<boolean>;

  // AI Price Intelligence operations
  getPriceIntelligence(userId: string): Promise<PriceIntelligence[]>;
  createPriceIntelligence(data: InsertPriceIntelligence): Promise<PriceIntelligence>;
  getAiLearningSessions(limit?: number): Promise<AiLearningSession[]>;

  // Document Analysis operations
  getDocumentUploads(userId: string): Promise<DocumentUpload[]>;
  getDocumentUpload(id: number, userId: string): Promise<DocumentUpload | undefined>;
  createDocumentUpload(upload: InsertDocumentUpload): Promise<DocumentUpload>;
  updateDocumentUpload(id: number, upload: Partial<InsertDocumentUpload>): Promise<DocumentUpload | undefined>;
  deleteDocumentUpload(id: number, userId: string): Promise<boolean>;

  getDocumentAnalyses(userId: string): Promise<DocumentAnalysis[]>;
  getDocumentAnalysis(id: number, userId: string): Promise<DocumentAnalysis | undefined>;
  createDocumentAnalysis(analysis: InsertDocumentAnalysis): Promise<DocumentAnalysis>;
  updateDocumentAnalysis(id: number, userId: string, analysis: Partial<InsertDocumentAnalysis>): Promise<DocumentAnalysis | undefined>;
  deleteDocumentAnalysis(id: number, userId: string): Promise<boolean>;

  getDocumentInsights(userId: string): Promise<DocumentInsight[]>;
  getDocumentInsight(id: number, userId: string): Promise<DocumentInsight | undefined>;
  createDocumentInsight(insight: InsertDocumentInsight): Promise<DocumentInsight>;
  updateDocumentInsight(id: number, userId: string, insight: Partial<InsertDocumentInsight>): Promise<DocumentInsight | undefined>;
  deleteDocumentInsight(id: number, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUserByAdmin(userData: CreateUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async canCreateUsers(userEmail: string): Promise<boolean> {
    // Only test@example.com can create users
    return userEmail === "test@example.com";
  }

  // Hotel operations
  async getHotels(): Promise<Hotel[]> {
    return await db.select().from(hotels).orderBy(desc(hotels.createdAt));
  }

  async getHotel(id: number): Promise<Hotel | undefined> {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, id));
    return hotel;
  }

  async createHotel(hotelData: InsertHotel): Promise<Hotel> {
    const [hotel] = await db
      .insert(hotels)
      .values({
        ...hotelData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return hotel;
  }

  async updateHotel(id: number, hotelData: Partial<InsertHotel>): Promise<Hotel | undefined> {
    const [hotel] = await db
      .update(hotels)
      .set({
        ...hotelData,
        updatedAt: new Date(),
      })
      .where(eq(hotels.id, id))
      .returning();
    return hotel;
  }

  async deleteHotel(id: number): Promise<boolean> {
    const result = await db.delete(hotels).where(eq(hotels.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async scrapeHotelData(url: string): Promise<any> {
    try {
      // Basic URL parsing to extract hotel information
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Simple mock data extraction - in a real implementation, you would use
      // web scraping libraries like Puppeteer or Playwright
      const mockData = {
        name: `Hotel from ${hostname}`,
        url: url,
        stars: Math.floor(Math.random() * 5) + 1,
        roomCount: Math.floor(Math.random() * 300) + 50,
        averagePrice: Math.floor(Math.random() * 200) + 100,
        location: hostname.includes('berlin') ? 'Berlin' : 
                 hostname.includes('munich') ? 'Munich' : 
                 hostname.includes('hamburg') ? 'Hamburg' : 'Unknown',
      };

      // Check if hotel already exists and create if not
      const existingHotels = await db.select().from(hotels).where(eq(hotels.url, url));
      if (existingHotels.length === 0) {
        await this.createHotel({
          name: mockData.name,
          url: mockData.url,
          stars: mockData.stars,
          roomCount: mockData.roomCount,
          location: mockData.location,
        });
      }

      return mockData;
    } catch (error) {
      throw new Error(`Failed to scrape hotel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Pricing calculation operations
  async getPricingCalculations(userId: number): Promise<PricingCalculation[]> {
    return await db
      .select()
      .from(pricingCalculations)
      .where(eq(pricingCalculations.userId, userId))
      .orderBy(desc(pricingCalculations.createdAt));
  }

  async getPricingCalculation(id: number, userId: number): Promise<PricingCalculation | undefined> {
    const [calculation] = await db
      .select()
      .from(pricingCalculations)
      .where(and(
        eq(pricingCalculations.id, id),
        eq(pricingCalculations.userId, userId)
      ));
    return calculation;
  }

  async createPricingCalculation(calculationData: InsertPricingCalculation): Promise<PricingCalculation> {
    const [calculation] = await db
      .insert(pricingCalculations)
      .values({
        ...calculationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return calculation;
  }

  async updatePricingCalculation(
    id: number, 
    userId: number, 
    calculationData: Partial<InsertPricingCalculation>
  ): Promise<PricingCalculation | undefined> {
    const [calculation] = await db
      .update(pricingCalculations)
      .set({
        ...calculationData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(pricingCalculations.id, id),
        eq(pricingCalculations.userId, userId)
      ))
      .returning();
    return calculation;
  }

  async deletePricingCalculation(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(pricingCalculations)
      .where(and(
        eq(pricingCalculations.id, id),
        eq(pricingCalculations.userId, userId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [feedbackItem] = await db
      .insert(feedback)
      .values({
        ...feedbackData,
        createdAt: new Date(),
      })
      .returning();
    return feedbackItem;
  }

  async getFeedback(calculationId: number): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.calculationId, calculationId))
      .orderBy(desc(feedback.createdAt));
  }

  // Export operations
  async exportToPDF(calculationId: number, userId: string): Promise<Buffer> {
    // Get the calculation data
    const calculation = await this.getPricingCalculation(calculationId, userId);
    if (!calculation) {
      throw new Error("Calculation not found");
    }

    // In a real implementation, you would use a library like PDFKit or Puppeteer
    // to generate a professional PDF report
    const pdfContent = `
      Hotel Pricing Report
      ===================
      
      Hotel: ${calculation.hotelName}
      URL: ${calculation.hotelUrl || 'N/A'}
      Stars: ${calculation.stars || 'N/A'}
      Rooms: ${calculation.roomCount || 'N/A'}
      
      Pricing Details:
      - Average Price: €${calculation.averagePrice}
      - Voucher Price: €${calculation.voucherPrice}
      - Operational Costs: €${calculation.operationalCosts}
      - VAT Rate: ${calculation.vatRate}%
      - VAT Amount: €${calculation.vatAmount}
      - Profit Margin: €${calculation.profitMargin}
      - Total Price: €${calculation.totalPrice}
      
      Generated on: ${new Date().toLocaleDateString()}
    `;

    // For now, return a simple text buffer
    // In production, this would be a proper PDF buffer
    return Buffer.from(pdfContent, 'utf-8');
  }

  async exportToExcel(calculationId: number, userId: string): Promise<Buffer> {
    // Get the calculation data
    const calculation = await this.getPricingCalculation(calculationId, userId);
    if (!calculation) {
      throw new Error("Calculation not found");
    }

    // In a real implementation, you would use a library like ExcelJS
    // to generate a proper Excel file with formulas and formatting
    const excelContent = `Hotel Name,URL,Stars,Rooms,Avg Price,Voucher Price,Operational Costs,VAT Rate,VAT Amount,Profit Margin,Total Price
${calculation.hotelName},${calculation.hotelUrl || ''},${calculation.stars || ''},${calculation.roomCount || ''},${calculation.averagePrice},${calculation.voucherPrice},${calculation.operationalCosts},${calculation.vatRate},${calculation.vatAmount},${calculation.profitMargin},${calculation.totalPrice}`;

    // For now, return a CSV buffer
    // In production, this would be a proper Excel buffer
    return Buffer.from(excelContent, 'utf-8');
  }

  // OCR Analysis operations
  async getOcrAnalyses(userId: string): Promise<OcrAnalysis[]> {
    const analyses = await db.select().from(ocrAnalyses)
      .where(eq(ocrAnalyses.userId, userId))
      .orderBy(desc(ocrAnalyses.createdAt));
    return analyses;
  }

  async getOcrAnalysis(id: number, userId: string): Promise<OcrAnalysis | undefined> {
    const [analysis] = await db.select().from(ocrAnalyses)
      .where(and(eq(ocrAnalyses.id, id), eq(ocrAnalyses.userId, userId)));
    return analysis;
  }

  async createOcrAnalysis(analysisData: InsertOcrAnalysis): Promise<OcrAnalysis> {
    const [analysis] = await db.insert(ocrAnalyses)
      .values(analysisData)
      .returning();
    return analysis;
  }

  async updateOcrAnalysis(id: number, userId: string, analysisData: Partial<InsertOcrAnalysis>): Promise<OcrAnalysis | undefined> {
    const [analysis] = await db.update(ocrAnalyses)
      .set({ ...analysisData, updatedAt: new Date() })
      .where(and(eq(ocrAnalyses.id, id), eq(ocrAnalyses.userId, userId)))
      .returning();
    return analysis;
  }

  async deleteOcrAnalysis(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(ocrAnalyses)
      .where(and(eq(ocrAnalyses.id, id), eq(ocrAnalyses.userId, userId)));
    return result.rowCount > 0;
  }

  // Document Upload operations
  async getDocumentUploads(userId: string): Promise<DocumentUpload[]> {
    return await db.select().from(documentUploads).where(eq(documentUploads.userId, userId));
  }

  async getDocumentUpload(id: number, userId: string): Promise<DocumentUpload | undefined> {
    const [upload] = await db.select().from(documentUploads)
      .where(and(eq(documentUploads.id, id), eq(documentUploads.userId, userId)));
    return upload;
  }

  async createDocumentUpload(uploadData: InsertDocumentUpload): Promise<DocumentUpload> {
    const [upload] = await db.insert(documentUploads).values(uploadData).returning();
    return upload;
  }

  async updateDocumentUpload(id: number, uploadData: Partial<InsertDocumentUpload>): Promise<DocumentUpload | undefined> {
    const [upload] = await db.update(documentUploads)
      .set({ ...uploadData, processedAt: new Date() })
      .where(eq(documentUploads.id, id))
      .returning();
    return upload;
  }

  async deleteDocumentUpload(id: number, userId: string): Promise<boolean> {
    try {
      // First delete related document analyses to avoid foreign key constraint violation
      await db
        .delete(documentAnalyses)
        .where(eq(documentAnalyses.uploadId, id));
      
      // Then delete the document upload
      const result = await db.delete(documentUploads)
        .where(and(eq(documentUploads.id, id), eq(documentUploads.userId, userId)));
      return result.rowCount! > 0;
    } catch (error) {
      console.error("Error deleting document upload:", error);
      return false;
    }
  }

  // Document Analysis operations
  async getDocumentAnalyses(userId: string): Promise<DocumentAnalysis[]> {
    return await db.select().from(documentAnalyses).where(eq(documentAnalyses.userId, userId));
  }

  async getDocumentAnalysis(id: number, userId: string): Promise<DocumentAnalysis | undefined> {
    const [analysis] = await db.select().from(documentAnalyses)
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)));
    return analysis;
  }

  async createDocumentAnalysis(analysisData: InsertDocumentAnalysis): Promise<DocumentAnalysis> {
    const [analysis] = await db.insert(documentAnalyses).values(analysisData).returning();
    return analysis;
  }

  async updateDocumentAnalysis(id: number, userId: string, analysisData: Partial<InsertDocumentAnalysis>): Promise<DocumentAnalysis | undefined> {
    const [analysis] = await db.update(documentAnalyses)
      .set({ ...analysisData, completedAt: new Date() })
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)))
      .returning();
    return analysis;
  }

  async deleteDocumentAnalysis(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(documentAnalyses)
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)));
    return result.rowCount > 0;
  }

  // Document Insights operations
  async getDocumentInsights(userId: string): Promise<DocumentInsight[]> {
    return await db.select().from(documentInsights).where(eq(documentInsights.userId, userId));
  }

  async getDocumentInsight(id: number, userId: string): Promise<DocumentInsight | undefined> {
    const [insight] = await db.select().from(documentInsights)
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)));
    return insight;
  }

  async createDocumentInsight(insightData: InsertDocumentInsight): Promise<DocumentInsight> {
    const [insight] = await db.insert(documentInsights).values(insightData).returning();
    return insight;
  }

  async updateDocumentInsight(id: number, userId: string, insightData: Partial<InsertDocumentInsight>): Promise<DocumentInsight | undefined> {
    const [insight] = await db.update(documentInsights)
      .set({ ...insightData, updatedAt: new Date() })
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)))
      .returning();
    return insight;
  }

  async deleteDocumentInsight(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(documentInsights)
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Missing methods for AI Price Intelligence
  async getPriceIntelligence(userId: string): Promise<PriceIntelligence[]> {
    return await db.select().from(priceIntelligence).where(eq(priceIntelligence.userId, parseInt(userId)));
  }

  async createPriceIntelligence(data: InsertPriceIntelligence): Promise<PriceIntelligence> {
    const [intelligence] = await db.insert(priceIntelligence).values(data).returning();
    return intelligence;
  }

  async getAiLearningSessions(limit: number = 10): Promise<AiLearningSession[]> {
    return await db.select().from(aiLearningSessions).limit(limit);
  }
}

export const storage = new DatabaseStorage();
