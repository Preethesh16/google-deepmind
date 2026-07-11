import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import { useSocket } from '../hooks/useSocket';
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
  gemma: '🧠',
  antigravity: '🤖',
  model: '⚙️',
  file_start: '📝',
  file_done: '✅',
  deploy: '🚀',
  done: '🎉',
  error: '❌',
  complete: '🏁',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { businessId, profile, buildEvents, filesCreated, deployUrl, isBuilding, currentBuildId } = useBusinessStore();
  const { sendBuildCommand, sendFollowUp, triggerDeploy } = useSocket();
  const [customCommand, setCustomCommand] = useState('');
  const [compiledContext, setCompiledContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [lastProjectPath, setLastProjectPath] = useState('');
  const [autoDeploy, setAutoDeploy] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [buildEvents]);

  // Get project path from latest build event
  useEffect(() => {
    const pathEvent = buildEvents.find(e => e.data?.projectPath);
    if (pathEvent?.data?.projectPath) {
      setLastProjectPath(pathEvent.data.projectPath);
    }
  }, [buildEvents]);

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
      alert('Gemma not running! Start with: ollama run gemma4:e2b');
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
            <span className="text-xs text-[#6B7FA3]">Gemma — Local</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6B7FA3] bg-[#0D1526] px-3 py-1.5 rounded-full border border-[rgba(99,102,241,0.2)]">
            🏢 {profile.businessName || 'Your Startup'}
          </span>
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
                Gemma Context
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

          {/* Agent Activity Terminal */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-3 border-b border-[rgba(99,102,241,0.1)] flex items-center gap-3">
              <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider">
                Agent Activity
              </span>
              {isBuilding && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-ping" />
                  <span className="text-xs text-[#6366F1]">Building MVP...</span>
                </div>
              )}
              <span className="ml-auto text-xs text-[#3A4F72]">
                Gemma → Antigravity Pipeline
              </span>
            </div>

            <div ref={terminalRef}
              className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1.5">
              {buildEvents.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[#3A4F72] text-sm mb-2">Ready to build</p>
                  <p className="text-[#2A3F60] text-xs">
                    Select a quick command or type your own below
                  </p>
                  <p className="text-[#6366F1]/50 text-xs mt-6 terminal-cursor" />
                </div>
              ) : (
                buildEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 group">
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
                      event.type === 'gemma' ? 'text-[#8B5CF6]' :
                      'text-[#6B7FA3]'
                    }`}>
                      {event.message}
                    </span>
                  </div>
                ))
              )}
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
                  placeholder="Tell Antigravity what to build or change..."
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
              Context flows: Gemma (local) → Antigravity API → Files written to disk → Auto-deploy
            </p>
          </div>
        </div>
      </div>

      {/* Context Modal */}
      {showContext && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-[#0D1526] rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-[rgba(99,102,241,0.3)]">
            <div className="flex items-center justify-between p-6 border-b border-[rgba(99,102,241,0.15)]">
              <h3 className="text-white font-semibold">🧠 Gemma Compiled Context</h3>
              <button onClick={() => setShowContext(false)} className="text-[#6B7FA3] hover:text-white">✕</button>
            </div>
            <pre className="flex-1 overflow-y-auto p-6 text-xs text-[#6B7FA3] font-mono whitespace-pre-wrap">
              {compiledContext || 'No context compiled yet. Click "Compile ↗" in the sidebar.'}
            </pre>
          </div>
        </div>
      )}
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
