import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Types pour Phantom Wallet
type PhantomEvent = 'connect' | 'disconnect';

interface PhantomProvider {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, callback: (args: any) => void) => void;
  isPhantom: boolean;
  isConnected: boolean;
  publicKey: PublicKey | null;
}

type WindowWithSolana = Window & { 
  solana?: PhantomProvider;
};

// Configuration du réseau Solana
const SOLANA_NETWORK = 'mainnet-beta';
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), {
  commitment: 'confirmed'
});

export interface WalletState {
  wallet: PhantomProvider | null;
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    wallet: null,
    connected: false,
    publicKey: null,
    connecting: false,
    error: null
  });

  // Initialisation du wallet
  useEffect(() => {
    const initializeWallet = async () => {
      console.log('Initializing wallet...');
      
      // Vérifier si Phantom est disponible
      const win = window as WindowWithSolana;
      console.log('Window object:', win);
      console.log('Solana provider:', win.solana);
      console.log('Is Phantom:', win.solana?.isPhantom);
      
      // Attendre que le provider soit disponible
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkProvider = () => {
        if (win.solana?.isPhantom) {
          console.log('Phantom wallet detected');
          const provider = win.solana;
          
          // Vérifier l'état initial
          if (provider.isConnected && provider.publicKey) {
            console.log('Wallet already connected');
            const publicKey = provider.publicKey;
            setState(s => ({
              ...s,
              wallet: provider,
              connected: true,
              publicKey: publicKey.toString(),
              error: null
            }));
          } else {
            console.log('Wallet not connected');
            setState(s => ({
              ...s,
              wallet: provider,
              connected: false,
              publicKey: null,
              error: null
            }));
          }

          // Configurer les écouteurs d'événements
          provider.on('connect', () => {
            console.log('Wallet connected event received');
            const publicKey = provider.publicKey;
            if (publicKey) {
              setState(s => ({
                ...s,
                connected: true,
                publicKey: publicKey.toString(),
                connecting: false,
                error: null
              }));
            }
          });

          provider.on('disconnect', () => {
            console.log('Wallet disconnected event received');
            setState(s => ({
              ...s,
              connected: false,
              publicKey: null,
              error: null
            }));
          });
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Waiting for Phantom wallet... Attempt ${attempts}/${maxAttempts}`);
            setTimeout(checkProvider, 500);
          } else {
            console.log('Phantom wallet not detected after maximum attempts');
            setState(s => ({
              ...s,
              error: 'Phantom wallet not detected. Please make sure the extension is installed and enabled.'
            }));
          }
        }
      };

      checkProvider();
    };

    initializeWallet();
  }, []);

  // Fonction de connexion
  const connect = useCallback(async () => {
    console.log('Connect function called');
    const { wallet } = state;
    
    if (!wallet) {
      console.log('No wallet available');
      setState(s => ({
        ...s,
        error: 'No wallet detected. Please make sure the Phantom wallet extension is installed and enabled.'
      }));
      return;
    }

    try {
      console.log('wallet object before connect:', wallet);
      console.log('Attempting to connect wallet...');
      setState(s => ({ ...s, connecting: true, error: null }));

      // Vérifier si déjà connecté
      if (wallet.isConnected && wallet.publicKey) {
        console.log('Wallet already connected');
        const publicKey = wallet.publicKey;
        setState(s => ({
          ...s,
          connected: true,
          publicKey: publicKey.toString(),
          connecting: false
        }));
        return;
      }

      // Tenter la connexion
      const { publicKey } = await wallet.connect();
      console.log('wallet.connect() success, publicKey:', publicKey.toString());

      // Vérifier la connexion au réseau
      try {
        const balance = await connection.getBalance(publicKey);
        console.log('Wallet balance:', balance);
      } catch (error) {
        console.error('Error checking wallet balance:', error);
        throw new Error('Failed to connect to Solana network');
      }

      setState(s => ({
        ...s,
        connected: true,
        publicKey: publicKey.toString(),
        connecting: false,
        error: null
      }));
    } catch (error) {
      console.error('Error in wallet.connect:', error);
      console.error('User agent:', navigator.userAgent);
      setState(s => ({
        ...s,
        connecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      }));
    }
  }, [state.wallet]);

  // Fonction de déconnexion
  const disconnect = useCallback(async () => {
    const { wallet } = state;
    if (wallet) {
      try {
        await wallet.disconnect();
        setState(s => ({
          ...s,
          connected: false,
          publicKey: null,
          error: null
        }));
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
        setState(s => ({
          ...s,
          error: error instanceof Error ? error.message : 'Failed to disconnect wallet'
        }));
      }
    }
  }, [state.wallet]);

  return {
    ...state,
    connect,
    disconnect
  };
}