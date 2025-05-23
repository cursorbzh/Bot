import { useState, useEffect } from 'react';
import { ApiStatus } from '@shared/schema';
import { useWebSocket } from './use-websocket';

interface ConnectionStatusHook {
  apiStatuses: Record<string, ApiStatus>;
  lastUpdated: Date | null;
  isConnected: boolean;
}

export function useConnectionStatus(): ConnectionStatusHook {
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>({
    helius: { name: 'Helius RPC', connected: false },
    jupiter: { name: 'Jupiter API', connected: false },
    coingecko: { name: 'CoinGecko', connected: false },
    coinmarketcap: { name: 'CoinMarketCap', connected: false },
    quicknode: { name: 'QuickNode', connected: false }
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { connected, lastMessage } = useWebSocket();

  useEffect(() => {
    // Initial fetch of API statuses
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.apiConnections) {
          setApiStatuses(data.apiConnections);
          setLastUpdated(new Date());
        }
      })
      .catch(error => {
        console.error('Error fetching API statuses:', error);
      });
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'apiStatuses') {
      setApiStatuses(lastMessage.data);
      setLastUpdated(new Date());
    }
  }, [lastMessage]);

  // Calculate overall connection status
  const isConnected = connected && Object.values(apiStatuses).some(status => status.connected);

  return {
    apiStatuses,
    lastUpdated,
    isConnected
  };
}
