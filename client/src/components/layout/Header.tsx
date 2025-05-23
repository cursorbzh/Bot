import React, { useState } from 'react';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { Button } from '@/components/ui/button';
import { useConnectionStatus } from '@/hooks/use-connection-status';
import { useWallet } from '@/hooks/use-wallet';
import { ApiStatus } from '@shared/schema';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Link } from 'wouter';

export function Header() {
  const { apiStatuses, isConnected } = useConnectionStatus();
  const { connected, publicKey, connecting, connect, disconnect, error: connectionError } = useWallet();
  const [showWalletDialog, setShowWalletDialog] = useState(false);

  const handleConnectClick = () => {
    if (!connected) {
      setShowWalletDialog(true);
    }
  };

  const truncateAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-surface border-b border-gray-800 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-primary mr-4">SolTrader Pro</h1>
          <div className="space-x-6 hidden md:flex">
            <Link href="/connections" className="flex items-center text-textnormal hover:text-primary transition-colors">
              <span className="material-icons text-sm mr-1">network_check</span>
              Connections
            </Link>
            <Link href="/settings" className="flex items-center text-textnormal hover:text-primary transition-colors">
              <span className="material-icons text-sm mr-1">settings</span>
              Settings
            </Link>
            <Link href="/history" className="flex items-center text-textnormal hover:text-primary transition-colors">
              <span className="material-icons text-sm mr-1">history</span>
              History
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Indicators */}
          <div className="flex items-center space-x-3">
            {Object.entries(apiStatuses).map(([key, status]) => (
              <ConnectionStatus 
                key={key}
                name={status.name}
                connected={status.connected}
                tooltip={status.errorMessage}
                requestsPerSecond={status.requestsPerSecond}
              />
            ))}
          </div>
          
          {/* Wallet Connection */}
          {!connected ? (
            <Button 
              variant="default" 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-white rounded px-3 py-1 text-sm flex items-center"
              onClick={handleConnectClick}
              disabled={connecting}
            >
              <span className="material-icons text-sm mr-1">account_balance_wallet</span>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-primary text-primary hover:bg-primary/10 rounded px-3 py-1 text-sm flex items-center"
                >
                  <span className="material-icons text-sm mr-1">account_balance_wallet</span>
                  {truncateAddress(publicKey)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="text-xs" onClick={(e) => {
                  e.preventDefault();
                  if (publicKey) {
                    navigator.clipboard.writeText(publicKey);
                  }
                }}>
                  <span className="material-icons text-xs mr-1">content_copy</span>
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onClick={(e) => {
                  e.preventDefault();
                  if (publicKey) {
                    window.open(`https://explorer.solana.com/address/${publicKey}`, '_blank');
                  }
                }}>
                  <span className="material-icons text-xs mr-1">open_in_new</span>
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs text-red-500" onClick={(e) => {
                  e.preventDefault();
                  disconnect();
                }}>
                  <span className="material-icons text-xs mr-1">logout</span>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Wallet Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a Wallet</DialogTitle>
            <DialogDescription>
              Please install one of the following wallet extensions to continue:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('https://phantom.app/', '_blank')}
            >
              <span className="mr-2">🦊</span>
              Phantom Wallet
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('https://solflare.com/', '_blank')}
            >
              <span className="mr-2">☀️</span>
              Solflare Wallet
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.open('https://backpack.app/', '_blank')}
            >
              <span className="mr-2">🎒</span>
              Backpack Wallet
            </Button>
          </div>
          {connectionError && (
            <p className="text-red-500 text-sm mt-4">{connectionError}</p>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={() => setShowWalletDialog(false)}>
              Close
            </Button>
            <Button variant="default" onClick={() => {
              connect();
              if (!connectionError) {
                setShowWalletDialog(false);
              }
            }}>
              Try Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
