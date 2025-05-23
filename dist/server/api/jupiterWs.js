import { EventEmitter } from 'events';
import fetch from 'node-fetch';
class JupiterQuoteAPI extends EventEmitter {
    baseUrl = 'https://quote-api.jup.ag/v6';
    requestCounter = 0;
    constructor() {
        super();
    }
    async getQuote(params) {
        try {
            const queryParams = new URLSearchParams({
                inputMint: params.inputMint,
                outputMint: params.outputMint,
                amount: params.amount,
                slippageBps: (params.slippageBps || 50).toString(),
                onlyDirectRoutes: (params.onlyDirectRoutes || false).toString()
            });
            const response = await fetch(`${this.baseUrl}/quote?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
            }
            const quoteResponse = await response.json();
            return quoteResponse;
        }
        catch (error) {
            console.error('Error getting quote:', error);
            throw error;
        }
    }
    isConnected() {
        return true; // Always return true since we're using REST API
    }
}
// Export singleton instance
export const jupiterQuoteApi = new JupiterQuoteAPI();
