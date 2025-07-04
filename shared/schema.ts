import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with local authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hotels table
export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  stars: integer("stars"),
  roomCount: integer("room_count"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing calculations table
export const pricingCalculations = pgTable("pricing_calculations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  hotelId: integer("hotel_id").references(() => hotels.id),
  hotelName: text("hotel_name").notNull(),
  hotelUrl: text("hotel_url"),
  stars: integer("stars"),
  roomCount: integer("room_count"),
  occupancyRate: decimal("occupancy_rate", { precision: 5, scale: 2 }),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }).notNull(),
  voucherPrice: decimal("voucher_price", { precision: 10, scale: 2 }).notNull(),
  operationalCosts: decimal("operational_costs", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull(),
  profitMargin: decimal("profit_margin", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  discountVsMarket: decimal("discount_vs_market", { precision: 10, scale: 2 }),
  isDraft: boolean("is_draft").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback table for pricing corrections
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  calculationId: integer("calculation_id").notNull().references(() => pricingCalculations.id),
  originalValue: decimal("original_value", { precision: 10, scale: 2 }).notNull(),
  correctedValue: decimal("corrected_value", { precision: 10, scale: 2 }).notNull(),
  fieldName: text("field_name").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  pricingCalculations: many(pricingCalculations),
  feedback: many(feedback),
}));

export const hotelsRelations = relations(hotels, ({ many }) => ({
  pricingCalculations: many(pricingCalculations),
}));

export const pricingCalculationsRelations = relations(pricingCalculations, ({ one, many }) => ({
  user: one(users, {
    fields: [pricingCalculations.userId],
    references: [users.id],
  }),
  hotel: one(hotels, {
    fields: [pricingCalculations.hotelId],
    references: [hotels.id],
  }),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
  calculation: one(pricingCalculations, {
    fields: [feedback.calculationId],
    references: [pricingCalculations.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertHotel = typeof hotels.$inferInsert;
export type Hotel = typeof hotels.$inferSelect;

export const insertPricingCalculationSchema = createInsertSchema(pricingCalculations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricingCalculation = z.infer<typeof insertPricingCalculationSchema>;
export type PricingCalculation = typeof pricingCalculations.$inferSelect;

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// OCR Analysis table
export const ocrAnalyses = pgTable("ocr_analyses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text"),
  insights: jsonb("insights").$type<{
    summary: string;
    keyMetrics: Array<{
      metric: string;
      value: string;
      change?: string;
    }>;
    recommendations: string[];
    trends: Array<{
      category: string;
      trend: 'up' | 'down' | 'stable';
      description: string;
    }>;
  }>(),
  status: varchar("status", { enum: ["pending", "processing", "completed", "error"] }).default("pending"),
  processingTime: integer("processing_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ocrAnalysesRelations = relations(ocrAnalyses, ({ one }) => ({
  user: one(users, {
    fields: [ocrAnalyses.userId],
    references: [users.id],
  }),
}));

export const insertOcrAnalysisSchema = createInsertSchema(ocrAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOcrAnalysis = z.infer<typeof insertOcrAnalysisSchema>;
export type OcrAnalysis = typeof ocrAnalyses.$inferSelect;

// AI Vector Database for Self-Learning Price Intelligence
export const priceIntelligence = pgTable("price_intelligence", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  hotelName: varchar("hotel_name").notNull(),
  stars: integer("stars").notNull(),
  roomCount: integer("room_count").notNull(),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }).notNull(),
  aiSuggestedPrice: decimal("ai_suggested_price", { precision: 10, scale: 2 }).notNull(),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }).notNull(),
  aiPercentage: decimal("ai_percentage", { precision: 5, scale: 2 }).notNull(), // AI suggested percentage
  actualPercentage: decimal("actual_percentage", { precision: 5, scale: 2 }).notNull(), // User chosen percentage
  userFeedback: text("user_feedback"), // Required comment when manually edited
  wasManuallyEdited: boolean("was_manually_edited").default(false),
  vectorEmbedding: jsonb("vector_embedding"), // For AI similarity search
  learningMetrics: jsonb("learning_metrics"), // Performance tracking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const priceIntelligenceRelations = relations(priceIntelligence, ({ one }) => ({
  user: one(users, {
    fields: [priceIntelligence.userId],
    references: [users.id],
  }),
}));

