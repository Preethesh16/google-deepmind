import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUp, staggerContainer } from './theme';

type Language = 'en' | 'ta' | 'hi';

const DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    "nav.agents": "Agents",
    "nav.workflow": "Workflow",
    "nav.onboarding": "Onboarding",
    "nav.getStarted": "Get Started",
    "hero.badge": "Built for first-time founders and MSMEs across India",
    "hero.title.pre": "The Operating System for ",
    "hero.title.accent": "Autonomous Founders",
    "hero.subtitle": "An AI agent team that replaces 6 full-time hires. From legal compliance to multilingual marketing, your business works in your language while you sleep.",
    "hero.cta.primary": "Get Started",
    "hero.cta.secondary": "See How It Works",
    "hero.demo": "Introducing Orbit — Watch demo",
    "multilingual.title.pre": "Businesses that feel handcrafted, ",
    "multilingual.title.accent": "run like a team",
    "multilingual.body": "Orbit doesn't just translate; it transcreates. Whether it's drafting your partnership deed or writing a WhatsApp campaign in Hindi, Orbit understands the local context of Indian business.",
    "agents.research.title": "Research Agent",
    "agents.research.body": "Validates your idea against real-world market data and identifies your niche competitors in seconds.",
    "agents.legal.title": "Legal & Compliance",
    "agents.legal.body": "Tracks registrations, drafts customized legal agreements, and manages your GST filings autonomously.",
    "onboarding.welcome": "Welcome to Orbit",
    "onboarding.question": "How are you building this?",
    "onboarding.solo.title": "Solo founder",
    "onboarding.solo.body": "One Gemma vault, one profile. Everything private stays on your device; agents see only scoped, derived facts.",
    "onboarding.team.title": "With a team",
    "onboarding.team.body": "A shared workspace with per-person Gemma vaults. Invite co-founders and hires with role-scoped access — personal data never syncs.",
    "onboarding.invite.title": "Invite your team",
    "onboarding.invite.body": "Each person gets their own Gemma-protected profile: a role, a permission scope, and a private vault on their own device.",
    "onboarding.invite.email": "Email address",
    "onboarding.invite.role": "Role",
    "onboarding.invite.add": "Add invite",
    "onboarding.invite.send": "Send invites & create workspace",
    "onboarding.scope.title": "What each role can see",
    "onboarding.continue": "Continue",
    "workflow.title": "From idea to a running company"
  },
  ta: {
    "nav.agents": "முகவர்கள்",
    "nav.workflow": "பணிப்பாதை",
    "nav.onboarding": "தொடக்கம்",
    "nav.getStarted": "தொடங்குங்கள்",
    "hero.badge": "இந்தியாவின் முதல்முறை நிறுவனர்களுக்கும் MSME-களுக்கும் உருவாக்கப்பட்டது",
    "hero.title.pre": "இயக்க அமைப்பு ",
    "hero.title.accent": "தன்னியக்க நிறுவனர்களுக்கு",
    "hero.subtitle": "6 முழுநேர ஊழியர்களுக்கு பதிலான ஒரு AI ஏஜென்ட் குழு. சட்ட இணக்கம் முதல் பன்மொழி சந்தைப்படுத்தல் வரை — நீங்கள் தூங்கும்போதும் உங்கள் வணிகம் உங்கள் மொழியில் இயங்குகிறது.",
    "hero.cta.primary": "தொடங்குங்கள்",
    "hero.cta.secondary": "இது எப்படி வேலை செய்கிறது",
    "hero.demo": "Orbit அறிமுகம் — டெமோ பார்க்க",
    "multilingual.title.pre": "கைவினை போல் தோன்றும் வணிகங்கள், ",
    "multilingual.title.accent": "குழு போல் இயங்கும்",
    "multilingual.body": "Orbit வெறும் மொழிபெயர்ப்பு செய்யாது; உணர்வை மாற்றி உருவாக்குகிறது. கூட்டாண்மை ஒப்பந்தமோ, தமிழில் WhatsApp பிரச்சாரமோ — இந்திய வணிகத்தின் உள்ளூர் சூழலை Orbit புரிந்துகொள்கிறது.",
    "agents.research.title": "ஆராய்ச்சி ஏஜென்ட்",
    "agents.research.body": "உங்கள் யோசனையை உண்மையான சந்தை தரவுடன் சரிபார்த்து, நொடிகளில் போட்டியாளர்களை அடையாளம் காட்டுகிறது.",
    "agents.legal.title": "சட்டம் & இணக்கம்",
    "agents.legal.body": "பதிவுகளை கண்காணித்து, ஒப்பந்தங்களை உருவாக்கி, உங்கள் GST தாக்கல்களை தானாக நிர்வகிக்கிறது.",
    "onboarding.welcome": "Orbit-க்கு வரவேற்கிறோம்",
    "onboarding.question": "இதை எப்படி உருவாக்குகிறீர்கள்?",
    "onboarding.solo.title": "தனி நிறுவனர்",
    "onboarding.solo.body": "ஒரு Gemma பெட்டகம், ஒரு சுயவிவரம். தனிப்பட்ட அனைத்தும் உங்கள் சாதனத்திலேயே இருக்கும்; ஏஜென்ட்கள் வரையறுக்கப்பட்ட தகவல்களை மட்டுமே பார்க்கும்.",
    "onboarding.team.title": "குழுவுடன்",
    "onboarding.team.body": "பகிரப்பட்ட பணியிடம், நபருக்கு ஒரு Gemma பெட்டகம். இணை நிறுவனர்களை பங்கு-அடிப்படை அணுகலுடன் அழையுங்கள் — தனிப்பட்ட தரவு ஒருபோதும் ஒத்திசைக்காது.",
    "onboarding.invite.title": "உங்கள் குழுவை அழைக்கவும்",
    "onboarding.invite.body": "ஒவ்வொருவருக்கும் சொந்த Gemma-பாதுகாப்பு சுயவிவரம்: ஒரு பங்கு, அனுமதி வரம்பு, மற்றும் சொந்த சாதனத்தில் தனிப்பட்ட பெட்டகம்.",
    "onboarding.invite.email": "மின்னஞ்சல் முகவரி",
    "onboarding.invite.role": "பங்கு",
    "onboarding.invite.add": "அழைப்பு சேர்க்க",
    "onboarding.invite.send": "அழைப்புகளை அனுப்பி பணியிடத்தை உருவாக்கு",
    "onboarding.scope.title": "ஒவ்வொரு பங்கும் எதைப் பார்க்கலாம்",
    "onboarding.continue": "தொடரவும்",
    "workflow.title": "யோசனையிலிருந்து இயங்கும் நிறுவனம் வரை"
  },
  hi: {
    "nav.agents": "एजेंट",
    "nav.workflow": "कार्यप्रवाह",
    "nav.onboarding": "ऑनबोर्डिंग",
    "nav.getStarted": "शुरू करें",
    "hero.badge": "भारत भर के पहली बार के संस्थापकों और एमएसएमई के लिए निर्मित",
    "hero.title.pre": "स्वायत्त संस्थापकों के लिए ",
    "hero.title.accent": "ऑपरेटिंग सिस्टम",
    "hero.subtitle": "एक एआई एजींट टीम जो 6 पूर्णकालिक कर्मचारियों की जगह लेती है। कानूनी अनुपालन से लेकर बहुभाषी विपणन तक, जब आप सो रहे होते हैं तो आपका व्यवसाय आपकी भाषा में काम करता है।",
    "hero.cta.primary": "शुरू करें",
    "hero.cta.secondary": "देखें कि यह कैसे काम करता है",
    "hero.demo": "ऑर्बिट का परिचय — डेमो देखें",
    "multilingual.title.pre": "व्यवसाय जो हस्तनिर्मित महसूस होते हैं, ",
    "multilingual.title.accent": "एक टीम की तरह चलते हैं",
    "multilingual.body": "ऑर्बिट केवल अनुवाद नहीं करता है; यह नया अर्थ देता है। चाहे आपकी साझेदारी विलेख का मसौदा तैयार करना हो या हिंदी में व्हाट्सएप अभियान लिखना हो, ऑर्बिट भारतीय व्यवसाय के स्थानीय संदर्भ को समझता है।",
    "agents.research.title": "अनुसंधान एजेंट",
    "agents.research.body": "कुछ ही सेकंड में वास्तविक बाजार डेटा के विरुद्ध आपके विचार को सत्यापित करता है और आपके प्रतिस्पर्धियों की पहचान करता।",
    "agents.legal.title": "कानूनी और अनुपालन",
    "agents.legal.body": "पंजीकरणों को ट्रैक करता है, अनुकूलित कानूनी समझौतों का मसौदा तैयार करता है, और जीएसटी दाखिले का प्रबंधन करता है।",
    "onboarding.welcome": "ऑर्बिट में आपका स्वागत है",
    "onboarding.question": "आप इसे कैसे बना रहे हैं?",
    "onboarding.solo.title": "एकल संस्थापक",
    "onboarding.solo.body": "एक गेम्मा वॉल्ट, एक प्रोफ़ाइल। सब कुछ व्यक्तिगत आपके डिवाइस पर रहता है; एजेंट केवल सीमित तथ्य देखते हैं।",
    "onboarding.team.title": "एक टीम के साथ",
    "onboarding.team.body": "प्रति-व्यक्ति गेम्मा वॉल्ट के साथ एक साझा कार्यक्षेत्र। भूमिका-आधारित पहुंच के साथ सह-संस्थापकों और कर्मचारियों को आमंत्रित करें - व्यक्तिगत डेटा कभी सिंक नहीं होता।",
    "onboarding.invite.title": "अपनी टीम को आमंत्रित करें",
    "onboarding.invite.body": "प्रत्येक व्यक्ति को अपनी स्वयं की गेम्मा-संरक्षित प्रोफ़ाइल मिलती है: एक भूमिका, एक अनुमति दायरा और उनके अपने डिवाइस पर एक निजी वॉल्ट।",
    "onboarding.invite.email": "ईमेल पता",
    "onboarding.invite.role": "भूमिका",
    "onboarding.invite.add": "आमंत्रण जोड़ें",
    "onboarding.invite.send": "आमंत्रण भेजें और कार्यक्षेत्र बनाएं",
    "onboarding.scope.title": "प्रत्येक भूमिका क्या देख सकती है",
    "onboarding.continue": "जारी रखें",
    "workflow.title": "विचार से लेकर चालू कंपनी तक"
  }
};

