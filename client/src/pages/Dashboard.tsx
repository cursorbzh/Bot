import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusPanel } from '@/components/layout/StatusPanel';
import { ArbitrageTable } from '@/components/modules/ArbitrageTable';
import { TokenSniper } from '@/components/modules/TokenSniper';
import { CopyTrading } from '@/components/modules/CopyTrading';
import { AutoTrading } from '@/components/modules/AutoTrading';
import { useWebSocket } from '@/hooks/use-websocket';
import { useArbitrageScanner } from '@/hooks/use-arbitrage-scanner';
import { useToast } from '@/hooks/use-toast';
import { 
  ArbitrageSettings,
  TokenSnipeSettings,
  WalletTrackingSettings,
  AutoTradingSettings,
  SystemStatus,
  ActivityLogEntry,
  Token
} from '@shared/schema';
import * as api from '@/lib/api';

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState<string>('arbitrage');
  const [activeTab, setActiveTab] = useState<string>('arbitrage');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    scanRate: 0,
    responseTime: 0,
    websocketPing: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    apiStatuses: {},
    lastUpdated: new Date()
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
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
  const [isAutoTradingActive, setIsAutoTradingActive] = useState(false);
  const [trackedWallets, setTrackedWallets] = useState<any[]>([]);

  const { connected, lastMessage, send } = useWebSocket();
  const { 
    opportunities, 
    isLoading: isLoadingArbitrage, 
    isScanning, 
    settings: arbitrageSettings, 
    startScanning, 
    executeArbitrage, 
    updateSettings: updateArbitrageSettings,
    sortOpportunities,
    filterOpportunities
  } = useArbitrageScanner();
  const { toast } = useToast();

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'systemStatus':
          setSystemStatus(lastMessage.data);
          break;
        case 'activityLogs':
          setActivityLogs(lastMessage.data);
          break;
        case 'walletTrackingAdded':
        case 'walletTrackingUpdated':
          // Refresh wallet tracking list
          api.getTrackedWallets()
            .then(wallets => setTrackedWallets(wallets))
            .catch(error => console.error('Error fetching wallet trackings:', error));
          break;
      }
    }
  }, [lastMessage]);

  // Initial data loading
  useEffect(() => {
    // Fetch system status
    api.getSystemStatus()
      .then(status => {
        if (status.system) {
          setSystemStatus(status.system);
        }
      })
      .catch(error => console.error('Error fetching system status:', error));

    // Fetch activity logs
    api.getActivityLogs()
      .then(logs => setActivityLogs(logs))
      .catch(error => console.error('Error fetching activity logs:', error));

    // Fetch tokens
    api.getTokens()
      .then(tokenList => setTokens(tokenList))
      .catch(error => console.error('Error fetching tokens:', error));

    // Fetch wallet trackings
    api.getTrackedWallets()
      .then(wallets => setTrackedWallets(wallets))
      .catch(error => console.error('Error fetching wallet trackings:', error));

  }, []);

  // Handle module change
  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    setActiveTab(moduleId);
  };

  // Handle settings change
  const handleSettingsChange = <T,>(moduleId: string, settings: Partial<T>) => {
    switch (moduleId) {
      case 'arbitrage':
        updateArbitrageSettings(settings as Partial<ArbitrageSettings>);
        break;
      case 'sniper':
        setTokenSnipeSettings(prev => ({ ...prev, ...settings }));
        break;
      case 'copytrading':
        setWalletTrackingSettings(prev => ({ ...prev, ...settings }));
        break;
      case 'autotrading':
        setAutoTradingSettings(prev => ({ ...prev, ...settings }));
        break;
    }
  };

  // Handle start auto trading
  const handleStartAutoTrading = () => {
    setIsAutoTradingActive(true);
    toast({
      title: "Auto-Trading Started",
      description: `Trading ${autoTradingSettings.tradingPairs.join(', ')} with ${autoTradingSettings.strategy} strategy`,
    });
  };

  // Handle stop auto trading
  const handleStopAutoTrading = () => {
    setIsAutoTradingActive(false);
    toast({
      title: "Auto-Trading Stopped",
      description: "All trading activities have been halted",
      variant: "destructive"
    });
  };

  // Handle reset settings
  const handleResetSettings = () => {
    switch (activeModule) {
      case 'arbitrage':
        updateArbitrageSettings({
          minSpreadPercentage: 1.5,
          executionSpeed: 'balanced',
          minLiquidity: 5000,
          dexes: ['Jupiter', 'Raydium', 'Orca'],
          autoExecution: false
        });
        break;
      case 'sniper':
        setTokenSnipeSettings({
          minLiquidity: 1000,
          maxSlippage: 5,
          autoBuy: false,
          maxBuyAmount: 0.1
        });
        break;
      case 'copytrading':
        setWalletTrackingSettings({
          addresses: [],
          followTransactionTypes: ['swap', 'mint'],
          minTransactionValue: 1000,
          autoFollow: false
        });
        break;
      case 'autotrading':
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
      description: "Settings have been reset to defaults",
    });
  };

  // Handle token snipe
  const handleTokenSnipe = (token: Token) => {
    toast({
      title: "Token Sniped",
      description: `Successfully sniped ${token.symbol}`,
      variant: "success"
    });
  };

  // Handle wallet tracking toggle
  const handleToggleWalletTracking = (id: number, active: boolean) => {
    api.updateWalletTracking(id, active)
      .then(() => {
        setTrackedWallets(prev => 
          prev.map(wallet => 
            wallet.id === id ? { ...wallet, active } : wallet
          )
        );
        toast({
          title: active ? "Tracking Enabled" : "Tracking Disabled",
          description: `Wallet tracking has been ${active ? 'enabled' : 'disabled'}`,
        });
      })
      .catch(error => {
        console.error('Error updating wallet tracking:', error);
        toast({
          title: "Error",
          description: "Failed to update wallet tracking status",
          variant: "destructive"
        });
      });
  };

  // Handle add wallet for tracking
  const handleAddWallet = (address: string, alias?: string) => {
    api.trackWallet(address, alias)
      .then(wallet => {
        setTrackedWallets(prev => [...prev, wallet]);
        toast({
          title: "Wallet Added",
          description: `Now tracking ${alias || address}`,
          variant: "success"
        });
      })
      .catch(error => {
        console.error('Error adding wallet tracking:', error);
        toast({
          title: "Error",
          description: "Failed to add wallet for tracking",
          variant: "destructive"
        });
      });
  };

  // Handle export logs
  const handleExportLogs = () => {
    // Create text content from logs
    const logText = activityLogs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    // Create blob and download
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soltrader-logs-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs Exported",
      description: "Activity logs have been exported to a text file",
    });
  };

  // Handle report issue
  const handleReportIssue = () => {
    // Open GitHub issues page or custom form
    window.open('https://github.com/yourusername/soltrader/issues/new', '_blank');
    
    toast({
      title: "Report Issue",
      description: "Redirecting to issue reporting page",
    });
  };

  // Handle arbitrary sorting and filtering
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    sortOpportunities({ key: field, direction });
  };

  const handleFilterMinSpread = (minSpread: number) => {
    filterOpportunities({ minSpread });
  };

  const handleSearch = (query: string) => {
    // This will be implemented based on the specific module's search requirements
    console.log('Search query:', query);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left Sidebar: Control Panel */}
          <Sidebar 
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            arbitrageSettings={arbitrageSettings}
            tokenSnipeSettings={tokenSnipeSettings}
            walletTrackingSettings={walletTrackingSettings}
            autoTradingSettings={autoTradingSettings}
            onSettingsChange={handleSettingsChange}
            onStartScanning={startScanning}
            isScanning={isScanning}
            onResetSettings={handleResetSettings}
          />
          
          {/* Middle: Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex items-center border-b border-gray-800 bg-surface px-2">
              <button 
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'arbitrage' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-textmuted hover:text-textnormal'
                }`}
                onClick={() => setActiveTab('arbitrage')}
              >
                Arbitrage Opportunities
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'sniper' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-textmuted hover:text-textnormal'
                }`}
                onClick={() => setActiveTab('sniper')}
              >
                New Token Detection
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'copytrading' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-textmuted hover:text-textnormal'
                }`}
                onClick={() => setActiveTab('copytrading')}
              >
                Wallet Tracking
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'autotrading' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-textmuted hover:text-textnormal'
                }`}
                onClick={() => setActiveTab('autotrading')}
              >
                Auto Trading
              </button>
              <div className="ml-auto flex items-center px-2">
                <span className="material-icons text-success text-sm mr-1">sync</span>
                <span className="text-xs text-textmuted">
                  Last update: {Math.floor((Date.now() - new Date(systemStatus.lastUpdated).getTime()) / 1000)}s ago
                </span>
              </div>
            </div>
            
            {/* Main Data Display - Show appropriate content based on active tab */}
            {activeTab === 'arbitrage' && (
              <ArbitrageTable 
                opportunities={opportunities}
                isLoading={isLoadingArbitrage} 
                onExecute={executeArbitrage}
                onSort={handleSort}
                onFilterMinSpread={handleFilterMinSpread}
                onSearch={handleSearch}
              />
            )}
            
            {activeTab === 'sniper' && (
              <TokenSniper 
                tokens={tokens}
                isLoading={false}
                onSnipe={handleTokenSnipe}
                onSort={handleSort}
                onSearch={handleSearch}
              />
            )}
            
            {activeTab === 'copytrading' && (
              <CopyTrading 
                wallets={trackedWallets}
                isLoading={false}
                onToggleTracking={handleToggleWalletTracking}
                onAddWallet={handleAddWallet}
                onSearch={handleSearch}
              />
            )}
            
            {activeTab === 'autotrading' && (
              <AutoTrading 
                settings={autoTradingSettings}
                isActive={isAutoTradingActive}
                onStartAutoTrading={handleStartAutoTrading}
                onStopAutoTrading={handleStopAutoTrading}
              />
            )}
          </div>
          
          {/* Right Sidebar: Statistics and System Status */}
          <StatusPanel 
            systemStatus={systemStatus}
            activityLogs={activityLogs}
            onExportLogs={handleExportLogs}
            onReportIssue={handleReportIssue}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
