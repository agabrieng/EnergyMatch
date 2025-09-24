import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password"),
  role: text("role").notNull().default("user"), // user, comercializadora, admin
  phone: text("phone"),
  documentType: text("document_type"), // "cpf" or "cnpj"
  documentNumber: text("document_number"),
  googleId: text("google_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
}));

export const comercializadoras = pgTable("comercializadoras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyName: text("company_name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  aneelRegistration: text("aneel_registration").notNull(),
  serviceAreas: text("service_areas").notNull(),
  description: text("description"),
  affiliateLink: text("affiliate_link"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("comercializadoras_user_id_idx").on(table.userId),
  approvedIdx: index("comercializadoras_approved_idx").on(table.isApproved),
}));

export const purchaseIntents = pgTable("purchase_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  comercializadoraId: varchar("comercializadora_id").notNull().references(() => comercializadoras.id),
  affiliateComercializadoraId: varchar("affiliate_comercializadora_id").references(() => comercializadoras.id), // Comercializadora que recebe crédito pelo link de afiliado
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  documentType: text("document_type").notNull(), // "cpf" or "cnpj"
  documentNumber: text("document_number").notNull(),
  billValue: text("bill_value").notNull(),
  consumptionType: text("consumption_type").notNull(),
  additionalInfo: text("additional_info"),
  invoiceFilePath: text("invoice_file_path"), // Path to uploaded PDF invoice
  status: text("status").notNull().default("active"), // active, closed, cancelled
  userReceivedResponse: boolean("user_received_response").default(false), // Se o usuário já recebeu resposta
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("purchase_intents_user_id_idx").on(table.userId),
  comercializadoraIdIdx: index("purchase_intents_comercializadora_id_idx").on(table.comercializadoraId),
  affiliateComercializadoraIdIdx: index("purchase_intents_affiliate_comercializadora_id_idx").on(table.affiliateComercializadoraId),
  statusIdx: index("purchase_intents_status_idx").on(table.status),
}));

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentId: varchar("intent_id").notNull().references(() => purchaseIntents.id),
  comercializadoraId: varchar("comercializadora_id").notNull().references(() => comercializadoras.id),
  discount: integer("discount").notNull(),
  contractTerm: integer("contract_term").notNull(),
  details: text("details").notNull(),
  startDate: timestamp("start_date").notNull(),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  intentIdIdx: index("proposals_intent_id_idx").on(table.intentId),
  comercializadoraIdIdx: index("proposals_comercializadora_id_idx").on(table.comercializadoraId),
  statusIdx: index("proposals_status_idx").on(table.status),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  comercializadora: one(comercializadoras, {
    fields: [users.id],
    references: [comercializadoras.userId],
  }),
  purchaseIntents: many(purchaseIntents),
}));

export const comercializadorasRelations = relations(comercializadoras, ({ one, many }) => ({
  user: one(users, {
    fields: [comercializadoras.userId],
    references: [users.id],
  }),
  proposals: many(proposals),
  purchaseIntents: many(purchaseIntents),
}));

export const purchaseIntentsRelations = relations(purchaseIntents, ({ one, many }) => ({
  user: one(users, {
    fields: [purchaseIntents.userId],
    references: [users.id],
  }),
  comercializadora: one(comercializadoras, {
    fields: [purchaseIntents.comercializadoraId],
    references: [comercializadoras.id],
  }),
  affiliateComercializadora: one(comercializadoras, {
    fields: [purchaseIntents.affiliateComercializadoraId],
    references: [comercializadoras.id],
  }),
  proposals: many(proposals),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  intent: one(purchaseIntents, {
    fields: [proposals.intentId],
    references: [purchaseIntents.id],
  }),
  comercializadora: one(comercializadoras, {
    fields: [proposals.comercializadoraId],
    references: [comercializadoras.id],
  }),
}));

export const userPartnerAccesses = pgTable("user_partner_accesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  comercializadoraId: varchar("comercializadora_id").notNull().references(() => comercializadoras.id),
  accessId: varchar("access_id").notNull(), // ID do localStorage
  firstAccess: timestamp("first_access").notNull(),
  lastAccess: timestamp("last_access").notNull(),
  receivedResponse: boolean("received_response").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_partner_accesses_user_id_idx").on(table.userId),
  comercializadoraIdIdx: index("user_partner_accesses_comercializadora_id_idx").on(table.comercializadoraId),
  accessIdIdx: index("user_partner_accesses_access_id_idx").on(table.accessId),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertComercializadoraSchema = createInsertSchema(comercializadoras).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseIntentSchema = createInsertSchema(purchaseIntents).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertUserPartnerAccessSchema = createInsertSchema(userPartnerAccesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Comercializadora = typeof comercializadoras.$inferSelect;
export type InsertComercializadora = z.infer<typeof insertComercializadoraSchema>;
export type PurchaseIntent = typeof purchaseIntents.$inferSelect;
export type InsertPurchaseIntent = z.infer<typeof insertPurchaseIntentSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type UserPartnerAccess = typeof userPartnerAccesses.$inferSelect;
export type InsertUserPartnerAccess = z.infer<typeof insertUserPartnerAccessSchema>;
