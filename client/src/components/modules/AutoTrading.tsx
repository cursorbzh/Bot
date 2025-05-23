import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AutoTradingSettings } from '@shared/schema';
import { Badge } from '@/components/ui/badge';

interface AutoTradingProps {
  settings: AutoTradingSettings;
  isActive: boolean;
  onStartAutoTrading: () => void;
  onStopAutoTrading: () => void;
}

export function AutoTrading({
  settings,
  isActive,
  onStartAutoTrading,
  onStopAutoTrading
}: AutoTradingProps) {
  // Sample trading data for component preview
  const sampleTradingPairs = [
    { pair: 'SOL/USDC', position: 'Long', entryPrice: '$102.45', currentPrice: '$103.87', profitLoss: '+1.38%', time: '2h 15m' },
    { pair: 'JUP/USDC', position: 'Long', entryPrice: '$0.746', currentPrice: '$0.754', profitLoss: '+1.07%', time: '1h 32m' },
    { pair: 'BONK/USDC', position: 'Short', entryPrice: '$0.00002153', currentPrice: '$0.00002086', profitLoss: '+3.11%', time: '4h 05m' },
  ];

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Strategy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-surface border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-textmuted">Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-lg font-semibold">{settings.strategy}</div>
                <Badge variant={isActive ? "success" : "secondary"} className={isActive ? "bg-success/20 text-success" : "bg-gray-800 text-gray-400"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-textmuted">
                Trading {settings.tradingPairs.join(', ')} with max position size of {settings.maxPositionSize} SOL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-textmuted">Risk Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">Stop Loss:</span>
                  <span className="text-danger">{settings.stopLoss}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">Take Profit:</span>
                  <span className="text-success">{settings.takeProfit}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">Risk/Reward:</span>
                  <span className="text-primary">1:{(settings.takeProfit / settings.stopLoss).toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-textmuted">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">Today:</span>
                  <span className="text-success">+2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">This Week:</span>
                  <span className="text-success">+8.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textmuted text-sm">Win Rate:</span>
                  <span className="text-primary">68%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Positions */}
        <Card className="bg-surface border-gray-800 flex-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-textmuted">Active Positions</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto scrollbar-thin h-[calc(100%-4rem)]">
            {isActive ? (
              <div className="space-y-4">
                {sampleTradingPairs.map((trade, index) => (
                  <div key={index} className="bg-surfacelight p-3 rounded-md border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <div className="font-medium">{trade.pair}</div>
                        <Badge 
                          variant={trade.position === 'Long' ? 'success' : 'destructive'} 
                          className={`ml-2 ${
                            trade.position === 'Long' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-danger/20 text-danger'
                          }`}
                        >
                          {trade.position}
                        </Badge>
                      </div>
                      <div className="text-xs text-textmuted">Duration: {trade.time}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <div className="text-xs text-textmuted">Entry</div>
                        <div className="font-mono">{trade.entryPrice}</div>
                      </div>
                      <div>
                        <div className="text-xs text-textmuted">Current</div>
                        <div className="font-mono">{trade.currentPrice}</div>
                      </div>
                      <div>
                        <div className="text-xs text-textmuted">P/L</div>
                        <div className={`font-mono ${
                          trade.profitLoss.startsWith('+') ? 'text-success' : 'text-danger'
                        }`}>
                          {trade.profitLoss}
                        </div>
                      </div>
                    </div>
                    <div className="w-full">
                      <Progress 
                        value={parseFloat(trade.profitLoss) / settings.takeProfit * 100} 
                        max={100}
                        className="h-1 bg-gray-700"
                      />
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-danger">-{settings.stopLoss}%</span>
                        <span className="text-success">+{settings.takeProfit}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-textmuted">
                <p className="mb-4">Auto-Trading is currently inactive</p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={onStartAutoTrading}
                >
                  Start Auto-Trading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Control Panel */}
        {isActive && (
          <div className="bg-surface border border-gray-800 rounded-md p-3 flex justify-between items-center">
            <div>
              <h3 className="font-medium">Auto-Trading Status</h3>
              <p className="text-xs text-textmuted">Running since 2h 45m | 3 active positions</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-gray-700 text-textmuted hover:bg-gray-800"
              >
                <span className="material-icons text-sm mr-1">refresh</span>
                Reset
              </Button>
              <Button 
                variant="destructive"
                onClick={onStopAutoTrading}
              >
                <span className="material-icons text-sm mr-1">stop</span>
                Stop Trading
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
