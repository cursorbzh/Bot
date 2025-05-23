import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  ArbitrageSettings,
  TokenSnipeSettings,
  WalletTrackingSettings,
  AutoTradingSettings
} from '@shared/schema';
import * as api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/modules/NotificationSettings';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const [arbitrageSettings, setArbitrageSettings] = useState<ArbitrageSettings>({
    minSpreadPercentage: 1.5,
    executionSpeed: 'balanced',
    minLiquidity: 5000,
    dexes: ['Jupiter', 'Raydium', 'Orca'],
    autoExecution: false
  });
  
  const [tokenSnipeSettings, setTokenSnipeSettings] = useState<TokenSnipeSettings>({
    minLiquidity: 1000,
    maxSlippage: 5,
    autoBuy: false,
    maxBuyAmount: 0.1
  });
  
  const [walletTrackingSettings, setWalletTrackingSettings] = useState<WalletTrackingSettings>({
    addresses: [],
    followTransactionTypes: ['swap', 'mint'],
    minTransactionValue: 1000,
    autoFollow: false
  });
  
  const [autoTradingSettings, setAutoTradingSettings] = useState<AutoTradingSettings>({
    active: false,
    tradingPairs: ['SOL/USDC'],
    strategy: 'MACD',
    maxPositionSize: 1,
    stopLoss: 5,
    takeProfit: 10
  });
  
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { 
    settings: notificationSettings,
    updateSettings: updateNotificationSettings,
    testNotification,
    isTestingNotification
  } = useNotifications();
  
  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load arbitrage settings
        const arbSettings = await api.getArbitrageSettings();
        if (arbSettings) {
          setArbitrageSettings(arbSettings);
        }
        
        // Load other settings
        // Note: These endpoints would need to be implemented on the backend
        // For now, we're using default values
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  const handleSaveArbitrageSettings = async () => {
    setSaving(true);
    try {
      await api.updateArbitrageSettings(arbitrageSettings);
      toast({
        title: "Settings Saved",
        description: "Arbitrage settings have been updated successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error saving arbitrage settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetSettings = (settingType: string) => {
    switch (settingType) {
      case 'arbitrage':
        setArbitrageSettings({
          minSpreadPercentage: 1.5,
          executionSpeed: 'balanced',
          minLiquidity: 5000,
          dexes: ['Jupiter', 'Raydium', 'Orca'],
          autoExecution: false
        });
        break;
      case 'tokenSnipe':
        setTokenSnipeSettings({
          minLiquidity: 1000,
          maxSlippage: 5,
          autoBuy: false,
          maxBuyAmount: 0.1
        });
        break;
      case 'walletTracking':
        setWalletTrackingSettings({
          addresses: [],
          followTransactionTypes: ['swap', 'mint'],
          minTransactionValue: 1000,
          autoFollow: false
        });
        break;
      case 'autoTrading':
        setAutoTradingSettings({
          active: false,
          tradingPairs: ['SOL/USDC'],
          strategy: 'MACD',
          maxPositionSize: 1,
          stopLoss: 5,
          takeProfit: 10
        });
        break;
    }
    
    toast({
      title: "Settings Reset",
      description: `${settingType.charAt(0).toUpperCase() + settingType.slice(1)} settings have been reset to defaults`,
    });
  };
  
  const handleTestNotification = () => {
    testNotification();
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue="arbitrage" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
            <TabsTrigger value="tokenSnipe">Token Sniper</TabsTrigger>
            <TabsTrigger value="walletTracking">Wallet Tracking</TabsTrigger>
            <TabsTrigger value="autoTrading">Auto Trading</TabsTrigger>
            <TabsTrigger value="api">API Connections</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="arbitrage">
            <Card>
              <CardHeader>
                <CardTitle>Arbitrage Settings</CardTitle>
                <CardDescription>Configure your arbitrage detection and execution preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minSpreadPercentage">Minimum Spread Percentage</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="minSpreadPercentage"
                        min={0.1} 
                        max={10} 
                        step={0.1} 
                        value={[arbitrageSettings.minSpreadPercentage]} 
                        onValueChange={(value) => setArbitrageSettings(prev => ({ ...prev, minSpreadPercentage: value[0] }))}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{arbitrageSettings.minSpreadPercentage}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minLiquidity">Minimum Liquidity (USD)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="minLiquidity"
                        min={1000} 
                        max={50000} 
                        step={1000} 
                        value={[arbitrageSettings.minLiquidity]} 
                        onValueChange={(value) => setArbitrageSettings(prev => ({ ...prev, minLiquidity: value[0] }))}
                        className="flex-1"
                      />
                      <span className="w-20 text-center">${arbitrageSettings.minLiquidity}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="executionSpeed">Execution Speed</Label>
                    <Select 
                      value={arbitrageSettings.executionSpeed}
                      onValueChange={(value) => setArbitrageSettings(prev => ({ ...prev, executionSpeed: value as 'fastest' | 'balanced' | 'economic' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select execution speed" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fastest">Fastest (Higher Fees)</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="economic">Economic (Lower Fees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dexes">DEXes to Monitor</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="dex-jupiter" 
                          checked={arbitrageSettings.dexes.includes('Jupiter')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setArbitrageSettings(prev => ({ ...prev, dexes: [...prev.dexes, 'Jupiter'] }));
                            } else {
                              setArbitrageSettings(prev => ({ ...prev, dexes: prev.dexes.filter(d => d !== 'Jupiter') }));
                            }
                          }}
                        />
                        <Label htmlFor="dex-jupiter">Jupiter</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="dex-raydium" 
                          checked={arbitrageSettings.dexes.includes('Raydium')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setArbitrageSettings(prev => ({ ...prev, dexes: [...prev.dexes, 'Raydium'] }));
                            } else {
                              setArbitrageSettings(prev => ({ ...prev, dexes: prev.dexes.filter(d => d !== 'Raydium') }));
                            }
                          }}
                        />
                        <Label htmlFor="dex-raydium">Raydium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="dex-orca" 
                          checked={arbitrageSettings.dexes.includes('Orca')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setArbitrageSettings(prev => ({ ...prev, dexes: [...prev.dexes, 'Orca'] }));
                            } else {
                              setArbitrageSettings(prev => ({ ...prev, dexes: prev.dexes.filter(d => d !== 'Orca') }));
                            }
                          }}
                        />
                        <Label htmlFor="dex-orca">Orca</Label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                  <Switch 
                    id="autoExecution"
                    checked={arbitrageSettings.autoExecution}
                    onCheckedChange={(checked) => setArbitrageSettings(prev => ({ ...prev, autoExecution: checked }))}
                  />
                  <Label htmlFor="autoExecution">Auto-execute profitable opportunities</Label>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => handleResetSettings('arbitrage')}>Reset to Default</Button>
                <Button onClick={handleSaveArbitrageSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="tokenSnipe">
            <Card>
              <CardHeader>
                <CardTitle>Token Sniper Settings</CardTitle>
                <CardDescription>Configure how the token sniper detects and reacts to new token listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minLiquidity">Minimum Liquidity (USD)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="minLiquidity"
                        min={100} 
                        max={10000} 
                        step={100} 
                        value={[tokenSnipeSettings.minLiquidity]} 
                        onValueChange={(value) => setTokenSnipeSettings(prev => ({ ...prev, minLiquidity: value[0] }))}
                        className="flex-1"
                      />
                      <span className="w-20 text-center">${tokenSnipeSettings.minLiquidity}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxSlippage">Maximum Slippage</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="maxSlippage"
                        min={0.1} 
                        max={20} 
                        step={0.1} 
                        value={[tokenSnipeSettings.maxSlippage]} 
                        onValueChange={(value) => setTokenSnipeSettings(prev => ({ ...prev, maxSlippage: value[0] }))}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{tokenSnipeSettings.maxSlippage}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxBuyAmount">Max Buy Amount (SOL)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="maxBuyAmount"
                        min={0.01} 
                        max={10} 
                        step={0.01} 
                        value={[tokenSnipeSettings.maxBuyAmount]} 
                        onValueChange={(value) => setTokenSnipeSettings(prev => ({ ...prev, maxBuyAmount: value[0] }))}
                        className="flex-1"
                      />
                      <span className="w-16 text-center">{tokenSnipeSettings.maxBuyAmount} SOL</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                  <Switch 
                    id="autoBuy"
                    checked={tokenSnipeSettings.autoBuy}
                    onCheckedChange={(checked) => setTokenSnipeSettings(prev => ({ ...prev, autoBuy: checked }))}
                  />
                  <Label htmlFor="autoBuy">Auto-buy new tokens matching criteria</Label>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => handleResetSettings('tokenSnipe')}>Reset to Default</Button>
                <Button onClick={() => {}} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="walletTracking">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Tracking Settings</CardTitle>
                <CardDescription>Configure wallet tracking and alerting preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="autoTrading">
            <Card>
              <CardHeader>
                <CardTitle>Auto Trading Settings</CardTitle>
                <CardDescription>Configure automated trading strategies and risk management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Connection Settings</CardTitle>
                <CardDescription>Manage your API connections and rate limits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">API Connection settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationSettingsComponent 
              onSave={updateNotificationSettings}
              onTestNotification={testNotification}
              initialSettings={notificationSettings}
              isLoading={isTestingNotification}
              isTesting={isTestingNotification}
            />
            <Button 
              variant="default" 
              onClick={handleTestNotification}
              disabled={!notificationSettings.enabled}
            >
              Test Notification
            </Button>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}