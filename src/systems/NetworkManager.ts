import { NetworkMessage, MapPing } from '../types';

// Simple browser-compatible EventEmitter
class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(...args));
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }
}

export class NetworkManager extends EventEmitter {
  private socket: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected: boolean = false;
  private messageQueue: NetworkMessage[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private lastUrl: string = '';
  private seenPingIds: Set<string> = new Set();

  constructor() {
    super();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('shadowrealm_party_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event?.data && typeof event.data === 'object') {
            this.handleMessage(event.data as NetworkMessage);
          }
        };
      } catch {
        // Ignore if BroadcastChannel is restricted
      }
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(url?: string): Promise<void> {
    const defaultProtocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultHost =
      typeof window !== 'undefined' && window.location.host ? window.location.host : 'localhost:3000';
    const targetUrl =
      url && !url.includes('localhost:8080') ? url : `${defaultProtocol}//${defaultHost}/ws`;
    this.lastUrl = targetUrl;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(targetUrl);

        this.socket.onopen = () => {
          console.log('Connected to party server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: NetworkMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.socket.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message to the server and party channel
   */
  sendMessage(message: NetworkMessage): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // Ignore channel errors
      }
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (message.type !== 'player_move') {
        this.messageQueue.push(message);
      }
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      if (message.type !== 'player_move') {
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Broadcast a tactical map ping to all party members
   */
  sendPing(ping: MapPing): void {
    this.seenPingIds.add(ping.id);
    this.sendMessage({
      type: 'party_ping',
      playerId: ping.playerId,
      data: ping,
      timestamp: ping.timestamp,
    });
  }

  /**
   * Handle incoming messages from server
   */
  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'player_move':
        this.emit('player_move', { playerId: message.playerId, ...message.data });
        break;
      case 'player_attack':
        this.emit('player_attack', message.data);
        break;
      case 'player_chat':
        this.emit('player_chat', { playerId: message.playerId, ...message.data });
        break;
      case 'player_spawn':
        this.emit('player_spawn', message.data);
        break;
      case 'enemy_spawn':
        this.emit('enemy_spawn', message.data);
        break;
      case 'combat_event':
        this.emit('combat_event', message.data);
        break;
      case 'player_death':
        this.emit('player_death', message.data);
        break;
      case 'loot_drop':
        this.emit('loot_drop', message.data);
        break;
      case 'party_ping': {
        const ping = message.data as MapPing;
        if (!ping || !ping.id) break;
        if (this.seenPingIds.has(ping.id)) break;
        this.seenPingIds.add(ping.id);
        this.emit('party_ping', ping);
        break;
      }
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Attempt to reconnect to server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      this.emit('reconnecting');
      if (this.lastUrl) {
        this.connect(this.lastUrl).catch(() => {});
      }
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  isOnline(): boolean {
    return this.isConnected || Boolean(this.broadcastChannel);
  }

  /**
   * Get connection status
   */
  getStatus(): string {
    if (this.isConnected) {
      return 'connected';
    } else if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return 'connecting';
    } else {
      return 'disconnected';
    }
  }
}
