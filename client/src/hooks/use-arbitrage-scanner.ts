import { useState, useEffect, useCallback } from 'react';
import { ArbitrageOpportunityData, ArbitrageSettings, Token } from '@shared/schema';
import { useWebSocket } from './use-websocket';
import { SortConfig, Filter } from '@/types';

interface ArbitrageScannerHook {
  opportunities: ArbitrageOpportunityData[];
  isLoading: boolean;
  error: Error | null;
  isScanning: boolean;
  settings: ArbitrageSettings;
  startScanning: () => void;
  stopScanning: () => void;
  executeArbitrage: (id: number) => Promise<void>;
  updateSettings: (settings: Partial<ArbitrageSettings>) => Promise<void>;
  sortOpportunities: (sortConfig: SortConfig) => void;
  filterOpportunities: (filter: Filter) => void;
}

export function useArbitrageScanner(): ArbitrageScannerHook {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunityData[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<ArbitrageOpportunityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [settings, setSettings] = useState<ArbitrageSettings>({
    minSpreadPercentage: 1.5,
    executionSpeed: 'balanced',
    minLiquidity: 5000,
    dexes: ['Jupiter', 'Raydium', 'Orca'],
    autoExecution: false
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'spreadPercentage',
    direction: 'desc'
  });
  const [filter, setFilter] = useState<Filter>({
    minSpread: 1.0,
    dexes: [],
    minLiquidity: 0
  });
  
  const { connected, lastMessage, send } = useWebSocket();
  
  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch arbitrage settings
        const settingsResponse = await fetch('/api/arbitrage/settings');
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);
        
        // Fetch arbitrage opportunities
        const opportunitiesResponse = await fetch('/api/arbitrage/opportunities');
        const opportunitiesData = await opportunitiesResponse.json();
        setOpportunities(opportunitiesData);
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch initial data'));
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'newArbitrageOpportunity':
          setOpportunities(prev => [lastMessage.data, ...prev]);
          break;
          
        case 'arbitrageOpportunities':
          setOpportunities(lastMessage.data);
          break;
          
        case 'arbitrageScannerStarted':
          setIsScanning(true);
          setSettings(lastMessage.data);
          break;
          
        case 'arbitrageScannerStopped':
          setIsScanning(false);
          break;
          
        case 'arbitrageSettingsUpdated':
          setSettings(lastMessage.data);
          break;
          
        case 'arbitrageExecuted':
          setOpportunities(prev => 
            prev.map(opp => 
              opp.id === lastMessage.data.opportunityId 
                ? { ...opp, executed: true }
                : opp
            )
          );
          break;
      }
    }
  }, [lastMessage]);
  
  // Filter and sort opportunities
  useEffect(() => {
    let filtered = [...opportunities];
    
    // Apply filters
    if (filter.minSpread !== undefined) {
      filtered = filtered.filter(opp => 
        parseFloat(opp.spreadPercentage) >= filter.minSpread!
      );
    }
    
    if (filter.dexes && filter.dexes.length > 0) {
      filtered = filtered.filter(opp => 
        filter.dexes!.includes(opp.buyDex) || filter.dexes!.includes(opp.sellDex)
      );
    }
    
    if (filter.minLiquidity !== undefined && filter.minLiquidity > 0) {
      filtered = filtered.filter(opp => 
        opp.liquidity ? parseFloat(opp.liquidity) >= filter.minLiquidity! : true
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'token':
          aValue = a.token?.symbol || '';
          bValue = b.token?.symbol || '';
          break;
        case 'spreadPercentage':
          aValue = parseFloat(a.spreadPercentage);
          bValue = parseFloat(b.spreadPercentage);
          break;
        case 'estimatedProfit':
          aValue = parseFloat(a.estimatedProfit);
          bValue = parseFloat(b.estimatedProfit);
          break;
        case 'volume24h':
          aValue = a.volume24h ? parseFloat(a.volume24h) : 0;
          bValue = b.volume24h ? parseFloat(b.volume24h) : 0;
          break;
        case 'liquidity':
          aValue = a.liquidity ? parseFloat(a.liquidity) : 0;
          bValue = b.liquidity ? parseFloat(b.liquidity) : 0;
          break;
        default:
          aValue = a[sortConfig.key as keyof ArbitrageOpportunityData] || '';
          bValue = b[sortConfig.key as keyof ArbitrageOpportunityData] || '';
      }
      
      // Compare based on direction
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredOpportunities(filtered);
  }, [opportunities, sortConfig, filter]);
  
  const startScanning = useCallback(() => {
    console.log('startScanning called, connected:', connected);
    if (!connected) {
      setError(new Error('WebSocket not connected'));
      return;
    }
    console.log('Envoi du message startArbitrageScanner via WebSocket');
    send({ type: 'startArbitrageScanner' });
  }, [connected, send]);
  
  const stopScanning = useCallback(() => {
    if (!connected) {
      setError(new Error('WebSocket not connected'));
      return;
    }
    
    send({ type: 'stopArbitrageScanner' });
  }, [connected, send]);
  
  const executeArbitrage = useCallback(async (id: number) => {
    try {
      const response = await fetch('/api/arbitrage/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to execute arbitrage: ${response.statusText}`);
      }
      
      // The WebSocket will update the opportunity status
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to execute arbitrage'));
      throw err;
    }
  }, []);
  
  const updateSettings = useCallback(async (newSettings: Partial<ArbitrageSettings>) => {
    try {
      const response = await fetch('/api/arbitrage/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }
      
      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      
      // Also update via WebSocket for others
      if (connected) {
        send({ type: 'updateArbitrageSettings', settings: newSettings });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update settings'));
      throw err;
    }
  }, [connected, send]);
  
  const sortOpportunities = useCallback((newSortConfig: SortConfig) => {
    setSortConfig(newSortConfig);
  }, []);
  
  const filterOpportunities = useCallback((newFilter: Filter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);
  
  return {
    opportunities: filteredOpportunities,
    isLoading,
    error,
    isScanning,
    settings,
    startScanning,
    stopScanning,
    executeArbitrage,
    updateSettings,
    sortOpportunities,
    filterOpportunities
  };
}
