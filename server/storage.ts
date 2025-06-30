import {
  users,
  hotels,
  pricingCalculations,
  feedback,
  type User,
  type UpsertUser,
  type Hotel,
  type InsertHotel,
  type PricingCalculation,
  type InsertPricingCalculation,
  type Feedback,
  type InsertFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createUserByAdmin(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // Hotel operations
  getHotels(): Promise<Hotel[]>;
  getHotel(id: number): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: number): Promise<boolean>;
  scrapeHotelData(url: string): Promise<any>;

  // Pricing calculation operations
  getPricingCalculations(userId: string): Promise<PricingCalculation[]>;
  getPricingCalculation(id: number, userId: string): Promise<PricingCalculation | undefined>;
  createPricingCalculation(calculation: InsertPricingCalculation): Promise<PricingCalculation>;
  updatePricingCalculation(id: number, userId: string, calculation: Partial<InsertPricingCalculation>): Promise<PricingCalculation | undefined>;
  deletePricingCalculation(id: number, userId: string): Promise<boolean>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(calculationId: number): Promise<Feedback[]>;

  // Export operations
  exportToPDF(calculationId: number, userId: string): Promise<Buffer>;
  exportToExcel(calculationId: number, userId: string): Promise<Buffer>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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

  async deleteUser(id: string): Promise<boolean> {
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
  async getPricingCalculations(userId: string): Promise<PricingCalculation[]> {
    return await db
      .select()
      .from(pricingCalculations)
      .where(eq(pricingCalculations.userId, userId))
      .orderBy(desc(pricingCalculations.createdAt));
  }

  async getPricingCalculation(id: number, userId: string): Promise<PricingCalculation | undefined> {
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
    userId: string, 
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

  async deletePricingCalculation(id: number, userId: string): Promise<boolean> {
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
}

export const storage = new DatabaseStorage();
