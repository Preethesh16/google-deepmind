import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  Terminal, 
  AlertTriangle, 
  Clock, 
  Users, 
  Activity, 
  DollarSign, 
  FileText, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  Zap, 
  FileLock2, 
  BookOpen, 
  Scale, 
  Palette, 
  Code, 
  CheckSquare, 
  Layers, 
  Cpu, 
  HelpCircle, 
  BarChart3, 
  Settings2,
  FolderDot,
  Send,
  MessageSquare,
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image,
  Instagram,
  Save,
  Check,
  Lock,
  Download,
  SlidersHorizontal,
  Mic,
  Upload
} from 'lucide-react';
import { StartupContext, AgentMessage, ExecutionTask, Conflict } from 'orbit-core';

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface PitchSlide {
  title: string;
  header: string;
  body: string;
}

// Final agent roster — the smart build-and-scale ecosystem.
const DEPT_SEQUENCE = [
  'Research', 'Finance', 'Marketing', 'Creative', 'Deck', 'Code', 'Conflict'
];

export default function App() {
  const [workspaceId, setWorkspaceId] = useState('default-workspace');
  const [objective, setObjective] = useState('');
  const [context, setContext] = useState<StartupContext | null>(null);
  const [tasks, setTasks] = useState<ExecutionTask[]>([]);
  const [logs, setLogs] = useState<AgentMessage[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [vaultEntries, setVaultEntries] = useState<any[]>([]);
  
  // Navigation & States
  const [hasIdeaLaunched, setHasIdeaLaunched] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | string>('overview');

  // Vault Form State
  const [vaultKeyType, setVaultKeyType] = useState('bank_account');
  const [vaultPayload, setVaultPayload] = useState('');

  // Department Chatbot State mapping
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Marketing Studio (real Nano Banana + Veo)
  const [bananaImages, setBananaImages] = useState<Array<{ type: string; prompt: string }>>([]);
  const [isGeneratingBanana, setIsGeneratingBanana] = useState(false);
  const [posterPrompt, setPosterPrompt] = useState('');
  const [posterUrls, setPosterUrls] = useState<string[]>([]);
  const [isGeneratingAd, setIsGeneratingAd] = useState(false);
  const [adKit, setAdKit] = useState<any>(null);

  // Creative Agent (captions + voiceover)
  const [captionProduct, setCaptionProduct] = useState('');
  const [captionLanguage, setCaptionLanguage] = useState('English');
  const [captionResult, setCaptionResult] = useState<any>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [voUrl, setVoUrl] = useState('');
  const [isGeneratingVo, setIsGeneratingVo] = useState(false);

  // Deck Agent (real PPTX)
  const [deckFocus, setDeckFocus] = useState('');
  const [deckResult, setDeckResult] = useState<any>(null);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);

  // Context upload
  const [uploadStatus, setUploadStatus] = useState('');
  const [instaUsername, setInstaUsername] = useState('');
  const [instaStatus, setInstaStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Branding Pitch Deck Slide Stack
  const [pitchSlides, setPitchSlides] = useState<PitchSlide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isDeckGenerated, setIsDeckGenerated] = useState(false);
  const [slideEditingText, setSlideEditingText] = useState('');
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Validation department custom questionnaire inputs
  const [validationBudget, setValidationBudget] = useState('');
  const [validationIdeaText, setValidationIdeaText] = useState('');
  const [validationFinStage, setValidationFinStage] = useState('Bootstrapped');
  const [isSavingValidationInputs, setIsSavingValidationInputs] = useState(false);

  // Budget Refiner
  const [budgetRefinePrompt, setBudgetRefinePrompt] = useState('');
  const [isRefiningBudget, setIsRefiningBudget] = useState(false);
  const [inputCompanyName, setInputCompanyName] = useState('');

  // Progressive flow completion state
  const [isCompletingStage, setIsCompletingStage] = useState(false);

  // Fetch current state
  const fetchData = async () => {
    try {
      const contextRes = await fetch(`/api/context?workspaceId=${workspaceId}`);
      if (contextRes.ok) {
        const ctxData = await contextRes.json();
        setContext(ctxData);
        
        // Auto-detect if workspace has an active idea launched
        if (ctxData.founderProfile.vision && ctxData.founderProfile.vision !== 'A simple SaaS platform') {
          setHasIdeaLaunched(true);
        }
      }

      const tasksRes = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      const conflictsRes = await fetch('/api/conflicts');
      if (conflictsRes.ok) {
        const conflictsData = await conflictsRes.json();
        setConflicts(conflictsData);
      }

      const vaultRes = await fetch('/api/vault');
      if (vaultRes.ok) {
        const vaultData = await vaultRes.json();
        setVaultEntries(vaultData);
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [workspaceId]);

  // Prepopulate agent chat welcome messages
  useEffect(() => {
    if (activeView !== 'overview') {
      const existingHistory = chatHistories[activeView];
      if (!existingHistory) {
        let welcomeText = `Welcome to the **${activeView} Department**. I have loaded our active startup context. Ask me anything about our plans, deliverables, or strategy!`;
        if (activeView === 'Validation') {
          welcomeText = `Welcome to the **Validation Department**. Let's review our PMF and feasibility metrics. To proceed, please enter your Budget, target description, and exact Financial Stage in the right-side configuration board.`;
        }
        setChatHistories(prev => ({
          ...prev,
          [activeView]: [
            {
              sender: 'agent',
              text: welcomeText,
              timestamp: new Date().toLocaleTimeString()
            }
          ]
        }));
      }
    }
  }, [activeView]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, activeView]);

  // Load saved pitch deck when entering Brand stage
  useEffect(() => {
    if (activeView === 'Brand') {
      fetch(`/api/brand/pitchdeck?workspaceId=${workspaceId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load');
        })
        .then(data => {
          if (data.pitchDeck && data.pitchDeck.length > 0) {
            setPitchSlides(data.pitchDeck);
            setIsDeckGenerated(true);
            setActiveSlideIdx(0);
            setSlideEditingText(data.pitchDeck[0].body);
          }
        })
        .catch(err => console.error('Error loading pitch deck:', err));
    }
  }, [activeView, workspaceId]);

  // Submit dynamic trigger from onboarding portal
  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    try {
      const res = await fetch('/api/execution/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, objective, companyName: inputCompanyName })
      });
      if (res.ok) {
        setHasIdeaLaunched(true);
        setActiveView('Research'); // Automatically route to Research Agent view
        setObjective('');
        setInputCompanyName('');
        fetchData();
      }
    } catch (err) {
      console.error('Error triggering execution loop', err);
    }
  };

  // Complete department and unlock next
  const handleCompleteDepartment = async () => {
    if (isCompletingStage || activeView === 'overview') return;
    setIsCompletingStage(true);

    try {
      const res = await fetch('/api/context/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, currentDepartment: activeView })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Switch client view to next unlocked department
        setActiveView(data.nextDepartment);
        fetchData();
      }
    } catch (err) {
      console.error('Error completing department', err);
    } finally {
      setIsCompletingStage(false);
    }
  };

  // Save Validation Questionnaire Inputs
  const handleSaveValidationInputs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationBudget.trim()) return;
    setIsSavingValidationInputs(true);

    // Feed context to chat thread
    const userMsg = `Budget target: ${validationBudget} | Building: ${validationIdeaText} | Stage: ${validationFinStage}`;
    const newMsg: ChatMessage = {
      sender: 'user',
      text: userMsg,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistories(prev => ({
      ...prev,
      Validation: [...(prev[prev.Validation ? 'Validation' : 'Validation'] || []), newMsg]
    }));

    try {
      // Send chat context update
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: 'Validation', message: userMsg, workspaceId })
      });
      
      if (res.ok) {
        const data = await res.json();
        const agentMsg: ChatMessage = {
          sender: 'agent',
          text: data.response,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistories(prev => ({
          ...prev,
          Validation: [...(prev.Validation || []), agentMsg]
        }));
      }

      // Automatically trigger a Finance budget optimization logic behind the scenes
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: 'Finance', message: `My budget is ${validationBudget}`, workspaceId })
      });
      
      fetchData();
    } catch (err) {
      console.error('Error validation details update:', err);
    } finally {
      setIsSavingValidationInputs(false);
    }
  };

  // Refine budget via AI
  const handleRefineBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetRefinePrompt.trim() || isRefiningBudget) return;
    setIsRefiningBudget(true);

    // Append to finance chat
    const userMsg = `Refine budget: ${budgetRefinePrompt}`;
    setChatHistories(prev => ({
      ...prev,
      Finance: [...(prev.Finance || []), {
        sender: 'user',
        text: userMsg,
        timestamp: new Date().toLocaleTimeString()
      }]
    }));

    try {
      const res = await fetch('/api/finance/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, prompt: budgetRefinePrompt })
      });
      
      if (res.ok) {
        const data = await res.json();
        setContext(data.context);
        setBudgetRefinePrompt('');
        
        // Append response
        setChatHistories(prev => ({
          ...prev,
          Finance: [...(prev.Finance || []), {
            sender: 'agent',
            text: `Budget refinement processed successfully:
- Updated Runway: **${data.context.financials.runwayMonths} Months**
- Updated burn rate: **$${data.context.financials.burnRate}/mo**
- Updated Infra cost: **$${data.context.financials.infrastructureCost}/mo**`,
            timestamp: new Date().toLocaleTimeString()
          }]
        }));
      }
    } catch (err) {
      console.error('Error refining budget:', err);
    } finally {
      setIsRefiningBudget(false);
    }
  };

  // Submit local secure vault entry
  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultPayload.trim()) return;

    try {
      const entryId = 'vault-' + Math.random().toString(36).substring(7);
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, keyType: vaultKeyType, encryptedPayload: vaultPayload })
      });
      if (res.ok) {
        setVaultPayload('');
        fetchData();
      }
    } catch (err) {
      console.error('Error saving to vault', err);
    }
  };

  // Resolve active conflict
  const handleConflictResolve = async (conflictId: string, resolution: string) => {
    try {
      const res = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, resolution })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error resolving conflict', err);
    }
  };

  // Chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    const newMsg: ChatMessage = {
      sender: 'user',
      text: userMsg,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistories(prev => ({
      ...prev,
      [activeView]: [...(prev[activeView] || []), newMsg]
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: activeView, message: userMsg, workspaceId })
      });
      
      if (res.ok) {
        const data = await res.json();
        const agentMsg: ChatMessage = {
          sender: 'agent',
          text: data.response,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistories(prev => ({
          ...prev,
          [activeView]: [...(prev[activeView] || []), agentMsg]
        }));
      }
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── REAL Nano Banana poster generation (multiple options) ──
  const triggerNanoBanana = async () => {
    if (!posterPrompt.trim()) return;
    setIsGeneratingBanana(true);
    setPosterUrls([]);
    try {
      const res = await fetch('/api/marketing/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: posterPrompt, count: 2, workspaceId })
      });
      const data = await res.json();
      if (res.ok) setPosterUrls((data.options || []).map((o: any) => o.url));
    } catch (err) {
      console.error('Poster generation error', err);
    } finally {
      setIsGeneratingBanana(false);
    }
  };

  // ── REAL Veo ad-video kit (falls back to storyboard) ──
  const triggerAdKit = async () => {
    if (!posterPrompt.trim()) return;
    setIsGeneratingAd(true);
    setAdKit(null);
    try {
      const res = await fetch('/api/marketing/adkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: posterPrompt, workspaceId })
      });
      if (res.ok) setAdKit(await res.json());
    } catch (err) {
      console.error('Ad kit error', err);
    } finally {
      setIsGeneratingAd(false);
    }
  };

  // ── Caption & Voice Agent handlers ──
  const generateCaptions = async () => {
    if (!captionProduct.trim()) return;
    setIsGeneratingCaptions(true);
    setCaptionResult(null);
    try {
      const res = await fetch('/api/creative/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: captionProduct, platform: 'Instagram', language: captionLanguage, workspaceId })
      });
      if (res.ok) setCaptionResult(await res.json());
    } catch (err) {
      console.error('Caption error', err);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const generateVoiceover = async (text: string) => {
    if (!text.trim()) return;
    setIsGeneratingVo(true);
    setVoUrl('');
    try {
      const res = await fetch('/api/creative/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (res.ok) setVoUrl(data.url);
    } catch (err) {
      console.error('Voiceover error', err);
    } finally {
      setIsGeneratingVo(false);
    }
  };

  // ── Pitch Deck Agent: real PPTX from live agent context ──
  const generateRealDeck = async () => {
    setIsGeneratingDeck(true);
    setDeckResult(null);
    try {
      const res = await fetch('/api/deck/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, focus: deckFocus })
      });
      if (res.ok) setDeckResult(await res.json());
    } catch (err) {
      console.error('Deck error', err);
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // ── Code section: hand off to Ashish's Antigravity build system ──
  // Set ANTIGRAVITY_URL to his app's address once it ships; until then the
  // request is logged into shared agent memory and the page refreshes.
  const ANTIGRAVITY_URL = ''; // e.g. 'http://localhost:4000/'
  const handleMvpAction = async (action: 'build' | 'fix') => {
    if (action === 'build') {
      try {
        await fetch('/api/launch-startupforge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Failed to launch StartupForge', err);
      }
      return;
    }

    try {
      await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'mvp-' + Math.random().toString(36).substring(7),
          keyType: 'mvp_fix_request',
          encryptedPayload: `Fix MVP requested from Code section`
        })
      });
    } catch (err) {
      console.error('MVP action log failed', err);
    }
    if (ANTIGRAVITY_URL) window.location.href = ANTIGRAVITY_URL;
    else window.location.reload();
  };

  // ── Context file upload → shared agent memory ──
  const handleContextFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('Uploading & summarizing...');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/context/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, content: reader.result, workspaceId })
        });
        const data = await res.json();
        setUploadStatus(res.ok ? `✓ ${file.name} ingested — agents now know: ${String(data.summary || '').slice(0, 120)}...` : 'Upload failed');
      } catch {
        setUploadStatus('Upload failed');
      }
    };
    // Text files as text (so agents can read), everything else as data URL
    if (file.type.startsWith('text') || /\.(txt|md|csv|json)$/i.test(file.name)) reader.readAsText(file);
    else reader.readAsDataURL(file);
  };

  // Instagram account hook
  const handleConnectInsta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instaUsername.trim()) return;
    setInstaStatus('connecting');
    setTimeout(() => {
      setInstaStatus('connected');
    }, 1500);
  };

  // Pitch Deck Builder
  const generatePitchDeck = async () => {
    if (!context) return;
    const slides: PitchSlide[] = [
      {
        title: 'Cover Slide',
        header: context.companyName,
        body: `Empowering ${context.business.targetMarket} through context-aware local intelligence. Built on the custom ${context.business.niche} framework.`
      },
      {
        title: 'The Problem',
        header: 'Manual Overhead and Information Loss',
        body: `Traditional businesses in ${context.business.niche} face severe task synchronization blocks, excessive manual coordination costs, and operational safety gaps.`
      },
      {
        title: 'The Solution',
        header: 'Orbit Autonomous Loop Orchestration',
        body: `An AI company working continuously inside local secure vaults. Coordinates Operations, Research, Finance, Brand, Design, Engineering, QA, and Marketing loops without human delays.`
      },
      {
        title: 'Market Opportunity',
        header: `TAM: ${context.business.tam || '$4.5 Billion'} / SAM: ${context.business.sam || '$820 Million'}`,
        body: `Targeting B2B operators within the ${context.business.niche} sector. Reaching +15.4% annual CAGR expansion indexes.`
      },
      {
        title: 'Business Model',
        header: 'Scalable B2B SaaS Tiers',
        body: `Proposing monthly subscription slots from $29/mo (entry validations) up to $199/mo (full code branch deployments and Stitch canvas integrations).`
      }
    ];

    setPitchSlides(slides);
    setActiveSlideIdx(0);
    setSlideEditingText(slides[0].body);
    setIsDeckGenerated(true);

    try {
      await fetch('/api/brand/pitchdeck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, pitchDeck: slides })
      });
    } catch (err) {
      console.error('Error saving generated pitch deck:', err);
    }
  };

  const handleSlideSelect = (idx: number) => {
    setActiveSlideIdx(idx);
    setSlideEditingText(pitchSlides[idx].body);
  };

  const handleSaveSlideText = async () => {
    const updated = [...pitchSlides];
    updated[activeSlideIdx].body = slideEditingText;
    setPitchSlides(updated);
    
    // Save to simulated context
    if (context) {
      const updatedCtx = { ...context };
      updatedCtx.marketing.brandVoice += ` | Updated slide: ${slideEditingText.substring(0, 30)}...`;
      setContext(updatedCtx);
    }

    try {
      await fetch('/api/brand/pitchdeck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, pitchDeck: updated })
      });
      setShowSavedNotification(true);
    } catch (err) {
      console.error('Error saving updated slide:', err);
    }
    setTimeout(() => setShowSavedNotification(false), 2000);
  };

  // Helper: Verify if department is unlocked under progression
  const isDeptUnlocked = (deptName: string) => {
    if (!context) return true;
    const activeStageIndex = DEPT_SEQUENCE.findIndex(d => d.toLowerCase() === context.business.stage.toLowerCase());
    const targetDeptIndex = DEPT_SEQUENCE.findIndex(d => d.toLowerCase() === deptName.toLowerCase());
    
    if (activeStageIndex === -1 || targetDeptIndex === -1) return true;
    return targetDeptIndex <= activeStageIndex;
  };

  // Get active status color for department nodes
  const getDeptStatus = (deptName: string) => {
    const activeTask = tasks.find(t => t.department.toLowerCase() === deptName.toLowerCase());
    if (!activeTask) return 'idle';
    return activeTask.status;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'inprogress':
        return 'bg-amber-100 text-amber-800 border border-amber-200/60 animate-pulse';
      case 'completed':
        return 'bg-emerald-100 text-emerald-850 border border-emerald-200/60';
      case 'failed':
        return 'bg-rose-100 text-rose-800 border border-rose-200/60';
      default:
        return 'bg-stone-200/60 text-stone-600 border border-stone-300/30';
    }
  };

  // Final roster: every agent here is real (Gemini-powered) except Code,
  // which is the integration point for Ashish's Antigravity track.
  const departmentsList = [
    { name: 'Research', icon: BookOpen, color: 'from-[#a53600] to-[#cc490e]', description: 'REAL market research via live Google Search: sizes, competitors, prices.' },
    { name: 'Finance', icon: DollarSign, color: 'from-[#a53600] to-[#cc490e]', description: 'Financial support: runway, unit economics, pricing, funding options.' },
    { name: 'Marketing', icon: Zap, color: 'from-[#a53600] to-[#cc490e]', description: 'Growth strategy + Nano Banana poster studio + Veo ad videos.' },
    { name: 'Creative', icon: Mic, color: 'from-[#a53600] to-[#cc490e]', description: 'Captions in any language + real TTS voiceovers for your ads.' },
    { name: 'Deck', icon: FileText, color: 'from-[#a53600] to-[#cc490e]', description: 'Investor pitch deck built from live agent context, exported as PPTX.' },
    { name: 'Code', icon: Code, color: 'from-[#a53600] to-[#cc490e]', description: 'Code support — Antigravity integration (Ashish\'s track, coming soon).' },
    { name: 'Conflict', icon: Settings2, color: 'from-[#a53600] to-[#cc490e]', description: 'Mediates department contradictions, outputs compromise logs.' }
  ];

  /* ----------------- RENDER ONBOARDING SCREEN ----------------- */
  if (!hasIdeaLaunched) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#fff8f6] overflow-hidden text-stone-850 px-4">
        {/* Soft warm gold background lights */}
        <div className="glow-orb w-[700px] h-[700px] bg-amber-100/30 top-[-300px] left-[-300px]" />
        <div className="glow-orb w-[600px] h-[600px] bg-orange-100/20 bottom-[-300px] right-[-300px]" />

        <div className="w-full max-w-xl z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#a53600] to-[#cc490e] text-[#fff8f6] shadow-[0_4px_20px_rgba(165,54,0,0.15)]">
              <FolderDot className="w-8 h-8" />
            </div>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 font-outfit mb-3">
            Orbit Autonomous Loop
          </h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-mono mb-8">
            The Autonomous Founder Operating System
          </p>

          <div className="glass-panel rounded-2xl p-6 shadow-2xl bg-white/70">
            <form onSubmit={handleLaunch} className="flex flex-col gap-4">
              <div>
                <label className="block text-left text-xs text-stone-600 font-mono mb-2 uppercase tracking-wider">Startup Name</label>
                <input 
                  type="text"
                  value={inputCompanyName}
                  onChange={(e) => setInputCompanyName(e.target.value)}
                  placeholder="e.g. AgriGrow"
                  className="w-full px-4 py-2 text-sm text-stone-850 rounded-xl bg-[#fff1ec] border border-stone-200 focus:outline-none focus:border-[#a53600] placeholder:text-stone-400 font-sans mb-1"
                  required
                />
              </div>

              <div>
                <label className="block text-left text-xs text-stone-600 font-mono mb-2 uppercase tracking-wider">Startup Vision / Idea</label>
                <textarea 
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe your product idea... (e.g. 'Build an automated CRM system for organic farms')"
                  className="w-full h-24 p-4 text-sm text-stone-850 rounded-xl bg-[#fff1ec] border border-stone-200 focus:outline-none focus:border-[#a53600] placeholder:text-stone-400 resize-none font-sans leading-relaxed focus:shadow-[0_0_20px_rgba(165,54,0,0.06)]"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#a53600] to-[#cc490e] hover:from-[#812800] hover:to-[#a53600] rounded-xl transition duration-200 shadow-[0_4px_25px_rgba(165,54,0,0.12)]"
              >
                <span>Let's Ideate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          
          <p className="text-[10px] text-stone-500 mt-6 font-mono">
            Orbit compiles code, generates design tokens, maps legal compliances, and tracks runways local first.
          </p>
        </div>
      </div>
    );
  }

  /* ----------------- RENDER MAIN APP LAYOUT ----------------- */
  return (
    <div className="flex min-h-screen bg-[#fff8f6] text-stone-800 font-sans">
      
      {/* Soft Gold Orbs */}
      <div className="glow-orb w-[600px] h-[600px] bg-amber-100/30 top-[-200px] left-[-200px]" />
      <div className="glow-orb w-[500px] h-[500px] bg-orange-100/20 bottom-[-200px] right-[-200px]" />

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-stone-200/80 bg-[#fff8f6]/60 backdrop-blur-xl shrink-0 flex flex-col z-20">
        
        {/* Workspace Brand Box */}
        <div className="p-5 border-b border-stone-200/85 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#a53600] to-[#cc490e] text-white shadow-sm">
            <FolderDot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-stone-900 font-outfit">Orbit</h1>
            <span className="text-[9px] text-stone-500 tracking-wider font-mono">FOUNDER COMPANION</span>
          </div>
        </div>

        {/* Workspace Selection */}
        <div className="p-4 border-b border-stone-200/85">
          <label className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1.5 font-mono">Workspace</label>
          <select 
            value={workspaceId} 
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs text-stone-800 rounded-lg bg-white border border-stone-200 focus:outline-none focus:border-[#a53600]"
          >
            <option value="default-workspace">Acme Analytics (Active)</option>
            <option value="workspace-2">Delta Delivery (Stage: GTM)</option>
          </select>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          <div>
            <span className="block text-[9px] text-stone-500 uppercase tracking-widest font-mono mb-2">Core Dashboard</span>
            <button 
              onClick={() => setActiveView('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeView === 'overview' 
                  ? 'bg-[#a53600]/10 text-[#a53600] border border-[#a53600]/15 font-semibold shadow-[0_2px_10px_rgba(165,54,0,0.04)]' 
                  : 'text-stone-600 hover:text-stone-800 hover:bg-[#a53600]/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Mission Control</span>
            </button>
          </div>

          <div>
            <span className="block text-[9px] text-stone-500 uppercase tracking-widest font-mono mb-2">AI Departments</span>
            <div className="flex flex-col gap-1">
              {departmentsList.map((dept, index) => {
                const status = getDeptStatus(dept.name);
                const isSelected = activeView === dept.name;
                const unlocked = isDeptUnlocked(dept.name);
                
                return (
                  <button 
                    key={index}
                    onClick={() => unlocked && setActiveView(dept.name)}
                    disabled={!unlocked}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                      isSelected 
                        ? 'bg-[#a53600]/10 text-[#a53600] border border-[#a53600]/15 font-semibold' 
                        : unlocked
                        ? 'text-stone-600 hover:text-stone-800 hover:bg-[#a53600]/5'
                        : 'text-stone-400 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {unlocked ? (
                        <dept.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#a53600]' : 'text-stone-500'}`} />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-stone-400" />
                      )}
                      <span>{dept.name}</span>
                    </div>
                    {unlocked && status === 'inprogress' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a53600] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Global Health Status */}
        <div className="p-4 border-t border-stone-200/80 bg-[#fff8f6]/60 text-[9px] font-mono text-stone-500 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GEMMA SECURE CORE: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GEMINI AGENT SYSTEM: ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* TOP BAR STATUS */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-stone-200/80 bg-[#fff8f6]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight font-outfit text-stone-800">
              {activeView === 'overview' ? 'Mission Control Hub' : `${activeView} Department Profile`}
            </h2>
            <span className="text-[10px] text-[#a53600] px-2 py-0.5 bg-[#a53600]/5 rounded border border-[#a53600]/15 font-mono">
              STAGE: {context?.business.stage.toUpperCase() || 'RESEARCH'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-stone-500">Startup Name:</span>
            <span className="font-bold text-stone-850 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
              {context?.companyName || 'Acme Analytics'}
            </span>
          </div>
        </header>

        {/* MAIN BODY: VIEW SWITCHER */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {activeView === 'overview' ? (
            /* MISSION CONTROL GENERAL OVERVIEW */
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              
              {/* Left Side: Idea Submission & Vault */}
              <div className="xl:col-span-1 flex flex-col gap-6">
                
                {/* Submit Objective Form */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-[#a53600]" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Mission Control</h3>
                  </div>
                  
                  <form onSubmit={handleLaunch} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] text-stone-500 uppercase tracking-wider mb-1.5 font-mono">Founder Vision Statement</label>
                      <textarea 
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Describe your product idea... (e.g. 'Build an automated CRM system for organic farms')"
                        className="w-full h-28 p-3 text-xs text-stone-800 rounded-xl bg-[#fff1ec] border border-stone-200 focus:outline-none focus:border-[#a53600] placeholder:text-stone-400 resize-none font-sans"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#a53600] to-[#cc490e] hover:from-[#812800] hover:to-[#a53600] rounded-xl transition duration-200 shadow-sm"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Launch AI Company</span>
                    </button>
                  </form>
                </div>

                {/* Gemma Vault */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70">
                  <div className="flex items-center gap-2 mb-3">
                    <FileLock2 className="w-5 h-5 text-stone-700" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Gemma Secure Vault</h3>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
                    Inputs saved here are local. Only derived calculations leave Gemma.
                  </p>

                  <form onSubmit={handleVaultSubmit} className="flex flex-col gap-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={vaultKeyType} 
                        onChange={(e) => setVaultKeyType(e.target.value)}
                        className="px-2 py-1 text-[11px] text-stone-700 rounded bg-white border border-stone-200"
                      >
                        <option value="bank_account">Bank Token</option>
                        <option value="api_credential">OAuth Secret</option>
                        <option value="passport">Identity Doc</option>
                      </select>
                      <input 
                        type="password"
                        value={vaultPayload}
                        onChange={(e) => setVaultPayload(e.target.value)}
                        placeholder="Enter secret..."
                        className="px-2 py-1 text-[11px] text-stone-800 rounded bg-white border border-stone-200 focus:outline-none focus:border-[#a53600]"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-1.5 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded"
                    >
                      Save Secure Key
                    </button>
                  </form>

                  <div className="max-h-36 overflow-y-auto flex flex-col gap-2">
                    {vaultEntries.length === 0 ? (
                      <p className="text-[10px] text-stone-400 italic">No credentials logged.</p>
                    ) : (
                      vaultEntries.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 text-[10px]">
                          <span className="font-mono text-[#a53600]">{e.key_type}</span>
                          <span className="text-stone-500">Securely Vaulted</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Context document upload — every agent gets the extracted facts */}
                  <div className="border-t border-stone-200/80 pt-3 mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#a53600]" />
                      <span className="text-[10px] font-bold text-stone-700 font-outfit">Upload business context</span>
                    </div>
                    <p className="text-[9px] text-stone-500 leading-relaxed">Invoices, ITRs, plans (txt/md/csv/pdf). Summarized locally — all agents get the facts, never the raw file.</p>
                    <label className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded cursor-pointer transition">
                      <Upload className="w-3 h-3" />
                      <span>Choose file to ingest</span>
                      <input type="file" onChange={handleContextFile} className="hidden" accept=".txt,.md,.csv,.json,.pdf" />
                    </label>
                    {uploadStatus && <p className="text-[9px] text-emerald-700 font-mono leading-relaxed">{uploadStatus}</p>}
                  </div>
                </div>
              </div>

              {/* Center Panel: Org chart & Timeline */}
              <div className="xl:col-span-2 flex flex-col gap-6">
                
                {/* Org Chart Grid */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-stone-700" />
                    <h3 className="font-semibold text-stone-800 font-outfit">AI Department Organization</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {departmentsList.map((dept, idx) => {
                      const status = getDeptStatus(dept.name);
                      const unlocked = isDeptUnlocked(dept.name);
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => unlocked && setActiveView(dept.name)}
                          className={`cursor-pointer group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                            !unlocked
                              ? 'border-stone-200/40 bg-stone-200/10 opacity-30 cursor-not-allowed'
                              : status === 'inprogress' 
                              ? 'border-[#a53600]/40 bg-[#a53600]/5 shadow-[0_2px_15px_rgba(165,54,0,0.06)]' 
                              : status === 'completed' 
                              ? 'border-emerald-250 bg-emerald-50/20'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${dept.color} text-[#fff8f6] mb-2`}>
                            {unlocked ? <dept.icon className="w-4 h-4" /> : <Lock className="w-4 h-4 text-stone-400" />}
                          </div>
                          <span className="text-xs font-medium text-stone-700 group-hover:text-[#a53600] transition">{dept.name}</span>
                          <span className={`text-[9px] uppercase mt-1 px-1.5 py-0.5 rounded font-mono ${getStatusBadgeClass(status)}`}>
                            {unlocked ? status : 'locked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Task Graph */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Active Execution Graph</h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-stone-500 text-xs italic">
                        <Activity className="w-8 h-8 mb-2 opacity-30 animate-spin" />
                        <span>No active tasks. Describe your vision to launch Orbit.</span>
                      </div>
                    ) : (
                      tasks.map((task, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 text-xs">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${
                              task.status === 'inprogress' ? 'bg-[#a53600]' : task.status === 'completed' ? 'bg-emerald-600' : 'bg-stone-400'
                            }`} />
                            <div>
                              <h4 className="font-semibold text-stone-800">{task.title}</h4>
                              <span className="text-[10px] text-stone-500 font-mono">Dept: {task.department} | Impact: ${task.costImpact}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-stone-500">Confidence: {task.confidenceScore}%</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${getStatusBadgeClass(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Logs and Terminal */}
              <div className="xl:col-span-1 flex flex-col gap-6">
                
                {/* Agent Pub/Sub timeline */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm h-[320px] flex flex-col bg-white/70">
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Activity className="w-5 h-5 text-[#a53600]" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Agent Pub/Sub Logs</h3>
                  </div>

                  <div className="flex-grow overflow-y-auto flex flex-col gap-3 pr-1">
                    {logs.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No communication logs.</p>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] font-sans">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#a53600] uppercase tracking-wider text-[10px]">{log.sender}</span>
                            <span className="text-[9px] text-stone-400 font-mono">{log.action}</span>
                          </div>
                          <p className="text-stone-600 leading-snug">{log.payload.title || JSON.stringify(log.payload)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Developer build terminal */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm h-[280px] flex flex-col bg-white/80 border-stone-200">
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Terminal className="w-5 h-5 text-stone-750" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Developer Console</h3>
                  </div>

                  <div className="flex-grow overflow-y-auto bg-stone-900 rounded-xl p-3 border border-stone-850 font-mono text-[10px] text-stone-200 flex flex-col gap-1.5 scrollbar-thin">
                    {context?.technical.buildLogs.length === 0 ? (
                      <span className="text-stone-500 italic">No build output. Ready to assemble.</span>
                    ) : (
                      context?.technical.buildLogs.map((logLine, idx) => (
                        <div key={idx} className="leading-relaxed border-l border-stone-500/20 pl-2">
                          {logLine}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom widgets: Financial runway & Conflict Resolution */}
              <div className="xl:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Projections */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#a53600]" />
                      <h3 className="font-semibold text-stone-800 font-outfit">Financial Projections</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase">Cash Runway</span>
                      <span className="text-xl font-bold font-outfit text-[#a53600]">{context?.financials.runwayMonths || 12} Months</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase">Monthly Burn</span>
                      <span className="text-xl font-bold font-outfit text-stone-700">${context?.financials.burnRate || 1500}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Stitch Cloud Infra:</span>
                      <span className="text-stone-700">${context?.financials.infrastructureCost || 150}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Gemini/Gemma Subscriptions:</span>
                      <span className="text-stone-700">${context?.financials.subscriptionCost || 80}</span>
                    </div>
                  </div>
                </div>

                {/* Conflict Center */}
                <div className="glass-panel rounded-2xl p-5 shadow-sm bg-white/70 col-span-1 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-[#a53600] animate-pulse" />
                    <h3 className="font-semibold text-stone-800 font-outfit">Conflict Resolution Center</h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {conflicts.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-4">No disputes detected between agents. Continuous loop running smoothly.</p>
                    ) : (
                      conflicts.map((conflict, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-[#a53600]/20 bg-[#a53600]/5 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-[#a53600] font-outfit">{conflict.topic}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                              conflict.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#a53600]/10 text-[#a53600]'
                            }`}>
                              {conflict.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="p-2.5 rounded bg-white border border-stone-200">
                              <span className="font-bold text-stone-500 text-[10px] uppercase block mb-1">{conflict.partyA} Argument</span>
                              <p className="text-stone-600 leading-relaxed text-[11px]">{conflict.argumentsA}</p>
                            </div>
                            <div className="p-2.5 rounded bg-white border border-stone-200">
                              <span className="font-bold text-stone-500 text-[10px] uppercase block mb-1">{conflict.partyB} Argument</span>
                              <p className="text-stone-600 leading-relaxed text-[11px]">{conflict.argumentsB}</p>
                            </div>
                          </div>

                          {conflict.status === 'active' ? (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleConflictResolve(conflict.id, `Approved argument by ${conflict.partyA}`)}
                                className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 rounded text-[11px]"
                              >
                                Approve Legal GDPR Rule
                              </button>
                              <button 
                                onClick={() => handleConflictResolve(conflict.id, `Approved argument by ${conflict.partyB}`)}
                                className="px-3 py-1.5 bg-[#a53600] text-white hover:bg-[#812800] font-semibold rounded text-[11px]"
                              >
                                Approve GTM Fast Signup
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-stone-500 italic mt-1.5 border-t border-stone-200 pt-1.5">
                              <strong>Resolution:</strong> {conflict.resolution}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* INDIVIDUAL DEPARTMENT VIEWS (CHATBOT + SPECIALIZED WIDGETS) */
            /* REDESIGNED CHATBOT: WIDER AND MORE SPACIOUS (65% width vs 35% width for widgets) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
              
              {/* LEFT COL — CODE VIEW: no chatbot, just the two MVP actions
                  that hand off to Ashish's Antigravity app */}
              {activeView === 'Code' ? (
              <div className="lg:col-span-8 glass-panel rounded-2xl p-10 shadow-2xl flex flex-col items-center justify-center gap-8 h-[600px] bg-white/70 border-stone-200/70 text-center">
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#a53600] to-[#cc490e] text-white shadow-[0_4px_20px_rgba(165,54,0,0.2)]">
                  <Code className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="font-bold text-stone-900 font-outfit text-xl">Ship your product</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    The Code agents build your MVP from everything the other agents already know — or fix the software you already have.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                  <button
                    type="button"
                    onClick={() => handleMvpAction('build')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-white bg-gradient-to-r from-[#a53600] to-[#cc490e] hover:from-[#812800] hover:to-[#a53600] rounded-xl transition shadow-xl shadow-[#a53600]/25 active:scale-95"
                  >
                    <Play className="w-4 h-4" />
                    <span>StartupForge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMvpAction('fix')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-[#a53600] bg-white border-2 border-[#a53600]/30 hover:border-[#a53600] hover:bg-[#a53600]/5 rounded-xl transition active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Fix your MVP software</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 font-mono">Hands off to the Antigravity build system (Ashish's track)</p>
              </div>
              ) : (
              <div className="lg:col-span-8 glass-panel rounded-2xl p-5 shadow-2xl flex flex-col h-[600px] bg-white/70 border-stone-200/70">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-4 mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#a53600] to-[#cc490e] text-white shadow-[0_2px_10px_rgba(165,54,0,0.1)]">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 font-outfit text-sm tracking-wide">{activeView} Agent</h3>
                      <span className="text-[9px] text-[#a53600] font-mono tracking-widest uppercase font-bold">Autonomous Context Memory active</span>
                    </div>
                  </div>

                  {/* PROGRESSIVE UNLOCK COMPLETE BUTTON */}
                  <button 
                    onClick={handleCompleteDepartment}
                    disabled={isCompletingStage}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-lg transition disabled:opacity-50"
                  >
                    {isCompletingStage ? (
                      <span>Unlocking...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Complete Department & Unlock Next</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Message logs */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 mb-4 scrollbar-thin">
                  {(chatHistories[activeView] || []).map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[90%] ${
                        msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <span className="text-[9px] text-stone-500 mb-1 font-mono">{msg.timestamp}</span>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans shadow-sm border ${
                        msg.sender === 'user' 
                          ? 'bg-[#a53600]/10 text-stone-850 border-[#a53600]/20' 
                          : 'bg-[#fff1ec]/95 text-stone-800 border-stone-200'
                      }`}>
                        {/* Markdown simple parser */}
                        {msg.text.split('\n').map((line, lIdx) => {
                          if (line.startsWith('### ')) {
                            return <h4 key={lIdx} className="font-bold text-stone-950 text-xs mb-1.5 mt-2 font-outfit">{line.replace('### ', '')}</h4>;
                          }
                          if (line.startsWith('- ')) {
                            return <li key={lIdx} className="list-disc list-inside ml-2 text-stone-600 my-0.5">{line.replace('- ', '')}</li>;
                          }
                          return <p key={lIdx} className="my-0.5">{line}</p>;
                        })}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="self-start items-start max-w-[90%] flex flex-col">
                      <span className="text-[9px] text-stone-500 mb-1 font-mono">Thinking...</span>
                      <div className="p-3.5 rounded-2xl text-xs bg-stone-100 text-stone-500 border border-stone-200 animate-pulse">
                        Analyzing active startup context engine log...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input box */}
                <form onSubmit={handleChatSubmit} className="flex gap-2.5 shrink-0 border-t border-stone-200/80 pt-3">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Submit context update or ask ${activeView} agent...`}
                    className="flex-1 px-4 py-2.5 text-xs text-stone-800 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600] placeholder:text-stone-400"
                  />
                  <button 
                    type="submit"
                    className="p-2.5 bg-gradient-to-tr from-[#a53600] to-[#cc490e] hover:from-[#812800] hover:to-[#a53600] text-white rounded-xl transition shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
              )}

              {/* RIGHT COL: SPECIALIZED DEPARTMENT WORKSPACE (Spans 4 cols - 33% width) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* RESEARCH WORKSPACE */}
                {activeView === 'Research' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-5 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Sparkles className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Dynamic Opportunity Matrix</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#fff1ec] border border-stone-200">
                        <span className="text-[10px] text-stone-500 block uppercase mb-1 font-mono">Total Addressable Market (TAM)</span>
                        <span className="text-xl font-bold text-[#a53600] font-outfit tracking-tight">
                          {context?.business.tam || '$4.5 Billion'}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#fff1ec] border border-stone-200">
                        <span className="text-[10px] text-stone-500 block uppercase mb-1 font-mono">Serviceable Addressable Market (SAM)</span>
                        <span className="text-xl font-bold text-stone-700 font-outfit tracking-tight">
                          {context?.business.sam || '$820 Million'}
                        </span>
                      </div>
                    </div>

                    <div className="border border-stone-200 rounded-xl p-3 bg-[#fff1ec] text-xs">
                      <h4 className="font-semibold text-stone-800 mb-2 font-outfit">Dynamic SWOT analysis</h4>
                      <div className="flex flex-col gap-1 text-stone-600 font-mono text-[10px]">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Niche: {context?.business.niche}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Target: {context?.business.targetMarket}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VALIDATION WORKSPACE */}
                {activeView === 'Validation' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-5 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <SlidersHorizontal className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Financial Setup Questionnaire</h3>
                    </div>

                    <form onSubmit={handleSaveValidationInputs} className="flex flex-col gap-3.5">
                      <div>
                        <label className="block text-[10px] text-stone-600 font-mono uppercase tracking-wider mb-1">Startup Target Budget</label>
                        <input 
                          type="text"
                          value={validationBudget}
                          onChange={(e) => setValidationBudget(e.target.value)}
                          placeholder="e.g. ₹3 Lakhs or $10,000"
                          className="w-full px-3 py-2 text-xs text-stone-800 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-600 font-mono uppercase tracking-wider mb-1">What exactly are you building?</label>
                        <textarea 
                          value={validationIdeaText}
                          onChange={(e) => setValidationIdeaText(e.target.value)}
                          placeholder="e.g. A lightweight offline agronomy journal app"
                          className="w-full h-16 p-2 text-xs text-stone-800 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600] resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-stone-600 font-mono uppercase tracking-wider mb-1">Financial Stage</label>
                        <select 
                          value={validationFinStage}
                          onChange={(e) => setValidationFinStage(e.target.value)}
                          className="w-full px-3 py-2 text-xs text-stone-700 rounded-xl bg-white border border-stone-200 focus:outline-none"
                        >
                          <option value="Bootstrapped">Bootstrapped / Self-Funded</option>
                          <option value="Pre-Seed">Pre-Seed round</option>
                          <option value="Seed-Funded">Seed VC investment</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSavingValidationInputs}
                        className="w-full py-2.5 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm"
                      >
                        {isSavingValidationInputs ? 'Saving Details...' : 'Save Financial Inputs & Validate'}
                      </button>
                    </form>
                  </div>
                )}

                {/* BRAND WORKSPACE: PITCH DECK BUILDER */}
                {activeView === 'Brand' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col gap-5 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Palette className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Sales Pitch Deck</h3>
                    </div>

                    {!isDeckGenerated ? (
                      <button 
                        onClick={generatePitchDeck}
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Generate Sales Pitch Deck</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Slide View Canvas */}
                        <div className="p-4 rounded-xl border border-[#a53600]/20 bg-[#fff1ec] min-h-[140px] flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] text-[#a53600] uppercase font-mono tracking-widest">{pitchSlides[activeSlideIdx].title}</span>
                              <span className="text-[9px] text-stone-500 font-mono">{activeSlideIdx + 1} / 5</span>
                            </div>
                            <h4 className="text-xs font-bold text-stone-900 font-outfit mb-1">{pitchSlides[activeSlideIdx].header}</h4>
                            <p className="text-[11px] text-stone-600 leading-relaxed italic">"{pitchSlides[activeSlideIdx].body}"</p>
                          </div>

                          {/* Slide Actions */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                            <button 
                              onClick={() => handleSlideSelect(Math.max(0, activeSlideIdx - 1))}
                              disabled={activeSlideIdx === 0}
                              className="p-1 rounded bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 text-stone-700" />
                            </button>
                            <span className="text-[10px] text-stone-500">Edit slide text below</span>
                            <button 
                              onClick={() => handleSlideSelect(Math.min(4, activeSlideIdx + 1))}
                              disabled={activeSlideIdx === 4}
                              className="p-1 rounded bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-stone-700" />
                            </button>
                          </div>
                        </div>

                        {/* Slide Editor */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-stone-500 uppercase font-mono">Edit Text Content</label>
                          <textarea 
                            value={slideEditingText}
                            onChange={(e) => setSlideEditingText(e.target.value)}
                            className="w-full h-20 p-2.5 text-xs text-stone-850 rounded-lg bg-white border border-stone-250 focus:outline-none focus:border-[#a53600] resize-none font-sans"
                          />
                          <button 
                            onClick={handleSaveSlideText}
                            className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-stone-700 bg-stone-100 border border-stone-300 hover:bg-stone-200 rounded-lg"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Slide Context</span>
                          </button>
                          {showSavedNotification && (
                            <span className="text-[10px] text-emerald-600 font-mono text-center flex items-center justify-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Saved to Context Engine!
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FINANCE WORKSPACE: DOWNLOAD & REFINE */}
                {activeView === 'Finance' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-5 bg-white/70 border-stone-200/70">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4.5 h-4.5 text-[#a53600]" />
                        <h3 className="font-bold text-stone-900 font-outfit text-sm">CFO Spreadsheet Room</h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a 
                        href={`/api/finance/excel?workspaceId=${workspaceId}`} 
                        download
                        className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm text-center"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Financial Sheet (Excel)</span>
                      </a>
                    </div>

                    <div className="border-t border-stone-200/80 pt-4 flex flex-col gap-3">
                      <h4 className="font-bold text-stone-900 font-outfit text-xs flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-[#a53600]" />
                        <span>Refine Budget via AI</span>
                      </h4>

                      <form onSubmit={handleRefineBudget} className="flex flex-col gap-2">
                        <textarea 
                          value={budgetRefinePrompt}
                          onChange={(e) => setBudgetRefinePrompt(e.target.value)}
                          placeholder="e.g. Cut cloud infra by 50% and allocate to sales outreach..."
                          className="w-full h-16 p-2 text-xs text-stone-850 rounded-xl bg-white border border-stone-250 focus:outline-none focus:border-[#a53600] resize-none"
                          required
                        />
                        <button 
                          type="submit"
                          disabled={isRefiningBudget}
                          className="w-full py-1.5 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition"
                        >
                          {isRefiningBudget ? 'Refining model data...' : 'Refine Budget'}
                        </button>
                      </form>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                      <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200 text-center">
                        <span className="text-[10px] text-stone-500 block uppercase mb-1">Burn Rate</span>
                        <span className="text-base font-bold text-stone-800 font-mono">${context?.financials.burnRate}/mo</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200 text-center">
                        <span className="text-[10px] text-stone-500 block uppercase mb-1">Infrastructure</span>
                        <span className="text-base font-bold text-stone-850 font-mono">${context?.financials.infrastructureCost}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MARKETING STUDIO: REAL NANO BANANA POSTERS + VEO AD VIDEOS */}
                {activeView === 'Marketing' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Image className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Poster & Ad Studio (Nano Banana + Veo)</h3>
                    </div>

                    <textarea
                      value={posterPrompt}
                      onChange={(e) => setPosterPrompt(e.target.value)}
                      placeholder="Describe the poster/ad... e.g. 'CAZ Drop 001 oversized tees, bold orange typography, college streetwear vibe'"
                      className="w-full h-16 p-2.5 text-xs text-stone-850 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600] resize-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={triggerNanoBanana}
                        disabled={isGeneratingBanana || !posterPrompt.trim()}
                        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#a53600] to-[#cc490e] hover:from-[#812800] hover:to-[#a53600] rounded-xl transition shadow-sm disabled:opacity-50"
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span>{isGeneratingBanana ? 'Rendering...' : 'Poster options'}</span>
                      </button>
                      <button
                        onClick={triggerAdKit}
                        disabled={isGeneratingAd || !posterPrompt.trim()}
                        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isGeneratingAd ? 'Veo rendering (~1 min)...' : 'Ad video'}</span>
                      </button>
                    </div>

                    {posterUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {posterUrls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-stone-200 hover:border-[#a53600] transition">
                            <img src={url} alt={`Poster option ${idx + 1}`} className="w-full h-auto" />
                            <span className="block text-center text-[9px] text-stone-500 font-mono py-1">Option {idx + 1} — click to open</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {adKit && (
                      <div className="flex flex-col gap-2 border-t border-stone-200/80 pt-3">
                        {adKit.video ? (
                          <video src={adKit.video} controls className="w-full rounded-xl border border-stone-200" />
                        ) : (
                          <span className="text-[10px] text-stone-500 italic">{adKit.note}</span>
                        )}
                        {(adKit.storyboard || []).length > 0 && (
                          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                            <span className="text-[9px] text-stone-500 uppercase font-mono">Storyboard</span>
                            {adKit.storyboard.map((s: any, idx: number) => (
                              <div key={idx} className="p-2 rounded-lg border border-stone-200 bg-[#fff1ec] text-[10px] text-stone-600">
                                <b className="text-[#a53600]">Shot {idx + 1}</b> ({s.durationSec}s): {s.scene} — <i>"{s.onScreenText}"</i>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* CREATIVE AGENT: CAPTIONS + REAL TTS VOICEOVER */}
                {activeView === 'Creative' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Mic className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Caption & Voiceover Studio</h3>
                    </div>

                    <input
                      type="text"
                      value={captionProduct}
                      onChange={(e) => setCaptionProduct(e.target.value)}
                      placeholder="What are we promoting? e.g. 'CAZ Drop 001 at ₹549'"
                      className="w-full px-3 py-2 text-xs text-stone-850 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={captionLanguage}
                        onChange={(e) => setCaptionLanguage(e.target.value)}
                        className="px-2.5 py-2 text-xs text-stone-800 rounded-xl bg-white border border-stone-200 focus:outline-none"
                      >
                        <option>English</option>
                        <option>English + Hindi mix</option>
                        <option>Hindi</option>
                        <option>Tamil</option>
                        <option>Kannada</option>
                      </select>
                      <button
                        onClick={generateCaptions}
                        disabled={isGeneratingCaptions || !captionProduct.trim()}
                        className="py-2 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm disabled:opacity-50"
                      >
                        {isGeneratingCaptions ? 'Writing...' : 'Generate captions'}
                      </button>
                    </div>

                    {captionResult && (
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                        {(captionResult.captions || []).map((c: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-stone-200 bg-[#fff1ec] text-[11px] text-stone-700 whitespace-pre-wrap">{c}</div>
                        ))}
                        {captionResult.voScript && (
                          <div className="border-t border-stone-200/80 pt-2 flex flex-col gap-2">
                            <span className="text-[9px] text-stone-500 uppercase font-mono">Voiceover script</span>
                            <p className="text-[11px] text-stone-700 italic">"{captionResult.voScript}"</p>
                            <button
                              onClick={() => generateVoiceover(captionResult.voScript)}
                              disabled={isGeneratingVo}
                              className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#a53600] to-[#cc490e] rounded-xl transition shadow-sm disabled:opacity-50"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>{isGeneratingVo ? 'Recording voiceover...' : 'Generate voiceover'}</span>
                            </button>
                            {voUrl && <audio src={voUrl} controls className="w-full" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* DECK AGENT: REAL PPTX FROM LIVE CONTEXT */}
                {activeView === 'Deck' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <FileText className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Investor Deck Builder</h3>
                    </div>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Builds a 10-slide PPTX grounded in what all the other agents have actually found — research, financials, uploaded documents.
                    </p>
                    <input
                      type="text"
                      value={deckFocus}
                      onChange={(e) => setDeckFocus(e.target.value)}
                      placeholder="Optional focus... e.g. 'seed round, emphasize unit economics'"
                      className="w-full px-3 py-2 text-xs text-stone-850 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-[#a53600]"
                    />
                    <button
                      onClick={generateRealDeck}
                      disabled={isGeneratingDeck}
                      className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-[#a53600] hover:bg-[#812800] rounded-xl transition shadow-sm disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{isGeneratingDeck ? 'Building deck from agent context...' : 'Generate PPTX deck'}</span>
                    </button>
                    {deckResult && (
                      <div className="flex flex-col gap-2">
                        <a href={deckResult.url} download className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-[#a53600] bg-[#a53600]/10 border border-[#a53600]/20 rounded-xl hover:bg-[#a53600]/15 transition">
                          <Download className="w-4 h-4" />
                          <span>Download deck (.pptx)</span>
                        </a>
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          {(deckResult.slides || []).map((s: any, idx: number) => (
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-[#fff1ec] text-[10px] text-stone-600">
                              <b>{idx + 1}.</b> {s.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CODE SUPPORT: ASHISH'S ANTIGRAVITY INTEGRATION POINT */}
                {activeView === 'Code' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Code className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Code Support — Antigravity</h3>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      "StartupForge" and "Fix your MVP software" hand your request — with the full shared agent context — to the Antigravity build system. Direct code-editing automation plugs in here when <b>Ashish's Antigravity track</b> ships.
                    </p>
                    <div className="p-3 rounded-xl border border-dashed border-[#a53600]/40 bg-[#fff1ec] text-[10px] font-mono text-stone-500 text-center">
                      ANTIGRAVITY INTEGRATION SLOT — pending Gemma vault edit/version API
                    </div>
                  </div>
                )}

                {/* ENGINEERING WORKSPACE */}
                {activeView === 'Engineering' && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
                      <Code className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">Repository Status</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200">
                        <span className="text-stone-500 block text-[9px] uppercase">Active Repo</span>
                        <span className="font-mono text-stone-800">git-worktree/orbit-monorepo</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#fff1ec] border border-stone-200">
                        <span className="text-stone-500 block text-[9px] uppercase">Build status</span>
                        <span className="font-mono text-emerald-850 font-bold uppercase">{context?.technical.buildStatus}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* FALLBACK FOR OTHER WIDGETS */}
                {['Research', 'Finance', 'Marketing', 'Creative', 'Deck', 'Code'].indexOf(activeView) === -1 && (
                  <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col gap-4 bg-white/70 border-stone-200/70">
                    <div className="flex items-center gap-2 border-b border-stone-200/85 pb-3">
                      <Cpu className="w-4.5 h-4.5 text-[#a53600]" />
                      <h3 className="font-bold text-stone-900 font-outfit text-sm">{activeView} Workspace Board</h3>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      This board displays live assets, document logs, and operational registers associated with the **{activeView} Department** execution tasks.
                    </p>
                    <div className="p-4 rounded-xl border border-stone-200 bg-[#fff1ec] text-xs flex flex-col gap-2 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500">Task Stage:</span>
                        <span className="text-stone-800">Automated loop check passed</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500">Deliverable Status:</span>
                        <span className="text-emerald-700">Synchronized with Context Engine</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
