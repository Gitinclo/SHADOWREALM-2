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
      const bannedUserIds = new Set<string>();
      let kickedCount = 0;
      let messageCounterWindow = 0;
      let activeShardId = 'Shard-Alpha-2030';
      let lastSaveEnvelopeFrame: string | null = null;
      let lastSiegeDeltaFrame: string | null = null;

      const broadcastJSON = (payload: Record<string, any>) => {
        const text = JSON.stringify(payload);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(text);
          }
        });
      };

      const broadcastPlayerCount = () => {
        broadcastJSON({
          type: 'player_spawn',
          playerId: 'server',
          data: { playerCount: wss.clients.size, activeShardId },
          timestamp: Date.now(),
        });
      };

      const broadcastServerTelemetry = () => {
        if (wss.clients.size === 0) return;
        const now = Date.now();
        const memMb =
          typeof process !== 'undefined' && process.memoryUsage
            ? Math.round(process.memoryUsage().rss / (1024 * 1024))
            : 148;
        const connectedClients = Math.max(1, wss.clients.size);
        const simulatedRealmPopulation = connectedClients + 4;
        const loadPct = Number(
          Math.min(
            96,
            18 + connectedClients * 4.5 + messageCounterWindow * 1.4 + Math.sin(now / 4000) * 5
          ).toFixed(1)
        );
        const predictedLoad2030Percent = Number(
          Math.min(99, loadPct * 1.12 + Math.cos(now / 3500) * 3.5).toFixed(1)
        );
        const anomalyScore = Number(
          Math.max(
            2,
            Math.min(
              95,
              Math.abs(predictedLoad2030Percent - loadPct) * 2.1 +
                (kickedCount + bannedUserIds.size) * 4.5
            )
          ).toFixed(1)
        );
        const autoScaleShardCount = loadPct > 70 ? 5 : 3;
        const throughputKbps = Number(
          (38 + connectedClients * 12.5 + messageCounterWindow * 3.8).toFixed(1)
        );
        messageCounterWindow = 0;

        broadcastJSON({
          type: 'server_telemetry',
          playerId: 'server',
          data: {
            timestamp: now,
            timeLabel: new Date(now).toISOString().slice(11, 19),
            serverLoadPercent: Math.max(8, loadPct),
            predictedLoad2030Percent,
            anomalyScore,
            autoScaleShardCount,
            activeShardId,
            activeUsers: simulatedRealmPopulation,
            wsClients: connectedClients,
            tickRateHz: 20,
            memoryUsageMb: memMb,
            wsThroughputKbps: throughputKbps,
            kickedCount,
            bannedCount: bannedUserIds.size,
            bannedUserIds: Array.from(bannedUserIds),
          },
          timestamp: now,
        });
      };

      const telemetryInterval = setInterval(broadcastServerTelemetry, 2000);
      server.httpServer.on('close', () => clearInterval(telemetryInterval));

      server.httpServer.on('upgrade', (request, socket, head) => {
        if (request.url === '/ws') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws: WebSocket) => {
        broadcastPlayerCount();
        broadcastServerTelemetry();

        if (lastSaveEnvelopeFrame && ws.readyState === WebSocket.OPEN) {
          ws.send(lastSaveEnvelopeFrame);
        }
        if (lastSiegeDeltaFrame && ws.readyState === WebSocket.OPEN) {
          ws.send(lastSiegeDeltaFrame);
        }

        ws.on('message', (raw: Buffer | string) => {
          try {
            messageCounterWindow++;
            const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
            const parsed = JSON.parse(text);

            if (parsed?.playerId) {
              if (bannedUserIds.has(parsed.playerId)) {
                ws.close(4003, 'Banned by Supreme Administrator');
                return;
              }
              activePlayers.set(ws, parsed.playerId);
            }

            if (parsed?.type === 'save_sync') {
              lastSaveEnvelopeFrame = text;
            } else if (parsed?.type === 'siege_delta') {
              lastSiegeDeltaFrame = text;
            } else if (
              parsed?.type === 'gm_command' &&
              parsed?.data?.action === 'migrate_shard' &&
              parsed?.data?.targetShardId
            ) {
              activeShardId = String(parsed.data.targetShardId);
              broadcastServerTelemetry();
            } else if (parsed?.type === 'kick_player' || parsed?.type === 'ban_player') {
              const targetUserId = parsed?.data?.targetUserId || parsed?.targetUserId;
              if (targetUserId) {
                if (parsed.type === 'ban_player') {
                  bannedUserIds.add(String(targetUserId));
                } else {
                  kickedCount++;
                }
                activePlayers.forEach((pId, clientSocket) => {
                  if (pId === targetUserId && clientSocket.readyState === WebSocket.OPEN) {
                    clientSocket.send(text);
                    clientSocket.close(
                      4001,
                      parsed.type === 'ban_player'
                        ? 'Connection terminated: Banned by GM'
                        : 'Connection terminated: Kicked by GM'
                    );
                    activePlayers.delete(clientSocket);
                  }
                });
              }
              broadcastServerTelemetry();
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
          broadcastServerTelemetry();
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
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
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
          three: ['three'],
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
