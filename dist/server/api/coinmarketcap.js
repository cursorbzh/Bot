import axios from 'axios';
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY || "";
const CMC_API_BASE_URL = "https://pro-api.coinmarketcap.com/v1";
/**
 * Get latest cryptocurrency quotes
 */
export async function getLatestQuotes(symbol, convert = "USD") {
    try {
        const url = new URL(`${CMC_API_BASE_URL}/cryptocurrency/quotes/latest`);
        url.searchParams.append("symbol", symbol);
        url.searchParams.append("convert", convert);
        const response = await fetch(url.toString(), {
            headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                "Accept": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data;
    }
    catch (error) {
        console.error(`Error getting CoinMarketCap quotes for ${symbol}:`, error);
        throw error;
    }
}
/**
 * Get cryptocurrency metadata
 */
export async function getMetadata(symbol) {
    try {
        const url = new URL(`${CMC_API_BASE_URL}/cryptocurrency/info`);
        url.searchParams.append("symbol", symbol);
        const response = await fetch(url.toString(), {
            headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                "Accept": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data;
    }
    catch (error) {
        console.error(`Error getting CoinMarketCap metadata for ${symbol}:`, error);
        throw error;
    }
}
/**
 * Get cryptocurrency listings
 */
export async function getLatestListings(limit = 100, convert = "USD") {
    try {
        const url = new URL(`${CMC_API_BASE_URL}/cryptocurrency/listings/latest`);
        url.searchParams.append("limit", limit.toString());
        url.searchParams.append("convert", convert);
        const response = await fetch(url.toString(), {
            headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                "Accept": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data;
    }
    catch (error) {
        console.error("Error getting CoinMarketCap listings:", error);
        throw error;
    }
}
/**
 * Get Solana tokens from CoinGecko
 */
export async function getSolanaTokens() {
    try {
        const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`, {
            params: {
                limit: 5000,
                convert: 'USD',
                platform_crypto_id: 5426 // Solana platform ID
            },
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            }
        });
        const data = response.data;
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        const solanaTokens = data.data.filter((token) => {
            return token.platform?.id === 5426; // Solana platform ID
        });
        return solanaTokens;
    }
    catch (error) {
        console.error('Error fetching Solana tokens:', error);
        throw error;
    }
}
/**
 * Check CMC API status
 */
export async function checkCoinMarketCapStatus() {
    try {
        // Using the key_info endpoint to check API status
        const url = `${CMC_API_BASE_URL}/key/info`;
        const response = await fetch(url, {
            headers: {
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
                "Accept": "application/json"
            }
        });
        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                statusText: response.statusText
            };
        }
        const data = await response.json();
        return {
            ok: true,
            limits: data.data,
            status: response.status,
            statusText: response.statusText
        };
    }
    catch (error) {
        console.error("Error checking CoinMarketCap API status:", error);
        return {
            ok: false,
            error: error.message
        };
    }
}
/**
 * Get cryptocurrency metadata from CoinMarketCap
 */
export async function getCryptoMetadata(symbol) {
    try {
        const response = await axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/info`, {
            params: {
                symbol
            },
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            }
        });
        const data = response.data;
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data.data;
    }
    catch (error) {
        console.error('Error fetching crypto metadata:', error);
        throw error;
    }
}
/**
 * Get latest cryptocurrency quotes from CoinMarketCap
 */
export async function getCryptoQuotes(symbol) {
    try {
        const response = await axios.get(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`, {
            params: {
                symbol,
                convert: 'USD'
            },
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            }
        });
        const data = response.data;
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data.data;
    }
    catch (error) {
        console.error('Error fetching crypto quotes:', error);
        throw error;
    }
}
/**
 * Get cryptocurrency listings from CoinMarketCap
 */
export async function getCryptoListings(limit = 5000) {
    try {
        const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest`, {
            params: {
                limit,
                convert: 'USD'
            },
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            }
        });
        const data = response.data;
        if (data.status.error_code !== 0) {
            throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
        }
        return data.data;
    }
    catch (error) {
        console.error('Error fetching crypto listings:', error);
        throw error;
    }
}
/**
 * Get CoinMarketCap API limits
 */
export async function getApiLimits() {
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/key/info', {
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            }
        });
        return {
            ok: response.data.status.error_code === 0,
            limits: response.data.data,
        };
    }
    catch (error) {
        console.error('Error checking CoinMarketCap API limits:', error);
        return {
            ok: false,
            error: error.message
        };
    }
}
