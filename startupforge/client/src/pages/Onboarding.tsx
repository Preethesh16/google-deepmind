import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import axios from 'axios';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Multi-step wizard steps
const STEPS = [
  { id: 1, label: 'Identity', icon: '🏢' },
  { id: 2, label: 'Problem', icon: '💡' },
  { id: 3, label: 'Team', icon: '👥' },
  { id: 4, label: 'Features', icon: '⚡' },
  { id: 5, label: 'Tech Stack', icon: '🛠️' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentStep, setStep, profile, team, features, setBusinessId } = useBusinessStore();
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save to backend (Gemma + SQLite)
      const res = await axios.post(`${SERVER}/api/business`, {
        ...profile,
        brandColors: profile.brandColors || ['#6366F1', '#8B5CF6', '#22D3EE']
      });
      const { id } = res.data;
      setBusinessId(id);

      // Save team members
      for (const member of team) {
        await axios.post(`${SERVER}/api/business/${id}/team`, member);
      }

      // Save features
      for (const feature of features) {
        await axios.post(`${SERVER}/api/business/${id}/features`, feature);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed. Is the backend running on port 3001?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">StartupForge</h1>
        <p className="text-[#6B7FA3] text-sm">
          Powered by Gemma + Antigravity
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => currentStep > step.id && setStep(step.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step.id === currentStep
                  ? 'bg-[#6366F1] text-white'
                  : step.id < currentStep
                  ? 'bg-[#6366F1]/20 text-[#6366F1] cursor-pointer hover:bg-[#6366F1]/30'
                  : 'bg-[#0D1526] text-[#6B7FA3] cursor-not-allowed'
              }`}
            >
              <span>{step.icon}</span>
              <span>{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${step.id < currentStep ? 'bg-[#6366F1]' : 'bg-[#1A2540]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="w-full max-w-2xl bg-[#0D1526] rounded-2xl p-8 card-glow border border-[rgba(99,102,241,0.2)]">
        {currentStep === 1 && <StepIdentity />}
        {currentStep === 2 && <StepProblem />}
        {currentStep === 3 && <StepTeam />}
        {currentStep === 4 && <StepFeatures />}
        {currentStep === 5 && <StepTech onComplete={handleComplete} saving={saving} />}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <button
              onClick={() => setStep(currentStep - 1)}
              className="px-6 py-2.5 rounded-xl border border-[rgba(99,102,241,0.3)] text-[#6B7FA3] hover:text-white hover:border-[#6366F1] transition-all text-sm"
            >
              ← Back
            </button>
          )}
          <div className="ml-auto">
            {currentStep < 5 && (
              <button
                onClick={() => setStep(currentStep + 1)}
                className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E8] text-white font-medium text-sm transition-all"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Business Identity
function StepIdentity() {
  const { profile, setProfile } = useBusinessStore();
  const field = (key: string) => ({
    value: (profile as any)[key] || '',
    onChange: (e: any) => setProfile({ [key]: e.target.value })
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white mb-1">Business Identity</h2>
      <p className="text-[#6B7FA3] text-sm mb-6">
        This is stored locally by Gemma — your data never leaves your machine.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Startup Name *" placeholder="BharatPay" {...field('businessName')} />
        <FormField label="Your Name *" placeholder="Ashish Kumar" {...field('founderName')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Industry *" options={['Fintech','EdTech','HealthTech','AgriTech','GovTech','Logistics','SaaS','Marketplace','Other']} {...field('industry')} />
        <FormSelect label="Stage" options={['Idea','Pre-seed','Seed','Series A','Revenue']} {...field('stage')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Location" placeholder="Bengaluru, Karnataka" {...field('location')} />
        <FormField label="Udyam / DPIIT Number" placeholder="UDYAM-KA-..." {...field('udyamNumber')} />
      </div>

      <FormField label="Revenue Model" placeholder="₹999/month SaaS subscription" {...field('revenueModel')} />
    </div>
  );
}

// Step 2: Problem & Solution
function StepProblem() {
  const { profile, setProfile } = useBusinessStore();
  const field = (key: string) => ({
    value: (profile as any)[key] || '',
    onChange: (e: any) => setProfile({ [key]: e.target.value })
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white mb-1">Problem & Solution</h2>
      <p className="text-[#6B7FA3] text-sm mb-6">
        Gemma uses this to understand what your MVP should solve.
      </p>

      <FormTextarea label="Problem Statement *" rows={3}
        placeholder="MSMEs spend 40+ hours/month on GST compliance due to complex forms and changing rules."
        {...field('problemStatement')} />

      <FormTextarea label="Your Solution *" rows={3}
        placeholder="AI-powered compliance automation that files GST returns automatically using transaction data."
        {...field('solution')} />

      <FormField label="Unique Value Proposition *"
        placeholder="10x cheaper than a CA, 100% automated, works in Hindi"
        {...field('uniqueValueProp')} />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Target Market" placeholder="MSME owners in Tier 2/3 cities" {...field('targetMarket')} />
        <FormField label="Market Size" placeholder="63M MSMEs in India" {...field('marketSize')} />
      </div>

      <FormField label="Mission" placeholder="Democratize financial compliance for every Indian business" {...field('mission')} />
    </div>
  );
}

// Step 3: Team
function StepTeam() {
  const { team, setTeam } = useBusinessStore();

  const addMember = () => setTeam([...team, {
    name: '', role: '', skills: [], equity: 0, linkedin: '', responsibilities: []
  }]);

  const updateMember = (i: number, field: string, value: any) => {
    const updated = [...team];
    updated[i] = { ...updated[i], [field]: value };
    setTeam(updated);
  };

  const removeMember = (i: number) => setTeam(team.filter((_, idx) => idx !== i));

  const SKILL_OPTIONS = ['React','Node.js','Python','TypeScript','PostgreSQL','MongoDB','AWS','GCP','Design','Product','Sales','Marketing','ML/AI','Flutter','iOS','Android'];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white mb-1">Your Team</h2>
      <p className="text-[#6B7FA3] text-sm mb-4">
        Team skills help Gemma pick the right tech stack for your MVP.
      </p>

      {team.map((member, i) => (
        <div key={i} className="bg-[#141E35] rounded-xl p-4 space-y-3 border border-[rgba(99,102,241,0.15)]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#6B7FA3] font-medium uppercase tracking-wider">
              Member {i + 1}
            </span>
            <button onClick={() => removeMember(i)} className="text-red-400 hover:text-red-300 text-xs">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Name" placeholder="Priya Sharma"
              value={member.name} onChange={(e: any) => updateMember(i, 'name', e.target.value)} />
            <FormField label="Role" placeholder="CTO"
              value={member.role} onChange={(e: any) => updateMember(i, 'role', e.target.value)} />
            <FormField label="Equity %" placeholder="33"
              value={String(member.equity)}
              onChange={(e: any) => updateMember(i, 'equity', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-[#6B7FA3] font-medium mb-2 block">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button key={skill}
                  onClick={() => {
                    const skills = member.skills.includes(skill)
                      ? member.skills.filter(s => s !== skill)
                      : [...member.skills, skill];
                    updateMember(i, 'skills', skills);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    member.skills.includes(skill)
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#0D1526] text-[#6B7FA3] hover:text-white hover:bg-[#1A2540]'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addMember}
        className="w-full py-2.5 rounded-xl border border-dashed border-[rgba(99,102,241,0.3)] text-[#6B7FA3] hover:border-[#6366F1] hover:text-[#6366F1] transition-all text-sm">
        + Add Team Member
      </button>
    </div>
  );
}

// Step 4: Core Features
function StepFeatures() {
  const { features, setFeatures } = useBusinessStore();

  const addFeature = () => setFeatures([...features, {
    name: '', description: '', priority: features.length + 1, isMvp: true
  }]);

  const updateFeature = (i: number, field: string, value: any) => {
    const updated = [...features];
    updated[i] = { ...updated[i], [field]: value };
    setFeatures(updated);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white mb-1">MVP Features</h2>
      <p className="text-[#6B7FA3] text-sm mb-4">
        Antigravity will build all ✅ MVP features. Mark the rest as Phase 2.
      </p>

      {features.map((feature, i) => (
        <div key={i} className="bg-[#141E35] rounded-xl p-4 border border-[rgba(99,102,241,0.15)]">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <FormField label="Feature Name" placeholder="GST Auto-Filing"
                value={feature.name} onChange={(e: any) => updateFeature(i, 'name', e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <button
                onClick={() => updateFeature(i, 'isMvp', !feature.isMvp)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  feature.isMvp ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#0D1526] text-[#6B7FA3]'
                }`}
              >
                {feature.isMvp ? '✅ MVP' : 'Phase 2'}
              </button>
              <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                className="px-2 py-2 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-all">
                ✕
              </button>
            </div>
          </div>
          <FormField label="Description" placeholder="Auto-detect GST liability from bank transactions and file GSTR-1"
            value={feature.description} onChange={(e: any) => updateFeature(i, 'description', e.target.value)} />
        </div>
      ))}

      <button onClick={addFeature}
        className="w-full py-2.5 rounded-xl border border-dashed border-[rgba(99,102,241,0.3)] text-[#6B7FA3] hover:border-[#6366F1] hover:text-[#6366F1] transition-all text-sm">
        + Add Feature
      </button>
    </div>
  );
}

