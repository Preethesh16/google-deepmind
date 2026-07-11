import { useState, useEffect, useRef, type ComponentType, type SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import { useSocket } from '../hooks/useSocket';
import AgentGraph from '../components/AgentGraph';
import GeneratingLoader from '../components/GeneratingLoader';
import VoiceInput from '../components/VoiceInput';
import {
  IconLogo, IconShield, IconFolder, IconGithub, IconRocket, IconPlay, IconSend,
  IconCompass, IconCpu, IconHammer, IconScan, IconWrench, IconCheck, IconCheckCircle,
  IconX, IconFile, IconLock, IconSpark, IconArrowRight, IconGlobe, IconActivity,
  IconTerminal, IconSettings, IconLayers, IconExternal,
} from '../components/Icons';
import axios from 'axios';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const QUICK_COMMANDS: { label: string; Icon: IconType; cmd: string }[] = [
  { label: 'Full MVP', Icon: IconRocket, cmd: 'Build a complete, production-ready MVP with landing page, authentication, dashboard, and all core features.' },
  { label: 'Landing Page', Icon: IconGlobe, cmd: 'Create a stunning, conversion-optimized landing page with hero section, features, pricing, and CTA.' },
  { label: 'Add Auth', Icon: IconLock, cmd: 'Add user authentication (email/password + Google OAuth) with protected routes and user dashboard.' },
  { label: 'Dashboard UI', Icon: IconLayers, cmd: 'Create the main user dashboard with sidebar navigation, data tables, and key metric cards.' },
  { label: 'Fix Bugs', Icon: IconWrench, cmd: 'Analyze the existing code for bugs, TypeScript errors, and missing imports. Fix all issues found.' },
  { label: 'Make Mobile', Icon: IconScan, cmd: 'Make all existing pages fully responsive and mobile-first. Fix any layout issues on small screens.' },
  { label: 'Improve UI', Icon: IconSpark, cmd: 'Redesign the UI to be more polished, modern, and conversion-optimized. Keep functionality intact.' },
  { label: 'Deploy Now', Icon: IconArrowRight, cmd: 'DEPLOY_ONLY' },
];

const EVENT_ICONS: Record<string, IconType> = {
  context: IconFile,
  agent: IconCompass,
  coordinator: IconCompass,
  planner: IconCpu,
  builder: IconHammer,
  critic: IconScan,
  fixer: IconWrench,
  antigravity: IconCompass,
  model: IconSettings,
  file_start: IconFile,
  file_done: IconCheck,
  deploy: IconRocket,
  github: IconGithub,
  done: IconCheckCircle,
  error: IconX,
  complete: IconCheckCircle,
};

const AGENT_COLORS: Record<string, string> = {
  coordinator: 'var(--text-1)',
  planner: 'var(--c-plan)',
  builder: 'var(--c-build)',
  critic: 'var(--c-critic)',
  fixer: 'var(--c-fix)',
  context: 'var(--text-2)',
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="px-5 h-14 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--accent)' }}><IconLogo size={20} /></span>
            <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>StartupForge</h1>
          </div>
          <div className="h-4 w-px" style={{ background: 'var(--line-strong)' }} />
          <div className="flex items-center gap-2">
            <span className={isBuilding ? 'dot dot-live' : 'dot'} style={{ background: isBuilding ? 'var(--accent)' : 'var(--text-3)' }} />
            <span className="text-[11.5px] mono" style={{ color: 'var(--text-2)' }}>
              antigravity · multi-agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-1)' }}>
            <IconLayers size={13} />
            {profile.businessName || 'Your Startup'}
          </span>
          <button onClick={() => navigate('/fix-center')} className="btn btn-ghost" style={{ padding: '7px 12px' }}>
            <IconShield size={14} /> Fix Center
          </button>
          <button onClick={() => navigate('/projects')} className="btn btn-ghost" style={{ padding: '7px 12px' }}>
            <IconFolder size={14} /> Projects
          </button>
          <button onClick={() => navigate('/onboarding')} className="btn" style={{ padding: '7px 10px', color: 'var(--text-2)' }}>
            <IconSettings size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL: Controls + File Tree */}
        <div className="w-72 flex flex-col overflow-hidden shrink-0" style={{ borderRight: '1px solid var(--line)', background: 'var(--bg-1)' }}>

          {/* Business Context */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">Business Context</span>
              <button onClick={compileContext} className="text-[11px] flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                Compile <IconExternal size={11} />
              </button>
            </div>
            <div className="space-y-2 text-[12.5px]">
              {[
                ['Company', profile.businessName || '—'],
                ['Industry', profile.industry || '—'],
                ['Stage', profile.stage || '—'],
                ['Stack', profile.preferredFrontend?.split(' ')[0] || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span style={{ color: 'var(--text-3)' }}>{k}</span>
                  <span className="truncate" style={{ color: 'var(--text-1)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-deploy toggle */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[12.5px]" style={{ color: 'var(--text-2)' }}>Auto-deploy after build</span>
            <button
              onClick={() => setAutoDeploy(!autoDeploy)}
              className="w-9 h-5 rounded-full transition-all relative"
              style={{ background: autoDeploy ? 'var(--accent-dim)' : 'var(--bg-3)' }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ background: '#fff', left: autoDeploy ? '18px' : '2px' }} />
            </button>
          </div>

          {/* GitHub */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="eyebrow block mb-3">GitHub</span>
            {github.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span style={{ color: 'var(--text-3)' }}>Connected</span>
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
                    <IconGithub size={13} /> {github.username}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setShowPublishModal(true)} disabled={!lastProjectPath} className="btn btn-primary flex-1" style={{ padding: '7px 10px' }}>
                    <IconRocket size={13} /> Publish
                  </button>
                  <button onClick={disconnectGithub} className="btn btn-ghost" style={{ padding: '7px 10px' }}>
                    Disconnect
                  </button>
                </div>
                {!lastProjectPath && <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>Build an MVP first to publish it.</p>}
              </div>
            ) : (
              <button onClick={connectGithub} className="btn btn-ghost w-full">
                <IconGithub size={15} /> Connect GitHub
              </button>
            )}
          </div>

          {/* Quick Commands */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="eyebrow block mb-3">Quick Commands</span>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_COMMANDS.map(({ label, Icon, cmd }) => (
                <button key={label} onClick={() => handleCommand(cmd)} disabled={isBuilding}
                  className="btn btn-ghost justify-start" style={{ padding: '8px 10px', fontSize: 12 }}>
                  <Icon size={14} /> <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <span className="eyebrow block mb-3">Generated Files · {filesCreated.length}</span>
            {filesCreated.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Files appear here as the agents write them.</p>
            ) : (
              <div className="space-y-0.5">
                {filesCreated.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span style={{ color: 'var(--text-3)' }}><IconFile size={13} /></span>
                    <span className="text-[12px] mono truncate" style={{ color: 'var(--text-2)' }}>{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MAIN PANEL: Pipeline + Console + Command Bar */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Deploy Banner */}
          {deployUrl && (
            <div className="px-6 py-2.5 flex items-center justify-between" style={{ background: 'rgba(52,211,166,0.06)', borderBottom: '1px solid rgba(52,211,166,0.2)' }}>
              <div className="flex items-center gap-2.5">
                <span style={{ color: 'var(--accent)' }}><IconCheckCircle size={16} /></span>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>Deployment live</span>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] mono hover:underline" style={{ color: 'var(--c-build)' }}>
                  {deployUrl}
                </a>
              </div>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 12px' }}>
                Open <IconArrowRight size={14} />
              </a>
            </div>
          )}

          {/* Run / Publish toolbar */}
          {lastProjectPath && (
            <div className="px-6 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-1)' }}>
              <span className="text-[12px] mono truncate mr-auto flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                <IconFolder size={13} /> {lastProjectPath.split(/[\\/]/).filter(Boolean).pop()}
              </span>
              <button onClick={runProject} disabled={isBuilding} className="btn btn-primary" style={{ padding: '7px 12px' }}>
                <IconPlay size={13} /> Run Project
              </button>
              {github.connected && (
                <button onClick={() => setShowPublishModal(true)} disabled={isBuilding} className="btn btn-ghost" style={{ padding: '7px 12px' }}>
                  <IconGithub size={13} /> Publish
                </button>
              )}
            </div>
          )}

          {/* Pipeline + Console */}
          <div className="flex-1 overflow-hidden flex">

            {/* LEFT: Multi-Agent Pipeline */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-w-0">
              <AgentGraph events={buildEvents} active={isBuilding} />

              {isBuilding && (
                <div className="panel flex items-center gap-5 py-6 px-6">
                  <GeneratingLoader label="Working" />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--text)' }}>Agents are building your MVP</div>
                    <div className="text-[12.5px] leading-relaxed max-w-md" style={{ color: 'var(--text-2)' }}>
                      {lastLogMessage || 'Compiling context and orchestrating the agent team.'}
                    </div>
                  </div>
                </div>
              )}

              {!isBuilding && buildEvents.length === 0 && (
                <div className="panel flex flex-col items-center justify-center py-14 px-6 text-center">
                  <span style={{ color: 'var(--accent)' }}><IconSpark size={26} /></span>
                  <div className="text-[13.5px] font-semibold mt-3 mb-1" style={{ color: 'var(--text)' }}>Ready to build</div>
                  <div className="text-[12.5px] max-w-sm" style={{ color: 'var(--text-2)' }}>
                    Pick a quick command, type, or speak your request — the pipeline lights up as each agent works.
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Console / activity log */}
            <div className="w-[380px] shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--line)', background: 'var(--bg-1)' }}>
              <div className="px-4 h-11 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--text-3)' }}><IconTerminal size={14} /></span>
                <span className="eyebrow">Console</span>
                {isBuilding && (
                  <span className="flex items-center gap-1.5 ml-auto">
                    <span className="dot dot-live" />
                    <span className="text-[10px] mono" style={{ color: 'var(--accent)' }}>STREAMING</span>
                  </span>
                )}
              </div>

              <div ref={terminalRef} className="flex-1 overflow-y-auto p-3 mono text-[11.5px] space-y-0.5" style={{ background: 'var(--bg)' }}>
                {buildEvents.length === 0 ? (
                  <div className="pt-4 pl-1" style={{ color: 'var(--text-3)' }}>
                    <span>startupforge:~$</span> <span className="caret" />
                  </div>
                ) : (
                  buildEvents.map((event, i) => {
                    const Icon = EVENT_ICONS[event.type];
                    const color =
                      event.type === 'error' ? 'var(--c-error)' :
                      event.type === 'done' || event.type === 'complete' ? 'var(--accent)' :
                      event.type === 'file_done' ? 'var(--c-build)' :
                      event.type === 'github' ? 'var(--c-plan)' :
                      AGENT_COLORS[event.type] || (event.type === 'agent' ? 'var(--c-plan)' : 'var(--text-2)');
                    return (
                      <div key={i} className="log-line flex items-start gap-2 leading-relaxed">
                        <span className="shrink-0" style={{ color: 'var(--text-3)' }}>
                          {new Date(event.timestamp).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="shrink-0 mt-[1px]" style={{ color }}>{Icon ? <Icon size={12} /> : null}</span>
                        <span className="break-words min-w-0" style={{ color }}>{event.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Command Bar */}
          <div className="p-4" style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-1)' }}>
            <div className="flex gap-2.5 items-center">
              <VoiceInput disabled={isBuilding} onTranscript={(t) => setCustomCommand((c) => (c ? c + ' ' : '') + t)} />
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--line-strong)' }}>
                <span className="shrink-0" style={{ color: 'var(--text-3)' }}><IconTerminal size={16} /></span>
                <input
                  value={customCommand}
                  onChange={e => setCustomCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isBuilding && handleCustomSend()}
                  placeholder="Describe the site you want, or hold the mic to speak…"
                  disabled={isBuilding}
                  className="flex-1 bg-transparent text-[13.5px] focus:outline-none"
                  style={{ color: 'var(--text)' }}
                />
                {isBuilding && <span className="spin shrink-0" style={{ color: 'var(--accent)' }}><IconSpark size={15} /></span>}
              </div>
              <button onClick={handleCustomSend} disabled={isBuilding || !customCommand.trim()} className="btn btn-primary" style={{ height: 44, padding: '0 18px' }}>
                Send <IconSend size={15} />
              </button>
            </div>
            <p className="text-[11px] mono mt-2.5 ml-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
              <IconActivity size={12} /> coordinator → planner → builders (parallel) → critic → fixer · voice by Sarvam AI
            </p>
          </div>
        </div>
      </div>

      {/* Context Modal */}
      {showContext && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: 'rgba(0,0,0,0.72)' }}>
          <div className="panel w-full max-w-3xl max-h-[80vh] flex flex-col" style={{ background: 'var(--bg-1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <IconFile size={16} /> Compiled Business Context
              </h3>
              <button onClick={() => setShowContext(false)} style={{ color: 'var(--text-2)' }}><IconX size={18} /></button>
            </div>
            <pre className="flex-1 overflow-y-auto p-5 text-[12px] mono whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
              {compiledContext || 'No context compiled yet. Click "Compile" in the sidebar.'}
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
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div onClick={e => e.stopPropagation()} className="panel w-full max-w-md p-6" style={{ background: 'var(--bg-1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}><IconGithub size={16} /> Connect GitHub</h3>
          <button onClick={onClose} style={{ color: 'var(--text-2)' }}><IconX size={18} /></button>
        </div>
        <p className="text-[12.5px] mb-3" style={{ color: 'var(--text-2)' }}>
          No OAuth App configured on the server. Paste a{' '}
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=StartupForge" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="hover:underline">
            Personal Access Token
          </a>{' '}with <code className="mono" style={{ color: 'var(--c-build)' }}>repo</code> scope instead.
        </p>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          className="field mb-2"
        />
        {error && <p className="text-[12px] mb-2" style={{ color: 'var(--c-error)' }}>{error}</p>}
        <button onClick={submit} disabled={saving || !token.trim()} className="btn btn-primary w-full">
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
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center z-50 p-6" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div onClick={e => e.stopPropagation()} className="panel w-full max-w-md p-6" style={{ background: 'var(--bg-1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}><IconRocket size={16} /> Publish to GitHub</h3>
          <button onClick={onClose} style={{ color: 'var(--text-2)' }}><IconX size={18} /></button>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: 'var(--text-2)' }}>
          Pushes source to a GitHub repo and publishes the built app live via GitHub Pages.
        </p>
        <label className="label">Repository name</label>
        <input value={repoName} onChange={e => setRepoName(e.target.value)} className="field mb-3" />
        <label className="flex items-center gap-2 mb-4 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Make repository private
        </label>
        <button onClick={() => onPublish(repoName.trim(), isPrivate)} disabled={!repoName.trim()} className="btn btn-primary w-full">
          Publish <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