interface Invite {
  email: string;
  role: string;
}

export default function App() {
  const [view, setView] = useState<'landing' | 'onboarding' | 'ideation'>('landing');
  const [lang, setLang] = useState<Language>('en');
  const [mode, setMode] = useState<'solo' | 'team'>('solo');

  // Input states
  const [founderName, setFounderName] = useState('');
  const [founderEmail, setFounderEmail] = useState('');
  const [startupName, setStartupName] = useState('');
  const [startupIdea, setStartupIdea] = useState('');

  // Team invites states
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Co-founder');

  // Loading indicator for spawning backend workspace
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasSavedWorkspace, setHasSavedWorkspace] = useState(false);

  // Helper i18n translator
  const t = (key: string) => {
    return DICTIONARY[lang][key] || DICTIONARY['en'][key] || key;
  };

  // Deep link from Preethesh's landing pages (/landing/) — "Get Started"
  // CTAs link to /?view=onboarding so founders skip the duplicate hero.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('view');
    if (wanted === 'onboarding' || wanted === 'ideation') setView(wanted);
  }, []);

  // Sync initial state if saved
  useEffect(() => {
    const saved = localStorage.getItem('orbit.state.react');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFounderName(parsed.founderName || '');
        setFounderEmail(parsed.founderEmail || '');
        setMode(parsed.mode || 'solo');
        if (parsed.founderName) {
          setHasSavedWorkspace(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveWorkspaceState = (updates: any) => {
    localStorage.setItem('orbit.state.react', JSON.stringify(updates));
  };

  // Triggers when details form is submitted in onboarding
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!founderName || !founderEmail) return;

    // Save configuration states locally
    saveWorkspaceState({
      founderName,
      founderEmail,
      hasWorkspace: true,
      mode
    });

    // Directly transition to startup name/idea screen (removing the old roadmap step list completely)
    setView('ideation');
  };

  // Posts startup details to backend express server to launch loop and redirect
  const handleLaunchStartup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupName || !startupIdea) return;
    setIsLaunching(true);

    try {
      const res = await fetch('http://localhost:5000/api/execution/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId: 'default-workspace', 
          objective: startupIdea, 
          companyName: startupName,
          track: mode === 'solo' ? 'founder' : 'startup'
        })
      });

      if (res.ok) {
        // Redirect directly to the React Client Dashboard on port 3000
        window.location.href = 'http://localhost:3000/';
      } else {
        alert('Failed to trigger workspace. Please ensure server is running.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server. Make sure server is running on port 5000.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f6] text-[#261814] font-sans antialiased selection:bg-primary/20">
      
      {/* Global Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-[#261814] hover:opacity-90 transition">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">orbit</span>
              </span>
              <span className="font-extrabold text-xl tracking-tight">Orbit</span>
            </button>
            <div className="hidden md:flex gap-6">
              <button onClick={() => setView('landing')} className={`font-semibold text-sm ${view === 'landing' ? 'text-primary' : 'text-secondary hover:text-primary transition'}`}>Features</button>
              <button onClick={() => setView('onboarding')} className={`font-semibold text-sm ${view === 'onboarding' ? 'text-primary' : 'text-secondary hover:text-primary transition'}`}>Onboarding</button>
              <a href="/landing/" className="font-semibold text-sm text-secondary hover:text-primary transition">Full site</a>
              <a href="/landing/workflow.html" className="font-semibold text-sm text-secondary hover:text-primary transition">Workflow</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-full border border-stone-200">
              {([ 'en', 'ta', 'hi' ] as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition uppercase ${
                    lang === l ? 'bg-primary text-white' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setView('onboarding')} 
              className="bg-primary text-white px-5 py-2 rounded-full text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-lg shadow-primary/20"
            >
              {t('nav.getStarted')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="relative">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: LANDING */}
          {view === 'landing' && (
            <motion.main
              key="landing"
              className="mx-auto max-w-7xl px-6 pt-28 pb-16 space-y-16"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {/* Hero Section */}
              <motion.section variants={slideUp} className="text-center space-y-6 max-w-4xl mx-auto pt-8">
                <span className="inline-block px-4 py-1.5 bg-[#a53600]/10 text-primary font-medium text-xs rounded-full border border-outline-variant/30">
                  {t('hero.badge')}
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-on-surface">
                  {t('hero.title.pre')}
                  <span className="text-primary">{t('hero.title.accent')}</span>
                </h1>
                <p className="text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
                  {t('hero.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button 
                    onClick={() => setView('onboarding')} 
                    className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-full font-bold text-sm shadow-xl shadow-primary/25 hover:brightness-110 active:scale-95 transition-all"
                  >
                    {t('hero.cta.primary')}
                  </button>
                  {hasSavedWorkspace && (
                    <a 
                      href="http://localhost:3000/"
                      className="w-full sm:w-auto bg-white border border-stone-200 text-stone-855 px-8 py-4 rounded-full font-bold text-sm hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Go to Dashboard</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  )}
                </div>
              </motion.section>

              {/* Mockup Dashboard Preview */}
              <motion.section variants={slideUp} className="pb-8">
                <div className="bg-[#111111] rounded-2xl overflow-hidden shadow-2xl border border-white/5 max-w-5xl mx-auto">
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="mx-auto text-white/40 text-[10px] font-mono">orbit.os / dashboard</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 min-h-[400px]">
                    {/* Mockup Sidebar */}
                    <div className="md:col-span-3 border-r border-white/5 p-5 space-y-6 hidden md:block text-left">
                      <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono font-bold">Live Agent Feed</p>
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-primary text-[10px] font-bold mb-0.5">Legal Agent</p>
                          <p className="text-white/80 text-[10px] leading-relaxed">GST status verified. Startup registration pre-filled.</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-[#a53600] text-[10px] font-bold mb-0.5">Brand Agent</p>
                          <p className="text-white/80 text-[10px] leading-relaxed">Pitch deck templates generated. Custom brand assets live.</p>
                        </div>
                      </div>
                    </div>
                    {/* Mockup Main Workspace Display */}
                    <div className="md:col-span-9 p-6 flex flex-col justify-between text-left">
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <div>
                          <h3 className="text-white font-bold text-sm">Orbit AI Loop</h3>
                          <p className="text-white/40 text-[9px] font-mono">Status: Connected to local private Gemma Vault</p>
                        </div>
                        <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-mono">Active</span>
                      </div>
                      <div className="py-8 space-y-4">
                        <p className="text-stone-300 text-xs leading-relaxed max-w-xl">
                          "Your idea has been parsed against category benchmarks. TAM calculated at ₹4,200 Cr, competitor pricing scans locked. Click completing research to unlock financial budget planners."
                        </p>
                      </div>
                      <div className="text-[10px] text-white/35 font-mono">Gemma vault: Encrypted · private · on-device</div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.main>
          )}

          {/* VIEW 2: ONBOARDING FLOW */}
          {view === 'onboarding' && (
            <motion.div
              key="onboarding"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="max-w-xl mx-auto px-6 pt-28 pb-16 space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#261814]">{t('onboarding.welcome')}</h1>
                <p className="text-sm text-stone-500 font-medium">{t('onboarding.question')}</p>
              </div>

              {/* Mode Choice Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('solo')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all space-y-3 ${
                    mode === 'solo' 
                      ? 'border-primary bg-white shadow-lg' 
                      : 'border-stone-200 bg-white/50 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'solo' ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-500'}`}>
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#261814]">{t('onboarding.solo.title')}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{t('onboarding.solo.body')}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('team')}
                  className={`p-6 rounded-2xl border-2 text-left transition-all space-y-3 ${
                    mode === 'team' 
                      ? 'border-primary bg-white shadow-lg' 
                      : 'border-stone-200 bg-white/50 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'team' ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-500'}`}>
                    <span className="material-symbols-outlined text-xl">groups</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#261814]">{t('onboarding.team.title')}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{t('onboarding.team.body')}</p>
                </button>
              </div>

              {/* Details Intake Form */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xl">
                <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-stone-500 uppercase font-mono tracking-wider font-bold text-left">Your Name</label>
                      <input 
                        type="text"
                        value={founderName}
                        onChange={(e) => setFounderName(e.target.value)}
                        placeholder="Preethesh"
                        className="w-full bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-stone-500 uppercase font-mono tracking-wider font-bold text-left">Your Email</label>
                      <input 
                        type="email"
                        value={founderEmail}
                        onChange={(e) => setFounderEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Team invites widget if team mode selected */}
                  {mode === 'team' && (
                    <div className="space-y-4 pt-4 border-t border-stone-100 text-left">
                      <label className="block text-[10px] text-stone-500 uppercase font-mono tracking-wider font-bold">{t('onboarding.invite.title')}</label>
                      <p className="text-[10px] text-stone-400 font-medium leading-relaxed">{t('onboarding.invite.body')}</p>
                      <div className="flex gap-2">
                        <input 
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="co-founder@gmail.com"
                          className="flex-1 bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-3 py-2 text-xs focus:outline-none transition"
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-32 bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-2 py-2 text-xs focus:outline-none"
                        >
                          <option value="Co-founder">Co-founder</option>
                          <option value="Ops hire">Ops hire</option>
                          <option value="Marketer">Marketer</option>
                          <option value="Sales">Sales</option>
                        </select>
                        <button 
                          type="button"
                          onClick={() => {
                            if (!inviteEmail) return;
                            setInvites([...invites, { email: inviteEmail, role: inviteRole }]);
                            setInviteEmail('');
                          }}
                          className="bg-stone-200 hover:bg-stone-300 text-stone-850 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0"
                        >
                          {t('onboarding.invite.add')}
                        </button>
                      </div>

                      {invites.length > 0 && (
                        <ul className="divide-y divide-stone-100 max-h-24 overflow-y-auto bg-stone-50 p-2 rounded-xl border border-stone-200">
                          {invites.map((inv, idx) => (
                            <li key={idx} className="flex justify-between items-center py-1 text-xs">
                              <span className="truncate text-stone-600">
                                <strong className="text-primary mr-1">{inv.role}:</strong> {inv.email}
                              </span>
                              <button 
                                type="button"
                                onClick={() => setInvites(invites.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:underline text-[9px] font-bold"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-3 bg-primary text-white rounded-full font-bold text-xs shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition"
                  >
                    {t('onboarding.continue')}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* VIEW 3: IDEATION FORM */}
          {view === 'ideation' && (
            <motion.div
              key="ideation"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="max-w-md mx-auto px-6 pt-28 pb-16"
            >
              <div className="bg-white space-y-6 shadow-2xl rounded-2xl p-8 border border-stone-200">
                <header className="space-y-2 text-left">
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#261814]">
                    Hey <span className="text-primary">{founderName || 'Founder'}</span>,
                  </h1>
                  <p className="text-xs text-stone-500 font-medium leading-relaxed">
                    Let's align your co-founding agent team! Enter your startup's name and vision below to begin.
                  </p>
                </header>

                <form onSubmit={handleLaunchStartup} className="space-y-5 text-left">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-stone-500 uppercase font-mono tracking-wider font-bold">Startup Name</label>
                    <input
                      type="text"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder="e.g. CAZ Streetwear"
                      className="w-full bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-stone-500 uppercase font-mono tracking-wider font-bold">Startup Idea / Vision</label>
                    <textarea
                      value={startupIdea}
                      onChange={(e) => setStartupIdea(e.target.value)}
                      placeholder="Describe your product idea... (e.g. 'Build an oversized organic hoodie drop platform in South India')"
                      className="w-full h-24 bg-stone-50 border border-stone-200 focus:border-primary text-stone-900 rounded-xl px-4 py-3 text-xs focus:outline-none transition resize-none leading-relaxed shadow-sm"
                      required
                  />
                  </div>

                  <button
                    type="submit"
                    disabled={isLaunching}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-full font-bold text-xs shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                  >
                    <span>{isLaunching ? 'Spawning Agent loop...' : "Let's Get Started"}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
