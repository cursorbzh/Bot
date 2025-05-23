import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from '../shared/schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Connecting to PostgreSQL database...");

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Function to push the schema to the database
export async function pushSchema() {
  try {
    // Drop and recreate system_settings table
    await pool.query(`DROP TABLE IF EXISTS system_settings CASCADE;`);
    
    const createSystemSettingsTable = `
      CREATE TABLE system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create other tables if they don't exist
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createTokensTable = `
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL UNIQUE,
        logo_url TEXT,
        coingecko_id VARCHAR(255),
        cmc_id VARCHAR(255)
      );
    `;

    const createArbitrageOpportunitiesTable = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id SERIAL PRIMARY KEY,
        token_id INTEGER REFERENCES tokens(id),
        buy_dex VARCHAR(100) NOT NULL,
        sell_dex VARCHAR(100) NOT NULL,
        buy_price VARCHAR(100) NOT NULL,
        sell_price VARCHAR(100) NOT NULL,
        spread_percentage VARCHAR(100) NOT NULL,
        estimated_profit VARCHAR(100) NOT NULL,
        volume_24h VARCHAR(100),
        liquidity VARCHAR(100),
        timestamp TIMESTAMP DEFAULT NOW(),
        executed BOOLEAN DEFAULT FALSE
      );
    `;

    const createWalletTrackingsTable = `
      CREATE TABLE IF NOT EXISTS wallet_trackings (
        id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL UNIQUE,
        alias VARCHAR(255),
        active BOOLEAN DEFAULT TRUE
      );
    `;

    const createTransactionHistoryTable = `
      CREATE TABLE IF NOT EXISTS transaction_history (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(100) NOT NULL,
        price VARCHAR(100) NOT NULL,
        token_id INTEGER REFERENCES tokens(id),
        timestamp TIMESTAMP DEFAULT NOW(),
        amount VARCHAR(100) NOT NULL,
        signature VARCHAR(255) NOT NULL,
        tx_details TEXT
      );
    `;

    const createActivityLogsTable = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL
      );
    `;

    await pool.query(createUsersTable);
    await pool.query(createTokensTable);
    await pool.query(createArbitrageOpportunitiesTable);
    await pool.query(createWalletTrackingsTable);
    await pool.query(createTransactionHistoryTable);
    await pool.query(createSystemSettingsTable);
    await pool.query(createActivityLogsTable);

    console.log("Database schema created successfully");
    return true;
  } catch (error) {
    console.error("Error creating database schema:", error);
    return false;
  }
}