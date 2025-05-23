/**
 * WebSocket client utility for handling connections and messages
 */

// Define message types for client-server communication
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

// Create a singleton WebSocket instance
let socket: WebSocket | null = null;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
let heartbeatInterval: number | null = null;

// Event listeners
const listeners: { [key: string]: ((data: any) => void)[] } = {
  message: [],
  open: [],
  close: [],
  error: [],
  reconnect: []
};

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(): void {
  // Close existing connection if any
  if (socket) {
    cleanupConnection();
  }

  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      
      // Setup heartbeat to keep connection alive
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      heartbeatInterval = window.setInterval(() => {
        sendMessage({ type: 'ping', timestamp: Date.now() });
      }, 30000);
      
      // Notify listeners
      listeners.open.forEach(listener => listener(null));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        // Notify general message listeners
        listeners.message.forEach(listener => listener(message));
        
        // Notify specific message type listeners if they exist
        if (message.type && listeners[message.type]) {
          listeners[message.type].forEach(listener => listener(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      
      // Clean up intervals
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Notify listeners
      listeners.close.forEach(listener => listener({ code: event.code, reason: event.reason }));
      
      // Attempt to reconnect with exponential backoff
      scheduleReconnect();
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      // Notify listeners
      listeners.error.forEach(listener => listener(event));
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    scheduleReconnect();
  }
}

/**
 * Clean up the WebSocket connection
 */
function cleanupConnection(): void {
  if (socket) {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    socket = null;
  }
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
  
  console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
  
  reconnectTimeout = window.setTimeout(() => {
    // Notify reconnect listeners
    listeners.reconnect.forEach(listener => listener({ attempt: reconnectAttempts }));
    
    initializeWebSocket();
  }, delay);
}

/**
 * Send a message to the server
 */
export function sendMessage(message: WebSocketMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('Cannot send message, WebSocket is not connected');
    return false;
  }
  
  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}

/**
 * Check if WebSocket is connected
 */
export function isConnected(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

/**
 * Add event listener
 */
export function addEventListener(event: string, callback: (data: any) => void): void {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  
  listeners[event].push(callback);
}

/**
 * Remove event listener
 */
export function removeEventListener(event: string, callback: (data: any) => void): void {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }
}

/**
 * Clean up all listeners and connection
 */
export function cleanup(): void {
  cleanupConnection();
  
  // Clear all listeners
  for (const event in listeners) {
    listeners[event] = [];
  }
}
