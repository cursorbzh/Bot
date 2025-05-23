import React, { useState, useEffect } from 'react';
import { SolanaNetworkStatus } from '@shared/schema';
import { cn } from '@/lib/utils';
import { useWebSocket } from '@/hooks/use-websocket';

export function Footer() {
  const [networkStatus, setNetworkStatus] = useState<SolanaNetworkStatus>({
    status: 'Unknown',
    tps: 0,
    price: '0',
    priceChange: '0',
    gasPrice: '0'
  });
  const [autoExecution, setAutoExecution] = useState(false);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    // Initial fetch
    fetch('/api/solana/status')
      .then(res => res.json())
      .then(data => {
        setNetworkStatus(data);
      })
      .catch(error => {
        console.error('Error fetching Solana network status:', error);
      });
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'solanaNetworkStatus') {
      setNetworkStatus(lastMessage.data);
    }

    if (lastMessage && lastMessage.type === 'arbitrageSettingsUpdated') {
      setAutoExecution(lastMessage.data.autoExecution);
    }
  }, [lastMessage]);

  return (
    <footer className="bg-surface border-t border-gray-800 py-1 px-4 text-xs text-textmuted flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div>
          Solana Network: 
          <span className={cn("ml-1", networkStatus.status === 'Healthy' ? 'text-success' : 'text-warning')}>
            {networkStatus.status} ({networkStatus.tps.toLocaleString()} TPS)
          </span>
        </div>
        <div>
          SOL Price: 
          <span className={cn("ml-1", 
            parseFloat(networkStatus.priceChange) >= 0 ? 'text-success' : 'text-danger'
          )}>
            ${networkStatus.price} ({networkStatus.priceChange}%)
          </span>
        </div>
        <div>Gas Price: <span>{networkStatus.gasPrice} SOL</span></div>
      </div>
      <div className="flex items-center space-x-4">
        <div>
          Auto-Execution: 
          <span className={cn("ml-1", autoExecution ? 'text-success' : 'text-danger')}>
            {autoExecution ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div>Version: <span>1.0.0</span></div>
      </div>
    </footer>
  );
}
