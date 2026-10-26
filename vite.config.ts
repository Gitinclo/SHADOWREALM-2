import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { WebSocketServer, WebSocket } from 'ws';

function shadowRealmSocketPlugin(): Plugin {
  return {
    name: 'shadowrealm-party-ws',
    configureServer(server) {
      if (!server.httpServer) return;
      const wss = new WebSocketServer({ noServer: true });
      const activePlayers = new Map<WebSocket, string>();

      const broadcastPlayerCount = () => {
        const countMsg = JSON.stringify({
          type: 'player_spawn',
          playerId: 'server',
          data: { playerCount: wss.clients.size },
          timestamp: Date.now(),
        });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(countMsg);
          }
        });
      };

      server.httpServer.on('upgrade', (request, socket, head) => {
        if (request.url === '/ws') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws: WebSocket) => {
        broadcastPlayerCount();

        ws.on('message', (raw: Buffer | string) => {
          try {
            const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
            const parsed = JSON.parse(text);
            if (parsed?.playerId) {
              activePlayers.set(ws, parsed.playerId);
            }
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(text);
              }
            });
          } catch {
            // Ignore malformed JSON frames
          }
        });

        ws.on('close', () => {
          activePlayers.delete(ws);
          broadcastPlayerCount();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), shadowRealmSocketPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
