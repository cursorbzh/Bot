import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArbitrageSettings, TokenSnipeSettings, WalletTrackingSettings, AutoTradingSettings } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  arbitrageSettings: ArbitrageSettings;
  tokenSnipeSettings: TokenSnipeSettings;
  walletTrackingSettings: WalletTrackingSettings;
  autoTradingSettings: AutoTradingSettings;
  onSettingsChange: <T>(moduleId: string, settings: Partial<T>) => void;
  onStartScanning: () => void;
  isScanning: boolean;
  onResetSettings: () => void;
}

export function Sidebar({
  activeModule,
  onModuleChange,
  arbitrageSettings,
  tokenSnipeSettings,
  walletTrackingSettings,
  autoTradingSettings,
  onSettingsChange,
  onStartScanning,
  isScanning,
  onResetSettings
}: SidebarProps) {
  const { toast } = useToast();
  
  const handleArbitrageSettingChange = <K extends keyof ArbitrageSettings>(
    key: K, 
    value: ArbitrageSettings[K]
  ) => {
    onSettingsChange('arbitrage', { [key]: value } as Partial<ArbitrageSettings>);
  };

  const handleStartScanning = () => {
    if (!isScanning) {
      onStartScanning();
      toast({
        title: "Scanning Started",
        description: "Arbitrage scanner is now running",
      });
    } else {
      // Si déjà en cours de scan, arrêter le scan
      onStartScanning();
      toast({
        title: "Scanning Stopped",
        description: "Arbitrage scanner has been stopped",
      });
    }
  };

  return (
    <div className="w-56 bg-surface border-r border-gray-800 flex flex-col overflow-hidden relative">
      <div className="p-3 border-b border-gray-800">
        <h2 className="font-semibold text-textnormal mb-2">Modules</h2>
        <div className="space-y-1">
          <button 
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              activeModule === 'arbitrage' 
                ? 'bg-secondary/20 text-secondary font-medium' 
                : 'hover:bg-surfacelight text-textnormal'
            } flex items-center`}
            onClick={() => onModuleChange('arbitrage')}
          >
            <span className="material-icons text-sm mr-2">swap_horiz</span>
            Arbitrage Scanner
          </button>
          <button 
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              activeModule === 'sniper' 
                ? 'bg-secondary/20 text-secondary font-medium' 
                : 'hover:bg-surfacelight text-textnormal'
            } flex items-center`}
            onClick={() => onModuleChange('sniper')}
          >
            <span className="material-icons text-sm mr-2">radar</span>
            Token Sniping
          </button>
          <button 
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              activeModule === 'copytrading' 
                ? 'bg-secondary/20 text-secondary font-medium' 
                : 'hover:bg-surfacelight text-textnormal'
            } flex items-center`}
            onClick={() => onModuleChange('copytrading')}
          >
            <span className="material-icons text-sm mr-2">content_copy</span>
            Copy Trading
          </button>
          <button 
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              activeModule === 'autotrading' 
                ? 'bg-secondary/20 text-secondary font-medium' 
                : 'hover:bg-surfacelight text-textnormal'
            } flex items-center`}
            onClick={() => onModuleChange('autotrading')}
          >
            <span className="material-icons text-sm mr-2">auto_awesome</span>
            Auto-Trading
          </button>
        </div>
      </div>
      
      {/* Strategy Controls - Show appropriate settings based on active module */}
      <div className="p-3 border-b border-gray-800 flex-1 overflow-y-auto scrollbar-thin">
        {activeModule === 'arbitrage' && (
          <>
            <h2 className="font-semibold text-textnormal mb-2">Arbitrage Settings</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="block text-textmuted mb-1">Minimum Spread (%)</Label>
                <Input 
                  type="number" 
                  value={arbitrageSettings.minSpreadPercentage} 
                  min="0.1" 
                  step="0.1" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => handleArbitrageSettingChange('minSpreadPercentage', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label className="block text-textmuted mb-1">Execution Speed</Label>
                <Select 
                  value={arbitrageSettings.executionSpeed}
                  onValueChange={(value) => handleArbitrageSettingChange('executionSpeed', value as any)}
                >
                  <SelectTrigger className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal">
                    <SelectValue placeholder="Select execution speed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fastest">Fastest (High Fee)</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="economic">Economic (Low Fee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-textmuted mb-1">Liquidity Minimum (USD)</Label>
                <Input 
                  type="number" 
                  value={arbitrageSettings.minLiquidity} 
                  min="100" 
                  step="100" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => handleArbitrageSettingChange('minLiquidity', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label className="block text-textmuted mb-1">DEX Selection</Label>
                <div className="space-y-1 mt-1">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={arbitrageSettings.dexes.includes('Jupiter')} 
                      className="mr-2 bg-surfacelight border border-gray-700 rounded"
                      onChange={(e) => {
                        const newDexes = e.target.checked 
                          ? [...arbitrageSettings.dexes, 'Jupiter']
                          : arbitrageSettings.dexes.filter(dex => dex !== 'Jupiter');
                        handleArbitrageSettingChange('dexes', newDexes);
                      }}
                    />
                    <span>Jupiter</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={arbitrageSettings.dexes.includes('Raydium')} 
                      className="mr-2 bg-surfacelight border border-gray-700 rounded"
                      onChange={(e) => {
                        const newDexes = e.target.checked 
                          ? [...arbitrageSettings.dexes, 'Raydium']
                          : arbitrageSettings.dexes.filter(dex => dex !== 'Raydium');
                        handleArbitrageSettingChange('dexes', newDexes);
                      }}
                    />
                    <span>Raydium</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={arbitrageSettings.dexes.includes('Orca')} 
                      className="mr-2 bg-surfacelight border border-gray-700 rounded"
                      onChange={(e) => {
                        const newDexes = e.target.checked 
                          ? [...arbitrageSettings.dexes, 'Orca']
                          : arbitrageSettings.dexes.filter(dex => dex !== 'Orca');
                        handleArbitrageSettingChange('dexes', newDexes);
                      }}
                    />
                    <span>Orca</span>
                  </label>
                </div>
              </div>
              
              <div>
                <Label className="block text-textmuted mb-1">Auto-Execution</Label>
                <div className="flex items-center mt-1">
                  <Switch 
                    checked={arbitrageSettings.autoExecution}
                    onCheckedChange={(checked) => handleArbitrageSettingChange('autoExecution', checked)}
                  />
                  <span className="ml-2 text-sm font-medium text-textnormal">
                    {arbitrageSettings.autoExecution ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => {
                  console.log('Bouton scan cliqué');
                  handleStartScanning();
                }}
                className={isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {isScanning ? 'Arrêter le scan' : 'Démarrer le scan'}
              </Button>
            </div>
          </>
        )}

        {activeModule === 'sniper' && (
          <>
            <h2 className="font-semibold text-textnormal mb-2">Token Sniper Settings</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="block text-textmuted mb-1">Min Liquidity (USD)</Label>
                <Input 
                  type="number" 
                  value={tokenSnipeSettings.minLiquidity} 
                  min="100" 
                  step="100" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('sniper', { minLiquidity: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Max Slippage (%)</Label>
                <Input 
                  type="number" 
                  value={tokenSnipeSettings.maxSlippage} 
                  min="0.1" 
                  max="100"
                  step="0.1" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('sniper', { maxSlippage: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Max Buy Amount (SOL)</Label>
                <Input 
                  type="number" 
                  value={tokenSnipeSettings.maxBuyAmount} 
                  min="0.01" 
                  step="0.01" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('sniper', { maxBuyAmount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Auto-Buy</Label>
                <div className="flex items-center mt-1">
                  <Switch 
                    checked={tokenSnipeSettings.autoBuy}
                    onCheckedChange={(checked) => onSettingsChange('sniper', { autoBuy: checked })}
                  />
                  <span className="ml-2 text-sm font-medium text-textnormal">
                    {tokenSnipeSettings.autoBuy ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModule === 'copytrading' && (
          <>
            <h2 className="font-semibold text-textnormal mb-2">Copy Trading Settings</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="block text-textmuted mb-1">Min Transaction Value (USD)</Label>
                <Input 
                  type="number" 
                  value={walletTrackingSettings.minTransactionValue} 
                  min="10" 
                  step="10" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('copytrading', { minTransactionValue: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Transaction Types</Label>
                <div className="space-y-1 mt-1">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={walletTrackingSettings.followTransactionTypes.includes('swap')} 
                      className="mr-2 bg-surfacelight border border-gray-700 rounded"
                      onChange={(e) => {
                        const newTypes = e.target.checked 
                          ? [...walletTrackingSettings.followTransactionTypes, 'swap']
                          : walletTrackingSettings.followTransactionTypes.filter(type => type !== 'swap');
                        onSettingsChange('copytrading', { followTransactionTypes: newTypes });
                      }}
                    />
                    <span>Swaps</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={walletTrackingSettings.followTransactionTypes.includes('mint')} 
                      className="mr-2 bg-surfacelight border border-gray-700 rounded"
                      onChange={(e) => {
                        const newTypes = e.target.checked 
                          ? [...walletTrackingSettings.followTransactionTypes, 'mint']
                          : walletTrackingSettings.followTransactionTypes.filter(type => type !== 'mint');
                        onSettingsChange('copytrading', { followTransactionTypes: newTypes });
                      }}
                    />
                    <span>Mints</span>
                  </label>
                </div>
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Auto-Follow Trades</Label>
                <div className="flex items-center mt-1">
                  <Switch 
                    checked={walletTrackingSettings.autoFollow}
                    onCheckedChange={(checked) => onSettingsChange('copytrading', { autoFollow: checked })}
                  />
                  <span className="ml-2 text-sm font-medium text-textnormal">
                    {walletTrackingSettings.autoFollow ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeModule === 'autotrading' && (
          <>
            <h2 className="font-semibold text-textnormal mb-2">Auto-Trading Settings</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label className="block text-textmuted mb-1">Trading Strategy</Label>
                <Select 
                  value={autoTradingSettings.strategy}
                  onValueChange={(value) => onSettingsChange('autotrading', { strategy: value })}
                >
                  <SelectTrigger className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MACD">MACD</SelectItem>
                    <SelectItem value="RSI">RSI</SelectItem>
                    <SelectItem value="Bollinger">Bollinger Bands</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Max Position Size (SOL)</Label>
                <Input 
                  type="number" 
                  value={autoTradingSettings.maxPositionSize} 
                  min="0.1" 
                  step="0.1" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('autotrading', { maxPositionSize: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Stop Loss (%)</Label>
                <Input 
                  type="number" 
                  value={autoTradingSettings.stopLoss} 
                  min="1" 
                  max="50"
                  step="1" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('autotrading', { stopLoss: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Take Profit (%)</Label>
                <Input 
                  type="number" 
                  value={autoTradingSettings.takeProfit} 
                  min="1" 
                  max="100"
                  step="1" 
                  className="w-full bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal"
                  onChange={(e) => onSettingsChange('autotrading', { takeProfit: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="block text-textmuted mb-1">Active</Label>
                <div className="flex items-center mt-1">
                  <Switch 
                    checked={autoTradingSettings.active}
                    onCheckedChange={(checked) => onSettingsChange('autotrading', { active: checked })}
                  />
                  <span className="ml-2 text-sm font-medium text-textnormal">
                    {autoTradingSettings.active ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="p-3 border-t border-gray-800 bg-surface space-y-2">
        <Button 
          variant="outline"
          className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm font-medium flex items-center justify-center"
          onClick={onResetSettings}
        >
          <span className="material-icons text-sm mr-1">refresh</span>
          Reset Settings
        </Button>
      </div>
      <div className="resize-handle"></div>
    </div>
  );
}