export const insertPriceIntelligenceSchema = createInsertSchema(priceIntelligence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPriceIntelligence = z.infer<typeof insertPriceIntelligenceSchema>;
export type PriceIntelligence = typeof priceIntelligence.$inferSelect;

// AI Learning Sessions - Track improvements over time
export const aiLearningSessions = pgTable("ai_learning_sessions", {
  id: serial("id").primaryKey(),
  sessionType: varchar("session_type").notNull(), // 'manual_correction', 'batch_learning', 'ocr_analysis'
  dataPoints: integer("data_points").notNull(), // Number of calculations processed
  accuracyBefore: decimal("accuracy_before", { precision: 5, scale: 2 }),
  accuracyAfter: decimal("accuracy_after", { precision: 5, scale: 2 }),
  adjustments: jsonb("adjustments"), // What the AI learned
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertAiLearningSession = typeof aiLearningSessions.$inferInsert;
export type AiLearningSession = typeof aiLearningSessions.$inferSelect;

// Document Upload and Analysis System
export const documentUploads = pgTable("document_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  fileName: varchar("file_name").notNull(),
  originalFileName: varchar("original_file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(), // 'zip', 'excel', 'pdf'
  uploadStatus: varchar("upload_status").default("uploaded"), // 'uploaded', 'processing', 'completed', 'error'
  extractedFiles: jsonb("extracted_files"), // Array of extracted file paths for ZIP files
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const documentAnalyses = pgTable("document_analyses", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").references(() => documentUploads.id),
  userId: varchar("user_id").notNull(),
  fileName: varchar("file_name").notNull(),
  worksheetName: varchar("worksheet_name"), // For Excel files with multiple sheets
  analysisType: varchar("analysis_type").notNull(), // 'ocr', 'excel_parse', 'structured_data'
  extractedData: jsonb("extracted_data"), // Raw extracted data
  processedData: jsonb("processed_data"), // Structured/normalized data
  insights: jsonb("insights"), // AI-generated insights
  priceData: jsonb("price_data"), // Extracted pricing information
  status: varchar("status").default("pending"), // 'pending', 'processing', 'completed', 'error'
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const documentInsights = pgTable("document_insights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  analysisIds: jsonb("analysis_ids"), // Array of analysis IDs used for this insight (nullable)
  insightType: varchar("insight_type").notNull(), // 'price_average', 'trend_analysis', 'comparison'
  title: varchar("title").notNull(),
  description: text("description"),
  data: jsonb("data").notNull(), // Calculated insights data
  visualizationData: jsonb("visualization_data"), // Chart/graph data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const documentUploadsRelations = relations(documentUploads, ({ many, one }) => ({
  analyses: many(documentAnalyses),
  user: one(users, { fields: [documentUploads.userId], references: [users.id] }),
}));

export const documentAnalysesRelations = relations(documentAnalyses, ({ one }) => ({
  upload: one(documentUploads, { fields: [documentAnalyses.uploadId], references: [documentUploads.id] }),
  user: one(users, { fields: [documentAnalyses.userId], references: [users.id] }),
}));

export const documentInsightsRelations = relations(documentInsights, ({ one }) => ({
  user: one(users, { fields: [documentInsights.userId], references: [users.id] }),
}));

// Types with Zod schemas
export const insertDocumentUploadSchema = createInsertSchema(documentUploads).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertDocumentAnalysisSchema = createInsertSchema(documentAnalyses).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDocumentInsightSchema = createInsertSchema(documentInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumentUpload = z.infer<typeof insertDocumentUploadSchema>;
export type DocumentUpload = typeof documentUploads.$inferSelect;

export type InsertDocumentAnalysis = z.infer<typeof insertDocumentAnalysisSchema>;
export type DocumentAnalysis = typeof documentAnalyses.$inferSelect;

export type InsertDocumentInsight = z.infer<typeof insertDocumentInsightSchema>;
export type DocumentInsight = typeof documentInsights.$inferSelect;
