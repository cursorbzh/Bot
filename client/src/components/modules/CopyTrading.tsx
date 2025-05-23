import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface WalletTrading {
  id: number;
  address: string;
  alias?: string;
  active: boolean;
  lastActivityTime?: Date;
  totalTrades?: number;
  profitRatio?: number;
}

interface CopyTradingProps {
  wallets: WalletTrading[];
  isLoading: boolean;
  onToggleTracking: (id: number, active: boolean) => void;
  onAddWallet: (address: string, alias?: string) => void;
  onSearch: (query: string) => void;
}

export function CopyTrading({
  wallets,
  isLoading,
  onToggleTracking,
  onAddWallet,
  onSearch
}: CopyTradingProps) {
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletAlias, setNewWalletAlias] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample wallet data for component preview
  const sampleWallets: WalletTrading[] = [
    { id: 1, address: '8JUjWJ33tWQ3WiNrKJ3qGJaLTSki8ieCePfGRtZr1TZW', alias: 'Whale 1', active: true, lastActivityTime: new Date(Date.now() - 1200000), totalTrades: 156, profitRatio: 2.3 },
    { id: 2, address: '5xLZuVrYKEQMkBhC3HBt9ich9pBgUBXLYL2eNMCPvzEW', alias: 'Top Trader', active: true, lastActivityTime: new Date(Date.now() - 3600000), totalTrades: 327, profitRatio: 4.1 },
    { id: 3, address: '3Mnn2fX6rQyUsyELYms1aBMfaFvKQhpTum9QywFYNDNi', alias: 'Solana Dev', active: false, lastActivityTime: new Date(Date.now() - 86400000), totalTrades: 76, profitRatio: 1.5 },
  ];

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  // Handle add wallet
  const handleAddWallet = () => {
    if (newWalletAddress) {
      onAddWallet(newWalletAddress, newWalletAlias || undefined);
      setNewWalletAddress('');
      setNewWalletAlias('');
    }
  };

  // Format time ago
  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Add Wallet Form */}
        <div className="p-3 bg-surface border-b border-gray-800">
          <h3 className="text-sm font-medium text-textmuted mb-2">Add Wallet to Track</h3>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Wallet Address"
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value)}
              className="flex-1 bg-surfacelight border border-gray-700 text-textnormal"
            />
            <Input
              placeholder="Alias (optional)"
              value={newWalletAlias}
              onChange={(e) => setNewWalletAlias(e.target.value)}
              className="md:w-1/4 bg-surfacelight border border-gray-700 text-textnormal"
            />
            <Button 
              onClick={handleAddWallet}
              disabled={!newWalletAddress}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-surface flex items-center justify-between text-sm">
          <div className="text-sm font-medium text-textmuted">Tracked Wallets</div>
          <div className="relative">
            <span className="material-icons absolute left-2 top-1/2 transform -translate-y-1/2 text-textmuted text-sm">search</span>
            <Input
              type="text"
              placeholder="Search wallets..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-surfacelight border border-gray-700 rounded pl-8 pr-3 py-1 text-textnormal w-48"
            />
          </div>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-0 px-3 py-2 bg-surfacelight text-textmuted text-xs font-medium">
          <div className="col-span-2">Wallet</div>
          <div className="text-center">Last Activity</div>
          <div className="text-center">Total Trades</div>
          <div className="text-center">Success Ratio</div>
          <div className="text-center">Status</div>
        </div>
        
        {/* Table Data */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-textmuted">
              Loading tracked wallets...
            </div>
          ) : wallets.length > 0 ? (
            // Render real wallet data when available
            wallets.map((wallet) => (
              <div key={wallet.id} className="grid grid-cols-6 gap-0 px-3 py-3 border-b border-gray-800 hover:bg-surface/50 text-sm items-center">
                <div className="col-span-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                    W
                  </div>
                  <div>
                    <div className="font-medium">{wallet.alias || 'Unnamed'}</div>
                    <div className="text-xs text-textmuted font-mono">{wallet.address.substring(0, 4)}...{wallet.address.substring(wallet.address.length - 4)}</div>
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                    {wallet.lastActivityTime ? timeAgo(wallet.lastActivityTime) : 'N/A'}
                  </Badge>
                </div>
                <div className="text-center font-mono">{wallet.totalTrades || 0}</div>
                <div className="text-center font-mono">
                  {wallet.profitRatio 
                    ? <span className={wallet.profitRatio > 1 ? 'text-success' : 'text-danger'}>{wallet.profitRatio.toFixed(1)}x</span>
                    : 'N/A'
                  }
                </div>
                <div className="text-center">
                  <Switch
                    checked={wallet.active}
                    onCheckedChange={(checked) => onToggleTracking(wallet.id, checked)}
                  />
                </div>
              </div>
            ))
          ) : (
            // Show sample data for UI demo
            sampleWallets.map((wallet) => (
              <div key={wallet.id} className="grid grid-cols-6 gap-0 px-3 py-3 border-b border-gray-800 hover:bg-surface/50 text-sm items-center">
                <div className="col-span-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                    {wallet.alias?.charAt(0) || 'W'}
                  </div>
                  <div>
                    <div className="font-medium">{wallet.alias}</div>
                    <div className="text-xs text-textmuted font-mono">{wallet.address.substring(0, 4)}...{wallet.address.substring(wallet.address.length - 4)}</div>
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700">
                    {timeAgo(wallet.lastActivityTime!)}
                  </Badge>
                </div>
                <div className="text-center font-mono">{wallet.totalTrades}</div>
                <div className="text-center font-mono">
                  <span className={wallet.profitRatio! > 1 ? 'text-success' : 'text-danger'}>{wallet.profitRatio!.toFixed(1)}x</span>
                </div>
                <div className="text-center">
                  <Switch
                    checked={wallet.active}
                    onCheckedChange={(checked) => onToggleTracking(wallet.id, checked)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
