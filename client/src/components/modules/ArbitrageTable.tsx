import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArbitrageOpportunityData } from '@shared/schema';
import { cn } from '@/lib/utils';

interface ArbitrageTableProps {
  opportunities: ArbitrageOpportunityData[];
  isLoading: boolean;
  onExecute: (id: number) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onFilterMinSpread: (minSpread: number) => void;
  onSearch: (query: string) => void;
}

export function ArbitrageTable({
  opportunities,
  isLoading,
  onExecute,
  onSort,
  onFilterMinSpread,
  onSearch
}: ArbitrageTableProps) {
  const [sortBy, setSortBy] = useState<string>('spreadPercentage');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    const [field, direction] = value.split('-');
    onSort(field, direction as 'asc' | 'desc');
  };

  // Handle min spread change
  const handleMinSpreadChange = (value: string) => {
    onFilterMinSpread(parseFloat(value));
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  // Format currency numbers
  const formatCurrency = (value: string | undefined) => {
    if (!value) return '-';
    const numValue = parseFloat(value);
    
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(1)}K`;
    } else {
      return `$${numValue.toFixed(2)}`;
    }
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
                <SelectItem value="spreadPercentage-desc">Spread % (High to Low)</SelectItem>
                <SelectItem value="spreadPercentage-asc">Spread % (Low to High)</SelectItem>
                <SelectItem value="volume24h-desc">Volume (High to Low)</SelectItem>
                <SelectItem value="liquidity-desc">Liquidity (High to Low)</SelectItem>
                <SelectItem value="token-asc">Token Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center">
            <span className="text-textmuted mr-2">Min. Spread:</span>
            <Select 
              defaultValue="1"
              onValueChange={handleMinSpreadChange}
            >
              <SelectTrigger className="bg-surfacelight border border-gray-700 rounded px-2 py-1 text-textnormal">
                <SelectValue placeholder="Select min spread" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5%</SelectItem>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="2">2%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative ml-auto">
            <span className="material-icons absolute left-2 top-1/2 transform -translate-y-1/2 text-textmuted text-sm">search</span>
            <Input 
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-surfacelight border border-gray-700 rounded pl-8 pr-3 py-1 text-textnormal w-48"
            />
          </div>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-9 gap-0 px-3 py-2 bg-surfacelight text-textmuted text-xs font-medium">
          <div className="col-span-2">Token</div>
          <div className="text-right">Best Buy</div>
          <div className="text-right">Best Sell</div>
          <div className="text-right">Spread %</div>
          <div className="text-right">Est. Profit</div>
          <div className="text-right">24h Volume</div>
          <div className="text-right">Liquidity</div>
          <div className="text-center">Action</div>
        </div>
        
        {/* Table Data */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-textmuted">
              Loading opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-textmuted">
              No arbitrage opportunities found.
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <div key={opportunity.id} className="grid grid-cols-9 gap-0 px-3 py-3 border-b border-gray-800 hover:bg-surface/50 text-sm items-center">
                <div className="col-span-2 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-2">
                    {opportunity.token.symbol.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{opportunity.token.symbol}</div>
                    <div className="text-xs text-textmuted">{opportunity.token.name}</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div>{opportunity.buyPrice}</div>
                  <div className="text-xs text-textmuted">on {opportunity.buyDex}</div>
                </div>
                <div className="text-right font-mono">
                  <div>{opportunity.sellPrice}</div>
                  <div className="text-xs text-textmuted">on {opportunity.sellDex}</div>
                </div>
                <div className="text-right font-mono text-success">+{opportunity.spreadPercentage}%</div>
                <div className="text-right font-mono">${parseFloat(opportunity.estimatedProfit).toFixed(2)}</div>
                <div className="text-right font-mono">{formatCurrency(opportunity.volume24h)}</div>
                <div className="text-right font-mono">{formatCurrency(opportunity.liquidity)}</div>
                <div className="text-center">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white rounded px-2 py-1 text-xs"
                    onClick={() => onExecute(opportunity.id!)}
                    disabled={opportunity.executed}
                  >
                    {opportunity.executed ? 'Executed' : 'Execute'}
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
