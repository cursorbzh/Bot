declare module '@shared/schema' {
  export interface Token {
    id: number;
    symbol: string;
    name: string;
    address: string;
    logoUrl?: string;
    coingeckoId?: string;
    cmcId?: string;
  }

  export interface ArbitrageOpportunityData {
    id?: number;
    token: Token;
    buyDex: string;
    sellDex: string;
    buyPrice: string;
    sellPrice: string;
    spreadPercentage: string;
    estimatedProfit: string;
    volume24h?: string;
    liquidity?: string;
    timestamp?: Date;
    executed?: boolean;
  }

  export interface ApiStatus {
    name: string;
    connected: boolean;
    rateLimit?: string;
    requestsPerSecond?: number;
    errorMessage?: string;
  }

  export interface SystemStatus {
    scanRate: number;
    responseTime: number;
    websocketPing: number;
    cpuUsage: number;
    memoryUsage: number;
    apiStatuses: Record<string, ApiStatus>;
    lastUpdated: Date;
  }

  export interface ActivityLogEntry {
    timestamp: Date;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }

  export interface TokenSnipeSettings {
    minLiquidity: number;
    maxSlippage: number;
    autoBuy: boolean;
    maxBuyAmount: number;
  }

  export interface ArbitrageSettings {
    minSpreadPercentage: number;
    executionSpeed: 'fastest' | 'balanced' | 'economic';
    minLiquidity: number;
    dexes: string[];
    autoExecution: boolean;
  }

  export interface WalletTrackingSettings {
    addresses: string[];
    followTransactionTypes: string[];
    minTransactionValue: number;
    autoFollow: boolean;
  }

  export interface AutoTradingSettings {
    active: boolean;
    tradingPairs: string[];
    strategy: string;
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
  }

  export interface SolanaNetworkStatus {
    status: string;
    tps: number;
    price: string;
    priceChange: string;
    gasPrice: string;
  }
} 