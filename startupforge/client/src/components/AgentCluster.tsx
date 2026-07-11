import { useMemo } from 'react';

interface BuildEvent {
  type: string;
  message: string;
  timestamp: number;
  data?: any;
}

interface AgentDef {
  key: string;
  name: string;
  icon: string;
  role: string;
  color: string;
  matches: string[];
}

const AGENTS: AgentDef[] = [
  { key: 'coordinator', name: 'Coordinator', icon: '🧭', role: 'Orchestrates the team', color: '#6366F1', matches: ['coordinator', 'antigravity', 'context'] },
  { key: 'planner', name: 'Planner', icon: '🧠', role: 'Splits work into files', color: '#8B5CF6', matches: ['planner'] },
  { key: 'builder', name: 'Builders', icon: '🛠️', role: 'Write code in parallel', color: '#22D3EE', matches: ['builder', 'file_start', 'file_done', 'file', 'model'] },
  { key: 'critic', name: 'Critic', icon: '🔍', role: 'Validates & finds defects', color: '#F59E0B', matches: ['critic'] },
  { key: 'fixer', name: 'Fixer', icon: '🔧', role: 'Resolves conflicts', color: '#10B981', matches: ['fixer'] }
];

type Phase = 'idle' | 'active' | 'done';

export default function AgentCluster({ events, active }: { events: BuildEvent[]; active: boolean }) {
  const { currentKey, seen, isDone } = useMemo(() => {
    const seen = new Set<string>();
    let currentKey = '';
    let isDone = false;
    for (const e of events) {
      if (e.type === 'complete' || e.type === 'done') isDone = true;
      const agent = AGENTS.find((a) => a.matches.includes(e.type));
      if (agent) {
        seen.add(agent.key);
        currentKey = agent.key;
      }
    }
    if (isDone) currentKey = '';
    return { currentKey, seen, isDone };
  }, [events]);

  const phaseFor = (a: AgentDef): Phase => {
    if (active && currentKey === a.key) return 'active';
    if (seen.has(a.key)) return 'done';
    return 'idle';
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '20px 18px',
      position: 'relative',
      overflow: 'hidden'
    }} className="card-glow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: 'var(--text-primary)' }}>
            AGENT CLUSTER
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Autonomous multi-agent orchestration
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600,
          color: active ? 'var(--accent-cyan)' : isDone ? 'var(--accent-green)' : 'var(--text-muted)'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: active ? 'var(--accent-cyan)' : isDone ? 'var(--accent-green)' : 'var(--text-muted)',
            boxShadow: active ? '0 0 8px var(--accent-cyan)' : 'none',
            animation: active ? 'blink 1s step-end infinite' : 'none'
          }} />
          {active ? 'WORKING' : isDone ? 'COMPLETE' : 'IDLE'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        {AGENTS.map((a, i) => {
          const phase = phaseFor(a);
          return (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <AgentNode agent={a} phase={phase} />
              {i < AGENTS.length - 1 && <Connector activeFlow={phase === 'active' || (phase === 'done' && active)} color={a.color} />}
            </div>
          );
        })}
      </div>

      {/* Parallel-builder hint */}
      <div style={{
        marginTop: 16, textAlign: 'center', fontSize: 10.5,
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)'
      }}>
        🧭 Coordinator → 🧠 Planner → 🛠️ Builders (parallel) → 🔍 Critic → 🔧 Fixer
      </div>
    </div>
  );
}

function AgentNode({ agent, phase }: { agent: AgentDef; phase: Phase }) {
  const isActive = phase === 'active';
  const isDone = phase === 'done';
  const ringColor = isActive ? agent.color : isDone ? 'var(--accent-green)' : 'var(--border)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        {isActive && (
          <span className="pulse-ring" style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `2px solid ${agent.color}`
          }} />
        )}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          background: isActive
            ? `radial-gradient(circle at 30% 30%, ${agent.color}55, ${agent.color}11)`
            : isDone ? 'rgba(16,185,129,0.12)' : 'var(--bg-surface)',
          border: `2px solid ${ringColor}`,
          boxShadow: isActive ? `0 0 18px ${agent.color}88` : 'none',
          transition: 'all 0.3s ease',
          opacity: phase === 'idle' ? 0.5 : 1
        }}>
          {isDone && !isActive ? '✅' : agent.icon}
        </div>
      </div>
      <div style={{ textAlign: 'center', minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 700,
          color: isActive ? agent.color : isDone ? 'var(--accent-green)' : 'var(--text-primary)',
          whiteSpace: 'nowrap'
        }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 2 }}>
          {agent.role}
        </div>
      </div>
    </div>
  );
}

function Connector({ activeFlow, color }: { activeFlow: boolean; color: string }) {
  return (
    <div style={{ position: 'relative', flex: '0 0 20px', height: 2, marginTop: 27 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: activeFlow ? color : 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {activeFlow && (
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
            background: 'linear-gradient(90deg, transparent, #fff, transparent)',
            animation: 'flow 1.1s linear infinite'
          }} />
        )}
      </div>
    </div>
  );
}
