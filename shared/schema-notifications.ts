import { z } from 'zod';

// Schéma pour les paramètres d'alertes d'arbitrage
export const ArbitrageAlertsSchema = z.object({
  enabled: z.boolean(),
  minSpreadPercentage: z.number().min(0),
  minProfit: z.number().min(0)
});

// Schéma pour les alertes de nouveaux tokens
export const NewTokenAlertsSchema = z.object({
  enabled: z.boolean()
});

// Schéma pour les alertes de suivi de portefeuille
export const WalletTrackingAlertsSchema = z.object({
  enabled: z.boolean(),
  minTransactionValue: z.number().min(0)
});

// Schéma pour les alertes système
export const SystemAlertsSchema = z.object({
  enabled: z.boolean(),
  errors: z.boolean(),
  statusChanges: z.boolean()
});

// Schéma pour les paramètres de notification
export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  arbitrageAlerts: ArbitrageAlertsSchema,
  newTokenAlerts: NewTokenAlertsSchema,
  walletTrackingAlerts: WalletTrackingAlertsSchema,
  systemAlerts: SystemAlertsSchema
});

// Types Typescript
export type ArbitrageAlerts = z.infer<typeof ArbitrageAlertsSchema>;
export type NewTokenAlerts = z.infer<typeof NewTokenAlertsSchema>;
export type WalletTrackingAlerts = z.infer<typeof WalletTrackingAlertsSchema>;
export type SystemAlerts = z.infer<typeof SystemAlertsSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

// Paramètres par défaut
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  arbitrageAlerts: {
    enabled: true,
    minSpreadPercentage: 2.0,
    minProfit: 5.0
  },
  newTokenAlerts: {
    enabled: true
  },
  walletTrackingAlerts: {
    enabled: true,
    minTransactionValue: 1000
  },
  systemAlerts: {
    enabled: true,
    errors: true,
    statusChanges: true
  }
};