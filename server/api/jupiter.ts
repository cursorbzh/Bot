import fetch from "node-fetch";
import Bottleneck from "bottleneck";
import { getRaydiumQuote } from './raydium.js';
import { jupiterQuoteApi } from './jupiterWs.js';
import { getOrcaQuote } from './orca.js';

const JUPITER_API_BASE_URL = "https://quote-api.jup.ag/v6";

// Rate limiter configuration - 60 requests per minute
const limiter = new Bottleneck({
  minTime: 1000, // 1 second between requests
  maxConcurrent: 1, // Process one request at a time
  reservoir: 60, // 60 requests
  reservoirRefreshAmount: 60, // Refill 60 tokens
  reservoirRefreshInterval: 60 * 1000 // Refill every 60 seconds
});

// Add retry strategy
limiter.on("failed", async (error: Error, jobInfo: any) => {
  if (error.message.includes("429") && jobInfo.retryCount < 3) {
    // Exponential backoff for rate limit errors
    const delay = Math.min(1000 * Math.pow(2, jobInfo.retryCount), 10000);
    console.log(`Rate limit hit, retrying in ${delay}ms...`);
    return delay;
  }
});

// Wrap fetch with rate limiting
const rateLimitedFetch = (url: string, options?: any) => {
  return limiter.schedule(() => fetch(url, options));
};

interface SwapInfo {
  ammKey: string;
  name?: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  feeAmount: string;
  feeMint: string;
}

interface RoutePlan {
  swapInfo: SwapInfo | SwapInfo[];
  percent: number;
}

interface QuoteResult {
  quote: {
    outAmount: string;
    routePlan?: RoutePlan[];
    inAmount?: string;
    outAmountWithSlippage?: string;
    priceImpactPct?: string;
    marketInfos?: any[];
    source?: string;
  };
  source: string;
}

interface ArbitrageResult {
  inputMint: string;
  outputMint: string;
  forwardPrice: string;
  backwardPrice: string;
  profitPercentage: number;
  routes: {
    forward: RoutePlan[];
    backward: RoutePlan[];
  };
  sources: {
    forward: string;
    backward: string;
  };
}

/**
 * Interface pour les résultats de l'API Jupiter
 */
interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  amount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  routePlan?: RoutePlan[];
  contextSlot?: number;
  timeTaken?: number;
  source?: string;
}

/**
 * Cache pour les quotes
 */
interface QuoteCache {
  [key: string]: {
    quote: any;
    source: string;
    timestamp: number;
  };
}

const quoteCache: QuoteCache = {};
const QUOTE_CACHE_TTL = 30000; // 30 secondes de validité pour le cache

function getCacheKey(inputMint: string, outputMint: string, amount: string): string {
  return `${inputMint}-${outputMint}-${amount}`;
}

function getQuoteFromCache(inputMint: string, outputMint: string, amount: string): { quote: any; source: string; } | null {
  const key = getCacheKey(inputMint, outputMint, amount);
  const cached = quoteCache[key];
  
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
    console.log(`Quote trouvé dans le cache pour ${inputMint}/${outputMint}`);
    return { quote: cached.quote, source: cached.source };
  }
  
  return null;
}

function addQuoteToCache(inputMint: string, outputMint: string, amount: string, quote: any, source: string): void {
  const key = getCacheKey(inputMint, outputMint, amount);
  quoteCache[key] = {
    quote,
    source,
    timestamp: Date.now()
  };
}

/**
 * Get a quote for swapping tokens using Jupiter's REST API
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50,
  onlyDirectRoutes: boolean = false
): Promise<JupiterQuoteResponse> {
  try {
    const quote = await jupiterQuoteApi.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps,
      onlyDirectRoutes
    });
    
    return {
      ...quote,
      source: 'Jupiter'
    };
  } catch (error) {
    console.error("Error getting quote:", error);
    throw error;
  }
}

/**
 * Get the price of a token in terms of another token
 * 
 * @param inputMint Input token mint address
 * @param outputMint Output token mint address
 * @returns Price information
 */
