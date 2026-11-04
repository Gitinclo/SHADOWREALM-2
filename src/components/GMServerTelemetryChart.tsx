import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ServerTelemetryPoint } from '../game/adminGMControl';

export interface GMServerTelemetryChartProps {
  telemetryHistory: ServerTelemetryPoint[];
  activeUsersCount: number;
  kickedCount: number;
  bannedCount: number;
  wsConnected: boolean;
  activeShardId?: string;
}

export const GMServerTelemetryChart: React.FC<GMServerTelemetryChartProps> = ({
  telemetryHistory,
  activeUsersCount,
  kickedCount,
  bannedCount,
  wsConnected,
  activeShardId = 'Shard-Alpha-2030',
}) => {
  const enrichedHistory = telemetryHistory.map((pt, idx) => {
    const predictedLoad2030Percent =
      typeof pt.predictedLoad2030Percent === 'number'
        ? pt.predictedLoad2030Percent
        : Number(Math.min(99, pt.serverLoadPercent * 1.12 + Math.cos(idx * 0.7) * 3.2).toFixed(1));
    const anomalyScore =
      typeof pt.anomalyScore === 'number'
        ? pt.anomalyScore
        : Number(
            Math.max(
              2,
              Math.min(95, Math.abs(predictedLoad2030Percent - pt.serverLoadPercent) * 2.4 + (bannedCount + kickedCount) * 4)
            ).toFixed(1)
          );
    const autoScaleShardCount = pt.autoScaleShardCount ?? (pt.serverLoadPercent > 70 ? 5 : 3);
    return {
      ...pt,
      predictedLoad2030Percent,
      anomalyScore,
      autoScaleShardCount,
    };
  });

  const latest = enrichedHistory[enrichedHistory.length - 1] || {
    serverLoadPercent: 24,
    predictedLoad2030Percent: 27.2,
    anomalyScore: 6.4,
    autoScaleShardCount: 3,
    activeUsers: activeUsersCount,
    tickRateHz: 20,
    memoryUsageMb: 148,
    wsThroughputKbps: 64,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Live 2030 KPI Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '5px',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>SHARD & ACTIVE USERS</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
            {latest.activeUsers} Online
          </div>
          <div style={{ fontSize: '9px', color: wsConnected ? '#10b981' : '#f59e0b' }}>
            {wsConnected ? `● /ws ${activeShardId}` : '● Local Party Sync'}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '5px',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>LOAD vs 2030 FORECAST</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
            {latest.serverLoadPercent.toFixed(1)}% &rarr; {latest.predictedLoad2030Percent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '9px', color: '#cbd5e1' }}>
            Tick: {latest.tickRateHz} Hz · {latest.memoryUsageMb} MB
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '5px',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>2030 ANOMALY & AUTO-SCALE</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>
            Risk {latest.anomalyScore.toFixed(1)}% · {latest.autoScaleShardCount} Shards
          </div>
          <div style={{ fontSize: '9px', color: '#cbd5e1' }}>
            {latest.wsThroughputKbps.toFixed(1)} KB/s Delta-Sync
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '5px',
            padding: '6px 8px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>MODERATION ACTIONS</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f87171' }}>
            {kickedCount} Kicked / {bannedCount} Banned
          </div>
          <div style={{ fontSize: '9px', color: '#cbd5e1' }}>Terminated Sessions</div>
        </div>
      </div>

      {/* Recharts Dual Visualization Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.35fr 1fr',
          gap: '10px',
          height: '188px',
        }}
      >
        {/* AreaChart: Actual Load %, 2030 Forecast Load %, & WS Throughput KB/s */}
        <div
          style={{
            background: 'rgba(5, 7, 12, 0.82)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '6px',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#cbd5e1',
              fontWeight: 600,
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>📈 Server Load (%), 2030 Predictive Load (%) & WS KB/s</span>
            <span style={{ color: '#fbbf24' }}>2030 Auto-Scale Feed</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={enrichedHistory}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gmLoadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gmPredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gmNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e131f',
                    border: '1px solid rgba(245,158,11,0.45)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="serverLoadPercent"
                  name="Actual Load %"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#gmLoadGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="predictedLoad2030Percent"
                  name="2030 Forecast %"
                  stroke="#a855f7"
                  strokeDasharray="4 2"
                  fillOpacity={1}
                  fill="url(#gmPredGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="wsThroughputKbps"
                  name="WS KB/s"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#gmNetGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BarChart: Active User Count, Tick Rate Hz & 2030 Anomaly Score */}
        <div
          style={{
            background: 'rgba(5, 7, 12, 0.82)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '6px',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#cbd5e1',
              fontWeight: 600,
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>👥 Active Users, Tick (Hz) & Anomaly Index</span>
            <span style={{ color: '#38bdf8' }}>/ws 2030 State</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={enrichedHistory}
                margin={{ top: 4, right: 8, left: -22, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e131f',
                    border: '1px solid rgba(6,182,212,0.45)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar
                  dataKey="activeUsers"
                  name="Active Users"
                  fill="#38bdf8"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="tickRateHz"
                  name="Tick Rate (Hz)"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="anomalyScore"
                  name="Anomaly Risk"
                  fill="#f43f5e"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
