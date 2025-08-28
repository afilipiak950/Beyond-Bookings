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

// User storage table with role-based access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  role: varchar("role").default("user").notNull(), // 'admin' or 'user'
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval requests table for pricing calculations that exceed thresholds
export const approvalRequests: any = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  calculationId: integer("calculation_id"), // Link to pricing calculation
  inputHash: varchar("input_hash", { length: 64 }), // SHA-256 hash for tracking input changes
  approvedByUserId: integer("approved_by_user_id").references(() => users.id),
  decisionByUserId: integer("decision_by_user_id").references(() => users.id),
  status: varchar("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
  starCategory: integer("star_category").notNull(),
  inputSnapshot: jsonb("input_snapshot").notNull(), // All form inputs
  calculationSnapshot: jsonb("calculation_snapshot"), // Results if calculated
  reasons: text("reasons").array().notNull(), // Array of reason strings
  adminComment: text("admin_comment"),
  decisionAt: timestamp("decision_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("approval_requests_status_idx").on(table.status),
  index("approval_requests_created_by_idx").on(table.createdByUserId),
  index("approval_requests_calculation_idx").on(table.calculationId),
  index("approval_requests_decision_by_idx").on(table.decisionByUserId),
  index("approval_requests_created_at_idx").on(table.createdAt),
  index("approval_requests_input_hash_idx").on(table.inputHash),
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientUserId: integer("recipient_user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'approval_pending', 'approval_approved', 'approval_rejected'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  approvalRequestId: integer("approval_request_id").references(() => approvalRequests.id),
  calculationId: integer("calculation_id"),
  status: varchar("status").default("unread").notNull(), // 'unread', 'read'
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notifications_recipient_status_idx").on(table.recipientUserId, table.status),
  index("notifications_created_at_idx").on(table.createdAt),
]);

// Hotels table with comprehensive review data
export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  stars: integer("stars"),
  roomCount: integer("room_count"),
  location: text("location"),
  city: text("city"),
  country: text("country"),
  category: text("category"),
  amenities: text("amenities").array(),
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }),
  // Review data from multiple platforms
  bookingReviews: jsonb("booking_reviews"), // {rating, count, summary, url}
  googleReviews: jsonb("google_reviews"), // {rating, count, summary, url}
  holidayCheckReviews: jsonb("holiday_check_reviews"), // {rating, count, summary, url}
  tripadvisorReviews: jsonb("tripadvisor_reviews"), // {rating, count, summary, url}
  reviewSummary: text("review_summary"), // AI-generated summary of all reviews
  lastReviewUpdate: timestamp("last_review_update"),
  createdByUserId: integer("created_by_user_id").references(() => users.id), // For owner filtering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Add indexes for filtering performance
  index("hotels_stars_idx").on(table.stars),
  index("hotels_category_idx").on(table.category),
  index("hotels_country_idx").on(table.country),
  index("hotels_city_idx").on(table.city),
  index("hotels_room_count_idx").on(table.roomCount),
  index("hotels_average_price_idx").on(table.averagePrice),
  index("hotels_created_at_idx").on(table.createdAt),
  index("hotels_updated_at_idx").on(table.updatedAt),
  index("hotels_created_by_idx").on(table.createdByUserId),
  index("hotels_name_search_idx").on(table.name), // For text search optimization
]);

// Pricing calculations table
export const pricingCalculations: any = pgTable("pricing_calculations", {
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
  
  // Additional form fields that need to be saved
  calculationDate: text("calculation_date"), // Date field from form
  currency: text("currency").default("EUR"), // Currency field from form
  contractYears: integer("contract_years").default(1), // Contract duration
  availableRoomnights: integer("available_roomnights"), // Calculated field
  addressableRoomnights: integer("addressable_roomnights"), // Calculated field
  
  // Right-side calculation details that need to persist
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }), // KI/Manual realistic price
  aiSuggestedPrice: decimal("ai_suggested_price", { precision: 10, scale: 2 }), // Original AI suggestion
  aiConfidence: integer("ai_confidence"), // AI confidence percentage
  aiReasoning: text("ai_reasoning"), // AI explanation text
  isManualEdit: boolean("is_manual_edit").default(false), // Whether price was manually edited
  manualEditFeedback: text("manual_edit_feedback"), // User's reason for manual edit
  
  // Voucher calculation details
  isVoucherManualEdit: boolean("is_voucher_manual_edit").default(false), // Whether voucher was manually edited
  voucherEditFeedback: text("voucher_edit_feedback"), // User's reason for voucher edit
  
  // Tripz calculation details
  tripzEstimateMultiplier: decimal("tripz_estimate_multiplier", { precision: 5, scale: 3 }).default("0.75"), // Multiplier for Tripz payment
  
  // Additional calculation metadata
  similarHotelsCount: integer("similar_hotels_count").default(0), // Number of similar hotels used by AI
  
  isDraft: boolean("is_draft").default(false),
  // Customer request fields
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  financingVolume: decimal("financing_volume", { precision: 15, scale: 2 }),
  projectDescription: text("project_description"),
  urgency: text("urgency"), // 'low', 'medium', 'high'
  additionalNotes: text("additional_notes"),
  requestType: text("request_type"), // 'standard', 'customer_financing'
  status: text("status").default("draft"), // 'draft', 'submitted', 'processing', 'completed'
  
  // Approval workflow fields
  approvalStatus: text("approval_status", { 
    enum: ["none_required", "required_not_sent", "pending", "approved", "rejected"] 
  }).default("none_required"),
  lastApprovalRequestId: integer("last_approval_request_id"),
  inputHash: text("input_hash"), // SHA-256 hash of key input fields for change detection
  approvedInputHash: text("approved_input_hash"), // Hash of inputs when approved to enforce snapshot identity
  
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

