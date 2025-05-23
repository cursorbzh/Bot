import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Token } from '@shared/schema';

interface TokenSniperProps {
  tokens: Token[];
  isLoading: boolean;
  onSnipe: (token: Token) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onSearch: (query: string) => void;
}

export function TokenSniper({
  tokens,
  isLoading,
  onSnipe,
  onSort,
  onSearch
}: TokenSniperProps) {
  const [sortBy, setSortBy] = useState<string>('time-desc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sample token list for the component preview
  const sampleTokens = [
    { id: 1, symbol: 'NEW', name: 'New Token', address: '0x123...', createdTime: new Date(Date.now() - 300000), mintedSupply: '1000000', initialLiquidity: '$5,000' },
    { id: 2, symbol: 'MOON', name: 'Moon Shot', address: '0x456...', createdTime: new Date(Date.now() - 900000), mintedSupply: '10000000', initialLiquidity: '$15,000' },
    { id: 3, symbol: 'PUMP', name: 'Pump Token', address: '0x789...', createdTime: new Date(Date.now() - 1800000), mintedSupply: '5000000', initialLiquidity: '$25,000' },
  ];

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    const [field, direction] = value.split('-');
    onSort(field, direction as 'asc' | 'desc');
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
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
        {/* Filters */}
        <div className="p-3 bg-surface flex items-center space-x-3 text-sm">
          <div className="flex items-center">
            <span className="text-textmuted mr-2">Sort by:</span>
            <Select 
              value={sortBy}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time-desc">Newest First</SelectItem>
                <SelectItem value="time-asc">Oldest First</SelectItem>
                <SelectItem value="liquidity-desc">Liquidity (High to Low)</SelectItem>
                <SelectItem value="symbol-asc">Token Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative ml-auto">
            <span className="material-icons absolute left-2 top-1/2 transform -translate-y-1/2 text-textmuted text-sm">search</span>
            <Input 
              type="text"
              placeholder="Search new tokens..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-surfacelight border border-gray-700 rounded pl-8 pr-3 py-1 text-textnormal w-48"
            />
          </div>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-7 gap-0 px-3 py-2 bg-surfacelight text-textmuted text-xs font-medium">
          <div className="col-span-2">Token</div>
          <div className="text-center">Time</div>
          <div className="text-right">Initial Supply</div>
          <div className="text-right">Initial Liquidity</div>
          <div className="text-center">DEX</div>
          <div className="text-center">Action</div>
        </div>
        
        {/* Table Data */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-textmuted">
              Scanning for new tokens...
            </div>
          ) : tokens.length > 0 ? (
            // Render real token data when available
            tokens.map((token) => (
              <div key={token.id} className="grid grid-cols-7 gap-0 px-3 py-3 border-b border-gray-800 hover:bg-surface/50 text-sm items-center">
                <div className="col-span-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                    {token.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-textmuted">{token.name}</div>
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
                    Just Now
                  </Badge>
                </div>
                <div className="text-right font-mono">1,000,000</div>
                <div className="text-right font-mono">$2,500</div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-800">
                    Raydium
                  </Badge>
                </div>
                <div className="text-center">
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-white rounded px-2 py-1 text-xs"
                    onClick={() => onSnipe(token)}
                  >
                    Snipe
                  </Button>
                </div>
              </div>
            ))
          ) : (
            // Show sample data for UI demo
            sampleTokens.map((token) => (
              <div key={token.id} className="grid grid-cols-7 gap-0 px-3 py-3 border-b border-gray-800 hover:bg-surface/50 text-sm items-center">
                <div className="col-span-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                    {token.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-textmuted">{token.name}</div>
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-purple-900/30 text-purple-300 border-purple-800">
                    {timeAgo(token.createdTime)}
                  </Badge>
                </div>
                <div className="text-right font-mono">{token.mintedSupply}</div>
                <div className="text-right font-mono">{token.initialLiquidity}</div>
                <div className="text-center">
                  <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-800">
                    Raydium
                  </Badge>
                </div>
                <div className="text-center">
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-white rounded px-2 py-1 text-xs"
                    onClick={() => onSnipe(token as any)}
                  >
                    Snipe
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
