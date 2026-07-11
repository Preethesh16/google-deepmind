import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import { useFeedbackStore, FeedbackItem } from '../stores/useFeedbackStore';
import { useSocket } from '../hooks/useSocket';
import AgentGraph from '../components/AgentGraph';
import { IconShield, IconWrench, IconCheck } from '../components/Icons';

const CATEGORY_META: Record<string, { label: string }> = {
  bug: { label: 'Bug' },
  error: { label: 'Error' },
  feature: { label: 'Feature' },
  ux: { label: 'UX' },
  performance: { label: 'Performance' },
  other: { label: 'Other' }
};

const PRIORITY_COLOR: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#6B7FA3' };
const URGENCY_COLOR: Record<string, string> = { critical: '#DC2626', high: '#F97316', normal: '#3B82F6', low: '#6B7FA3' };

type Filter = 'all' | 'open' | 'fixing' | 'pending_approval' | 'completed' | 'rejected';

export default function FixCenter() {
  const navigate = useNavigate();
  const { businessId, profile, buildEvents, isBuilding } = useBusinessStore();
  const { items, stats, workbookPath, loading, activeFixId, setItems, setStats, setWorkbookPath, setLoading } = useFeedbackStore();
  const { fixFeedback, approveFeedback, rejectFeedback } = useSocket();

  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/feedback');
      setItems(data.items);
      setStats(data.stats);
      setWorkbookPath(data.workbook);
    } catch (e) {
      console.error('Failed to load feedback', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeedback(); /* eslint-disable-next-line */ }, []);

  const importExcel = async () => {
    setBusy('import');
    try {
      await axios.post('/api/feedback/import');
      await loadFeedback();
    } finally { setBusy(''); }
  };

  const syncExcel = async () => {
    setBusy('sync');
    try {
      const { data } = await axios.post('/api/feedback/sync');
      alert(`Synced ${data.rows} rows back to Excel:\n${data.path}`);
    } finally { setBusy(''); }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--accent)', display: 'flex' }}><IconShield size={20} /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Fix Center</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Autonomous feedback resolution · {profile.businessName || 'Your startup'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/dashboard')} style={ghostBtn}>← Dashboard</button>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 28px 60px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total" value={stats.total} color="#8A8F9C" active={filter === 'all'} onClick={() => setFilter('all')} />
          <StatCard label="Open" value={stats.open} color="#7C9CFF" active={filter === 'open'} onClick={() => setFilter('open')} />
          <StatCard label="Fixing" value={stats.fixing} color="#5BD4EE" active={filter === 'fixing'} onClick={() => setFilter('fixing')} />
          <StatCard label="Review" value={stats.pending} color="#F4B860" active={filter === 'pending_approval'} onClick={() => setFilter('pending_approval')} />
          <StatCard label="Done" value={stats.completed} color="#34D3A6" active={filter === 'completed'} onClick={() => setFilter('completed')} />
          <StatCard label="Rejected" value={stats.rejected} color="#F26D6D" active={filter === 'rejected'} onClick={() => setFilter('rejected')} />
        </div>

        {/* Agent cluster */}
        <div style={{ marginBottom: 20 }}>
          <AgentGraph events={buildEvents} active={isBuilding && activeFixId !== null} />
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 16, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={importExcel} disabled={!!busy} style={primaryBtn}>
              {busy === 'import' ? 'Importing…' : 'Import from Excel'}
            </button>
            <button onClick={syncExcel} disabled={!!busy} style={ghostBtn}>
              {busy === 'sync' ? 'Syncing…' : 'Sync to Excel'}
            </button>
            <button onClick={() => setShowForm(true)} style={ghostBtn}>Add Feedback</button>
            <button onClick={loadFeedback} style={ghostBtn}>Refresh</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {workbookPath || 'feedback.xlsx'}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading feedback…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, color: 'var(--text-muted)',
            border: '1px dashed var(--border)', borderRadius: 14
          }}>
            No feedback in this view. Connect a Google Form export or click <b>Import from Excel</b>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                businessId={businessId}
                isBusy={isBuilding && activeFixId === item.id}
                onFix={() => fixFeedback({ feedbackId: item.id, businessId: businessId ?? undefined })}
                onApprove={() => approveFeedback({ feedbackId: item.id })}
                onReject={() => rejectFeedback({ feedbackId: item.id })}
              />
            ))}
          </div>
        )}

        {/* Live activity for the active fix */}
        {isBuilding && activeFixId !== null && (
          <LiveFeed events={buildEvents} />
        )}
      </div>

      {showForm && <FeedbackFormModal onClose={() => setShowForm(false)} onSaved={loadFeedback} />}
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  item, isBusy, onFix, onApprove, onReject
}: {
  item: FeedbackItem;
  businessId: number | null;
  isBusy: boolean;
  onFix: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
  const completed = item.status === 'completed';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${item.status === 'pending_approval' ? 'rgba(245,158,11,0.4)' : completed ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`,
      borderRadius: 14, padding: 18, position: 'relative',
      opacity: completed ? 0.85 : 1
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <Badge bg="rgba(124,156,255,0.14)" color="#A9BEFF">{cat.label}</Badge>
            <Badge bg="transparent" color={PRIORITY_COLOR[item.priority]} border>
              ● {item.priority} priority
            </Badge>
            <Badge bg="transparent" color={URGENCY_COLOR[item.urgency]} border>
              ▲ {item.urgency} urgency
            </Badge>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              score {item.score}
            </span>
            <StatusPill status={item.status} />
          </div>

          {/* Message */}
          <div style={{
            fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-primary)',
            textDecoration: completed ? 'none' : 'none', marginBottom: 8
          }}>
            {completed && <span style={{ color: 'var(--accent-green)', marginRight: 6, display: 'inline-flex', verticalAlign: 'middle' }}><IconCheck size={14} /></span>}
            {item.message}
          </div>

          {/* Meta */}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {item.userName || 'Anonymous'}{item.email ? ` · ${item.email}` : ''}
            {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ''}
          </div>

          {/* Files changed + summary */}
          {(item.status === 'pending_approval' || completed) && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 10,
              background: 'var(--bg-surface)', border: '1px solid var(--border)'
            }}>
              {item.fixSummary && (
                <div style={{ fontSize: 12, color: 'var(--accent-green)', marginBottom: 6 }}>
                  {item.fixSummary}
                </div>
              )}
              {item.filesChanged.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.filesChanged.map((f) => (
                    <span key={f} style={{
                      fontSize: 10.5, fontFamily: 'monospace', color: 'var(--accent-cyan)',
                      background: 'rgba(91,212,238,0.1)', padding: '2px 7px', borderRadius: 6
                    }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150, alignItems: 'stretch' }}>
          {item.status === 'open' && (
            <button onClick={onFix} disabled={isBusy} style={fixBtn}>
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}><IconWrench size={14} /></span>Fix with Agents
            </button>
          )}
          {item.status === 'fixing' && (
            <div style={{
              ...fixBtn, background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default'
            }}>
              <span className="pulse-ring" style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--accent-cyan)' }} />
              Agents working…
            </div>
          )}
          {item.status === 'pending_approval' && (
            <>
              <button onClick={onApprove} style={approveBtn}>✔ Approve</button>
              <button onClick={onReject} style={rejectBtn}>✕ Reject</button>
            </>
          )}
          {completed && (
            <div style={{
              ...fixBtn, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'default'
            }}>
              Completed
            </div>
          )}
          {item.status === 'rejected' && (
            <button onClick={onFix} disabled={isBusy} style={fixBtn}>↻ Retry Fix</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}1f` : 'var(--bg-card)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 12, padding: '12px 10px', cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.2s'
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </button>
  );
}

