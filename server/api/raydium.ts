import { Connection, PublicKey } from '@solana/web3.js';
import { 
  Liquidity, 
  jsonInfo2PoolKeys
} from '@raydium-io/raydium-sdk';
import axios from 'axios';
import { BN } from 'bn.js';
import Bottleneck from "bottleneck";

// Configuration Solana
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Cache pour les liquidity pools
let liquidityPoolsCache: any[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Wrap API calls with rate limiting
const rateLimitedCall = (fn: Function, ...args: any[]) => {
  return limiter.schedule(() => fn(...args));
};

/**
 * Récupère les pools de liquidité depuis l'API Raydium
 */
async function fetchLiquidityPools() {
  const now = Date.now();
  
  // Si le cache est récent, l'utiliser
  if (liquidityPoolsCache.length > 0 && (now - lastCacheUpdate) < CACHE_TTL) {
    return liquidityPoolsCache;
  }
  
  try {
    console.log('Récupération des pools de liquidité Raydium...');
    const response = await axios.get('https://api.raydium.io/v2/main/pairs');
    
    if (response.status === 200 && response.data) {
      liquidityPoolsCache = response.data;
      lastCacheUpdate = now;
      console.log(`${liquidityPoolsCache.length} pools de liquidité récupérés`);
      return liquidityPoolsCache;
    } else {
      throw new Error(`Erreur de récupération des pools: ${response.status}`);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des pools Raydium:', error);
    // Si le cache existe mais est expiré, le renvoyer quand même en cas d'erreur
    if (liquidityPoolsCache.length > 0) {
      console.log('Utilisation du cache expiré en cas d\'échec');
      return liquidityPoolsCache;
    }
    throw error;
  }
}

/**
 * Trouve un pool de liquidité pour une paire de tokens
 */
async function findLiquidityPool(inputMint: string, outputMint: string) {
  const pools = await fetchLiquidityPools();
  
  // Recherche du pool pour la paire spécifiée (dans les deux sens)
  const pool = pools.find(
    pool => 
      (pool.baseMint === inputMint && pool.quoteMint === outputMint) ||
      (pool.baseMint === outputMint && pool.quoteMint === inputMint)
  );

  if (!pool) {
    return null;
  }

  // Vérifier que les données du pool sont valides
  if (!pool.baseReserve || !pool.quoteReserve || 
      typeof pool.baseReserve !== 'string' || typeof pool.quoteReserve !== 'string') {
    console.log(`Pool trouvé mais données invalides pour ${inputMint}/${outputMint}:`, 
      JSON.stringify({ baseReserve: pool.baseReserve, quoteReserve: pool.quoteReserve }));
    return null;
  }

  // Convertir les réserves en nombres et vérifier qu'elles sont valides
  const baseReserve = parseFloat(pool.baseReserve);
  const quoteReserve = parseFloat(pool.quoteReserve);

  if (isNaN(baseReserve) || isNaN(quoteReserve) || baseReserve <= 0 || quoteReserve <= 0) {
    console.log(`Pool trouvé mais réserves invalides pour ${inputMint}/${outputMint}:`,
      { baseReserve, quoteReserve });
    return null;
  }

  // Retourner le pool avec les réserves validées
  return {
    ...pool,
    baseReserve: baseReserve.toString(),
    quoteReserve: quoteReserve.toString()
  };
}

/**
 * Calcule un prix estimé basé sur la liquidité d'un pool
 */
function calculateEstimatedPrice(pool: any, inputMint: string, amountIn: string) {
  // Vérifier si inputMint est baseMint ou quoteMint
  const isBaseToQuote = pool.baseMint === inputMint;
  
  // Conversion du montant en nombre
  const amount = parseFloat(amountIn);
  if (isNaN(amount) || amount <= 0) {
    console.log(`Montant d'entrée invalide: ${amountIn}`);
    return "0";
  }
  
  // Obtenir les réserves
  const baseReserve = parseFloat(pool.baseReserve);
  const quoteReserve = parseFloat(pool.quoteReserve);
  
  // Les réserves ont déjà été validées dans findLiquidityPool
  // mais on vérifie quand même par sécurité
  if (isNaN(baseReserve) || isNaN(quoteReserve) || baseReserve <= 0 || quoteReserve <= 0) {
    console.log(`Réserves invalides: baseReserve=${baseReserve}, quoteReserve=${quoteReserve}`);
    return "0";
  }
  
  // Calculer le prix en fonction de la direction
  let outAmount;
  
  try {
    if (isBaseToQuote) {
      // Base token -> Quote token (ex: SOL -> USDC)
      // formule: (quote_reserve * amount_in) / (base_reserve + amount_in)
      outAmount = (quoteReserve * amount) / (baseReserve + amount);
    } else {
      // Quote token -> Base token (ex: USDC -> SOL)
      // formule: (base_reserve * amount_in) / (quote_reserve + amount_in)
      outAmount = (baseReserve * amount) / (quoteReserve + amount);
    }
  } catch (error) {
    console.error('Erreur lors du calcul du prix:', error);
    return "0";
  }
  
  // Vérifier si le résultat est un nombre valide
  if (isNaN(outAmount) || outAmount <= 0) {
    console.log(`Résultat de calcul invalide: ${outAmount}`);
    return "0";
  }
  
  // Appliquer les frais (0.3% pour Raydium)
  outAmount = outAmount * 0.997;
  
  return outAmount.toString();
}

/**
 * Calcule un quote pour un échange via Raydium
 */
export async function getRaydiumQuote(
  inputMint: string,
  outputMint: string,
  amountIn: string,
  slippageBps: number = 50
) {
  return rateLimitedCall(async () => {
    try {
      // Trouver le pool de liquidité pour cette paire
      const pool = await findLiquidityPool(inputMint, outputMint);
      
      if (!pool) {
        throw new Error(`Aucun pool de liquidité trouvé pour ${inputMint}/${outputMint}`);
      }
      
      // Calculer le montant de sortie estimé
      const outAmount = calculateEstimatedPrice(pool, inputMint, amountIn);
      
      // Vérifier que le montant est valide
      if (outAmount === "0") {
        throw new Error(`Pas assez de liquidité pour ${inputMint}/${outputMint}`);
      }
      
      // Calculer le montant minimum avec le slippage
      const slippageFactor = 1 - (slippageBps / 10000);
      const minOutAmount = (parseFloat(outAmount) * slippageFactor).toString();
      
      // Construire un objet similaire à celui de Jupiter pour la compatibilité
      return {
        inAmount: amountIn,
        outAmount,
        outAmountWithSlippage: minOutAmount,
        priceImpactPct: '0.3', // Approximation standard pour Raydium
        marketInfos: [{
          id: pool.ammId,
          label: 'Raydium',
          inputMint,
          outputMint,
          notEnoughLiquidity: false,
          liquidityFee: 0.003, // 0.3%
          platformFee: 0
        }],
        routePlan: [{
          swapInfo: {
            ammKey: pool.ammId,
            name: 'Raydium',
            label: 'Raydium',
            inputMint,
            outputMint,
            inAmount: amountIn,
            outAmount,
            feeAmount: (parseFloat(outAmount) * 0.003).toString(),
            feeMint: outputMint
          },
          percent: 100
        }],
        // Information sur la source des données
        source: 'Raydium'
      };
    } catch (error) {
      console.error('Erreur lors du calcul du quote Raydium:', error);
      throw error;
    }
  });
}

/**
 * Vérifie la disponibilité de l'API Raydium
 */
export async function checkRaydiumStatus() {
  try {
    const response = await axios.get('https://api.raydium.io/v2/main/version', {
      timeout: 5000
    });
    
    return {
      ok: response.status === 200,
      version: response.data?.version || 'unknown'
    };
  } catch (error) {
    console.error('Erreur lors de la vérification du statut Raydium:', error);
    return {
      ok: false,
      error: (error as Error).message
    };
  }
} 