// User management schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const createUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
});

export const updateUserProfileSchema = updateUserSchema.omit({
  password: true,
}).extend({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

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

export const insertNotificationSchema = createInsertSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// OCR Analysis table
export const ocrAnalyses = pgTable("ocr_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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

// Approval request types and schemas
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// AI Hub Database Schema
export const aiThreads = pgTable("ai_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  mode: varchar("mode").default("general").notNull(), // general, calculation, docs, sql, sheets, api
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ai_threads_user_idx").on(table.userId),
  index("ai_threads_created_at_idx").on(table.createdAt),
]);

export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => aiThreads.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  toolCalls: jsonb("tool_calls"), // Array of tool calls made
  citations: jsonb("citations"), // Array of source citations
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ai_messages_thread_idx").on(table.threadId),
  index("ai_messages_created_at_idx").on(table.createdAt),
]);

export const aiDocs = pgTable("ai_docs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(), // pdf, md, docx, csv, xlsx
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("ai_docs_user_idx").on(table.userId),
  index("ai_docs_uploaded_at_idx").on(table.uploadedAt),
]);

export const aiChunks = pgTable("ai_chunks", {
  id: serial("id").primaryKey(),
  docId: integer("doc_id").notNull().references(() => aiDocs.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count").notNull(),
  metadata: jsonb("metadata"), // page number, section, etc.
}, (table) => [
  index("ai_chunks_doc_idx").on(table.docId),
  index("ai_chunks_chunk_idx").on(table.chunkIndex),
]);

export const aiEmbeddings = pgTable("ai_embeddings", {
  id: serial("id").primaryKey(),
  chunkId: integer("chunk_id").notNull().references(() => aiChunks.id, { onDelete: "cascade" }),
  embedding: text("embedding").notNull(), // Stored as JSON string
}, (table) => [
  index("ai_embeddings_chunk_idx").on(table.chunkId),
]);

export const aiLogs = pgTable("ai_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  threadId: integer("thread_id").references(() => aiThreads.id),
  role: varchar("role").notNull(),
  prompt: text("prompt"),
  toolCalls: jsonb("tool_calls"),
  tokenUsage: jsonb("token_usage"), // { prompt_tokens, completion_tokens, total_tokens }
  cost: decimal("cost", { precision: 10, scale: 6 }), // USD cost
  latency: integer("latency"), // milliseconds
  citations: jsonb("citations"),
  model: varchar("model"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ai_logs_user_idx").on(table.userId),
  index("ai_logs_thread_idx").on(table.threadId),
  index("ai_logs_created_at_idx").on(table.createdAt),
]);

// AI Hub Relations
export const aiThreadsRelations = relations(aiThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [aiThreads.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  thread: one(aiThreads, {
    fields: [aiMessages.threadId],
    references: [aiThreads.id],
  }),
}));

export const aiDocsRelations = relations(aiDocs, ({ one, many }) => ({
  user: one(users, {
    fields: [aiDocs.userId],
    references: [users.id],
  }),
  chunks: many(aiChunks),
}));

export const aiChunksRelations = relations(aiChunks, ({ one, many }) => ({
  doc: one(aiDocs, {
    fields: [aiChunks.docId],
    references: [aiDocs.id],
  }),
  embeddings: many(aiEmbeddings),
}));

export const aiEmbeddingsRelations = relations(aiEmbeddings, ({ one }) => ({
  chunk: one(aiChunks, {
    fields: [aiEmbeddings.chunkId],
    references: [aiChunks.id],
  }),
}));

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiLogs.userId],
    references: [users.id],
  }),
  thread: one(aiThreads, {
    fields: [aiLogs.threadId],
    references: [aiThreads.id],
  }),
}));

// AI Hub Insert Schemas
export const insertAiThreadSchema = createInsertSchema(aiThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiMessageSchema = createInsertSchema(aiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAiDocSchema = createInsertSchema(aiDocs).omit({
  id: true,
  uploadedAt: true,
});

export const insertAiChunkSchema = createInsertSchema(aiChunks).omit({
  id: true,
});

export const insertAiEmbeddingSchema = createInsertSchema(aiEmbeddings).omit({
  id: true,
});

export const insertAiLogSchema = createInsertSchema(aiLogs).omit({
  id: true,
  createdAt: true,
});

// AI Hub Types
export type AiThread = typeof aiThreads.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type AiDoc = typeof aiDocs.$inferSelect;
export type AiChunk = typeof aiChunks.$inferSelect;
export type AiEmbedding = typeof aiEmbeddings.$inferSelect;
export type AiLog = typeof aiLogs.$inferSelect;

export type InsertAiThread = z.infer<typeof insertAiThreadSchema>;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type InsertAiDoc = z.infer<typeof insertAiDocSchema>;
export type InsertAiChunk = z.infer<typeof insertAiChunkSchema>;
export type InsertAiEmbedding = z.infer<typeof insertAiEmbeddingSchema>;
export type InsertAiLog = z.infer<typeof insertAiLogSchema>;
