import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import { useSocket } from '../hooks/useSocket';
import AgentGraph from '../components/AgentGraph';
import GeneratingLoader from '../components/GeneratingLoader';
import axios from 'axios';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const QUICK_COMMANDS = [
  { label: '🚀 Full MVP', cmd: 'Build a complete, production-ready MVP with landing page, authentication, dashboard, and all core features.' },
  { label: '🏠 Landing Page', cmd: 'Create a stunning, conversion-optimized landing page with hero section, features, pricing, and CTA.' },
  { label: '🔐 Add Auth', cmd: 'Add user authentication (email/password + Google OAuth) with protected routes and user dashboard.' },
  { label: '📊 Dashboard UI', cmd: 'Create the main user dashboard with sidebar navigation, data tables, and key metric cards.' },
  { label: '🐛 Fix Bugs', cmd: 'Analyze the existing code for bugs, TypeScript errors, and missing imports. Fix all issues found.' },
  { label: '📱 Make Mobile', cmd: 'Make all existing pages fully responsive and mobile-first. Fix any layout issues on small screens.' },
  { label: '🎨 Improve UI', cmd: 'Redesign the UI to be more polished, modern, and conversion-optimized. Keep functionality intact.' },
  { label: '🌐 Deploy Now', cmd: 'DEPLOY_ONLY' },
];

const EVENT_ICONS: Record<string, string> = {
  context: '📋',
  agent: '🤖',
  coordinator: '🧭',
  planner: '🧠',
  builder: '🛠️',
  critic: '🔍',
  fixer: '🔧',
  antigravity: '🤖',
  model: '⚙️',
  file_start: '📝',
  file_done: '✅',
  deploy: '🚀',
  github: '🐙',
  done: '🎉',
  error: '❌',
  complete: '🏁',
};

