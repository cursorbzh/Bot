import fetch from "node-fetch";
import WebSocket from "ws";
import { EventEmitter } from "events";

interface HeliusWebSocketMessage {
  jsonrpc: string;
  id: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    message: string;
    code: number;
  };
}

// Get API key from environment or mark as missing
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_API_KEY_MISSING = !HELIUS_API_KEY;

// Fallback to public endpoints if API key is missing (for development only)
const HELIUS_RPC_URL = HELIUS_API_KEY_MISSING 
  ? "https://api.mainnet-beta.solana.com" 
  : `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const HELIUS_WEBSOCKET_URL = HELIUS_API_KEY_MISSING
  ? "wss://api.mainnet-beta.solana.com" 
  : `wss://mainnet.helius-rpc.com/v0/?api-key=${HELIUS_API_KEY}`;

// Create event emitter for WebSocket events
const heliusEvents = new EventEmitter();

// Placeholder for WebSocket connection
let wsConnection: WebSocket | null = null;
let reconnectAttempts = 0;
let pingInterval: NodeJS.Timeout | null = null;

/**
 * Initialize WebSocket connection to Helius RPC
 */
export function initHeliusWebsocket(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      // Close existing connection if any
      if (wsConnection) {
        wsConnection.close();
      }

      // Clear ping interval if exists
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      wsConnection = new WebSocket(HELIUS_WEBSOCKET_URL, {
        perMessageDeflate: false,
        maxPayload: 1024 * 1024
      });

      wsConnection.on("open", () => {
        reconnectAttempts = 0;
        console.log("Connected to Helius WebSocket");
        
        // Subscribe to account transactions
        const subscribeMessage = {
          jsonrpc: "2.0",
          id: 1,
          method: "accountSubscribe",
          params: [
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program
            { commitment: "confirmed", encoding: "jsonParsed" }
          ]
        };
        
        wsConnection?.send(JSON.stringify(subscribeMessage));
        
        // Setup ping interval to keep connection alive
        pingInterval = setInterval(() => {
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.ping();
          }
        }, 30000);
        
        heliusEvents.emit("connected");
        resolve(true);
      });

      wsConnection.on("close", (code, reason) => {
        console.log(`Helius WebSocket closed: ${code} - ${reason}`);
        
        // Clear ping interval
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
        // Try to reconnect with exponential backoff
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        
        setTimeout(() => {
          initHeliusWebsocket();
        }, delay);
        
        heliusEvents.emit("disconnected", { code, reason });
      });

      wsConnection.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as HeliusWebSocketMessage;
          heliusEvents.emit("message", message);
          
          // Process specific message types
          if (message.method === "accountNotification") {
            heliusEvents.emit("accountUpdate", message.params);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      wsConnection.on("error", (error) => {
        console.error("Helius WebSocket error:", error);
        heliusEvents.emit("error", error);
        reject(error);
      });
      
      wsConnection.on("pong", () => {
        heliusEvents.emit("pong", Date.now());
      });
      
    } catch (error) {
      console.error("Error initializing Helius WebSocket:", error);
      heliusEvents.emit("error", error);
      reject(error);
    }
  });
}

/**
 * Close WebSocket connection
 */
export function closeHeliusWebsocket(): void {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
  
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

/**
 * Get the current WebSocket connection status
 */
export function getHeliusConnectionStatus(): { connected: boolean; readyState?: number } {
  if (!wsConnection) {
    return { connected: false };
  }
  
  return {
    connected: wsConnection.readyState === WebSocket.OPEN,
    readyState: wsConnection.readyState
  };
}

/**
 * Make an RPC call to Helius API
 */
export async function heliusRpcCall<T>(method: string, params: any[] = []): Promise<T> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });
  
  if (!response.ok) {
    throw new Error(`Helius RPC error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as { 
    result: T; 
    error?: { 
      message?: string; 
      code?: number 
    } 
  };
  
  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  return data.result;
}

/**
 * Get Solana network status
 */
export async function getSolanaNetworkStatus() {
  try {
    // Get performance samples to calculate TPS
    const performanceSamples = await heliusRpcCall<any[]>("getRecentPerformanceSamples", [1]);
    
    if (performanceSamples && performanceSamples.length > 0) {
      const sample = performanceSamples[0];
      const tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
      
      return {
        status: "Healthy",
        tps
      };
    }
    
    return {
      status: "Unknown",
      tps: 0
    };
  } catch (error) {
    console.error("Error getting Solana network status:", error);
    return {
      status: "Error",
      tps: 0
    };
  }
}

/**
 * Get token accounts for a wallet
 */
export async function getTokenAccounts(walletAddress: string) {
  return heliusRpcCall<any>("getTokenAccountsByOwner", [
    walletAddress,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" }
  ]);
}

/**
 * Subscribe to events for a specific wallet
 */
export function subscribeToWallet(walletAddress: string) {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket connection not established");
  }
  
  const subscribeMessage = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "accountSubscribe",
    params: [
      walletAddress,
      { commitment: "confirmed", encoding: "jsonParsed" }
    ]
  };
  
  wsConnection.send(JSON.stringify(subscribeMessage));
}

/**
 * Get recent mints (new token creations)
 */
export async function getRecentMints() {
  // Using Helius API - this call might differ based on actual API structure
  try {
    const response = await fetch(`https://api.helius.xyz/v0/tokens/mints?api-key=${HELIUS_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Error getting recent mints: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting recent mints:", error);
    throw error;
  }
}

export { heliusEvents };
