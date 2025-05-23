import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import type { ArbitrageOpportunity, Token, WalletTracking, TransactionHistory } from '../../shared/schema.js';

// Configuration Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Vérifier si les informations Telegram sont disponibles
const TELEGRAM_ENABLED = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

// Créer l'instance du bot Telegram
let bot: TelegramBot | null = null;

// Initialiser le bot Telegram
export function initTelegramBot(): boolean {
  if (!TELEGRAM_ENABLED) {
    console.log('Telegram notifications disabled: missing configuration');
    return false;
  }

  try {
    // Créer le bot avec l'option polling désactivée (nous ne recevons pas de messages)
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('Telegram bot initialized successfully');
    
    // Envoyer un message de test pour confirmer que le bot fonctionne
    sendTelegramMessage('🚀 SolTrader Pro a démarré! Les notifications sont actives.');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return false;
  }
}

// Fonction pour envoyer un message Telegram
export async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

// Notification d'opportunité d'arbitrage
export async function notifyArbitrageOpportunity(opportunity: ArbitrageOpportunity, token: Token): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  const profit = parseFloat(opportunity.estimatedProfit);
  const spread = parseFloat(opportunity.spreadPercentage);
  
  // N'envoyer que pour les opportunités intéressantes (> 1%)
  if (spread < 1.0) {
    return false;
  }

  const message = `
💰 *Opportunité d'Arbitrage* 💰

*Token:* ${token.symbol} (${token.name})
*Spread:* ${opportunity.spreadPercentage}%
*Profit Estimé:* $${parseFloat(opportunity.estimatedProfit).toFixed(2)}
*Achat:* ${opportunity.buyPrice} sur ${opportunity.buyDex}
*Vente:* ${opportunity.sellPrice} sur ${opportunity.sellDex}
${opportunity.liquidity ? `*Liquidité:* $${parseFloat(opportunity.liquidity).toLocaleString()}` : ''}

[Explorer le token](https://solscan.io/token/${token.address})
`;

  return sendTelegramMessage(message);
}

// Notification d'exécution d'arbitrage
export async function notifyArbitrageExecution(opportunity: ArbitrageOpportunity, token: Token, success: boolean): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  const statusEmoji = success ? '✅' : '❌';
  const statusText = success ? 'SUCCÈS' : 'ÉCHEC';

  const message = `
${statusEmoji} *Exécution d'Arbitrage: ${statusText}* ${statusEmoji}

*Token:* ${token.symbol} (${token.name})
*Spread:* ${opportunity.spreadPercentage}%
*Profit Réalisé:* $${parseFloat(opportunity.estimatedProfit).toFixed(2)}
*Achat:* ${opportunity.buyPrice} sur ${opportunity.buyDex}
*Vente:* ${opportunity.sellPrice} sur ${opportunity.sellDex}

${success ? '✅ Transaction complétée avec succès!' : '❌ La transaction a échoué. Vérifiez les logs pour plus de détails.'}
`;

  return sendTelegramMessage(message);
}

// Notification de nouveau token
export async function notifyNewToken(token: Token): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  const message = `
🔔 *Nouveau Token Détecté* 🔔

*Symbole:* ${token.symbol}
*Nom:* ${token.name}
*Adresse:* \`${token.address}\`

[Explorer le token](https://solscan.io/token/${token.address})
`;

  return sendTelegramMessage(message);
}

// Notification d'activité de portefeuille suivi
export async function notifyWalletActivity(wallet: WalletTracking, transaction: TransactionHistory): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  const message = `
👁️ *Activité Détectée - Portefeuille Suivi* 👁️

*Portefeuille:* ${wallet.alias || wallet.address}
*Type:* ${transaction.type}
*Montant:* ${transaction.amount}
*Prix:* ${transaction.price}
*Statut:* ${transaction.status}
*Signature:* \`${transaction.signature}\`

[Explorer la transaction](https://solscan.io/tx/${transaction.signature})
`;

  return sendTelegramMessage(message);
}

// Notification d'erreur système
export async function notifySystemError(errorMessage: string): Promise<boolean> {
  if (!TELEGRAM_ENABLED || !bot) {
    return false;
  }

  const message = `
🚨 *ALERTE SYSTÈME* 🚨

*Erreur:* ${errorMessage}
*Timestamp:* ${new Date().toISOString()}

_Veuillez vérifier les logs du système pour plus de détails._
`;

  return sendTelegramMessage(message);
}