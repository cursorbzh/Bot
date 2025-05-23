import 'dotenv/config';
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { initTelegramBot } from "./services/telegram.js";
import { initNotificationSettings } from "./api/telegram.js";
import { pushSchema } from "./db.js";
import { WebSocketServer } from 'ws';
import { parse } from 'url';
import type { Server } from 'http';
import WebSocket from 'ws';
import https from 'https';
import fs from 'fs';
import { storage } from './storage.js';
import type { ArbitrageSettings } from '../shared/schema.js';
import { scanForArbitrageOpportunities } from './api/jupiter.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Map pour suivre les scans d'arbitrage actifs
const activeArbitrageScans = new Map<string, {
  intervalId: NodeJS.Timeout;
  settings: ArbitrageSettings;
}>();

(async () => {
  // Initialiser le bot Telegram
  initTelegramBot();
  
  // Initialiser les paramètres de notification Telegram
  try {
    await initNotificationSettings();
    console.log("Telegram notification settings initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Telegram notification settings:", error);
  }
  
  // Pousser le schéma vers la base de données
  try {
    await pushSchema();
    console.log("Database schema pushed successfully");
  } catch (error) {
    console.error("Failed to push database schema:", error);
  }
  
  const server = await registerRoutes(app);

  // Remplacer la création du serveur HTTP par HTTPS
  const httpsOptions = {
    key: fs.readFileSync('./cert/key.pem'),
    cert: fs.readFileSync('./cert/cert.pem')
  };
  const httpsServer = https.createServer(httpsOptions, app);

  // Configuration WebSocket
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false,
    clientTracking: true,
    maxPayload: 1024 * 1024
  });

  // Map pour suivre les connexions actives et en attente
  const activeConnections = new Map();
  const pendingUpgrades = new Map();
  const upgradeTimeouts = new Map();

  // Fonction pour nettoyer les connexions
  const cleanupConnection = (clientId: string) => {
    activeConnections.delete(clientId);
    pendingUpgrades.delete(clientId);
    if (upgradeTimeouts.has(clientId)) {
      clearTimeout(upgradeTimeouts.get(clientId));
      upgradeTimeouts.delete(clientId);
    }
  };

  // Gestionnaire de connexion WebSocket
  wss.on('connection', (ws, req) => {
    const { query } = parse(req.url || '', true);
    const clientId = query.clientId as string;
    
    if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
      console.warn('Invalid clientId:', clientId);
      ws.close(1000, 'Invalid client ID');
      return;
    }
    
    console.log('WebSocket client connected with ID:', clientId);
    
    // Nettoyer les connexions en attente
    cleanupConnection(clientId);
    
    // Stocker la connexion
    activeConnections.set(clientId, {
      ws,
      lastPing: Date.now(),
      connectedAt: Date.now()
    });
    
    // Envoyer l'ID client au client
    ws.send(JSON.stringify({ 
      type: 'connection_established',
      clientId,
      timestamp: Date.now()
    }));
    
    // Gestion des messages
    ws.on('message', (message) => {
      try {
        console.log('WebSocket message reçu:', message.toString());
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          // Mettre à jour le dernier ping
          const connection = activeConnections.get(clientId);
          if (connection) {
            connection.lastPing = Date.now();
            activeConnections.set(clientId, connection);
          }
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now(),
            clientId 
          }));
        } else if (data.type === 'startArbitrageScanner') {
          console.log('Début du scan d\'arbitrage demandé par le client:', clientId);
          
          // Si un scan est déjà actif pour ce client, l'arrêter
          if (activeArbitrageScans.has(clientId)) {
            const scan = activeArbitrageScans.get(clientId);
            if (scan && scan.intervalId) {
              clearInterval(scan.intervalId);
              console.log('Scan existant arrêté pour le client:', clientId);
            }
          }
          
          // Récupérer les paramètres d'arbitrage depuis le stockage
          storage.getArbitrageSettings().then((settings: ArbitrageSettings) => {
            // Envoyer une confirmation que le scan a démarré
            ws.send(JSON.stringify({
              type: 'arbitrageScannerStarted',
              data: settings,
              timestamp: Date.now()
            }));
            
            // Obtenir la liste des tokens pour créer des paires
            storage.getAllTokens().then(async (tokens) => {
              // Créer des paires de tokens pour le scan d'arbitrage
              const tokenPairs: {inputMint: string, outputMint: string}[] = [];
              
              // Trouver les tokens de base les plus populaires
              const solToken = tokens.find(t => t.symbol === 'SOL');
              const usdcToken = tokens.find(t => t.symbol === 'USDC');
              const usdtToken = tokens.find(t => t.symbol === 'USDT');
              
              // Adresses hardcodées au cas où
              const solAddress = 'So11111111111111111111111111111111111111112';
              const usdcAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; 
              const usdtAddress = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
              
              // Créer un tableau de tokens de base en utilisant ceux trouvés ou les adresses hardcodées
              const baseTokens = [];
              if (solToken) baseTokens.push(solToken);
              else baseTokens.push({id: 0, symbol: 'SOL', name: 'Solana', address: solAddress});
              
              if (usdcToken) baseTokens.push(usdcToken);
              else baseTokens.push({id: 0, symbol: 'USDC', name: 'USD Coin', address: usdcAddress});
              
              if (usdtToken) baseTokens.push(usdtToken);
              else baseTokens.push({id: 0, symbol: 'USDT', name: 'Tether', address: usdtAddress});
              
              // Tokens populaires (utiliser ceux de la DB si disponibles, sinon hardcoder les adresses)
              const popularTokenSymbols = ['BONK', 'JUP', 'RAY', 'ORCA', 'PYTH'];
              const popularTokenAddresses: Record<string, string> = {
                'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
                'ORCA': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
                'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'
              };
              
              const popularTokens = [];
              
              // Ajouter les tokens populaires depuis la DB ou les adresses hardcodées
              for (const symbol of popularTokenSymbols) {
                const token = tokens.find(t => t.symbol === symbol);
                if (token) {
                  popularTokens.push(token);
                } else if (popularTokenAddresses[symbol]) {
                  popularTokens.push({
                    id: 0, 
                    symbol, 
                    name: symbol, 
                    address: popularTokenAddresses[symbol]
                  });
                }
              }
              
              // Créer toutes les paires possibles entre tokens de base et tokens populaires
              for (const baseToken of baseTokens) {
                // Paires entre tokens de base
                for (const otherBaseToken of baseTokens) {
                  if (baseToken.symbol !== otherBaseToken.symbol) {
                    tokenPairs.push({
                      inputMint: baseToken.address,
                      outputMint: otherBaseToken.address
                    });
                  }
                }
                
                // Paires entre tokens de base et tokens populaires
                for (const popularToken of popularTokens) {
                  tokenPairs.push({
                    inputMint: baseToken.address,
                    outputMint: popularToken.address
                  });
                  
                  tokenPairs.push({
                    inputMint: popularToken.address,
                    outputMint: baseToken.address
                  });
                }
              }
              
              // Paires entre tokens populaires
              for (let i = 0; i < popularTokens.length; i++) {
                for (let j = i + 1; j < popularTokens.length; j++) {
                  tokenPairs.push({
                    inputMint: popularTokens[i].address,
                    outputMint: popularTokens[j].address
                  });
                  
                  tokenPairs.push({
                    inputMint: popularTokens[j].address,
                    outputMint: popularTokens[i].address
                  });
                }
              }
              
              // Dédupliquer les paires
              const uniquePairs: {inputMint: string, outputMint: string}[] = [];
              const seenPairs = new Set<string>();
              
              for (const pair of tokenPairs) {
                const pairKey = `${pair.inputMint}:${pair.outputMint}`;
                if (!seenPairs.has(pairKey)) {
                  seenPairs.add(pairKey);
                  uniquePairs.push(pair);
                }
              }
              
              console.log(`Configuration de ${uniquePairs.length} paires de tokens pour le scan`);
              
              // Limiter le nombre de paires pour le premier scan pour éviter les erreurs de limite de taux
              // Prendre les 10 premières paires pour commencer
              const initialPairsToScan = uniquePairs.slice(0, 10);
              console.log(`Scan initial limité aux ${initialPairsToScan.length} premières paires`);
              
              // Effectuer un premier scan immédiatement
              try {
                console.log('Démarrage du scan d\'arbitrage initial');
                const opportunities = await scanForArbitrageOpportunities(initialPairsToScan);
                
                if (!opportunities || opportunities.length === 0) {
                  console.log('Aucune opportunité trouvée dans le scan initial');
                  ws.send(JSON.stringify({
                    type: 'arbitrageOpportunities',
                    data: [],
                    timestamp: Date.now()
                  }));
                } else {
                  // Filtrer les opportunités selon les paramètres
                  const minSpreadPercentage = settings.minSpreadPercentage > 0 ? 0.01 : settings.minSpreadPercentage;
                  
                  const filteredOpportunities = opportunities.filter(
                    opp => opp.profitPercentage >= minSpreadPercentage
                  );
                  
                  console.log(`Scan initial terminé, ${filteredOpportunities.length} opportunités trouvées`);
                  
                  // Enregistrer les opportunités dans la base de données
                  for (const opp of filteredOpportunities) {
                    try {
                      const tokenInput = tokens.find(t => t.address === opp.inputMint);
                      const tokenOutput = tokens.find(t => t.address === opp.outputMint);
                      
                      if (tokenInput && tokenOutput) {
                        await storage.createArbitrageOpportunity({
                          tokenId: tokenInput.id,
                          buyDex: opp.sources?.forward || 
                            (Array.isArray(opp.routes.forward[0]?.swapInfo) 
                              ? opp.routes.forward[0]?.swapInfo[0]?.label 
                              : opp.routes.forward[0]?.swapInfo?.label) || 
                            'Jupiter',
                          sellDex: opp.sources?.backward || 
                            (Array.isArray(opp.routes.backward[0]?.swapInfo) 
                              ? opp.routes.backward[0]?.swapInfo[0]?.label 
                              : opp.routes.backward[0]?.swapInfo?.label) || 
                            'Jupiter',
                          buyPrice: opp.forwardPrice,
                          sellPrice: opp.backwardPrice,
                          spreadPercentage: opp.profitPercentage.toString(),
                          estimatedProfit: ((opp.profitPercentage / 100) * 100).toString(),
                          liquidity: '10000',
                          volume24h: '0'
                        });
                        
                        // Envoyer la nouvelle opportunité enrichie au client
                        const newOpportunity = {
                          ...opp,
                          buyDex: opp.sources?.forward || 
                            (Array.isArray(opp.routes.forward[0]?.swapInfo) 
                              ? opp.routes.forward[0]?.swapInfo[0]?.label 
                              : opp.routes.forward[0]?.swapInfo?.label) || 
                            'Jupiter',
                          sellDex: opp.sources?.backward || 
                            (Array.isArray(opp.routes.backward[0]?.swapInfo) 
                              ? opp.routes.backward[0]?.swapInfo[0]?.label 
                              : opp.routes.backward[0]?.swapInfo?.label) || 
                            'Jupiter',
                          buyPrice: opp.forwardPrice,
                          sellPrice: opp.backwardPrice,
                          spreadPercentage: opp.profitPercentage.toString(),
                          estimatedProfit: ((opp.profitPercentage / 100) * 100).toString(),
                          token: tokenInput,
                          tokenId: tokenInput.id,
                          liquidity: '10000',
                          volume24h: '0',
                          timestamp: new Date(),
                          executed: false
                        };
                        
                        ws.send(JSON.stringify({
                          type: 'newArbitrageOpportunity',
                          data: newOpportunity,
                          timestamp: Date.now()
                        }));
                      }
                    } catch (dbError) {
                      console.error('Erreur lors de l\'enregistrement de l\'opportunité:', dbError);
                    }
                  }
                  
                  // Envoyer les opportunités au client
                  try {
                    const dbOpportunities = await storage.getArbitrageOpportunities();
                    
                    // Enrichir les opportunités avec les données complètes des tokens
                    const enrichedOpportunities = await Promise.all(
                      dbOpportunities.map(async (opp) => {
                        try {
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
                        } catch (error) {
                          console.error(`Erreur lors de la récupération du token ${opp.tokenId}:`, error);
                          // Fournir un token par défaut en cas d'erreur
                          return {
                            ...opp,
                            token: { 
                              symbol: "UNKNOWN", 
                              name: "Unknown Token",
                              address: "",
                              decimals: 9,
                              logoURI: ""
                            }
                          };
                        }
                      })
                    );
                    
                    ws.send(JSON.stringify({
                      type: 'arbitrageOpportunities',
                      data: enrichedOpportunities,
                      timestamp: Date.now()
                    }));
                  } catch (fetchError) {
                    console.error('Erreur lors de la récupération des opportunités:', fetchError);
                    ws.send(JSON.stringify({
                      type: 'arbitrageOpportunities',
                      data: [],
                      timestamp: Date.now()
                    }));
                  }
                }
              } catch (error) {
                console.error('Erreur lors du scan initial:', error);
                ws.send(JSON.stringify({
                  type: 'arbitrageOpportunities',
                  data: [],
                  timestamp: Date.now()
                }));
              }
              
              // Configurer un intervalle pour scanner régulièrement
              const intervalId = setInterval(async () => {
                try {
                  console.log('Exécution du scan d\'arbitrage périodique pour le client:', clientId);
                  
                  // Diviser les paires en lots pour éviter les erreurs de limite de taux
                  const batchSize = 5; // Traiter 5 paires à la fois
                  const allOpportunities = [];
                  
                  // Traiter les paires par lots
                  for (let i = 0; i < uniquePairs.length; i += batchSize) {
                    const batch = uniquePairs.slice(i, i + batchSize);
                    console.log(`Traitement du lot ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniquePairs.length/batchSize)} (${batch.length} paires)`);
                    
                    try {
                      const batchOpportunities = await scanForArbitrageOpportunities(batch);
                      if (batchOpportunities && batchOpportunities.length > 0) {
                        allOpportunities.push(...batchOpportunities);
                      }
                    } catch (batchError) {
                      console.error(`Erreur lors du traitement du lot ${Math.floor(i/batchSize) + 1}:`, batchError);
                    }
                  }
                  
                  if (!allOpportunities || allOpportunities.length === 0) {
                    console.log('Aucune opportunité trouvée dans le scan périodique');
                    ws.send(JSON.stringify({
                      type: 'arbitrageOpportunities',
                      data: [],
                      timestamp: Date.now()
                    }));
                    return;
                  }
                  
                  // Filtrer les opportunités selon les paramètres
                  const minSpreadPercentage = settings.minSpreadPercentage > 0 ? 0.01 : settings.minSpreadPercentage;
                  
                  const filteredOpportunities = allOpportunities.filter(
                    opp => opp.profitPercentage >= minSpreadPercentage
                  );
                  
                  console.log(`Scan périodique terminé, ${filteredOpportunities.length} opportunités trouvées`);
                  
                  // Mettre à jour ou créer des opportunités dans la base de données
                  for (const opp of filteredOpportunities) {
                    try {
                      const tokenInput = tokens.find(t => t.address === opp.inputMint);
                      const tokenOutput = tokens.find(t => t.address === opp.outputMint);
                      
                      if (tokenInput && tokenOutput) {
                        // Vérifier si une opportunité similaire existe déjà
                        const existingOpps = await storage.getArbitrageOpportunities(10);
                        const existingOpp = existingOpps.find(
                          ex => ex.tokenId === tokenInput.id
                        );
                        
                        if (existingOpp) {
                          // Mettre à jour l'opportunité existante
                          await storage.updateArbitrageOpportunity(
                            existingOpp.id, 
                            existingOpp.executed || false // Garder le même statut d'exécution
                          );
                        } else {
                          // Créer une nouvelle opportunité
                          await storage.createArbitrageOpportunity({
                            tokenId: tokenInput.id,
                            buyDex: opp.sources?.forward || 
                              (Array.isArray(opp.routes.forward[0]?.swapInfo) 
                                ? opp.routes.forward[0]?.swapInfo[0]?.label 
                                : opp.routes.forward[0]?.swapInfo?.label) || 
                              'Jupiter',
                            sellDex: opp.sources?.backward || 
                              (Array.isArray(opp.routes.backward[0]?.swapInfo) 
                                ? opp.routes.backward[0]?.swapInfo[0]?.label 
                                : opp.routes.backward[0]?.swapInfo?.label) || 
                              'Jupiter',
                            buyPrice: opp.forwardPrice,
                            sellPrice: opp.backwardPrice,
                            spreadPercentage: opp.profitPercentage.toString(),
                            estimatedProfit: ((opp.profitPercentage / 100) * 100).toString(),
                            liquidity: '10000',
                            volume24h: '0'
                          });
                        }
                      }
                    } catch (dbError) {
                      console.error('Erreur lors de la mise à jour de l\'opportunité:', dbError);
                    }
                  }
                  
                  // Envoyer les opportunités mises à jour au client
                  try {
                    const updatedOpportunities = await storage.getArbitrageOpportunities();
                    
                    // Enrichir les opportunités avec les données complètes des tokens
                    const enrichedOpportunities = await Promise.all(
                      updatedOpportunities.map(async (opp) => {
                        try {
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
                        } catch (error) {
                          console.error(`Erreur lors de la récupération du token ${opp.tokenId}:`, error);
                          // Fournir un token par défaut en cas d'erreur
                          return {
                            ...opp,
                            token: { 
                              symbol: "UNKNOWN", 
                              name: "Unknown Token",
                              address: "",
                              decimals: 9,
                              logoURI: ""
                            }
                          };
                        }
                      })
                    );
                    
                    ws.send(JSON.stringify({
                      type: 'arbitrageOpportunities',
                      data: enrichedOpportunities,
                      timestamp: Date.now()
                    }));
                  } catch (fetchError) {
                    console.error('Erreur lors de la récupération des opportunités:', fetchError);
                  }
                } catch (error) {
                  console.error('Erreur lors du scan périodique:', error);
                }
              }, 60000); // Scan toutes les 60 secondes
              
              // Stocker l'intervalle pour pouvoir l'arrêter plus tard
              activeArbitrageScans.set(clientId, {
                intervalId,
                settings
              });
              
              // Ajouter un log d'activité
              return storage.addActivityLog({
                timestamp: new Date(),
                message: 'Arbitrage scanner started',
                type: 'info'
              });
            }).then(() => {
              // Récupérer et diffuser les logs mis à jour
              return storage.getActivityLogs();
            }).then((logs: any[]) => {
              ws.send(JSON.stringify({
                type: 'activityLogs',
                data: logs
              }));
            }).catch((error: Error) => {
              console.error('Error setting up token pairs:', error);
            });
          }).catch((error: Error) => {
            console.error('Error starting arbitrage scanner:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to start arbitrage scanner',
              error: error.message,
              timestamp: Date.now()
            }));
          });
        } else if (data.type === 'stopArbitrageScanner') {
          console.log('Arrêt du scan d\'arbitrage demandé par le client:', clientId);
          
          // Arrêter l'intervalle de scan s'il existe
          if (activeArbitrageScans.has(clientId)) {
            const scan = activeArbitrageScans.get(clientId);
            if (scan && scan.intervalId) {
              clearInterval(scan.intervalId);
              activeArbitrageScans.delete(clientId);
              console.log('Scan d\'arbitrage arrêté pour le client:', clientId);
            }
          }
          
          ws.send(JSON.stringify({
            type: 'arbitrageScannerStopped',
            timestamp: Date.now()
          }));
          
          // Ajouter un log d'activité
          storage.addActivityLog({
            timestamp: new Date(),
            message: 'Arbitrage scanner stopped',
            type: 'info'
          }).then(() => {
            // Récupérer et diffuser les logs mis à jour
            return storage.getActivityLogs();
          }).then((logs: any[]) => {
            ws.send(JSON.stringify({
              type: 'activityLogs',
              data: logs
            }));
          }).catch((error: Error) => {
            console.error('Error updating activity logs:', error);
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Gestion de la fermeture
    ws.on('close', (code, reason) => {
      console.log('WebSocket client disconnected:', clientId, 'Code:', code, 'Reason:', reason.toString());
      cleanupConnection(clientId);
    });

    // Gestion des erreurs
    ws.on('error', (error) => {
      console.error('WebSocket error for client', clientId, ':', error);
      cleanupConnection(clientId);
    });

    // Gestion du ping/pong
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    ws.on('pong', () => {
      const connection = activeConnections.get(clientId);
      if (connection) {
        connection.lastPing = Date.now();
        activeConnections.set(clientId, connection);
      }
    });
  });

  // Remplacer server.on('upgrade', ...) par httpsServer.on('upgrade', ...)
  httpsServer.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);
    const clientId = query.clientId as string;

    // Vérifier si c'est une requête WebSocket valide
    if (pathname !== '/ws') {
      console.warn('Invalid WebSocket request:', { pathname, clientId });
      socket.destroy();
      return;
    }

    // Vérifier si le clientId est valide
    if (!clientId || typeof clientId !== 'string' || clientId.length < 5) {
      console.warn('Invalid clientId:', clientId);
      socket.destroy();
      return;
    }

    console.log('Processing upgrade request for client:', clientId);

    // Vérifier si une mise à niveau est déjà en cours
    if (pendingUpgrades.has(clientId)) {
      console.log('Upgrade already in progress for client:', clientId);
      socket.destroy();
      return;
    }

    // Vérifier si une connexion existe déjà
    const existingConnection = activeConnections.get(clientId);
    if (existingConnection) {
      console.log('Closing existing connection for client:', clientId);
      try {
        pendingUpgrades.set(clientId, true);
        existingConnection.ws.terminate();
        cleanupConnection(clientId);
        
        // Attendre que la connexion soit complètement fermée
        const timeoutId = setTimeout(() => {
          if (pendingUpgrades.has(clientId)) {
            pendingUpgrades.delete(clientId);
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request);
            });
          }
        }, 1000);
        
        upgradeTimeouts.set(clientId, timeoutId);
      } catch (error) {
        console.error('Error handling existing connection:', error);
        cleanupConnection(clientId);
        socket.destroy();
      }
    } else {
      pendingUpgrades.set(clientId, true);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  const port = 5000;
  httpsServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} (HTTPS)`);
  });
})();

