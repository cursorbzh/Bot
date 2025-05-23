import { EventEmitter } from 'events';
import fetch from 'node-fetch';

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  swapMode?: string;
  onlyDirectRoutes?: boolean;
}

interface QuoteRequest {
  jsonrpc: string;
  method: string;
  params: QuoteParams;
  id: number;
}

class JupiterQuoteAPI extends EventEmitter {
  private baseUrl: string = 'https://quote-api.jup.ag/v6';
  private requestCounter: number = 0;

  constructor() {
    super();
  }

  public async getQuote(params: QuoteParams): Promise<any> {
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
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return true; // Always return true since we're using REST API
  }
}

// Export singleton instance
export const jupiterQuoteApi = new JupiterQuoteAPI(); 