function Badge({ children, bg, color, border }: { children: React.ReactNode; bg: string; color: string; border?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: bg,
      border: border ? `1px solid ${color}66` : 'none',
      padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', textTransform: 'capitalize'
    }}>{children}</span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    open: { label: 'Open', color: '#3B82F6' },
    fixing: { label: 'Fixing', color: '#22D3EE' },
    pending_approval: { label: 'Awaiting Approval', color: '#F59E0B' },
    completed: { label: 'Completed', color: '#10B981' },
    rejected: { label: 'Rejected', color: '#EF4444' }
  };
  const m = map[status] || map.open;
  return (
    <span style={{
      marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: m.color,
      background: `${m.color}1a`, padding: '3px 10px', borderRadius: 20
    }}>{m.label}</span>
  );
}

function LiveFeed({ events }: { events: { type: string; message: string; timestamp: number }[] }) {
  const recent = events.slice(-40);
  return (
    <div style={{
      marginTop: 20, background: '#05060B', border: '1px solid var(--border)',
      borderRadius: 12, padding: 14, maxHeight: 240, overflowY: 'auto',
      fontFamily: 'monospace', fontSize: 12
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 11 }}>◉ LIVE AGENT ACTIVITY</div>
      {recent.map((e, i) => (
        <div key={i} style={{ color: colorFor(e.type), marginBottom: 3, lineHeight: 1.4 }}>
          <span style={{ color: 'var(--text-muted)' }}>[{new Date(e.timestamp).toLocaleTimeString()}]</span> {e.message}
        </div>
      ))}
      <span className="terminal-cursor" />
    </div>
  );
}

