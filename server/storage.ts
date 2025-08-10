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
  approvalRequests,
  type User,
  type UpsertUser,
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
  type ApprovalRequest,
  type InsertApprovalRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for local authentication
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUserByAdmin(user: UpsertUser): Promise<User>;
  deleteUser(id: number): Promise<boolean>;

  // Hotel operations
  getHotels(): Promise<Hotel[]>;
  getHotel(id: number): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: number): Promise<boolean>;
  scrapeHotelData(url: string): Promise<any>;

  // Pricing calculation operations
  getPricingCalculations(userId: number): Promise<PricingCalculation[]>;
  getAllPricingCalculations(): Promise<(PricingCalculation & { createdBy: string })[]>;
  getPricingCalculation(id: number, userId: number): Promise<PricingCalculation | undefined>;
  createPricingCalculation(calculation: InsertPricingCalculation): Promise<PricingCalculation>;
  updatePricingCalculation(id: number, userId: number, calculation: Partial<InsertPricingCalculation>): Promise<PricingCalculation | undefined>;
  deletePricingCalculation(id: number, userId: number): Promise<boolean>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(calculationId: number): Promise<Feedback[]>;

  // Export operations
  exportToPDF(calculationId: number, userId: number): Promise<Buffer>;
  exportToExcel(calculationId: number, userId: number): Promise<Buffer>;

  // OCR Analysis operations
  getOcrAnalyses(userId: number): Promise<OcrAnalysis[]>;
  getOcrAnalysis(id: number, userId: number): Promise<OcrAnalysis | undefined>;
  createOcrAnalysis(analysis: InsertOcrAnalysis): Promise<OcrAnalysis>;
  updateOcrAnalysis(id: number, userId: number, analysis: Partial<InsertOcrAnalysis>): Promise<OcrAnalysis | undefined>;
  deleteOcrAnalysis(id: number, userId: number): Promise<boolean>;

  // AI Price Intelligence operations
  getPriceIntelligence(userId: number): Promise<PriceIntelligence[]>;
  createPriceIntelligence(data: InsertPriceIntelligence): Promise<PriceIntelligence>;
  getAiLearningSessions(limit?: number): Promise<AiLearningSession[]>;

  // Document Analysis operations
  getDocumentUploads(userId: number): Promise<DocumentUpload[]>;
  getDocumentUpload(id: number, userId: number): Promise<DocumentUpload | undefined>;
  createDocumentUpload(upload: InsertDocumentUpload): Promise<DocumentUpload>;
  updateDocumentUpload(id: number, upload: Partial<InsertDocumentUpload>): Promise<DocumentUpload | undefined>;
  deleteDocumentUpload(id: number, userId: number): Promise<boolean>;

  getDocumentAnalyses(userId: number): Promise<DocumentAnalysis[]>;
  getDocumentAnalysis(id: number, userId: number): Promise<DocumentAnalysis | undefined>;
  createDocumentAnalysis(analysis: InsertDocumentAnalysis): Promise<DocumentAnalysis>;
  updateDocumentAnalysis(id: number, userId: number, analysis: Partial<InsertDocumentAnalysis>): Promise<DocumentAnalysis | undefined>;
  deleteDocumentAnalysis(id: number, userId: number): Promise<boolean>;

  getDocumentInsights(userId: number): Promise<DocumentInsight[]>;
  getDocumentInsight(id: number, userId: number): Promise<DocumentInsight | undefined>;
  createDocumentInsight(insight: InsertDocumentInsight): Promise<DocumentInsight>;
  updateDocumentInsight(id: number, userId: number, insight: Partial<InsertDocumentInsight>): Promise<DocumentInsight | undefined>;
  deleteDocumentInsight(id: number, userId: number): Promise<boolean>;

  // Approval request operations
  createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest>;
  getApprovalRequests(filters?: { status?: string; userId?: number }): Promise<(ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } })[]>;
  getApprovalRequest(id: number): Promise<(ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } }) | undefined>;
  updateApprovalRequest(id: number, adminUserId: number, data: { status: string; adminComment?: string }): Promise<ApprovalRequest | undefined>;
  getUserApprovalRequests(userId: number): Promise<ApprovalRequest[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
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

  async createUserByAdmin(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
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
      const city = hostname.includes('berlin') ? 'Berlin' : 
                   hostname.includes('munich') ? 'Munich' : 
                   hostname.includes('hamburg') ? 'Hamburg' : 'Unknown';
      
      const mockData = {
        name: `Hotel from ${hostname}`,
        url: url,
        stars: Math.floor(Math.random() * 5) + 1,
        roomCount: Math.floor(Math.random() * 300) + 50,
        averagePrice: Math.floor(Math.random() * 200) + 100,
        location: city,
        city: city,
        country: 'Germany',
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
          city: mockData.city,
          country: mockData.country,
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

  async getAllPricingCalculations(): Promise<(PricingCalculation & { createdBy: string })[]> {
    const result = await db
      .select()
      .from(pricingCalculations)
      .leftJoin(users, eq(pricingCalculations.userId, users.id))
      .orderBy(desc(pricingCalculations.createdAt));
    
    return result.map(row => ({
      ...row.pricing_calculations,
      createdBy: row.users?.email || 'Unknown'
    })) as (PricingCalculation & { createdBy: string })[];
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
  async exportToPDF(calculationId: number, userId: number): Promise<Buffer> {
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

  async exportToExcel(calculationId: number, userId: number): Promise<Buffer> {
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
  async getOcrAnalyses(userId: number): Promise<OcrAnalysis[]> {
    const analyses = await db.select().from(ocrAnalyses)
      .where(eq(ocrAnalyses.userId, userId))
      .orderBy(desc(ocrAnalyses.createdAt));
    return analyses;
  }

  async getOcrAnalysis(id: number, userId: number): Promise<OcrAnalysis | undefined> {
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

  async updateOcrAnalysis(id: number, userId: number, analysisData: Partial<InsertOcrAnalysis>): Promise<OcrAnalysis | undefined> {
    const [analysis] = await db.update(ocrAnalyses)
      .set({ ...analysisData, updatedAt: new Date() })
      .where(and(eq(ocrAnalyses.id, id), eq(ocrAnalyses.userId, userId)))
      .returning();
    return analysis;
  }

  async deleteOcrAnalysis(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(ocrAnalyses)
      .where(and(eq(ocrAnalyses.id, id), eq(ocrAnalyses.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // AI Price Intelligence operations
  async getPriceIntelligence(userId: number): Promise<PriceIntelligence[]> {
    return await db.select().from(priceIntelligence)
      .where(eq(priceIntelligence.userId, userId))
      .orderBy(desc(priceIntelligence.createdAt));
  }

  async createPriceIntelligence(data: InsertPriceIntelligence): Promise<PriceIntelligence> {
    const [intelligence] = await db.insert(priceIntelligence).values(data).returning();
    return intelligence;
  }

  async getAiLearningSessions(limit?: number): Promise<AiLearningSession[]> {
    return await db.select().from(aiLearningSessions)
      .orderBy(desc(aiLearningSessions.createdAt))
      .limit(limit || 10);
  }

  // Document Upload operations
  async getDocumentUploads(userId: number): Promise<DocumentUpload[]> {
    return await db.select().from(documentUploads).where(eq(documentUploads.userId, userId));
  }

  async getDocumentUpload(id: number, userId: number): Promise<DocumentUpload | undefined> {
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

  async deleteDocumentUpload(id: number, userId: number): Promise<boolean> {
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
  async getDocumentAnalyses(userId: number): Promise<DocumentAnalysis[]> {
    return await db.select().from(documentAnalyses).where(eq(documentAnalyses.userId, userId));
  }

  async getDocumentAnalysis(id: number, userId: number): Promise<DocumentAnalysis | undefined> {
    const [analysis] = await db.select().from(documentAnalyses)
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)));
    return analysis;
  }

  async createDocumentAnalysis(analysisData: InsertDocumentAnalysis): Promise<DocumentAnalysis> {
    const [analysis] = await db.insert(documentAnalyses).values(analysisData).returning();
    return analysis;
  }

  async updateDocumentAnalysis(id: number, userId: number, analysisData: Partial<InsertDocumentAnalysis>): Promise<DocumentAnalysis | undefined> {
    const [analysis] = await db.update(documentAnalyses)
      .set({ ...analysisData, completedAt: new Date() })
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)))
      .returning();
    return analysis;
  }

  async deleteDocumentAnalysis(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(documentAnalyses)
      .where(and(eq(documentAnalyses.id, id), eq(documentAnalyses.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Document Insights operations
  async getDocumentInsights(userId: number): Promise<DocumentInsight[]> {
    return await db.select().from(documentInsights).where(eq(documentInsights.userId, userId));
  }

  async getDocumentInsight(id: number, userId: number): Promise<DocumentInsight | undefined> {
    const [insight] = await db.select().from(documentInsights)
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)));
    return insight;
  }

  async createDocumentInsight(insightData: InsertDocumentInsight): Promise<DocumentInsight> {
    const [insight] = await db.insert(documentInsights).values(insightData).returning();
    return insight;
  }

  async updateDocumentInsight(id: number, userId: number, insightData: Partial<InsertDocumentInsight>): Promise<DocumentInsight | undefined> {
    const [insight] = await db.update(documentInsights)
      .set({ ...insightData, updatedAt: new Date() })
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)))
      .returning();
    return insight;
  }

  async deleteDocumentInsight(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(documentInsights)
      .where(and(eq(documentInsights.id, id), eq(documentInsights.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Approval request operations
  async createApprovalRequest(request: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [approvalRequest] = await db
      .insert(approvalRequests)
      .values(request)
      .returning();
    return approvalRequest;
  }

  async getApprovalRequests(filters?: { status?: string; userId?: number }): Promise<(ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } })[]> {
    let query = db
      .select({
        id: approvalRequests.id,
        createdByUserId: approvalRequests.createdByUserId,
        approvedByUserId: approvalRequests.approvedByUserId,
        status: approvalRequests.status,
        starCategory: approvalRequests.starCategory,
        inputSnapshot: approvalRequests.inputSnapshot,
        calculationSnapshot: approvalRequests.calculationSnapshot,
        reasons: approvalRequests.reasons,
        adminComment: approvalRequests.adminComment,
        createdAt: approvalRequests.createdAt,
        updatedAt: approvalRequests.updatedAt,
        createdByUser: {
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(approvalRequests)
      .leftJoin(users, eq(approvalRequests.createdByUserId, users.id))
      .orderBy(desc(approvalRequests.createdAt));

    if (filters?.status) {
      query = query.where(eq(approvalRequests.status, filters.status)) as any;
    }
    if (filters?.userId) {
      query = query.where(eq(approvalRequests.createdByUserId, filters.userId)) as any;
    }

    return query as Promise<(ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } })[]>;
  }

  async getApprovalRequest(id: number): Promise<(ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } }) | undefined> {
    const [result] = await db
      .select({
        id: approvalRequests.id,
        createdByUserId: approvalRequests.createdByUserId,
        approvedByUserId: approvalRequests.approvedByUserId,
        status: approvalRequests.status,
        starCategory: approvalRequests.starCategory,
        inputSnapshot: approvalRequests.inputSnapshot,
        calculationSnapshot: approvalRequests.calculationSnapshot,
        reasons: approvalRequests.reasons,
        adminComment: approvalRequests.adminComment,
        createdAt: approvalRequests.createdAt,
        updatedAt: approvalRequests.updatedAt,
        createdByUser: {
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(approvalRequests)
      .leftJoin(users, eq(approvalRequests.createdByUserId, users.id))
      .where(eq(approvalRequests.id, id));

    return result as (ApprovalRequest & { createdByUser: { email: string; firstName?: string; lastName?: string } }) | undefined;
  }

  async updateApprovalRequest(id: number, adminUserId: number, data: { status: string; adminComment?: string }): Promise<ApprovalRequest | undefined> {
    const [updated] = await db
      .update(approvalRequests)
      .set({
        ...data,
        approvedByUserId: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, id))
      .returning();

    return updated;
  }

  async getUserApprovalRequests(userId: number): Promise<ApprovalRequest[]> {
    return await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.createdByUserId, userId))
      .orderBy(desc(approvalRequests.createdAt));
  }
}

export const storage = new DatabaseStorage();
