import { useState, type ComponentType, type SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../stores/useBusinessStore';
import {
  IconLogo, IconBuilding, IconBulb, IconUsers, IconZap, IconLayers,
  IconArrowRight, IconArrowLeft, IconPlus, IconTrash, IconCheck, IconLock, IconRocket,
} from '../components/Icons';
import axios from 'axios';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Multi-step wizard steps
const STEPS: { id: number; label: string; Icon: IconType }[] = [
  { id: 1, label: 'Identity', Icon: IconBuilding },
  { id: 2, label: 'Problem', Icon: IconBulb },
  { id: 3, label: 'Team', Icon: IconUsers },
  { id: 4, label: 'Features', Icon: IconZap },
  { id: 5, label: 'Tech Stack', Icon: IconLayers },
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ background: 'var(--bg)' }}>
      <div className="ambient" />
      <div className="grid-bg absolute inset-0 opacity-40" />

      {/* Header */}
      <div className="mb-9 text-center relative">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span style={{ color: 'var(--accent)' }}><IconLogo size={26} /></span>
          <h1 className="text-[26px] font-semibold tracking-tight title-grad">StartupForge</h1>
        </div>
        <p className="text-[13px] mono" style={{ color: 'var(--text-3)' }}>
          autonomous multi-agent build system
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8 relative">
        {STEPS.map((step, i) => {
          const active = step.id === currentStep;
          const past = step.id < currentStep;
          const { Icon } = step;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => currentStep > step.id && setStep(step.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: active ? 'var(--accent-glow)' : past ? 'var(--bg-2)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent-dim)' : 'var(--line)'}`,
                  color: active ? 'var(--accent)' : past ? 'var(--text-1)' : 'var(--text-3)',
                  cursor: past ? 'pointer' : active ? 'default' : 'not-allowed',
                }}
              >
                {past ? <IconCheck size={13} /> : <Icon size={13} />}
                <span>{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-7 h-px" style={{ background: step.id < currentStep ? 'var(--accent-dim)' : 'var(--line-strong)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="w-full max-w-2xl panel p-7 relative fade-up" style={{ background: 'var(--bg-1)' }}>
        {currentStep === 1 && <StepIdentity />}
        {currentStep === 2 && <StepProblem />}
        {currentStep === 3 && <StepTeam />}
        {currentStep === 4 && <StepFeatures />}
        {currentStep === 5 && <StepTech onComplete={handleComplete} saving={saving} />}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <button onClick={() => setStep(currentStep - 1)} className="btn btn-outline">
              <IconArrowLeft size={14} /> Back
            </button>
          )}
          <div className="ml-auto">
            {currentStep < 5 && (
              <button onClick={() => setStep(currentStep + 1)} className="btn btn-primary">
                Continue <IconArrowRight size={14} />
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
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Business Identity</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-2)' }}>
        Stored locally on your machine — this data never leaves your environment.
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
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Problem &amp; Solution</h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-2)' }}>
        The agents use this to understand exactly what your MVP should solve.
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
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Your Team</h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-2)' }}>
        Team skills help the planner pick the right tech stack for your MVP.
      </p>

      {team.map((member, i) => (
        <div key={i} className="panel-2 p-4 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="eyebrow">Member {i + 1}</span>
            <button onClick={() => removeMember(i)} className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--c-error)' }}>
              <IconTrash size={13} /> Remove
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
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button key={skill}
                  onClick={() => {
                    const skills = member.skills.includes(skill)
                      ? member.skills.filter(s => s !== skill)
                      : [...member.skills, skill];
                    updateMember(i, 'skills', skills);
                  }}
                  className={member.skills.includes(skill) ? 'chip chip-on' : 'chip'}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addMember} className="btn btn-outline w-full" style={{ borderStyle: 'dashed' }}>
        <IconPlus size={14} /> Add Team Member
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
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>MVP Features</h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-2)' }}>
        The builders ship every feature marked MVP. Mark the rest as Phase 2.
      </p>

      {features.map((feature, i) => (
        <div key={i} className="panel-2 p-4">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <FormField label="Feature Name" placeholder="GST Auto-Filing"
                value={feature.name} onChange={(e: any) => updateFeature(i, 'name', e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <button
                onClick={() => updateFeature(i, 'isMvp', !feature.isMvp)}
                className={feature.isMvp ? 'chip chip-on' : 'chip'}
                style={{ padding: '8px 11px' }}
              >
                {feature.isMvp ? 'MVP' : 'Phase 2'}
              </button>
              <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                className="chip" style={{ padding: '8px 10px', color: 'var(--c-error)' }}>
                <IconTrash size={13} />
              </button>
            </div>
          </div>
          <FormField label="Description" placeholder="Auto-detect GST liability from bank transactions and file GSTR-1"
            value={feature.description} onChange={(e: any) => updateFeature(i, 'description', e.target.value)} />
        </div>
      ))}

      <button onClick={addFeature} className="btn btn-outline w-full" style={{ borderStyle: 'dashed' }}>
        <IconPlus size={14} /> Add Feature
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
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Tech Stack &amp; Design</h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-2)' }}>
        The planner validates these choices and suggests improvements before building.
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
        <label className="label">Brand Colors</label>
        <div className="flex gap-3">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={color}
                onChange={(e) => {
                  const updated = [...colors];
                  updated[i] = e.target.value;
                  setProfile({ brandColors: updated });
                }}
                className="w-9 h-9 rounded-lg cursor-pointer bg-transparent"
                style={{ border: '1px solid var(--line-strong)' }}
              />
              <span className="text-[12px] mono" style={{ color: 'var(--text-2)' }}>{color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Existing Repo */}
      <div>
        <label className="label">Existing GitHub Repo (optional)</label>
        <div className="flex gap-2.5 items-center">
          <input
            type="checkbox"
            checked={profile.hasExistingCode || false}
            onChange={(e) => setProfile({ hasExistingCode: e.target.checked })}
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>I have existing code</span>
        </div>
        {profile.hasExistingCode && (
          <div className="mt-3">
            <FormField label="GitHub URL" placeholder="https://github.com/yourname/your-repo"
              {...field('githubRepoUrl')} />
          </div>
        )}
      </div>

      {/* Final submit */}
      <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <p className="text-[12px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--accent)' }}><IconLock size={13} /></span>
          Your profile is stored locally. Nothing is sent to the cloud until you build.
        </p>
        <button
          onClick={onComplete}
          disabled={saving}
          className="btn btn-primary w-full"
          style={{ padding: '13px', fontSize: 14 }}
        >
          {saving ? 'Saving profile…' : <>Launch Dashboard <IconRocket size={16} /></>}
        </button>
      </div>
    </div>
  );
}

// Reusable Form Components
function FormField({ label, placeholder, value, onChange }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="text" placeholder={placeholder} value={value} onChange={onChange} className="field" />
    </div>
  );
}

function FormTextarea({ label, placeholder, value, onChange, rows = 3 }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows} className="field resize-none" />
    </div>
  );
}

function FormSelect({ label, options, value, onChange }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={onChange} className="field">
        <option value="">Select...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
