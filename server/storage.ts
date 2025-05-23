import {
  users, tokens, arbitrageOpportunities, walletTrackings, transactionHistory,
  type User, type Token, type ArbitrageOpportunity, type WalletTracking, type TransactionHistory,
  type InsertUser, type InsertToken, type InsertArbitrageOpportunity, type InsertWalletTracking, type InsertTransactionHistory,
  type SystemStatus, type ActivityLogEntry, type ArbitrageSettings, type TokenSnipeSettings, type WalletTrackingSettings, type AutoTradingSettings,
  type SolanaNetworkStatus, type ApiStatus
} from "../shared/schema.js";
import { sql } from 'drizzle-orm';
import { eq, desc } from 'drizzle-orm';
import { db, pool } from './db.js';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Token methods
  getToken(id: number): Promise<Token | undefined>;
  getTokenByAddress(address: string): Promise<Token | undefined>;
  getTokenBySymbol(symbol: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;
  getAllTokens(): Promise<Token[]>;
  
  // Arbitrage opportunity methods
  getArbitrageOpportunity(id: number): Promise<ArbitrageOpportunity | undefined>;
  createArbitrageOpportunity(opportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity>;
  getArbitrageOpportunities(limit?: number): Promise<ArbitrageOpportunity[]>;
  updateArbitrageOpportunity(id: number, executed: boolean): Promise<ArbitrageOpportunity | undefined>;
  
  // Wallet tracking methods
  getWalletTracking(id: number): Promise<WalletTracking | undefined>;
  getWalletTrackingByAddress(address: string): Promise<WalletTracking | undefined>;
  createWalletTracking(tracking: InsertWalletTracking): Promise<WalletTracking>;
  getAllWalletTrackings(): Promise<WalletTracking[]>;
  updateWalletTracking(id: number, active: boolean): Promise<WalletTracking | undefined>;
  
  // Transaction history methods
  getTransactionHistory(id: number): Promise<TransactionHistory | undefined>;
  createTransactionHistory(history: InsertTransactionHistory): Promise<TransactionHistory>;
  getTransactionHistoryByType(type: string, limit?: number): Promise<TransactionHistory[]>;
  
  // System status methods
  getSystemStatus(): Promise<SystemStatus>;
  updateSystemStatus(status: Partial<SystemStatus>): Promise<SystemStatus>;
  
  // Activity log methods
  addActivityLog(entry: ActivityLogEntry): Promise<void>;
  getActivityLogs(limit?: number): Promise<ActivityLogEntry[]>;
  
  // Settings methods
  getArbitrageSettings(): Promise<ArbitrageSettings>;
  updateArbitrageSettings(settings: Partial<ArbitrageSettings>): Promise<ArbitrageSettings>;
  getTokenSnipeSettings(): Promise<TokenSnipeSettings>;
  updateTokenSnipeSettings(settings: Partial<TokenSnipeSettings>): Promise<TokenSnipeSettings>;
  getWalletTrackingSettings(): Promise<WalletTrackingSettings>;
  updateWalletTrackingSettings(settings: Partial<WalletTrackingSettings>): Promise<WalletTrackingSettings>;
  getAutoTradingSettings(): Promise<AutoTradingSettings>;
  updateAutoTradingSettings(settings: Partial<AutoTradingSettings>): Promise<AutoTradingSettings>;
  
  // Network status methods
  getSolanaNetworkStatus(): Promise<SolanaNetworkStatus>;
  updateSolanaNetworkStatus(status: Partial<SolanaNetworkStatus>): Promise<SolanaNetworkStatus>;
  
  // API status methods
  getApiStatus(name: string): Promise<ApiStatus | undefined>;
  updateApiStatus(name: string, status: Partial<ApiStatus>): Promise<ApiStatus>;
  getAllApiStatuses(): Promise<Record<string, ApiStatus>>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<number, Token>;
  private arbitrageOpportunities: Map<number, ArbitrageOpportunity>;
  private walletTrackings: Map<number, WalletTracking>;
  private transactionHistory: Map<number, TransactionHistory>;
  private activityLogs: ActivityLogEntry[];
  private systemStatus: SystemStatus;
  private arbitrageSettings: ArbitrageSettings;
  private tokenSnipeSettings: TokenSnipeSettings;
  private walletTrackingSettings: WalletTrackingSettings;
  private autoTradingSettings: AutoTradingSettings;
  private solanaNetworkStatus: SolanaNetworkStatus;
  private apiStatuses: Record<string, ApiStatus>;
  
  private currentUserId: number;
  private currentTokenId: number;
  private currentArbitrageId: number;
  private currentWalletTrackingId: number;
  private currentTransactionHistoryId: number;

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.arbitrageOpportunities = new Map();
    this.walletTrackings = new Map();
    this.transactionHistory = new Map();
    this.activityLogs = [];
    
    this.currentUserId = 1;
    this.currentTokenId = 1;
    this.currentArbitrageId = 1;
    this.currentWalletTrackingId = 1;
    this.currentTransactionHistoryId = 1;
    
    // Initialize system status
    this.systemStatus = {
      scanRate: 0,
      responseTime: 0,
      websocketPing: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      apiStatuses: {},
      lastUpdated: new Date()
    };
    
    // Initialize settings
    this.arbitrageSettings = {
      minSpreadPercentage: 1.5,
      executionSpeed: 'balanced',
      minLiquidity: 5000,
      dexes: ['Jupiter', 'Raydium', 'Orca'],
      autoExecution: false
    };
    
    this.tokenSnipeSettings = {
      minLiquidity: 1000,
      maxSlippage: 5,
      autoBuy: false,
      maxBuyAmount: 0.1
    };
    
    this.walletTrackingSettings = {
      addresses: [],
      followTransactionTypes: ['swap', 'mint'],
      minTransactionValue: 1000,
      autoFollow: false
    };
    
    this.autoTradingSettings = {
      active: false,
      tradingPairs: ['SOL/USDC'],
      strategy: 'MACD',
      maxPositionSize: 1,
      stopLoss: 5,
      takeProfit: 10
    };
    
    this.solanaNetworkStatus = {
      status: 'Healthy',
      tps: 0,
      price: '0',
      priceChange: '0',
      gasPrice: '0'
    };
    
    this.apiStatuses = {
      helius: { name: 'Helius RPC', connected: false },
      jupiter: { name: 'Jupiter API', connected: false },
      coingecko: { name: 'CoinGecko', connected: false },
      coinmarketcap: { name: 'CoinMarketCap', connected: false },
      quicknode: { name: 'QuickNode', connected: false }
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Token methods
  async getToken(id: number): Promise<Token | undefined> {
    return this.tokens.get(id);
  }
  
  async getTokenByAddress(address: string): Promise<Token | undefined> {
    return Array.from(this.tokens.values()).find(
      (token) => token.address === address,
    );
  }
  
  async getTokenBySymbol(symbol: string): Promise<Token | undefined> {
    return Array.from(this.tokens.values()).find(
      (token) => token.symbol === symbol,
    );
  }
  
  async createToken(insertToken: InsertToken): Promise<Token> {
    const id = this.currentTokenId++;
    const token: Token = { 
      ...insertToken, 
      id,
      logoUrl: insertToken.logoUrl || null,
      coingeckoId: insertToken.coingeckoId || null,
      cmcId: insertToken.cmcId || null
    };
    this.tokens.set(id, token);
    return token;
  }
  
  async getAllTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
  }
  
  // Arbitrage opportunity methods
  async getArbitrageOpportunity(id: number): Promise<ArbitrageOpportunity | undefined> {
    return this.arbitrageOpportunities.get(id);
  }
  
  async createArbitrageOpportunity(insertOpportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity> {
    try {
      // Plutôt que d'utiliser this.currentArbitrageId qui peut causer des conflits,
      // on va d'abord vérifier le plus grand ID existant dans la table
      const maxIdResult = await db
        .select({ maxId: sql`MAX(id)` })
        .from(arbitrageOpportunities);
      
      // Calculer le prochain ID disponible (+1 par rapport au max actuel, ou 1 si table vide)
      const nextId = maxIdResult[0].maxId ? Number(maxIdResult[0].maxId) + 1 : 1;
      
      // Mise à jour de notre compteur interne pour les prochaines insertions
      this.currentArbitrageId = nextId + 1;
      
      const opportunity: ArbitrageOpportunity = { 
        ...insertOpportunity, 
        id: nextId, 
        timestamp: new Date(),
        executed: insertOpportunity.executed || null,
        volume24h: insertOpportunity.volume24h || null,
        liquidity: insertOpportunity.liquidity || null
      };
      
      const [opportunityResult] = await db.insert(arbitrageOpportunities).values(opportunity).returning();
      return opportunityResult;
    } catch (error) {
      console.error('Error creating arbitrage opportunity:', error);
      throw error;
    }
  }
  
  async getArbitrageOpportunities(limit?: number): Promise<ArbitrageOpportunity[]> {
    const opportunities = Array.from(this.arbitrageOpportunities.values())
      .sort((a, b) => {
        // Sort by timestamp desc
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    
    return limit ? opportunities.slice(0, limit) : opportunities;
  }
  
  async updateArbitrageOpportunity(id: number, executed: boolean): Promise<ArbitrageOpportunity | undefined> {
    const opportunity = await this.getArbitrageOpportunity(id);
    if (!opportunity) return undefined;
    
    const updatedOpportunity: ArbitrageOpportunity = {
      ...opportunity,
      executed
    };
    
    this.arbitrageOpportunities.set(id, updatedOpportunity);
    return updatedOpportunity;
  }
  
  // Wallet tracking methods
  async getWalletTracking(id: number): Promise<WalletTracking | undefined> {
    return this.walletTrackings.get(id);
  }
  
  async getWalletTrackingByAddress(address: string): Promise<WalletTracking | undefined> {
    return Array.from(this.walletTrackings.values()).find(
      (tracking) => tracking.address === address,
    );
  }
  
  async createWalletTracking(insertTracking: InsertWalletTracking): Promise<WalletTracking> {
    const id = this.currentWalletTrackingId++;
    const tracking: WalletTracking = { 
      ...insertTracking, 
      id,
      active: insertTracking.active || null,
      alias: insertTracking.alias || null
    };
    this.walletTrackings.set(id, tracking);
    return tracking;
  }
  
  async getAllWalletTrackings(): Promise<WalletTracking[]> {
    return Array.from(this.walletTrackings.values());
  }
  
  async updateWalletTracking(id: number, active: boolean): Promise<WalletTracking | undefined> {
    const tracking = await this.getWalletTracking(id);
    if (!tracking) return undefined;
    
    const updatedTracking: WalletTracking = {
      ...tracking,
      active
    };
    
    this.walletTrackings.set(id, updatedTracking);
    return updatedTracking;
  }
  
  // Transaction history methods
  async getTransactionHistory(id: number): Promise<TransactionHistory | undefined> {
    return this.transactionHistory.get(id);
  }
  
  async createTransactionHistory(insertHistory: InsertTransactionHistory): Promise<TransactionHistory> {
    const id = this.currentTransactionHistoryId++;
    const history: TransactionHistory = { 
      ...insertHistory, 
      id,
      timestamp: new Date(),
      txDetails: insertHistory.txDetails || null
    };
    this.transactionHistory.set(id, history);
    return history;
  }
  
  async getTransactionHistoryByType(type: string, limit?: number): Promise<TransactionHistory[]> {
    const history = Array.from(this.transactionHistory.values())
      .filter(record => record.type === type)
      .sort((a, b) => {
        // Sort by timestamp desc
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    
    return limit ? history.slice(0, limit) : history;
  }
  
  // System status methods
  async getSystemStatus(): Promise<SystemStatus> {
    return {
      ...this.systemStatus,
      apiStatuses: { ...this.apiStatuses }
    };
  }
  
  async updateSystemStatus(status: Partial<SystemStatus>): Promise<SystemStatus> {
    this.systemStatus = {
      ...this.systemStatus,
      ...status,
      lastUpdated: new Date()
    };
    
    if (status.apiStatuses) {
      this.apiStatuses = {
        ...this.apiStatuses,
        ...status.apiStatuses
      };
    }
    
    return this.systemStatus;
  }
  
  // Activity log methods
  async addActivityLog(entry: ActivityLogEntry): Promise<void> {
    this.activityLogs.unshift(entry);
    
    // Keep only the last 100 logs
    if (this.activityLogs.length > 100) {
      this.activityLogs = this.activityLogs.slice(0, 100);
    }
  }
  
  async getActivityLogs(limit = 15): Promise<ActivityLogEntry[]> {
    return this.activityLogs.slice(0, limit);
  }
  
  // Settings methods
  async getArbitrageSettings(): Promise<ArbitrageSettings> {
    return { ...this.arbitrageSettings };
  }
  
  async updateArbitrageSettings(settings: Partial<ArbitrageSettings>): Promise<ArbitrageSettings> {
    this.arbitrageSettings = {
      ...this.arbitrageSettings,
      ...settings
    };
    return this.arbitrageSettings;
  }
  
  async getTokenSnipeSettings(): Promise<TokenSnipeSettings> {
    return { ...this.tokenSnipeSettings };
  }
  
  async updateTokenSnipeSettings(settings: Partial<TokenSnipeSettings>): Promise<TokenSnipeSettings> {
    this.tokenSnipeSettings = {
      ...this.tokenSnipeSettings,
      ...settings
    };
    return this.tokenSnipeSettings;
  }
  
  async getWalletTrackingSettings(): Promise<WalletTrackingSettings> {
    return { ...this.walletTrackingSettings };
  }
  
  async updateWalletTrackingSettings(settings: Partial<WalletTrackingSettings>): Promise<WalletTrackingSettings> {
    this.walletTrackingSettings = {
      ...this.walletTrackingSettings,
      ...settings
    };
    return this.walletTrackingSettings;
  }
  
  async getAutoTradingSettings(): Promise<AutoTradingSettings> {
    return { ...this.autoTradingSettings };
  }
  
  async updateAutoTradingSettings(settings: Partial<AutoTradingSettings>): Promise<AutoTradingSettings> {
    this.autoTradingSettings = {
      ...this.autoTradingSettings,
      ...settings
    };
    return this.autoTradingSettings;
  }
  
  // Network status methods
  async getSolanaNetworkStatus(): Promise<SolanaNetworkStatus> {
    return { ...this.solanaNetworkStatus };
  }
  
  async updateSolanaNetworkStatus(status: Partial<SolanaNetworkStatus>): Promise<SolanaNetworkStatus> {
    this.solanaNetworkStatus = {
      ...this.solanaNetworkStatus,
      ...status
    };
    return this.solanaNetworkStatus;
  }
  
  // API status methods
  async getApiStatus(name: string): Promise<ApiStatus | undefined> {
    return this.apiStatuses[name];
  }
  
  async updateApiStatus(name: string, status: Partial<ApiStatus>): Promise<ApiStatus> {
    this.apiStatuses[name] = {
      ...this.apiStatuses[name],
      ...status
    };
    return this.apiStatuses[name];
  }
  
  async getAllApiStatuses(): Promise<Record<string, ApiStatus>> {
    return { ...this.apiStatuses };
  }
}

// Remplacez le stockage en mémoire par le stockage en base de données
// import { db, pool } from './db.js';

export class DatabaseStorage implements IStorage {
  private currentTokenId: number = 1;
  private currentArbitrageId: number = 1;
  private currentWalletTrackingId: number = 1;
  private currentTransactionHistoryId: number = 1;
  
  private apiStatuses: Record<string, ApiStatus> = {
    helius: {
      name: 'Helius RPC',
      connected: false,
      requestsPerSecond: 0
    },
    jupiter: {
      name: 'Jupiter API',
      connected: false,
      requestsPerSecond: 0
    },
    coingecko: {
      name: 'CoinGecko',
      connected: false,
      requestsPerSecond: 0
    },
    coinmarketcap: {
      name: 'CoinMarketCap',
      connected: false,
      requestsPerSecond: 0
    },
    quicknode: {
      name: 'QuickNode',
      connected: false,
      requestsPerSecond: 0
    }
  };

  private arbitrageSettings: ArbitrageSettings = {
    minSpreadPercentage: 1.5,
    executionSpeed: 'balanced',
    minLiquidity: 5000,
    dexes: ['Jupiter', 'Raydium', 'Orca'],
    autoExecution: false
  };
  
  private tokenSnipeSettings: TokenSnipeSettings = {
    minLiquidity: 1000,
    maxSlippage: 5,
    autoBuy: false,
    maxBuyAmount: 0.1
  };
  
  private walletTrackingSettings: WalletTrackingSettings = {
    addresses: [],
    followTransactionTypes: ['swap', 'mint'],
    minTransactionValue: 1000,
    autoFollow: false
  };
  
  private autoTradingSettings: AutoTradingSettings = {
    active: false,
    tradingPairs: ['SOL/USDC'],
    strategy: 'MACD',
    maxPositionSize: 1,
    stopLoss: 5,
    takeProfit: 10
  };
  
  private solanaNetworkStatus: SolanaNetworkStatus = {
    status: 'Healthy',
    tps: 0,
    price: '0',
    priceChange: '0',
    gasPrice: '0'
  };
  
  private systemStatus: SystemStatus = {
    scanRate: 0,
    responseTime: 0,
    websocketPing: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    apiStatuses: this.apiStatuses,
    lastUpdated: new Date()
  };

  constructor() {
    // Initialize settings from database or use defaults
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      // Get settings from database
      const result = await pool.query(`
        SELECT key, value FROM system_settings
        WHERE key IN ('arbitrageSettings', 'tokenSnipeSettings', 'walletTrackingSettings', 'autoTradingSettings', 'solanaNetworkStatus')
      `);
      
      for (const row of result.rows) {
        try {
          // Vérifier si la valeur est déjà un objet
          const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
          
          switch (row.key) {
            case 'arbitrageSettings':
              this.arbitrageSettings = value;
              break;
            case 'tokenSnipeSettings':
              this.tokenSnipeSettings = value;
              break;
            case 'walletTrackingSettings':
              this.walletTrackingSettings = value;
              break;
            case 'autoTradingSettings':
              this.autoTradingSettings = value;
              break;
            case 'solanaNetworkStatus':
              this.solanaNetworkStatus = value;
              break;
          }
        } catch (parseError) {
          console.error(`Error parsing settings for ${row.key}:`, parseError);
          // Continuer avec les paramètres par défaut pour cette clé
        }
      }

      console.log('Settings loaded from database');
    } catch (error) {
      console.error('Error loading settings:', error);
      // Default settings will be used
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Token operations
  async getToken(id: number): Promise<Token | undefined> {
    try {
      const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return undefined;
    }
  }
  
  async getTokenByAddress(address: string): Promise<Token | undefined> {
    try {
      const [token] = await db.select().from(tokens).where(eq(tokens.address, address));
      return token;
    } catch (error) {
      console.error('Error getting token by address:', error);
      return undefined;
    }
  }
  
  async getTokenBySymbol(symbol: string): Promise<Token | undefined> {
    try {
      const [token] = await db.select().from(tokens).where(eq(tokens.symbol, symbol));
      return token;
    } catch (error) {
      console.error('Error getting token by symbol:', error);
      return undefined;
    }
  }
  
  async createToken(insertToken: InsertToken): Promise<Token> {
    try {
      const id = this.currentTokenId++;
      const token: Token = { 
        ...insertToken, 
        id,
        logoUrl: insertToken.logoUrl || null,
        coingeckoId: insertToken.coingeckoId || null,
        cmcId: insertToken.cmcId || null
      };
      const [tokenResult] = await db.insert(tokens).values(token).returning();
      return tokenResult;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }
  
  async getAllTokens(): Promise<Token[]> {
    try {
      const allTokens = await db.select().from(tokens);
      return allTokens;
    } catch (error) {
      console.error('Error getting all tokens:', error);
      return [];
    }
  }
  
  // Arbitrage opportunity operations
  async getArbitrageOpportunity(id: number): Promise<ArbitrageOpportunity | undefined> {
    try {
      const [opportunity] = await db.select().from(arbitrageOpportunities).where(eq(arbitrageOpportunities.id, id));
      return opportunity;
    } catch (error) {
      console.error('Error getting arbitrage opportunity:', error);
      return undefined;
    }
  }
  
  async createArbitrageOpportunity(insertOpportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity> {
    try {
      // Plutôt que d'utiliser this.currentArbitrageId qui peut causer des conflits,
      // on va d'abord vérifier le plus grand ID existant dans la table
      const maxIdResult = await db
        .select({ maxId: sql`MAX(id)` })
        .from(arbitrageOpportunities);
      
      // Calculer le prochain ID disponible (+1 par rapport au max actuel, ou 1 si table vide)
      const nextId = maxIdResult[0].maxId ? Number(maxIdResult[0].maxId) + 1 : 1;
      
      // Mise à jour de notre compteur interne pour les prochaines insertions
      this.currentArbitrageId = nextId + 1;
      
      const opportunity: ArbitrageOpportunity = { 
        ...insertOpportunity, 
        id: nextId, 
        timestamp: new Date(),
        executed: insertOpportunity.executed || null,
        volume24h: insertOpportunity.volume24h || null,
        liquidity: insertOpportunity.liquidity || null
      };
      
      const [opportunityResult] = await db.insert(arbitrageOpportunities).values(opportunity).returning();
      return opportunityResult;
    } catch (error) {
      console.error('Error creating arbitrage opportunity:', error);
      throw error;
    }
  }
  
  async getArbitrageOpportunities(limit?: number): Promise<ArbitrageOpportunity[]> {
    try {
      let query = db.select().from(arbitrageOpportunities).orderBy(desc(arbitrageOpportunities.timestamp));
      
      if (limit) {
        query = query.limit(limit) as any;
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting arbitrage opportunities:', error);
      return [];
    }
  }
  
  async updateArbitrageOpportunity(id: number, executed: boolean): Promise<ArbitrageOpportunity | undefined> {
    try {
      const [opportunity] = await db
        .update(arbitrageOpportunities)
        .set({ executed })
        .where(eq(arbitrageOpportunities.id, id))
        .returning();
        
      return opportunity;
    } catch (error) {
      console.error('Error updating arbitrage opportunity:', error);
      return undefined;
    }
  }
  
  // Wallet tracking operations
  async getWalletTracking(id: number): Promise<WalletTracking | undefined> {
    try {
      const [tracking] = await db.select().from(walletTrackings).where(eq(walletTrackings.id, id));
      return tracking;
    } catch (error) {
      console.error('Error getting wallet tracking:', error);
      return undefined;
    }
  }
  
  async getWalletTrackingByAddress(address: string): Promise<WalletTracking | undefined> {
    try {
      const [tracking] = await db.select().from(walletTrackings).where(eq(walletTrackings.address, address));
      return tracking;
    } catch (error) {
      console.error('Error getting wallet tracking by address:', error);
      return undefined;
    }
  }
  
  async createWalletTracking(insertTracking: InsertWalletTracking): Promise<WalletTracking> {
    try {
      const id = this.currentWalletTrackingId++;
      const tracking: WalletTracking = { 
        ...insertTracking, 
        id,
        active: insertTracking.active || null,
        alias: insertTracking.alias || null
      };
      const [trackingResult] = await db.insert(walletTrackings).values(tracking).returning();
      return trackingResult;
    } catch (error) {
      console.error('Error creating wallet tracking:', error);
      throw error;
    }
  }
  
  async getAllWalletTrackings(): Promise<WalletTracking[]> {
    try {
      const allTrackings = await db.select().from(walletTrackings);
      return allTrackings;
    } catch (error) {
      console.error('Error getting all wallet trackings:', error);
      return [];
    }
  }
  
  async updateWalletTracking(id: number, active: boolean): Promise<WalletTracking | undefined> {
    try {
      const [tracking] = await db
        .update(walletTrackings)
        .set({ active })
        .where(eq(walletTrackings.id, id))
        .returning();
        
      return tracking;
    } catch (error) {
      console.error('Error updating wallet tracking:', error);
      return undefined;
    }
  }
  
  // Transaction history operations
  async getTransactionHistory(id: number): Promise<TransactionHistory | undefined> {
    try {
      const [history] = await db.select().from(transactionHistory).where(eq(transactionHistory.id, id));
      return history;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return undefined;
    }
  }
  
  async createTransactionHistory(insertHistory: InsertTransactionHistory): Promise<TransactionHistory> {
    try {
      const id = this.currentTransactionHistoryId++;
      const history: TransactionHistory = { 
        ...insertHistory, 
        id,
        timestamp: new Date(),
        txDetails: insertHistory.txDetails || null
      };
      const [historyResult] = await db.insert(transactionHistory).values(history).returning();
      return historyResult;
    } catch (error) {
      console.error('Error creating transaction history:', error);
      throw error;
    }
  }
  
  async getTransactionHistoryByType(type: string, limit?: number): Promise<TransactionHistory[]> {
    try {
      let query = db
        .select()
        .from(transactionHistory)
        .where(eq(transactionHistory.type, type))
        .orderBy(desc(transactionHistory.timestamp));
      
      if (limit) {
        query = query.limit(limit) as any;
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting transaction history by type:', error);
      return [];
    }
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'systemStatus'
      `);
      
      if (result.rowCount && result.rowCount > 0) {
        const systemStatus = JSON.parse(result.rows[0].value);
        return {
          ...systemStatus,
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error('Error getting system status:', error);
    }
    
    return {
      ...this.systemStatus,
      lastUpdated: new Date()
    };
  }
  
  async updateSystemStatus(status: Partial<SystemStatus>): Promise<SystemStatus> {
    try {
      const currentStatus = await this.getSystemStatus();
      const updatedStatus = {
        ...currentStatus,
        ...status,
        lastUpdated: new Date()
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('systemStatus', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedStatus)]);
      
      this.systemStatus = updatedStatus;
      return updatedStatus;
    } catch (error) {
      console.error('Error updating system status:', error);
      return this.systemStatus;
    }
  }
  
  // Activity log operations
  async addActivityLog(entry: ActivityLogEntry): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO activity_logs (timestamp, message, type)
        VALUES ($1, $2, $3)
      `, [entry.timestamp, entry.message, entry.type]);
      
      // Keep only the most recent 100 logs
      await pool.query(`
        DELETE FROM activity_logs
        WHERE id NOT IN (
          SELECT id FROM activity_logs
          ORDER BY timestamp DESC
          LIMIT 100
        )
      `);
    } catch (error) {
      console.error('Error adding activity log:', error);
    }
  }
  
  async getActivityLogs(limit = 15): Promise<ActivityLogEntry[]> {
    try {
      const result = await pool.query(`
        SELECT timestamp, message, type FROM activity_logs
        ORDER BY timestamp DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }
  
  // Settings operations
  async getArbitrageSettings(): Promise<ArbitrageSettings> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'arbitrageSettings'
      `);
      
      if (result?.rowCount && result.rowCount > 0) {
        return JSON.parse(result.rows[0].value);
      }
    } catch (error) {
      console.error('Error getting arbitrage settings:', error);
    }
    
    return this.arbitrageSettings;
  }
  
  async updateArbitrageSettings(settings: Partial<ArbitrageSettings>): Promise<ArbitrageSettings> {
    try {
      const currentSettings = await this.getArbitrageSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('arbitrageSettings', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedSettings)]);
      
      this.arbitrageSettings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Error updating arbitrage settings:', error);
      return this.arbitrageSettings;
    }
  }
  
  async getTokenSnipeSettings(): Promise<TokenSnipeSettings> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'tokenSnipeSettings'
      `);
      
      if (result?.rowCount && result.rowCount > 0) {
        return JSON.parse(result.rows[0].value);
      }
    } catch (error) {
      console.error('Error getting token snipe settings:', error);
    }
    
    return this.tokenSnipeSettings;
  }
  
  async updateTokenSnipeSettings(settings: Partial<TokenSnipeSettings>): Promise<TokenSnipeSettings> {
    try {
      const currentSettings = await this.getTokenSnipeSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('tokenSnipeSettings', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedSettings)]);
      
      this.tokenSnipeSettings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Error updating token snipe settings:', error);
      return this.tokenSnipeSettings;
    }
  }
  
  async getWalletTrackingSettings(): Promise<WalletTrackingSettings> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'walletTrackingSettings'
      `);
      
      if (result?.rowCount && result.rowCount > 0) {
        return JSON.parse(result.rows[0].value);
      }
    } catch (error) {
      console.error('Error getting wallet tracking settings:', error);
    }
    
    return this.walletTrackingSettings;
  }
  
  async updateWalletTrackingSettings(settings: Partial<WalletTrackingSettings>): Promise<WalletTrackingSettings> {
    try {
      const currentSettings = await this.getWalletTrackingSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('walletTrackingSettings', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedSettings)]);
      
      this.walletTrackingSettings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Error updating wallet tracking settings:', error);
      return this.walletTrackingSettings;
    }
  }
  
  async getAutoTradingSettings(): Promise<AutoTradingSettings> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'autoTradingSettings'
      `);
      
      if (result?.rowCount && result.rowCount > 0) {
        return JSON.parse(result.rows[0].value);
      }
    } catch (error) {
      console.error('Error getting auto trading settings:', error);
    }
    
    return this.autoTradingSettings;
  }
  
  async updateAutoTradingSettings(settings: Partial<AutoTradingSettings>): Promise<AutoTradingSettings> {
    try {
      const currentSettings = await this.getAutoTradingSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('autoTradingSettings', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedSettings)]);
      
      this.autoTradingSettings = updatedSettings;
      return updatedSettings;
    } catch (error) {
      console.error('Error updating auto trading settings:', error);
      return this.autoTradingSettings;
    }
  }
  
  // Network status operations
  async getSolanaNetworkStatus(): Promise<SolanaNetworkStatus> {
    try {
      const result = await pool.query(`
        SELECT value FROM system_settings WHERE key = 'solanaNetworkStatus'
      `);
      
      if (result.rowCount && result.rowCount > 0) {
        try {
          // Vérifier si la valeur est déjà un objet
          if (typeof result.rows[0].value === 'object') {
            return result.rows[0].value;
          }
          // Sinon essayer de parser le JSON
          return JSON.parse(result.rows[0].value);
        } catch (parseError) {
          console.error('Error parsing Solana network status JSON:', parseError);
          return this.solanaNetworkStatus;
        }
      }
    } catch (error) {
      console.error('Error getting Solana network status:', error);
    }
    
    return this.solanaNetworkStatus;
  }
  
  async updateSolanaNetworkStatus(status: Partial<SolanaNetworkStatus>): Promise<SolanaNetworkStatus> {
    try {
      const currentStatus = await this.getSolanaNetworkStatus();
      const updatedStatus = {
        ...currentStatus,
        ...status
      };
      
      await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt)
        VALUES ('solanaNetworkStatus', $1, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = $1, updatedAt = NOW()
      `, [JSON.stringify(updatedStatus)]);
      
      this.solanaNetworkStatus = updatedStatus;
      return updatedStatus;
    } catch (error) {
      console.error('Error updating Solana network status:', error);
      return this.solanaNetworkStatus;
    }
  }
  
  // API status operations
  async getApiStatus(name: string): Promise<ApiStatus | undefined> {
    return this.apiStatuses[name];
  }
  
  async updateApiStatus(name: string, status: Partial<ApiStatus>): Promise<ApiStatus> {
    const apiStatus = this.apiStatuses[name] || {
      name,
      connected: false,
      requestsPerSecond: 0
    };
    
    this.apiStatuses[name] = {
      ...apiStatus,
      ...status
    };
    
    return this.apiStatuses[name];
  }
  
  async getAllApiStatuses(): Promise<Record<string, ApiStatus>> {
    return this.apiStatuses;
  }
}

// Utilisation du stockage en base de données au lieu du stockage en mémoire
export const storage = new DatabaseStorage();
