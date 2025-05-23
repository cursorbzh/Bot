import { sendTelegramMessage } from '../services/telegram.js';
import { pool } from '../db.js';
import { DEFAULT_NOTIFICATION_SETTINGS, NotificationSettingsSchema } from '../../shared/schema.js';
// Stockage des paramètres en mémoire (sera également sauvegardé en DB)
let notificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
// Initialisation des paramètres de notification depuis la base de données
export async function initNotificationSettings() {
    try {
        // Vérifier si les paramètres existent déjà en base de données
        const result = await pool.query(`
      SELECT value FROM system_settings WHERE key = 'notificationSettings'
    `);
        if (result.rowCount && result.rowCount > 0) {
            try {
                const settings = JSON.parse(result.rows[0].value);
                // Valider les paramètres avec Zod
                const parsedSettings = NotificationSettingsSchema.safeParse(settings);
                if (parsedSettings.success) {
                    notificationSettings = parsedSettings.data;
                    console.log('Paramètres de notification chargés depuis la base de données');
                }
                else {
                    console.error('Les paramètres de notification en base de données sont invalides:', parsedSettings.error);
                    await saveNotificationSettingsToDb(DEFAULT_NOTIFICATION_SETTINGS);
                }
            }
            catch (error) {
                console.error('Erreur lors du parsing des paramètres de notification:', error);
                await saveNotificationSettingsToDb(DEFAULT_NOTIFICATION_SETTINGS);
            }
        }
        else {
            // Les paramètres n'existent pas encore, on les crée
            await saveNotificationSettingsToDb(DEFAULT_NOTIFICATION_SETTINGS);
        }
    }
    catch (error) {
        console.error('Erreur lors de l\'initialisation des paramètres de notification:', error);
    }
}
// Fonction pour sauvegarder les paramètres en base de données
async function saveNotificationSettingsToDb(settings) {
    try {
        const settingsString = JSON.stringify(settings);
        // Vérifier si l'entrée existe déjà
        const checkResult = await pool.query(`
      SELECT 1 FROM system_settings WHERE key = 'notificationSettings'
    `);
        if (checkResult.rowCount && checkResult.rowCount > 0) {
            // Mettre à jour les paramètres existants
            await pool.query(`
        UPDATE system_settings SET value = $1, updatedAt = NOW() WHERE key = 'notificationSettings'
      `, [settingsString]);
        }
        else {
            // Créer une nouvelle entrée
            await pool.query(`
        INSERT INTO system_settings (key, value, updatedAt) VALUES ('notificationSettings', $1, NOW())
      `, [settingsString]);
        }
        console.log('Paramètres de notification sauvegardés en base de données');
    }
    catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres de notification:', error);
    }
}
// Obtenir les paramètres de notification
export function getNotificationSettings() {
    return notificationSettings;
}
// Mettre à jour les paramètres de notification
export async function updateNotificationSettings(settings) {
    try {
        // Valider les paramètres avec Zod
        const parsedSettings = NotificationSettingsSchema.safeParse(settings);
        if (!parsedSettings.success) {
            throw new Error(`Paramètres de notification invalides: ${parsedSettings.error}`);
        }
        // Mettre à jour les paramètres en mémoire
        notificationSettings = parsedSettings.data;
        // Sauvegarder en base de données
        await saveNotificationSettingsToDb(notificationSettings);
        return notificationSettings;
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres de notification:', error);
        throw error;
    }
}
// Envoyer une notification de test
export async function sendTestNotification() {
    const message = `
🧪 *Test de Notification* 🧪

Ce message confirme que vos paramètres de notification Telegram fonctionnent correctement.

✅ Configuration réussie!
⏰ ${new Date().toLocaleString('fr-FR')}
  `;
    return sendTelegramMessage(message);
}
