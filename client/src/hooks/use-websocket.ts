import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@/types';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const clientIdRef = useRef<string | null>(null);
  const lastConnectionAttemptRef = useRef<number>(0);
  const MIN_RECONNECT_DELAY = 5000;
  const MAX_RECONNECT_DELAY = 30000;
  const connectionTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      socketRef.current.close(1000, 'Cleanup');
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (isConnectingRef.current) {
      console.log('Already connecting, skipping...');
      return;
    }

    const now = Date.now();
    if (now - lastConnectionAttemptRef.current < MIN_RECONNECT_DELAY) {
      console.log('Too soon to reconnect, waiting...');
      return;
    }

    lastConnectionAttemptRef.current = now;
    isConnectingRef.current = true;

    // Nettoyer toute connexion existante
    cleanup();

    // Générer un ID client unique
    const clientId = `mawsujp${Math.random().toString(36).substring(2, 8)}`;
    clientIdRef.current = clientId;

    // Choisir le bon protocole WebSocket selon le contexte (HTTPS ou HTTP)
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = window.location.port;
    const wsUrl = `${protocol}://${host}:${port}/ws?clientId=${clientId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    const socket = new WebSocket(wsUrl);

    // Timeout de connexion
    connectionTimeoutRef.current = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        console.log('Connection timeout, closing socket');
        socket.close(1000, 'Connection timeout');
      }
    }, 10000);

    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      setConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      isConnectingRef.current = false;
      
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Envoyer un ping toutes les 30 secondes
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      pingIntervalRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: Date.now(),
              clientId: clientIdRef.current 
            }));
          } catch (error) {
            console.error('Error sending ping:', error);
            if (pingIntervalRef.current) {
              clearInterval(pingIntervalRef.current);
              pingIntervalRef.current = null;
            }
            socket.close(1000, 'Error sending ping');
          }
        } else {
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connection_established') {
          if (data.clientId) {
            clientIdRef.current = data.clientId;
          }
        }
        setLastMessage(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(new Error('WebSocket connection error'));
      isConnectingRef.current = false;
      
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setConnected(false);
      isConnectingRef.current = false;
      
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Ne pas tenter de se reconnecter si la fermeture est normale
      if (event.code === 1000 || event.code === 1001) {
        console.log('Normal closure, not attempting to reconnect');
        return;
      }
      
      // Si la fermeture n'est pas normale, tenter de se reconnecter
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.max(MIN_RECONNECT_DELAY, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), MAX_RECONNECT_DELAY));
        
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      } else {
        setError(new Error('Max reconnection attempts reached'));
      }
    };

    socketRef.current = socket;
  }, [cleanup]);

  const send = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({
          ...data,
          clientId: clientIdRef.current
        }));
      } catch (error) {
        console.error('Error sending message:', error);
        setError(new Error('Failed to send message'));
      }
    } else {
      console.error('WebSocket not connected, unable to send message');
    }
  }, []);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  // Empêcher les connexions multiples
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!connected && !isConnectingRef.current) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, connected]);

  return {
    connected,
    error,
    lastMessage,
    send,
    reconnect: connect
  };
}
