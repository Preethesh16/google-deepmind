import { useMemo, type ComponentType, type SVGProps } from 'react';
import { motion } from 'framer-motion';
import { IconCompass, IconCpu, IconHammer, IconScan, IconWrench, IconCheck } from './Icons';

interface BuildEvent {
  type: string;
  message: string;
  timestamp: number;
  data?: any;
}

interface AgentDef {
  key: string;
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  role: string;
  color: string;
  x: number;
  matches: string[];
}

const CY = 118;

const AGENTS: AgentDef[] = [
  { key: 'coordinator', name: 'Coordinator', Icon: IconCompass, role: 'orchestrates', color: '#8A93A6', x: 74, matches: ['coordinator', 'antigravity', 'context'] },
  { key: 'planner', name: 'Planner', Icon: IconCpu, role: 'plans files', color: '#7C9CFF', x: 210, matches: ['planner'] },
  { key: 'builder', name: 'Builders', Icon: IconHammer, role: 'write code', color: '#5BD4EE', x: 346, matches: ['builder', 'file_start', 'file_done', 'file', 'model'] },
  { key: 'critic', name: 'Critic', Icon: IconScan, role: 'validates', color: '#F4B860', x: 482, matches: ['critic'] },
  { key: 'fixer', name: 'Fixer', Icon: IconWrench, role: 'resolves', color: '#34D3A6', x: 606, matches: ['fixer'] },
];

const VW = 680;
const VH = 236;
const NODE = 82;

type Phase = 'idle' | 'active' | 'done';

export default function AgentGraph({ events, active }: { events: BuildEvent[]; active: boolean }) {
  const { currentKey, seen, isDone, fileCount } = useMemo(() => {
    const seen = new Set<string>();
    let currentKey = '';
    let isDone = false;
    let fileCount = 0;
    for (const e of events) {
      if (e.type === 'complete' || e.type === 'done') isDone = true;
      if (e.type === 'file_done') fileCount++;
      const agent = AGENTS.find((a) => a.matches.includes(e.type));
      if (agent) { seen.add(agent.key); currentKey = agent.key; }
    }
    if (isDone) currentKey = '';
    return { currentKey, seen, isDone, fileCount };
  }, [events]);

  const phaseFor = (a: AgentDef): Phase => {
    if (active && currentKey === a.key) return 'active';
    if (seen.has(a.key) || (isDone)) return 'done';
    return 'idle';
  };

  const statusColor = active ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--text-3)';
  const statusLabel = active ? 'RUNNING' : isDone ? `COMPLETE · ${fileCount} FILES` : 'IDLE';

  return (
    <div className="panel dot-grid" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 18px 8px', borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text)' }}>
            MULTI-AGENT PIPELINE
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            Autonomous orchestration · Antigravity
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', color: statusColor, fontFamily: 'var(--font-mono)' }}>
          <span className={active ? 'dot dot-live' : 'dot'} style={{ background: active ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--text-3)' }} />
          {statusLabel}
        </div>
      </div>

      {/* Graph */}
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          {AGENTS.map((a) => (
            <marker key={a.key} id={`ag-arrow-${a.key}`} viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={a.color} />
            </marker>
          ))}
          <marker id="ag-arrow-idle" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.14)" />
          </marker>
        </defs>

        {/* Connectors */}
        {AGENTS.slice(0, -1).map((a, i) => {
          const next = AGENTS[i + 1];
          const x1 = a.x + NODE / 2 + 2;
          const x2 = next.x - NODE / 2 - 8;
          const d = `M ${x1} ${CY} L ${x2} ${CY}`;
          const nextPhase = phaseFor(next);
          const flowing = active && (nextPhase === 'active' || currentKey === a.key);
          const doneSeg = seen.has(next.key) || isDone;
          const color = flowing || doneSeg ? next.color : 'rgba(255,255,255,0.12)';
          return (
            <g key={a.key}>
              <path d={d} fill="none" stroke={color} strokeWidth={1.6}
                markerEnd={`url(#ag-arrow-${flowing || doneSeg ? next.key : 'idle'})`}
                opacity={flowing ? 0.4 : 1} />
              {flowing && (
                <path d={d} fill="none" stroke={next.color} strokeWidth={2}
                  strokeDasharray="5 8" strokeLinecap="round"
                  style={{ animation: 'dash-flow 0.6s linear infinite' }} />
              )}
            </g>
          );
        })}

        {/* Parallel-builder satellites */}
        {(() => {
          const b = AGENTS[2];
          const on = phaseFor(b) !== 'idle';
          const dots = [{ dx: -30, dy: -48 }, { dx: 30, dy: -48 }, { dx: 0, dy: 52 }];
          return dots.map((p, i) => (
            <g key={`sat-${i}`}>
              <line x1={b.x} y1={CY} x2={b.x + p.dx} y2={CY + p.dy}
                stroke={on ? b.color : 'rgba(255,255,255,0.1)'} strokeWidth={1} strokeDasharray="2 3" />
              <motion.circle cx={b.x + p.dx} cy={CY + p.dy} r={3.5}
                fill={on ? b.color : 'rgba(255,255,255,0.15)'}
                animate={on ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.3 }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
            </g>
          ));
        })()}

        {/* Nodes */}
        {AGENTS.map((a) => (
          <foreignObject key={a.key} x={a.x - NODE / 2} y={CY - NODE / 2}
            width={NODE} height={NODE} style={{ overflow: 'visible' }}>
            <AgentNode agent={a} phase={phaseFor(a)} />
          </foreignObject>
        ))}
      </svg>

      {/* Footer */}
      <div style={{
        padding: '12px 18px 14px', textAlign: 'center',
        fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
        borderTop: '1px solid var(--line)',
      }}>
        coordinator → planner → builders (parallel) → critic → fixer
      </div>
    </div>
  );
}

function AgentNode({ agent, phase }: { agent: AgentDef; phase: Phase }) {
  const isActive = phase === 'active';
  const isDone = phase === 'done';
  const ring = isActive ? agent.color : isDone ? 'var(--accent-dim)' : 'rgba(255,255,255,0.12)';
  const { Icon } = agent;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        {isActive && (
          <span className="pulse-ring" style={{ position: 'absolute', inset: 0, borderRadius: 12, border: `1.5px solid ${agent.color}` }} />
        )}
        <motion.div
          animate={isActive ? { boxShadow: [`0 0 0 ${agent.color}00`, `0 0 18px ${agent.color}66`, `0 0 0 ${agent.color}00`] } : {}}
          transition={{ repeat: Infinity, duration: 1.6 }}
          style={{
            width: 44, height: 44, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? `${agent.color}1f` : isDone ? 'rgba(52,211,166,0.10)' : 'var(--bg-2)',
            border: `1.5px solid ${ring}`,
            color: isActive ? agent.color : isDone ? 'var(--accent)' : 'var(--text-3)',
            opacity: phase === 'idle' ? 0.7 : 1,
          }}>
          {isDone && !isActive ? <IconCheck size={20} /> : <Icon size={20} />}
        </motion.div>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', color: isActive ? 'var(--text)' : isDone ? 'var(--text-1)' : 'var(--text-2)' }}>
        {agent.name}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{agent.role}</div>
    </div>
  );
}
