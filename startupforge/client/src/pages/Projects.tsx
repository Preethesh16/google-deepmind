import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import { IconFolder } from '../components/Icons';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

interface Project {
  buildId: number;
  businessId: number;
  businessName: string;
  industry: string;
  stage: string;
  status: string;
  projectPath: string;
  deployUrl: string;
  githubUrl: string;
  githubPagesUrl: string;
  filesCreated: string[];
  commandUsed: string;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  running: { label: 'Building', color: '#5BD4EE' },
  built: { label: 'Built', color: '#7C9CFF' },
  deployed: { label: 'Deployed', color: '#34D3A6' },
  failed: { label: 'Failed', color: '#F26D6D' },
  pending: { label: 'Pending', color: '#8A8F9C' }
};

export default function Projects() {
  const navigate = useNavigate();
  const { setBusinessId, setActiveProjectPath } = useBusinessStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${SERVER}/api/projects`);
      setProjects(data.projects);
    } finally {
      setLoading(false);
    }
  };

  const openProject = (p: Project) => {
    setBusinessId(p.businessId);
    setActiveProjectPath(p.projectPath);
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--accent)', display: 'flex' }}><IconFolder size={20} /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Project Library</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
              Every generated MVP — reopen, edit, deploy, or publish any of them
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} style={ghostBtn}>← Dashboard</button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, color: 'var(--text-muted)',
            border: '1px dashed var(--border)', borderRadius: 14
          }}>
            No projects yet. Build your first MVP from the Dashboard.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.pending;
              const name = p.projectPath.split(/[\\/]/).filter(Boolean).pop() || `build-${p.buildId}`;
              return (
                <div key={p.buildId} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10
                }} className="card-glow">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {p.businessName} · {p.industry || 'general'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: meta.color,
                      background: `${meta.color}1a`, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap'
                    }}>{meta.label}</span>
                  </div>

                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {p.commandUsed ? truncate(p.commandUsed, 110) : 'No command recorded'}
                  </div>

                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {p.filesCreated.length} files · {new Date(p.createdAt).toLocaleString()}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.deployUrl && (
                      <a href={p.deployUrl} target="_blank" rel="noopener noreferrer" style={linkChip('#34D3A6')}>
                        Live
                      </a>
                    )}
                    {p.githubUrl && (
                      <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" style={linkChip('#7C9CFF')}>
                        Repo
                      </a>
                    )}
                    {p.githubPagesUrl && (
                      <a href={p.githubPagesUrl} target="_blank" rel="noopener noreferrer" style={linkChip('#5BD4EE')}>
                        Pages
                      </a>
                    )}
                  </div>

                  <button onClick={() => openProject(p)} style={{
                    marginTop: 4, padding: '9px 14px',
                    background: 'var(--accent)', color: '#062018',
                    border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer'
                  }}>
                    Open & Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function linkChip(color: string): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 600, color, background: `${color}1a`,
    padding: '4px 10px', borderRadius: 20, textDecoration: 'none'
  };
}

const ghostBtn: React.CSSProperties = {
  padding: '9px 14px', background: 'var(--bg-surface)', color: 'var(--text-primary)',
  border: '1px solid var(--border)', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer'
};
