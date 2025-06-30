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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
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
  userId: varchar("user_id").notNull().references(() => users.id),
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
  userId: varchar("user_id").notNull().references(() => users.id),
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
