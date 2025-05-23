import { Connection, PublicKey } from "@solana/web3.js";
// Use the full QuickNode URL as provided
const QUICKNODE_RPC_URL = "https://maximum-silent-dream.solana-mainnet.quiknode.pro/8eef70ed1acf74b2d96c0ce0e60ffa8884cb0987/";
console.log(`Connecting to Solana RPC: ${QUICKNODE_RPC_URL}...`);
// Initialize Solana connection
const connection = new Connection(QUICKNODE_RPC_URL);
/**
 * Get transaction details
 */
export async function getTransaction(signature) {
    try {
        const tx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });
        return tx;
    }
    catch (error) {
        console.error(`Error getting transaction ${signature}:`, error);
        throw error;
    }
}
/**
 * Get account information
 */
export async function getAccountInfo(address) {
    try {
        const publicKey = new PublicKey(address);
        const accountInfo = await connection.getAccountInfo(publicKey);
        return accountInfo;
    }
    catch (error) {
        console.error(`Error getting account info for ${address}:`, error);
        throw error;
    }
}
/**
 * Get balance for an account
 */
export async function getBalance(address) {
    try {
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        return balance;
    }
    catch (error) {
        console.error(`Error getting balance for ${address}:`, error);
        throw error;
    }
}
/**
 * Get token accounts by owner
 */
export async function getTokenAccountsByOwner(ownerAddress) {
    try {
        const publicKey = new PublicKey(ownerAddress);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
        return tokenAccounts;
    }
    catch (error) {
        console.error(`Error getting token accounts for ${ownerAddress}:`, error);
        throw error;
    }
}
/**
 * Get recent transactions for an account
 */
export async function getSignaturesForAddress(address, limit = 10) {
    try {
        const publicKey = new PublicKey(address);
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
        return signatures;
    }
    catch (error) {
        console.error(`Error getting signatures for ${address}:`, error);
        throw error;
    }
}
/**
 * Check QuickNode connection status
 */
export async function checkQuickNodeStatus() {
    try {
        const result = await connection.getVersion();
        return {
            ok: true,
            version: result["solana-core"],
            featureSet: result["feature-set"]
        };
    }
    catch (error) {
        console.error("Error checking QuickNode status:", error);
        return {
            ok: false,
            error: error.message
        };
    }
}
/**
 * Get recent block height
 */
export async function getBlockHeight() {
    try {
        const blockHeight = await connection.getBlockHeight();
        return blockHeight;
    }
    catch (error) {
        console.error("Error getting block height:", error);
        throw error;
    }
}
/**
 * Get recent performance samples
 */
export async function getRecentPerformanceSamples(limit = 1) {
    try {
        const samples = await connection.getRecentPerformanceSamples(limit);
        return samples;
    }
    catch (error) {
        console.error("Error getting performance samples:", error);
        throw error;
    }
}
export { connection };