// Step 5: Tech Stack + Submit
function StepTech({ onComplete, saving }: { onComplete: () => void; saving: boolean }) {
  const { profile, setProfile } = useBusinessStore();
  const field = (key: string) => ({
    value: (profile as any)[key] || '',
    onChange: (e: any) => setProfile({ [key]: e.target.value })
  });

  const colors = profile.brandColors || ['#6366F1', '#8B5CF6', '#22D3EE'];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-white mb-1">Tech Stack & Design</h2>
      <p className="text-[#6B7FA3] text-sm mb-4">
        Gemma will validate this and suggest improvements before building.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Frontend" options={['React + Vite + TypeScript','Next.js 14','Vue 3','Svelte','React Native (mobile)']} {...field('preferredFrontend')} />
        <FormSelect label="Backend" options={['Node.js + Express','Python FastAPI','Python Django','Go + Gin','Java Spring Boot']} {...field('preferredBackend')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect label="Database" options={['SQLite','PostgreSQL','MongoDB','Supabase','Firebase']} {...field('preferredDb')} />
        <FormSelect label="Deploy Target" options={['Vercel','Firebase Hosting','Netlify','Railway','GCP Cloud Run']} {...field('preferredCloud')} />
      </div>
      <FormSelect label="Design Style" options={['Modern dark with gradients','Clean minimal white','Bold colorful','Corporate professional','Glassmorphism dark']} {...field('designStyle')} />

      {/* Brand Colors */}
      <div>
        <label className="text-xs text-[#6B7FA3] font-medium mb-2 block">Brand Colors</label>
        <div className="flex gap-3">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={color}
                onChange={(e) => {
                  const updated = [...colors];
                  updated[i] = e.target.value;
                  setProfile({ brandColors: updated });
                }}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[rgba(99,102,241,0.3)] bg-transparent"
              />
              <span className="text-xs text-[#6B7FA3] font-mono">{color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Existing Repo */}
      <div>
        <label className="text-xs text-[#6B7FA3] font-medium mb-2 block">Existing GitHub Repo (optional)</label>
        <div className="flex gap-3 items-center">
          <input
            type="checkbox"
            checked={profile.hasExistingCode || false}
            onChange={(e) => setProfile({ hasExistingCode: e.target.checked })}
            className="accent-[#6366F1]"
          />
          <span className="text-sm text-[#6B7FA3]">I have existing code</span>
        </div>
        {profile.hasExistingCode && (
          <FormField label="GitHub URL" placeholder="https://github.com/yourname/your-repo"
            {...field('githubRepoUrl')} />
        )}
      </div>

      {/* Final submit */}
      <div className="pt-4 border-t border-[rgba(99,102,241,0.15)]">
        <p className="text-xs text-[#6B7FA3] mb-4 flex items-center gap-2">
          <span className="text-green-400">🔒</span>
          All data stored locally by Gemma. Nothing is sent to the cloud until you build.
        </p>
        <button
          onClick={onComplete}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white font-semibold text-base hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? '💾 Saving to Gemma...' : '🚀 Launch StartupForge Dashboard →'}
        </button>
      </div>
    </div>
  );
}

// Reusable Form Components
function FormField({ label, placeholder, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs text-[#6B7FA3] font-medium mb-1.5 block">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-[#060B18] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3A4F72] focus:outline-none focus:border-[#6366F1] transition-colors"
      />
    </div>
  );
}

function FormTextarea({ label, placeholder, value, onChange, rows = 3 }: any) {
  return (
    <div>
      <label className="text-xs text-[#6B7FA3] font-medium mb-1.5 block">{label}</label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full bg-[#060B18] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#3A4F72] focus:outline-none focus:border-[#6366F1] transition-colors resize-none"
      />
    </div>
  );
}

function FormSelect({ label, options, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs text-[#6B7FA3] font-medium mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-[#060B18] border border-[rgba(99,102,241,0.2)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1] transition-colors"
      >
        <option value="">Select...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
