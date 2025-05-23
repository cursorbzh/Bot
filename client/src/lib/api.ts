import { apiRequest } from "@/lib/queryClient";
import { 
  ArbitrageSettings, 
  TokenSnipeSettings, 
  WalletTrackingSettings, 
  AutoTradingSettings,
  ArbitrageOpportunityData
} from "@shared/schema";

// Arbitrage APIs
export async function getArbitrageOpportunities(): Promise<ArbitrageOpportunityData[]> {
  const res = await apiRequest('GET', '/api/arbitrage/opportunities');
  return res.json();
}

export async function executeArbitrage(id: number): Promise<any> {
  const res = await apiRequest('POST', '/api/arbitrage/execute', { id });
  return res.json();
}

export async function getArbitrageSettings(): Promise<ArbitrageSettings> {
  const res = await apiRequest('GET', '/api/arbitrage/settings');
  return res.json();
}

export async function updateArbitrageSettings(settings: Partial<ArbitrageSettings>): Promise<ArbitrageSettings> {
  const res = await apiRequest('POST', '/api/arbitrage/settings', settings);
  return res.json();
}

// Token Sniper APIs
export async function getTokenSnipeSettings(): Promise<TokenSnipeSettings> {
  const res = await apiRequest('GET', '/api/tokensniping/settings');
  return res.json();
}

export async function updateTokenSnipeSettings(settings: Partial<TokenSnipeSettings>): Promise<TokenSnipeSettings> {
  const res = await apiRequest('POST', '/api/tokensniping/settings', settings);
  return res.json();
}

// Wallet Tracking APIs
export async function getWalletTrackingSettings(): Promise<WalletTrackingSettings> {
  const res = await apiRequest('GET', '/api/wallet/settings');
  return res.json();
}

export async function updateWalletTrackingSettings(settings: Partial<WalletTrackingSettings>): Promise<WalletTrackingSettings> {
  const res = await apiRequest('POST', '/api/wallet/settings', settings);
  return res.json();
}

export async function trackWallet(address: string, alias?: string): Promise<any> {
  const res = await apiRequest('POST', '/api/wallet/track', { address, alias });
  return res.json();
}

export async function getTrackedWallets(): Promise<any[]> {
  const res = await apiRequest('GET', '/api/wallet/tracking');
  return res.json();
}

export async function updateWalletTracking(id: number, active: boolean): Promise<any> {
  const res = await apiRequest('PATCH', `/api/wallet/tracking/${id}`, { active });
  return res.json();
}

// Auto Trading APIs
export async function getAutoTradingSettings(): Promise<AutoTradingSettings> {
  const res = await apiRequest('GET', '/api/autotrading/settings');
  return res.json();
}

export async function updateAutoTradingSettings(settings: Partial<AutoTradingSettings>): Promise<AutoTradingSettings> {
  const res = await apiRequest('POST', '/api/autotrading/settings', settings);
  return res.json();
}

// System APIs
export async function getSystemStatus(): Promise<any> {
  const res = await apiRequest('GET', '/api/status');
  return res.json();
}

export async function getActivityLogs(limit?: number): Promise<any[]> {
  const url = limit ? `/api/logs?limit=${limit}` : '/api/logs';
  const res = await apiRequest('GET', url);
  return res.json();
}

export async function getSolanaNetworkStatus(): Promise<any> {
  const res = await apiRequest('GET', '/api/solana/status');
  return res.json();
}

export async function getTokens(): Promise<any[]> {
  const res = await apiRequest('GET', '/api/tokens');
  return res.json();
}

export async function getTokenPrices(symbols: string[]): Promise<any[]> {
  const res = await apiRequest('GET', `/api/tokens/prices?symbols=${symbols.join(',')}`);
  return res.json();
}

// Jupiter API
export async function getJupiterQuote(inputMint: string, outputMint: string, amount: string, slippageBps?: number): Promise<any> {
  const url = `/api/jupiter/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}${slippageBps ? `&slippageBps=${slippageBps}` : ''}`;
  const res = await apiRequest('GET', url);
  return res.json();
}