export async function getPrice(
  inputMint: string,
  outputMint: string
) {
  try {
    const url = new URL(`${JUPITER_API_BASE_URL}/price`);
    url.searchParams.append("inputMint", inputMint);
    url.searchParams.append("outputMint", outputMint);
    
    // Use rate limited fetch
    const response = await rateLimitedFetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting Jupiter price:", error);
    throw error;
  }
}

/**
 * Get indexed routes data for multiple token pairs
 * Used for arbitrage scanning
 */
export async function getIndexedRouteMap() {
  try {
    // Use rate limited fetch
    const response = await rateLimitedFetch(`${JUPITER_API_BASE_URL}/indexed-route-map`);
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting indexed route map:", error);
    throw error;
  }
}

/**
 * Get token list from Jupiter
 */
export async function getTokenList() {
  try {
    // Use rate limited fetch
    const response = await rateLimitedFetch("https://token.jup.ag/all");
    
    if (!response.ok) {
      throw new Error(`Jupiter token list error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting Jupiter token list:", error);
    throw error;
  }
}

/**
 * Prepare a swap transaction
 */
export async function prepareSwapTransaction(
  quoteResponse: any,
  userPublicKey: string
) {
  try {
    // Use rate limited fetch
    const response = await rateLimitedFetch(`${JUPITER_API_BASE_URL}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapUnwrapSOL: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter swap error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error preparing Jupiter swap transaction:", error);
    throw error;
  }
}

// Ajouter une fonction sleep pour les délais
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get prices for multiple token pairs to find arbitrage opportunities
 */
export async function scanForArbitrageOpportunities(tokenPairs: Array<{ inputMint: string, outputMint: string }>) {
  const results = [];
  
  // Configuration du rate limiting
  let retryDelay = 1000;
  const maxRetryDelay = 5000;
  const minRetryDelay = 1000;
  
  // Liste des DEX disponibles pour la rotation
  const dexes = ['Jupiter', 'Raydium', 'Orca'];
  let currentDexIndex = 0;
  
  async function getQuoteWithCache(
    inputMint: string | undefined,
    outputMint: string | undefined,
    amount: string
  ): Promise<QuoteResult | null> {
    // Vérifier que les paramètres sont définis
    if (!inputMint || !outputMint) {
      console.log('Paramètres manquants pour le quote');
      return null;
    }

    // Vérifier d'abord le cache
    const cached = getQuoteFromCache(inputMint, outputMint, amount);
    if (cached) return cached;
    
    let attempts = 0;
    const maxAttempts = dexes.length * 2;
    
    while (attempts < maxAttempts) {
      const currentDex = dexes[currentDexIndex];
      try {
        let quote: any;
        let source: string;
        
        if (currentDex === 'Jupiter') {
          console.log(`Utilisation de Jupiter pour le quote ${inputMint}/${outputMint}`);
          quote = await getQuote(inputMint, outputMint, amount, 50);
          source = 'Jupiter';
        } else if (currentDex === 'Raydium') {
          console.log(`Utilisation de Raydium pour le quote ${inputMint}/${outputMint}`);
          quote = await getRaydiumQuote(inputMint, outputMint, amount, 50);
          source = 'Raydium';
        } else if (currentDex === 'Orca') {
          console.log(`Utilisation d'Orca pour le quote ${inputMint}/${outputMint}`);
          quote = await getOrcaQuote(inputMint, outputMint, amount, 50);
          source = 'Orca';
        } else {
          throw new Error(`DEX non supporté: ${currentDex}`);
        }
        
        if (quote && typeof quote.outAmount === 'string') {
          const result: QuoteResult = {
            quote,
            source: source || 'Unknown'
          };
          // Ajouter au cache
          addQuoteToCache(inputMint, outputMint, amount, quote, result.source);
          return result;
        }
      } catch (error: unknown) {
        console.log(`Erreur avec ${currentDex}:`, error instanceof Error ? error.message : String(error));
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
          await sleep(retryDelay);
        }
      }
      
      attempts++;
      currentDexIndex = (currentDexIndex + 1) % dexes.length;
    }
    
    return null;
  }
  
  for (const pair of tokenPairs) {
    try {
      console.log(`Scanning pair ${pair.inputMint}/${pair.outputMint} (dans les deux sens)`);
      const forwardAmount = "1000000000";
      
      // Tester le sens direct
      const forward = await testArbitragePath(
        pair.inputMint,
        pair.outputMint,
        forwardAmount,
        getQuoteWithCache
      );
      
      if (forward) {
        results.push(forward);
      }
      
      // Tester le sens inverse
      const backward = await testArbitragePath(
        pair.outputMint,
        pair.inputMint,
        forwardAmount,
        getQuoteWithCache
      );
      
      if (backward) {
        results.push(backward);
      }
      
      // Attendre avant la prochaine paire
      await sleep(retryDelay);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Erreur lors du scan de la paire ${pair.inputMint}/${pair.outputMint}: ${errorMessage}`);
    }
  }
  
  return results;
}

async function testArbitragePath(
  startMint: string,
  endMint: string,
  amount: string,
  getQuoteWithCache: (inputMint: string, outputMint: string, amount: string) => Promise<{ quote: any; source: string; } | null>
): Promise<ArbitrageResult | null> {
  // Quote aller
  const forward = await getQuoteWithCache(startMint, endMint, amount);
  if (!forward) return null;
  
  console.log(`Quote aller (${forward.source}): ${amount} -> ${forward.quote.outAmount} (taux: ${Number(forward.quote.outAmount) / Number(amount)})`);
  
  // Quote retour
  const backward = await getQuoteWithCache(endMint, startMint, forward.quote.outAmount);
  if (!backward) return null;
  
  console.log(`Quote retour (${backward.source}): ${forward.quote.outAmount} -> ${backward.quote.outAmount} (taux: ${Number(backward.quote.outAmount) / Number(forward.quote.outAmount)})`);
  
  try {
    const outAmountValue = Number(backward.quote.outAmount);
    if (isNaN(outAmountValue)) {
      console.log(`Valeur NaN détectée pour le quote retour: ${backward.quote.outAmount}`);
      return null;
    }
    
    const initialAmount = BigInt(amount);
    const finalAmount = BigInt(backward.quote.outAmount);
    
    const profitRatio = (Number(finalAmount) - Number(initialAmount)) / Number(initialAmount);
    const profitPercentage = profitRatio * 100;
    
    console.log(`Résultat (${forward.source} -> ${backward.source}): Initial ${initialAmount} -> Final ${finalAmount}, profit: ${profitPercentage.toFixed(4)}%`);
    
    if (finalAmount >= initialAmount * BigInt(99) / BigInt(100)) {
      const adjustedProfitPercentage = finalAmount >= initialAmount ? profitPercentage : 0;
      
      console.log(`Opportunité enregistrée: ${startMint}/${endMint} via ${forward.source}/${backward.source}, profit affiché: ${adjustedProfitPercentage.toFixed(4)}%`);
      
      const result: ArbitrageResult = {
        inputMint: startMint,
        outputMint: endMint,
        forwardPrice: (Number(forward.quote.outAmount) / Number(amount)).toString(),
        backwardPrice: (Number(backward.quote.outAmount) / Number(forward.quote.outAmount)).toString(),
        profitPercentage: adjustedProfitPercentage,
        routes: {
          forward: Array.isArray(forward.quote.routePlan) ? forward.quote.routePlan as RoutePlan[] : [],
          backward: Array.isArray(backward.quote.routePlan) ? backward.quote.routePlan as RoutePlan[] : []
        },
        sources: {
          forward: forward.source || 'Unknown',
          backward: backward.source || 'Unknown'
        }
      };
      
      return result;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Erreur de calcul d'arbitrage: ${errorMessage}`);
  }
  
  return null;
}

/**
 * Check Jupiter API health status
 */
export async function checkJupiterStatus() {
  try {
    const response = await fetch(`${JUPITER_API_BASE_URL}/health`);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error("Error checking Jupiter API status:", error);
    return {
      ok: false,
      error: (error as Error).message
    };
  }
}
