import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { NotificationSettings as INotificationSettings } from '@/hooks/use-notifications';
import { Loader2 } from 'lucide-react';

interface NotificationSettingsProps {
  onSave: (settings: INotificationSettings) => void;
  onTestNotification: () => void;
  initialSettings?: INotificationSettings;
  isLoading?: boolean;
  isTesting?: boolean;
}

export function NotificationSettings({ 
  onSave, 
  onTestNotification, 
  initialSettings,
  isLoading = false,
  isTesting = false
}: NotificationSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<INotificationSettings>({
    enabled: true,
    arbitrageAlerts: {
      enabled: true,
      minSpreadPercentage: 2.0,
      minProfit: 5.0,
    },
    newTokenAlerts: {
      enabled: true,
    },
    walletTrackingAlerts: {
      enabled: true,
      minTransactionValue: 1000,
    },
    systemAlerts: {
      enabled: true,
      errors: true,
      statusChanges: true,
    },
  });
  
  // Mettre à jour les paramètres lorsque les paramètres initiaux changent
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleSaveSettings = () => {
    onSave(settings);
    // Note: Le toast est maintenant géré dans le hook useNotifications
  };

  const handleTestNotification = () => {
    onTestNotification();
    // Note: Le toast est maintenant géré dans le hook useNotifications
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres de Notification</CardTitle>
        <CardDescription>Configurez vos alertes Telegram pour rester informé des événements importants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Notifications Telegram</h3>
            <p className="text-sm text-muted-foreground">Activer/désactiver toutes les notifications Telegram</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Alertes d'Arbitrage</h3>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="arbitrage-alerts"
              checked={settings.arbitrageAlerts.enabled}
              onCheckedChange={(checked) => 
                setSettings((prev) => ({
                  ...prev,
                  arbitrageAlerts: { ...prev.arbitrageAlerts, enabled: checked }
                }))
              }
              disabled={!settings.enabled}
            />
            <Label htmlFor="arbitrage-alerts">Recevoir des alertes pour les opportunités d'arbitrage</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-spread">Spread minimum (%)</Label>
              <Input
                id="min-spread"
                type="number"
                value={settings.arbitrageAlerts.minSpreadPercentage}
                onChange={(e) => 
                  setSettings((prev) => ({
                    ...prev,
                    arbitrageAlerts: { 
                      ...prev.arbitrageAlerts, 
                      minSpreadPercentage: parseFloat(e.target.value) || 0 
                    }
                  }))
                }
                min={0}
                step={0.1}
                disabled={!settings.enabled || !settings.arbitrageAlerts.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min-profit">Profit minimum ($)</Label>
              <Input
                id="min-profit"
                type="number"
                value={settings.arbitrageAlerts.minProfit}
                onChange={(e) => 
                  setSettings((prev) => ({
                    ...prev,
                    arbitrageAlerts: { 
                      ...prev.arbitrageAlerts, 
                      minProfit: parseFloat(e.target.value) || 0 
                    }
                  }))
                }
                min={0}
                step={0.5}
                disabled={!settings.enabled || !settings.arbitrageAlerts.enabled}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Alertes de Nouveaux Tokens</h3>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="new-tokens-alerts"
              checked={settings.newTokenAlerts.enabled}
              onCheckedChange={(checked) => 
                setSettings((prev) => ({
                  ...prev,
                  newTokenAlerts: { ...prev.newTokenAlerts, enabled: checked }
                }))
              }
              disabled={!settings.enabled}
            />
            <Label htmlFor="new-tokens-alerts">Recevoir des alertes pour les nouveaux tokens détectés</Label>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Alertes de Suivi de Portefeuille</h3>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="wallet-tracking-alerts"
              checked={settings.walletTrackingAlerts.enabled}
              onCheckedChange={(checked) => 
                setSettings((prev) => ({
                  ...prev,
                  walletTrackingAlerts: { ...prev.walletTrackingAlerts, enabled: checked }
                }))
              }
              disabled={!settings.enabled}
            />
            <Label htmlFor="wallet-tracking-alerts">Recevoir des alertes pour l'activité des portefeuilles suivis</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="min-transaction-value">Valeur minimum de transaction ($)</Label>
            <Input
              id="min-transaction-value"
              type="number"
              value={settings.walletTrackingAlerts.minTransactionValue}
              onChange={(e) => 
                setSettings((prev) => ({
                  ...prev,
                  walletTrackingAlerts: { 
                    ...prev.walletTrackingAlerts, 
                    minTransactionValue: parseFloat(e.target.value) || 0 
                  }
                }))
              }
              min={0}
              step={100}
              disabled={!settings.enabled || !settings.walletTrackingAlerts.enabled}
            />
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Alertes Système</h3>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="system-alerts"
              checked={settings.systemAlerts.enabled}
              onCheckedChange={(checked) => 
                setSettings((prev) => ({
                  ...prev,
                  systemAlerts: { ...prev.systemAlerts, enabled: checked }
                }))
              }
              disabled={!settings.enabled}
            />
            <Label htmlFor="system-alerts">Recevoir des alertes système</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="error-alerts"
                checked={settings.systemAlerts.errors}
                onCheckedChange={(checked) => 
                  setSettings((prev) => ({
                    ...prev,
                    systemAlerts: { ...prev.systemAlerts, errors: checked }
                  }))
                }
                disabled={!settings.enabled || !settings.systemAlerts.enabled}
              />
              <Label htmlFor="error-alerts">Erreurs système</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="status-change-alerts"
                checked={settings.systemAlerts.statusChanges}
                onCheckedChange={(checked) => 
                  setSettings((prev) => ({
                    ...prev,
                    systemAlerts: { ...prev.systemAlerts, statusChanges: checked }
                  }))
                }
                disabled={!settings.enabled || !settings.systemAlerts.enabled}
              />
              <Label htmlFor="status-change-alerts">Changements de statut</Label>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleTestNotification} disabled={!settings.enabled}>
          Envoyer une notification de test
        </Button>
        <Button onClick={handleSaveSettings}>Sauvegarder les paramètres</Button>
      </CardFooter>
    </Card>
  );
}