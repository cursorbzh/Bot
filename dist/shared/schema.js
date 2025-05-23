import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
});
export const tokens = pgTable("tokens", {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    address: text("address").notNull().unique(),
    logoUrl: text("logo_url"),
    coingeckoId: text("coingecko_id"),
    cmcId: text("cmc_id"),
});
export const arbitrageOpportunities = pgTable("arbitrage_opportunities", {
    id: serial("id").primaryKey(),
    tokenId: integer("token_id").notNull().references(() => tokens.id),
    buyDex: text("buy_dex").notNull(),
    sellDex: text("sell_dex").notNull(),
    buyPrice: text("buy_price").notNull(),
    sellPrice: text("sell_price").notNull(),
    spreadPercentage: text("spread_percentage").notNull(),
    estimatedProfit: text("estimated_profit").notNull(),
    volume24h: text("volume_24h"),
    liquidity: text("liquidity"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    executed: boolean("executed").default(false),
});
export const walletTrackings = pgTable("wallet_trackings", {
    id: serial("id").primaryKey(),
    address: text("address").notNull().unique(),
    alias: text("alias"),
    active: boolean("active").default(true),
});
export const transactionHistory = pgTable("transaction_history", {
    id: serial("id").primaryKey(),
    signature: text("signature").notNull().unique(),
    tokenId: integer("token_id").notNull().references(() => tokens.id),
    type: text("type").notNull(), // "arbitrage", "snipe", "copy"
    amount: text("amount").notNull(),
    price: text("price").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    status: text("status").notNull(), // "success", "failed", "pending"
    txDetails: text("tx_details"), // JSON string
});
// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
});
export const insertTokenSchema = createInsertSchema(tokens).pick({
    symbol: true,
    name: true,
    address: true,
    logoUrl: true,
    coingeckoId: true,
    cmcId: true,
});
export const insertArbitrageOpportunitySchema = createInsertSchema(arbitrageOpportunities).pick({
    tokenId: true,
    buyDex: true,
    sellDex: true,
    buyPrice: true,
    sellPrice: true,
    spreadPercentage: true,
    estimatedProfit: true,
    volume24h: true,
    liquidity: true,
    executed: true,
});
export const insertWalletTrackingSchema = createInsertSchema(walletTrackings).pick({
    address: true,
    alias: true,
    active: true,
});
export const insertTransactionHistorySchema = createInsertSchema(transactionHistory).pick({
    signature: true,
    tokenId: true,
    type: true,
    amount: true,
    price: true,
    status: true,
    txDetails: true,
});
// Table des paramètres système
export const systemSettings = pgTable("system_settings", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).pick({
    key: true,
    value: true,
});
export const DEFAULT_NOTIFICATION_SETTINGS = {
    enabled: false,
    telegramChatId: null,
    telegramBotToken: null,
    notifyOnArbitrage: true,
    notifyOnWalletActivity: true,
    notifyOnError: true,
    minProfitThreshold: 1.0,
    minTransactionValue: 1000
};
export const NotificationSettingsSchema = z.object({
    enabled: z.boolean(),
    telegramChatId: z.string().nullable(),
    telegramBotToken: z.string().nullable(),
    notifyOnArbitrage: z.boolean(),
    notifyOnWalletActivity: z.boolean(),
    notifyOnError: z.boolean(),
    minProfitThreshold: z.number(),
    minTransactionValue: z.number()
});
export const NotificationTestSchema = z.object({
    chatId: z.string(),
    message: z.string().optional()
});
