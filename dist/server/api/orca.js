import axios from 'axios';
import Bottleneck from 'bottleneck';
// Fonction d'attente simple
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Configuration du rate limiter pour Orca
const limiter = new Bottleneck({
    minTime: 1000, // 1 seconde entre les requêtes
    maxConcurrent: 1, // Une requête à la fois
    reservoir: 60, // 60 requêtes
    reservoirRefreshAmount: 60, // Recharge 60 jetons
    reservoirRefreshInterval: 60 * 1000 // Recharge toutes les 60 secondes
});
// URL de base de l'API Orca
const ORCA_API_BASE_URL = "https://api.orca.so";
// Fonction encapsulée avec rate limiting
const rateLimitedCall = async (fn) => {
    return limiter.schedule(fn);
};
let poolsCache = [];
let lastPoolUpdateTime = 0;
const POOL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Récupère les pools Orca
 */
async function fetchOrcaPools() {
    if (poolsCache.length > 0 && Date.now() - lastPoolUpdateTime < POOL_CACHE_TTL) {
        return poolsCache;
    }
    try {
        const response = await axios.get(`${ORCA_API_BASE_URL}/pools`, {
            timeout: 10000
        });
        if (response.status === 200 && response.data && Array.isArray(response.data.pools)) {
            poolsCache = response.data.pools.map((pool) => ({
                id: pool.address,
                tokenA: pool.tokenA.mint,
                tokenB: pool.tokenB.mint,
                reserveA: pool.tokenA.reserve,
                reserveB: pool.tokenB.reserve,
                fee: pool.fee || 0.003 // Fee par défaut de 0.3%
            }));
            lastPoolUpdateTime = Date.now();
            return poolsCache;
        }
        else {
            throw new Error('Format de réponse inattendu pour les pools Orca');
        }
    }
    catch (error) {
        console.error('Erreur lors de la récupération des pools Orca:', error);
        // Si le cache n'est pas vide, retourner le cache périmé en cas d'erreur
        if (poolsCache.length > 0) {
            console.log('Utilisation du cache Orca périmé en raison d\'une erreur');
            return poolsCache;
        }
        throw error;
    }
}
/**
 * Trouve un pool de liquidité pour une paire de tokens
 */
async function findOrcaPool(inputMint, outputMint) {
    try {
        const pools = await fetchOrcaPools();
        // Recherche directe (tokenA = input, tokenB = output)
        const directPool = pools.find(pool => (pool.tokenA === inputMint && pool.tokenB === outputMint));
        if (directPool)
            return directPool;
        // Recherche inverse (tokenA = output, tokenB = input)
        const inversePool = pools.find(pool => (pool.tokenA === outputMint && pool.tokenB === inputMint));
        if (inversePool) {
            // Inversion des données pour conserver la cohérence
            return {
                ...inversePool,
                tokenA: inversePool.tokenB,
                tokenB: inversePool.tokenA,
                reserveA: inversePool.reserveB,
                reserveB: inversePool.reserveA
            };
        }
        return null;
    }
    catch (error) {
        console.error('Erreur lors de la recherche du pool Orca:', error);
        return null;
    }
}
/**
 * Calcule le prix estimé pour un swap
 */
function calculateOrcaQuote(pool, inputAmount) {
    // Conversion en nombres pour les calculs
    const reserveIn = parseFloat(pool.reserveA);
    const reserveOut = parseFloat(pool.reserveB);
    const amountIn = parseFloat(inputAmount);
    if (reserveIn <= 0 || reserveOut <= 0 || amountIn <= 0) {
        return "0";
    }
    // Calcule le montant de sortie selon la formule x*y=k
    // Prend en compte les frais (0.3% par défaut pour Orca)
    const amountInWithFee = amountIn * (1 - pool.fee);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    // Arrondi à un entier pour être cohérent avec les tokens SPL
    return Math.floor(numerator / denominator).toString();
}
/**
 * Obtient un quote pour un swap via Orca
 */
export async function getOrcaQuote(inputMint, outputMint, amountIn, slippageBps = 50) {
    return rateLimitedCall(async () => {
        try {
            // Recherche du pool pour cette paire de tokens
            const pool = await findOrcaPool(inputMint, outputMint);
            if (!pool) {
                throw new Error(`Aucun pool Orca trouvé pour ${inputMint}/${outputMint}`);
            }
            // Calcule le montant de sortie estimé
            const outAmount = calculateOrcaQuote(pool, amountIn);
            if (outAmount === "0") {
                throw new Error(`Pas assez de liquidité Orca pour ${inputMint}/${outputMint}`);
            }
            // Calcule le montant minimum avec le slippage
            const slippageFactor = 1 - (slippageBps / 10000);
            const minOutAmount = (parseFloat(outAmount) * slippageFactor).toString();
            // Construit un objet compatible avec le format Jupiter pour l'uniformité
            return {
                inAmount: amountIn,
                outAmount,
                outAmountWithSlippage: minOutAmount,
                priceImpactPct: '0.3', // Approximation standard
                marketInfos: [{
                        id: pool.id,
                        label: 'Orca',
                        inputMint,
                        outputMint,
                        notEnoughLiquidity: false,
                        liquidityFee: pool.fee,
                        platformFee: 0
                    }],
                routePlan: [{
                        swapInfo: {
                            ammKey: pool.id,
                            name: 'Orca',
                            label: 'Orca',
                            inputMint,
                            outputMint,
                            inAmount: amountIn,
                            outAmount,
                            feeAmount: (parseFloat(outAmount) * pool.fee).toString(),
                            feeMint: outputMint
                        },
                        percent: 100
                    }],
                // Information sur la source
                source: 'Orca'
            };
        }
        catch (error) {
            console.error('Erreur lors du calcul du quote Orca:', error);
            throw error;
        }
    });
}
/**
 * Vérifie la disponibilité de l'API Orca
 */
export async function checkOrcaStatus() {
    try {
        const response = await axios.get(`${ORCA_API_BASE_URL}/status`, {
            timeout: 5000
        });
        return {
            ok: response.status === 200,
            version: response.data?.version || 'unknown'
        };
    }
    catch (error) {
        console.error('Erreur lors de la vérification du statut Orca:', error);
        return {
            ok: false,
            error: (error instanceof Error) ? error.message : String(error)
        };
    }
}
