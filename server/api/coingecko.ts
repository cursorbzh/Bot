import fetch from "node-fetch";
import axios from 'axios';

const COINGECKO_API_BASE_URL = "https://api.coingecko.com/api/v3";
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";

const headers: HeadersInit = {};
if (COINGECKO_API_KEY) {
  // Use x-cg-demo-api-key for the public/demo API authentication
  headers["x-cg-demo-api-key"] = COINGECKO_API_KEY;
}

console.log("CoinGecko API configuration initialized");

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24h_vol: number;
    usd_24h_change: number;
  };
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    [key: string]: string;
  };
}

/**
 * Get cryptocurrency prices from CoinGecko
 */
export async function getPrices(ids: string[]) {
  try {
    const response = await axios.get<CoinGeckoResponse>('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: ids.join(','),
        vs_currencies: 'usd',
        include_24hr_vol: true,
        include_24hr_change: true
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching prices:', error);
    throw error;
  }
}

/**
 * Get list of all coins from CoinGecko
 */
export async function getCoinsList() {
  try {
    const response = await axios.get<CoinGeckoCoin[]>('https://api.coingecko.com/api/v3/coins/list', {
      params: {
        include_platform: true
      }
    });

    const coins = response.data;
    return coins.filter((coin: CoinGeckoCoin) =>
      coin.platforms && coin.platforms['solana']
    );
  } catch (error) {
    console.error('Error fetching coins list:', error);
    throw error;
  }
}

/**
 * Get coin price from CoinGecko
 */
export async function getCoinPrice(coinId: string, vsCurrencies: string = "usd") {
  try {
    const url = new URL(`${COINGECKO_API_BASE_URL}/simple/price`);
    
    url.searchParams.append("ids", coinId);
    url.searchParams.append("vs_currencies", vsCurrencies);
    url.searchParams.append("include_24hr_vol", "true");
    url.searchParams.append("include_24hr_change", "true");
    url.searchParams.append("include_market_cap", "true");
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting CoinGecko price for ${coinId}:`, error);
    throw error;
  }
}

/**
 * Get coin information from CoinGecko
 */
export async function getCoinInfo(coinId: string) {
  try {
    const url = `${COINGECKO_API_BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting CoinGecko info for ${coinId}:`, error);
    throw error;
  }
}

/**
 * Search for coins, categories and markets
 */
export async function searchCoins(query: string) {
  try {
    const url = new URL(`${COINGECKO_API_BASE_URL}/search`);
    url.searchParams.append("query", query);
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error searching CoinGecko for ${query}:`, error);
    throw error;
  }
}

/**
 * Get historical market data
 */
export async function getHistoricalMarketData(
  coinId: string, 
  vsCurrency: string = "usd", 
  days: string | number = 1
) {
  try {
    const url = new URL(`${COINGECKO_API_BASE_URL}/coins/${coinId}/market_chart`);
    
    url.searchParams.append("vs_currency", vsCurrency);
    url.searchParams.append("days", days.toString());
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting CoinGecko historical data for ${coinId}:`, error);
    throw error;
  }
}

/**
 * Check CoinGecko API status
 */
export async function checkCoinGeckoStatus() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/ping');
    return {
      ok: response.status === 200,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('Error checking CoinGecko API status:', error);
    return {
      ok: false,
      error: (error as Error).message
    };
  }
}
