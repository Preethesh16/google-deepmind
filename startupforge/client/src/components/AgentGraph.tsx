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

  return (
    <div className="ai-panel ai-grid-bg" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 6px'
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: '#fff' }}>
            MULTI-AGENT PIPELINE
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            Antigravity autonomous orchestration
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 700,
          color: active ? '#c4b5fd' : isDone ? '#6ee7b7' : 'rgba(255,255,255,0.4)'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: active ? '#a67dff' : isDone ? '#10B981' : 'rgba(255,255,255,0.3)',
            boxShadow: active ? '0 0 10px #a67dff' : 'none',
            animation: active ? 'blink 1s step-end infinite' : 'none'
          }} />
          {active ? 'WORKING' : isDone ? `COMPLETE · ${fileCount} FILES` : 'IDLE'}
        </div>
      </div>

      {/* Graph */}
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', position: 'relative', zIndex: 2, display: 'block' }}>
        <defs>
          {AGENTS.map((a) => (
            <marker key={a.key} id={`arrow-${a.key}`} viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={a.color} />
            </marker>
          ))}
          <marker id="arrow-idle" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.14)" />
          </marker>
        </defs>

        {/* Connectors */}
        {AGENTS.slice(0, -1).map((a, i) => {
          const next = AGENTS[i + 1];
          const x1 = a.x + NODE / 2 + 3;
          const x2 = next.x - NODE / 2 - 8;
          const d = `M ${x1} ${CY} L ${x2} ${CY}`;
          const nextPhase = phaseFor(next);
          const flowing = active && (nextPhase === 'active' || (currentKey === a.key));
          const doneSeg = seen.has(next.key) || isDone;
          const color = flowing || doneSeg ? next.color : 'rgba(255,255,255,0.14)';
          return (
            <g key={a.key}>
              <path d={d} fill="none" stroke={color} strokeWidth={2}
                markerEnd={`url(#arrow-${flowing || doneSeg ? next.key : 'idle'})`}
                opacity={flowing ? 0.35 : 1} />
              {flowing && (
                <motion.path
                  d={d} fill="none" stroke={next.color} strokeWidth={2.5}
                  strokeDasharray="6 9" strokeLinecap="round"
                  animate={{ strokeDashoffset: [30, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                />
              )}
            </g>
          );
        })}

        {/* Parallel-builder satellites */}
        {(() => {
          const b = AGENTS[2];
          const on = phaseFor(b) !== 'idle';
          const dots = [{ dx: -30, dy: -46 }, { dx: 30, dy: -46 }, { dx: 0, dy: 50 }];
          return dots.map((p, i) => (
            <g key={`sat-${i}`}>
              <line x1={b.x} y1={CY} x2={b.x + p.dx} y2={CY + p.dy}
                stroke={on ? b.color : 'rgba(255,255,255,0.1)'} strokeWidth={1} strokeDasharray="2 3" />
              <motion.circle cx={b.x + p.dx} cy={CY + p.dy} r={4}
                fill={on ? b.color : 'rgba(255,255,255,0.15)'}
                animate={on ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.3 }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
            </g>
          ));
        })()}

        {/* Nodes */}
        {AGENTS.map((a) => {
          const phase = phaseFor(a);
          return (
            <foreignObject key={a.key} x={a.x - NODE / 2} y={CY - NODE / 2}
              width={NODE} height={NODE} style={{ overflow: 'visible' }}>
              <AgentNode agent={a} phase={phase} />
            </foreignObject>
          );
        })}
      </svg>

      {/* Footer legend */}
      <div style={{
        position: 'relative', zIndex: 3, padding: '2px 20px 16px',
        textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.4)',
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        Coordinator → Planner → Builders (parallel) → Critic → Fixer
      </div>
    </div>
  );
}

function AgentNode({ agent, phase }: { agent: AgentDef; phase: Phase }) {
  const isActive = phase === 'active';
  const isDone = phase === 'done';
  const ring = isActive ? agent.color : isDone ? '#10B981' : 'rgba(255,255,255,0.12)';
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3
    }}>
      <motion.div
        animate={isActive ? { scale: [1, 1.08, 1], boxShadow: [`0 0 0 ${agent.color}00`, `0 0 22px ${agent.color}aa`, `0 0 0 ${agent.color}00`] } : {}}
        transition={{ repeat: Infinity, duration: 1.4 }}
        style={{
          width: 42, height: 42, borderRadius: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
          background: isActive
            ? `linear-gradient(180deg, ${agent.color}dd, ${agent.color}55)`
            : isDone ? 'linear-gradient(180deg, rgba(16,185,129,0.35), rgba(16,185,129,0.1))'
            : 'linear-gradient(180deg, #2a2a35, #14141c)',
          border: `2px solid ${ring}`,
          boxShadow: isActive ? `inset 0 2px 6px rgba(255,255,255,0.3)` : 'inset 0 2px 6px rgba(255,255,255,0.06)',
          opacity: phase === 'idle' ? 0.55 : 1
        }}>
        {isDone && !isActive ? '✅' : agent.icon}
      </motion.div>
      <div style={{
        fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
        color: isActive ? '#fff' : isDone ? '#6ee7b7' : 'rgba(255,255,255,0.7)'
      }}>{agent.name}</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{agent.role}</div>
    </div>
  );
}
