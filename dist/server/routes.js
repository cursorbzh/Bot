import { createServer } from "http";
import { WebSocket } from "ws";
import { storage } from "./storage.js";
import { initHeliusWebsocket, closeHeliusWebsocket, getHeliusConnectionStatus, heliusEvents, getSolanaNetworkStatus } from "./api/helius.js";
import { getQuote, checkJupiterStatus } from "./api/jupiter.js";
import { checkCoinGeckoStatus, getPrices } from "./api/coingecko.js";
import { checkCoinMarketCapStatus } from "./api/coinmarketcap.js";
import { checkQuickNodeStatus } from "./api/quicknode.js";
import { insertWalletTrackingSchema } from "../shared/schema.js";
import { parse } from "url";
export async function registerRoutes(app) {
    const httpServer = createServer(app);
    // Connected clients
    const clients = new Set();
    // Initialize WebSocket server
    httpServer.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '', true);
        if (pathname === '/ws') {
            // La gestion des WebSocket est faite dans index.ts
            return;
        }
    });
    // Broadcast to all connected clients
    function broadcast(data) {
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
    // Initialize API connections and monitor statuses
    initApiConnections();
    // Set up REST API routes
    setupApiRoutes(app, broadcast);
    // Initialize event listeners
    setupEventListeners(broadcast);
    return httpServer;
}
async function initApiConnections() {
    try {
        // Initialize Helius WebSocket
        await initHeliusWebsocket();
        // Check status of each API
        const [jupiterStatus, coingeckoStatus, cmcStatus, quicknodeStatus] = await Promise.allSettled([
            checkJupiterStatus(),
            checkCoinGeckoStatus(),
            checkCoinMarketCapStatus(),
            checkQuickNodeStatus()
        ]);
        // Update storage with API statuses
        if (jupiterStatus.status === 'fulfilled') {
            await storage.updateApiStatus('jupiter', {
                name: 'Jupiter API',
                connected: jupiterStatus.value.ok
            });
        }
        if (coingeckoStatus.status === 'fulfilled') {
            await storage.updateApiStatus('coingecko', {
                name: 'CoinGecko',
                connected: coingeckoStatus.value.ok
            });
        }
        if (cmcStatus.status === 'fulfilled') {
            await storage.updateApiStatus('coinmarketcap', {
                name: 'CoinMarketCap',
                connected: cmcStatus.value.ok,
                rateLimit: cmcStatus.value.ok ? JSON.stringify(cmcStatus.value.limits) : undefined
            });
        }
        if (quicknodeStatus.status === 'fulfilled') {
            await storage.updateApiStatus('quicknode', {
                name: 'QuickNode',
                connected: quicknodeStatus.value.ok
            });
        }
        // Update Helius connection status
        const heliusStatus = getHeliusConnectionStatus();
        await storage.updateApiStatus('helius', {
            name: 'Helius RPC',
            connected: heliusStatus.connected
        });
        // Get Solana network status
        const solanaStatus = await getSolanaNetworkStatus();
        await storage.updateSolanaNetworkStatus({
            status: solanaStatus.status,
            tps: solanaStatus.tps
        });
        // Initialize some sample tokens
        await initializeSampleTokens();
    }
    catch (error) {
        console.error('Error initializing API connections:', error);
    }
}
async function setupEventListeners(broadcast) {
    // Listen for Helius events
    heliusEvents.on('connected', async () => {
        await storage.updateApiStatus('helius', {
            name: 'Helius RPC',
            connected: true
        });
        await storage.addActivityLog({
            timestamp: new Date(),
            message: 'Connected to Helius websocket',
            type: 'success'
        });
        // Broadcast updated API status
        const apiStatuses = await storage.getAllApiStatuses();
        broadcast({
            type: 'apiStatuses',
            data: apiStatuses
        });
        // Broadcast updated activity logs
        const logs = await storage.getActivityLogs();
        broadcast({
            type: 'activityLogs',
            data: logs
        });
    });
    heliusEvents.on('disconnected', async (data) => {
        await storage.updateApiStatus('helius', {
            name: 'Helius RPC',
            connected: false,
            errorMessage: `Disconnected: ${data.code} - ${data.reason}`
        });
        await storage.addActivityLog({
            timestamp: new Date(),
            message: `Disconnected from Helius websocket: ${data.reason}`,
            type: 'error'
        });
        // Broadcast updated API status
        const apiStatuses = await storage.getAllApiStatuses();
        broadcast({
            type: 'apiStatuses',
            data: apiStatuses
        });
        // Broadcast updated activity logs
        const logs = await storage.getActivityLogs();
        broadcast({
            type: 'activityLogs',
            data: logs
        });
    });
    heliusEvents.on('error', async (error) => {
        await storage.updateApiStatus('helius', {
            name: 'Helius RPC',
            connected: false,
            errorMessage: error.message
        });
        await storage.addActivityLog({
            timestamp: new Date(),
            message: `Helius websocket error: ${error.message}`,
            type: 'error'
        });
        // Broadcast updated API status
        const apiStatuses = await storage.getAllApiStatuses();
        broadcast({
            type: 'apiStatuses',
            data: apiStatuses
        });
        // Broadcast updated activity logs
        const logs = await storage.getActivityLogs();
        broadcast({
            type: 'activityLogs',
            data: logs
        });
    });
    // Clean up on process exit
    process.on('exit', () => {
        closeHeliusWebsocket();
    });
}
function setupApiRoutes(app, broadcast) {
    // API status endpoint
    app.get('/api/status', async (req, res) => {
        try {
            const status = {
                apiConnections: await storage.getAllApiStatuses(),
                system: await storage.getSystemStatus(),
                solana: await storage.getSolanaNetworkStatus()
            };
            res.json(status);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Arbitrage opportunities endpoint
    app.get('/api/arbitrage/opportunities', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const opportunities = await storage.getArbitrageOpportunities(limit);
            // Enrich with token data
            const enrichedOpportunities = await Promise.all(opportunities.map(async (opp) => {
                const token = await storage.getToken(opp.tokenId);
                return {
                    ...opp,
                    token: token || {
                        symbol: "UNKNOWN",
                        name: "Unknown Token",
                        address: "",
                        decimals: 9,
                        logoURI: ""
                    }
                };
            }));
            res.json(enrichedOpportunities);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Execute arbitrage endpoint
    app.post('/api/arbitrage/execute', async (req, res) => {
        try {
            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ error: 'Opportunity ID is required' });
            }
            const opportunity = await storage.getArbitrageOpportunity(parseInt(id));
            if (!opportunity) {
                return res.status(404).json({ error: 'Arbitrage opportunity not found' });
            }
            const updatedOpportunity = await storage.updateArbitrageOpportunity(parseInt(id), true);
            await storage.addActivityLog({
                timestamp: new Date(),
                message: `Executed arbitrage opportunity #${id}`,
                type: 'success'
            });
            // Broadcast updates
            broadcast({
                type: 'arbitrageExecuted',
                data: {
                    opportunityId: id,
                    executed: true,
                    timestamp: new Date()
                }
            });
            // Get updated activity logs
            const logs = await storage.getActivityLogs();
            broadcast({
                type: 'activityLogs',
                data: logs
            });
            res.json(updatedOpportunity);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get arbitrage settings
    app.get('/api/arbitrage/settings', async (req, res) => {
        try {
            const settings = await storage.getArbitrageSettings();
            res.json(settings);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Update arbitrage settings
    app.post('/api/arbitrage/settings', async (req, res) => {
        try {
            const updatedSettings = await storage.updateArbitrageSettings(req.body);
            // Broadcast updated settings
            broadcast({
                type: 'arbitrageSettingsUpdated',
                data: updatedSettings
            });
            res.json(updatedSettings);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get tokens
    app.get('/api/tokens', async (req, res) => {
        try {
            const tokens = await storage.getAllTokens();
            res.json(tokens);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get token prices
    app.get('/api/tokens/prices', async (req, res) => {
        try {
            const { symbols } = req.query;
            if (!symbols) {
                return res.status(400).json({ error: 'Symbols parameter is required' });
            }
            const symbolsArray = symbols.split(',');
            // Get prices from CoinGecko
            const priceData = await getPrices(symbolsArray.map(symbol => symbol));
            const prices = symbolsArray.map(symbol => ({
                symbol,
                name: symbol,
                price: symbol && priceData[symbol]?.usd || null,
                change24h: symbol && priceData[symbol]?.usd_24h_change || null,
                volume24h: symbol && priceData[symbol]?.usd_24h_vol || null
            }));
            res.json(prices);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get activity logs
    app.get('/api/logs', async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
            const logs = await storage.getActivityLogs(limit);
            res.json(logs);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Wallet tracking
    app.post('/api/wallet/track', async (req, res) => {
        try {
            // Validate input
            const validationResult = insertWalletTrackingSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({ error: 'Invalid input', details: validationResult.error });
            }
            const { address, alias, active } = validationResult.data;
            // Check if already tracking this wallet
            const existingTracking = await storage.getWalletTrackingByAddress(address);
            if (existingTracking) {
                return res.status(409).json({ error: 'Already tracking this wallet', tracking: existingTracking });
            }
            // Add to tracking
            const tracking = await storage.createWalletTracking({
                address,
                alias,
                active: active ?? true
            });
            await storage.addActivityLog({
                timestamp: new Date(),
                message: `Started tracking wallet ${alias || address}`,
                type: 'info'
            });
            // Get updated activity logs
            const logs = await storage.getActivityLogs();
            broadcast({
                type: 'activityLogs',
                data: logs
            });
            // Broadcast new tracking
            broadcast({
                type: 'walletTrackingAdded',
                data: tracking
            });
            res.json(tracking);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get tracked wallets
    app.get('/api/wallet/tracking', async (req, res) => {
        try {
            const trackings = await storage.getAllWalletTrackings();
            res.json(trackings);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Routes pour les notifications Telegram
    app.get('/api/notifications/settings', async (req, res) => {
        try {
            const { getNotificationSettings } = await import('./api/telegram.js');
            const settings = getNotificationSettings();
            res.json(settings);
        }
        catch (error) {
            console.error('Error getting notification settings:', error);
            res.status(500).json({ error: error.message || 'Failed to get notification settings' });
        }
    });
    app.post('/api/notifications/settings', async (req, res) => {
        try {
            const { updateNotificationSettings } = await import('./api/telegram.js');
            const settings = updateNotificationSettings(req.body);
            res.json(settings);
        }
        catch (error) {
            console.error('Error updating notification settings:', error);
            res.status(500).json({ error: error.message || 'Failed to update notification settings' });
        }
    });
    app.post('/api/notifications/test', async (req, res) => {
        try {
            const { sendTestNotification } = await import('./api/telegram.js');
            const success = await sendTestNotification();
            if (success) {
                res.json({ success: true, message: 'Test notification sent successfully' });
            }
            else {
                res.status(400).json({ success: false, message: 'Failed to send test notification. Check Telegram configuration.' });
            }
        }
        catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({ error: error.message || 'Failed to send test notification' });
        }
    });
    // Update wallet tracking
    app.patch('/api/wallet/tracking/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { active } = req.body;
            if (active === undefined) {
                return res.status(400).json({ error: 'active field is required' });
            }
            const updatedTracking = await storage.updateWalletTracking(id, active);
            if (!updatedTracking) {
                return res.status(404).json({ error: 'Wallet tracking not found' });
            }
            // Broadcast updated tracking
            broadcast({
                type: 'walletTrackingUpdated',
                data: updatedTracking
            });
            res.json(updatedTracking);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Jupiter price quote
    app.get('/api/jupiter/quote', async (req, res) => {
        try {
            const { inputMint, outputMint, amount, slippageBps } = req.query;
            if (!inputMint || !outputMint || !amount) {
                return res.status(400).json({ error: 'inputMint, outputMint, and amount are required' });
            }
            const quote = await getQuote(inputMint, outputMint, amount, slippageBps ? parseInt(slippageBps) : undefined);
            res.json(quote);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // Get solana network status
    app.get('/api/solana/status', async (req, res) => {
        try {
            const status = await storage.getSolanaNetworkStatus();
            res.json(status);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
async function initializeSampleTokens() {
    try {
        // Add some sample tokens if none exist
        const existingTokens = await storage.getAllTokens();
        if (existingTokens.length === 0) {
            const sampleTokens = [
                {
                    symbol: 'SOL',
                    name: 'Solana',
                    address: 'So11111111111111111111111111111111111111112',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
                    coingeckoId: 'solana',
                    cmcId: '5426'
                },
                {
                    symbol: 'BONK',
                    name: 'Bonk',
                    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
                    coingeckoId: 'bonk',
                    cmcId: '23095'
                },
                {
                    symbol: 'JUP',
                    name: 'Jupiter',
                    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN/logo.png',
                    coingeckoId: 'jupiter-exchange',
                    cmcId: '24928'
                },
                {
                    symbol: 'RAY',
                    name: 'Raydium',
                    address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
                    coingeckoId: 'raydium',
                    cmcId: '8526'
                },
                {
                    symbol: 'ORCA',
                    name: 'Orca',
                    address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png',
                    coingeckoId: 'orca',
                    cmcId: '11165'
                },
                {
                    symbol: 'PYTH',
                    name: 'Pyth Network',
                    address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
                    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3/logo.png',
                    coingeckoId: 'pyth-network',
                    cmcId: '27012'
                }
            ];
            for (const token of sampleTokens) {
                await storage.createToken(token);
            }
            console.log(`Initialized ${sampleTokens.length} sample tokens`);
        }
    }
    catch (error) {
        console.error('Error initializing sample tokens:', error);
    }
}