function colorFor(type: string): string {
  const m: Record<string, string> = {
    error: '#EF4444', done: '#10B981', complete: '#10B981', file_done: '#22D3EE',
    coordinator: '#8A93A6', planner: '#7C9CFF', builder: '#5BD4EE',
    critic: '#F59E0B', fixer: '#10B981', context: '#A78BFA', agent: '#818CF8'
  };
  return m[type] || 'var(--text-primary)';
}

// ─── Add-feedback modal (simulates a Google Form submission) ────────────────

function FeedbackFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    userName: '', email: '', category: 'bug',
    message: '', priority: 'medium', urgency: 'normal'
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!f.message.trim()) return;
    setSaving(true);
    try {
      await axios.post('/api/feedback', f);
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
        padding: 24, width: 'min(520px, 100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Submit Feedback</div>
          <button onClick={onClose} style={{ ...ghostBtn, padding: '4px 10px' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Name" value={f.userName} onChange={(v) => setF({ ...f, userName: v })} />
            <Field label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })}
              options={['bug', 'error', 'feature', 'ux', 'performance', 'other']} />
            <Select label="Priority" value={f.priority} onChange={(v) => setF({ ...f, priority: v })}
              options={['high', 'medium', 'low']} />
            <Select label="Urgency" value={f.urgency} onChange={(v) => setF({ ...f, urgency: v })}
              options={['critical', 'high', 'normal', 'low']} />
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })}
              rows={4} placeholder="Describe the bug, error, or feature request…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button onClick={submit} disabled={saving || !f.message.trim()} style={primaryBtn}>
            {saving ? 'Saving…' : 'Add to Fix Center'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none' };
const primaryBtn: React.CSSProperties = { padding: '9px 16px', background: 'var(--accent)', color: '#062018', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { padding: '9px 14px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const fixBtn: React.CSSProperties = { padding: '10px 14px', background: 'var(--accent)', color: '#062018', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const approveBtn: React.CSSProperties = { padding: '10px 14px', background: 'rgba(52,211,166,0.15)', color: '#34D3A6', border: '1px solid rgba(52,211,166,0.5)', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const rejectBtn: React.CSSProperties = { padding: '8px 14px', background: 'transparent', color: '#F26D6D', border: '1px solid rgba(242,109,109,0.4)', borderRadius: 9, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' };