const AGENT_COLORS: Record<string, string> = {
  coordinator: 'text-indigo-400',
  planner: 'text-violet-400',
  builder: 'text-cyan-400',
  critic: 'text-amber-400',
  fixer: 'text-emerald-400',
  context: 'text-purple-400',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    businessId, profile, buildEvents, filesCreated, deployUrl, isBuilding, currentBuildId,
    activeProjectPath, setActiveProjectPath
  } = useBusinessStore();
  const { sendBuildCommand, sendFollowUp, triggerDeploy, publishToGithub } = useSocket();
  const [customCommand, setCustomCommand] = useState('');
  const [compiledContext, setCompiledContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [github, setGithub] = useState<{ connected: boolean; username: string | null; oauthConfigured: boolean }>({
    connected: false, username: null, oauthConfigured: false
  });
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const lastProjectPath = activeProjectPath;

  const lastLogMessage = buildEvents.length ? buildEvents[buildEvents.length - 1].message : '';

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [buildEvents]);

  // Track the active project path from the latest build event (persists to store)
  useEffect(() => {
    const pathEvent = [...buildEvents].reverse().find(e => e.data?.projectPath);
    if (pathEvent?.data?.projectPath && pathEvent.data.projectPath !== activeProjectPath) {
      setActiveProjectPath(pathEvent.data.projectPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildEvents]);

  // GitHub connection status (+ handle OAuth redirect back from /api/github/callback)
  useEffect(() => {
    refreshGithubStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected' || params.get('github') === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
      refreshGithubStatus();
    }
  }, []);

  const refreshGithubStatus = async () => {
    try {
      const { data } = await axios.get(`${SERVER}/api/github/status`);
      setGithub(data);
    } catch { /* server may be starting up */ }
  };

  const connectGithub = async () => {
    try {
      const { data } = await axios.get(`${SERVER}/api/github/auth-url`);
      window.location.href = data.url;
    } catch {
      setShowGithubModal(true); // OAuth not configured — offer token paste instead
    }
  };

  const disconnectGithub = async () => {
    await axios.post(`${SERVER}/api/github/disconnect`);
    refreshGithubStatus();
  };

  const handleCommand = (cmd: string) => {
    if (!businessId) return;

    if (cmd === 'DEPLOY_ONLY') {
      if (lastProjectPath && currentBuildId) {
        triggerDeploy({ projectPath: lastProjectPath, buildId: currentBuildId });
      }
      return;
    }

    if (lastProjectPath) {
      // Follow-up command on existing project
      sendFollowUp({ businessId, command: cmd, projectPath: lastProjectPath });
    } else {
      // First build
      sendBuildCommand({ businessId, command: cmd, autoDeploy });
    }
  };

  const runProject = () => {
    if (lastProjectPath) {
      triggerDeploy({ projectPath: lastProjectPath, buildId: currentBuildId ?? 0 });
    }
  };

  const handleCustomSend = () => {
    if (customCommand.trim()) {
      handleCommand(customCommand);
      setCustomCommand('');
    }
  };

  const compileContext = async () => {
    try {
      const res = await axios.get(`${SERVER}/api/business/${businessId}/context`);
      setCompiledContext(res.data.context);
      setShowContext(true);
    } catch (err) {
      alert('Failed to compile context. Check that the server is running.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] flex flex-col">

      {/* Header */}
      <header className="border-b border-[rgba(99,102,241,0.15)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold gradient-text">StartupForge</h1>
          <div className="h-4 w-px bg-[#1A2540]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-[#6B7FA3]">Antigravity — Multi-Agent</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7FA3] bg-[#0D1526] px-3 py-1.5 rounded-full border border-[rgba(99,102,241,0.2)]">
            🏢 {profile.businessName || 'Your Startup'}
          </span>
          <button
            onClick={() => navigate('/fix-center')}
            className="text-xs font-semibold text-white bg-[rgba(99,102,241,0.15)] hover:bg-[rgba(99,102,241,0.3)] px-3 py-1.5 rounded-full border border-[rgba(99,102,241,0.4)] transition-colors"
          >
            🛡️ Fix Center
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-white bg-[rgba(99,102,241,0.15)] hover:bg-[rgba(99,102,241,0.3)] px-3 py-1.5 rounded-full border border-[rgba(99,102,241,0.4)] transition-colors"
          >
            📁 Projects
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="text-xs text-[#6B7FA3] hover:text-white transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL: Controls + File Tree */}
        <div className="w-72 border-r border-[rgba(99,102,241,0.15)] flex flex-col overflow-hidden">

          {/* Business Context */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider">
                Business Context
              </span>
              <button onClick={compileContext}
                className="text-xs text-[#6366F1] hover:text-[#8B5CF6] transition-colors">
                Compile ↗
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7FA3]">Company</span>
                <span className="text-white font-medium truncate ml-2">
                  {profile.businessName || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7FA3]">Industry</span>
                <span className="text-white">{profile.industry || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7FA3]">Stage</span>
                <span className="text-white capitalize">{profile.stage || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7FA3]">Stack</span>
                <span className="text-white truncate ml-2">{profile.preferredFrontend?.split(' ')[0] || '—'}</span>
              </div>
            </div>
          </div>

          {/* Auto-deploy toggle */}
          <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.1)] flex items-center justify-between">
            <span className="text-xs text-[#6B7FA3]">Auto-deploy after build</span>
            <button
              onClick={() => setAutoDeploy(!autoDeploy)}
              className={`w-10 h-5 rounded-full transition-all relative ${
                autoDeploy ? 'bg-[#6366F1]' : 'bg-[#1A2540]'
              }`}
            >
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
                style={{ left: autoDeploy ? '22px' : '2px' }} />
            </button>
          </div>

          {/* GitHub */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.1)]">
            <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider block mb-3">
              GitHub
            </span>
            {github.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6B7FA3]">Connected as</span>
                  <span className="text-white font-medium">🐙 {github.username}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowPublishModal(true)}
                    disabled={!lastProjectPath}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-xs font-medium transition-all disabled:opacity-40"
                  >
                    🚀 Publish
                  </button>
                  <button
                    onClick={disconnectGithub}
                    className="py-1.5 px-2 rounded-lg bg-[#0D1526] hover:bg-[#141E35] text-xs text-[#6B7FA3] border border-[rgba(99,102,241,0.15)] transition-all"
                  >
                    Disconnect
                  </button>
                </div>
                {!lastProjectPath && (
                  <p className="text-[10px] text-[#3A4F72] italic">Build an MVP first to publish it.</p>
                )}
              </div>
            ) : (
              <button
                onClick={connectGithub}
                className="w-full py-2 rounded-lg bg-[#0D1526] hover:bg-[#141E35] text-xs font-medium text-white border border-[rgba(99,102,241,0.2)] hover:border-[#6366F1] transition-all flex items-center justify-center gap-2"
              >
                🐙 Connect GitHub
              </button>
            )}
          </div>

          {/* Quick Commands */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.1)]">
            <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider block mb-3">
              Quick Commands
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_COMMANDS.map(({ label, cmd }) => (
                <button key={label} onClick={() => handleCommand(cmd)}
                  disabled={isBuilding}
                  className="py-1.5 px-2 rounded-lg bg-[#0D1526] hover:bg-[#141E35] text-xs text-[#6B7FA3] hover:text-white border border-[rgba(99,102,241,0.15)] hover:border-[#6366F1] transition-all disabled:opacity-40 text-left">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider block mb-3">
              Generated Files ({filesCreated.length})
            </span>
            {filesCreated.length === 0 ? (
              <p className="text-xs text-[#3A4F72] italic">Files will appear here as Antigravity creates them...</p>
            ) : (
              <div className="space-y-0.5">
                {filesCreated.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="text-xs">{getFileIcon(file)}</span>
                    <span className="text-xs text-[#6B7FA3] hover:text-white transition-colors truncate font-mono">
                      {file}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MAIN PANEL: Terminal + Command Bar */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Deploy Banner */}
          {deployUrl && (
            <div className="bg-gradient-to-r from-[#10B981]/10 to-[#059669]/10 border-b border-[#10B981]/30 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[#10B981] text-sm font-semibold">🎉 MVP is LIVE!</span>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[#22D3EE] text-sm hover:underline font-mono">
                  {deployUrl}
                </a>
              </div>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium rounded-lg transition-colors">
                Open →
              </a>
            </div>
          )}

          {/* Run / Publish toolbar */}
          {lastProjectPath && (
            <div className="px-6 py-2.5 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-2 bg-[#0A0F1E]">
              <span className="text-xs text-[#3A4F72] font-mono truncate mr-auto">
                📁 {lastProjectPath.split(/[\\/]/).filter(Boolean).pop()}
              </span>
              <button
                onClick={runProject}
                disabled={isBuilding}
                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                ▶ Run Project
              </button>
              {github.connected && (
                <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={isBuilding}
                  className="px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  🐙 Publish to GitHub
                </button>
              )}
            </div>
          )}

          {/* Graph (centerpiece) + side log */}
          <div className="flex-1 overflow-hidden flex">

            {/* LEFT: Graphical Multi-Agent Pipeline */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-w-0">
              <AgentGraph events={buildEvents} active={isBuilding} />

              {isBuilding && (
                <div className="ai-panel flex items-center justify-center gap-6 py-6 px-6">
                  <GeneratingLoader label="Generating" />
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm mb-1">Agents are building your MVP</div>
                    <div className="text-[rgba(255,255,255,0.55)] text-xs leading-relaxed max-w-xs">
                      {lastLogMessage || 'Compiling context and orchestrating the agent team…'}
                    </div>
                  </div>
                </div>
              )}

              {!isBuilding && buildEvents.length === 0 && (
                <div className="ai-panel flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="text-4xl mb-3">✦</div>
                  <div className="text-white font-semibold text-sm mb-1">Ready to build</div>
                  <div className="text-[rgba(255,255,255,0.5)] text-xs">
                    Pick a quick command or describe your website below — the agents light up as they work.
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Live activity log */}
            <div className="w-[360px] shrink-0 border-l border-[rgba(99,102,241,0.15)] flex flex-col overflow-hidden bg-[#080C18]">
              <div className="px-4 py-3 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-2">
                <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider">
                  Activity Log
                </span>
                {isBuilding && (
                  <span className="flex items-center gap-1.5 ml-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a67dff] animate-ping" />
                    <span className="text-[10px] text-[#c4b5fd] font-mono">LIVE</span>
                  </span>
                )}
              </div>

              <div ref={terminalRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5">
                {buildEvents.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-[#3A4F72] text-xs mb-1">No activity yet</p>
                    <p className="text-[#6366F1]/40 text-xs terminal-cursor" />
                  </div>
                ) : (
                  buildEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-2 group">
                      <span className="text-[#3A4F72] shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString('en', {
                          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </span>
                      <span className="shrink-0">{EVENT_ICONS[event.type] || '▸'}</span>
                      <span className={`${
                        event.type === 'error' ? 'text-red-400' :
                        event.type === 'done' ? 'text-[#10B981]' :
                        event.type === 'file_done' ? 'text-[#22D3EE]' :
                        event.type === 'github' ? 'text-[#c4b5fd]' :
                        AGENT_COLORS[event.type] || (
                          event.type === 'agent' ? 'text-[#818CF8]' :
                          'text-[#6B7FA3]'
                        )
                      } break-words min-w-0`}>
                        {event.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Command Bar */}
          <div className="border-t border-[rgba(99,102,241,0.15)] p-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-[#0D1526] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-[#6366F1] transition-colors">
                <span className="text-[#6366F1] text-sm shrink-0">⌘</span>
                <input
                  value={customCommand}
                  onChange={e => setCustomCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isBuilding && handleCustomSend()}
                  placeholder="Describe the website you want — e.g. 'create a modern SaaS landing page with pricing'..."
                  disabled={isBuilding}
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#3A4F72] focus:outline-none"
                />
                {isBuilding && (
                  <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
              <button
                onClick={handleCustomSend}
                disabled={isBuilding || !customCommand.trim()}
                className="px-5 py-3 bg-[#6366F1] hover:bg-[#5558E8] text-white font-medium text-sm rounded-xl transition-all disabled:opacity-40 shrink-0"
              >
                Send →
              </button>
            </div>
            <p className="text-xs text-[#3A4F72] mt-2 ml-1">
              🧭 Coordinator → 🧠 Planner → 🛠️ Builders (parallel) → 🔍 Critic → 🔧 Fixer — via Antigravity API
            </p>
          </div>
        </div>
      </div>

      {/* Context Modal */}
      {showContext && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0D1526] rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-[rgba(99,102,241,0.3)]">
            <div className="flex items-center justify-between p-6 border-b border-[rgba(99,102,241,0.15)]">
              <h3 className="text-white font-semibold">📋 Business Context (Compiled)</h3>
              <button onClick={() => setShowContext(false)} className="text-[#6B7FA3] hover:text-white">✕</button>
            </div>
            <pre className="flex-1 overflow-y-auto p-6 text-xs text-[#6B7FA3] font-mono whitespace-pre-wrap">
              {compiledContext || 'No context compiled yet. Click "Compile ↗" in the sidebar.'}
            </pre>
          </div>
        </div>
      )}

      {/* GitHub token-connect fallback modal (used when OAuth App isn't configured) */}
      {showGithubModal && (
        <GithubTokenModal
          onClose={() => setShowGithubModal(false)}
          onConnected={() => { setShowGithubModal(false); refreshGithubStatus(); }}
        />
      )}

      {/* Publish-to-GitHub modal */}
      {showPublishModal && lastProjectPath && (
        <PublishModal
          projectPath={lastProjectPath}
          buildId={currentBuildId ?? undefined}
          onClose={() => setShowPublishModal(false)}
          onPublish={(repoName, isPrivate) => {
            publishToGithub({ projectPath: lastProjectPath, repoName, isPrivate, buildId: currentBuildId ?? undefined });
            setShowPublishModal(false);
          }}
        />
      )}
    </div>
  );
}

function GithubTokenModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setError('');
    try {
      await axios.post(`${SERVER}/api/github/token`, { token: token.trim() });
      onConnected();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect. Check the token and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div onClick={e => e.stopPropagation()} className="bg-[#0D1526] rounded-2xl w-full max-w-md border border-[rgba(99,102,241,0.3)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">🐙 Connect GitHub</h3>
          <button onClick={onClose} className="text-[#6B7FA3] hover:text-white">✕</button>
        </div>
        <p className="text-xs text-[#6B7FA3] mb-3">
          No OAuth App configured on the server. Paste a{' '}
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=StartupForge" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">
            Personal Access Token
          </a>{' '}with <code className="text-[#22D3EE]">repo</code> scope instead.
        </p>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          className="w-full bg-[#141E35] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3A4F72] focus:outline-none focus:border-[#6366F1] mb-2"
        />
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <button
          onClick={submit}
          disabled={saving || !token.trim()}
          className="w-full py-2 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-sm font-medium transition-all disabled:opacity-40"
        >
          {saving ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </div>
  );
}

function PublishModal({ projectPath, onClose, onPublish }: {
  projectPath: string; buildId?: number; onClose: () => void; onPublish: (repoName: string, isPrivate: boolean) => void;
}) {
  const defaultName = projectPath.split(/[\\/]/).filter(Boolean).pop() || 'startupforge-mvp';
  const [repoName, setRepoName] = useState(defaultName);
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div onClick={e => e.stopPropagation()} className="bg-[#0D1526] rounded-2xl w-full max-w-md border border-[rgba(99,102,241,0.3)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">🚀 Publish to GitHub</h3>
          <button onClick={onClose} className="text-[#6B7FA3] hover:text-white">✕</button>
        </div>
        <p className="text-xs text-[#6B7FA3] mb-3">
          Pushes source to a GitHub repo and publishes the built app live via GitHub Pages.
        </p>
        <label className="text-xs text-[#6B7FA3] block mb-1">Repository name</label>
        <input
          value={repoName}
          onChange={e => setRepoName(e.target.value)}
          className="w-full bg-[#141E35] border border-[rgba(99,102,241,0.2)] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3A4F72] focus:outline-none focus:border-[#6366F1] mb-3"
        />
        <label className="flex items-center gap-2 mb-4 text-xs text-[#6B7FA3]">
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          Make repository private
        </label>
        <button
          onClick={() => onPublish(repoName.trim(), isPrivate)}
          disabled={!repoName.trim()}
          className="w-full py-2 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-sm font-medium transition-all disabled:opacity-40"
        >
          Publish →
        </button>
      </div>
    </div>
  );
}

function getFileIcon(filePath: string): string {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return '⚛️';
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) return '📜';
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) return '🎨';
  if (filePath.endsWith('.json')) return '📦';
  if (filePath.endsWith('.md')) return '📖';
  if (filePath.endsWith('.html')) return '🌐';
  if (filePath.endsWith('.env') || filePath.includes('config')) return '⚙️';
  if (filePath.includes('prisma') || filePath.includes('schema')) return '🗄️';
  if (filePath.includes('test') || filePath.includes('spec')) return '🧪';
  return '📄';
}
