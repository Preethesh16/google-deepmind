import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TeamMember {
  id?: number;
  name: string;
  role: string;
  skills: string[];
  equity: number;
  linkedin: string;
  responsibilities: string[];
}

interface CoreFeature {
  id?: number;
  name: string;
  description: string;
  priority: number;
  isMvp: boolean;
}

interface BusinessProfile {
  businessName: string;
  founderName: string;
  industry: string;
  stage: string;
  location: string;
  problemStatement: string;
  solution: string;
  mission: string;
  vision: string;
  uniqueValueProp: string;
  productType: string;
  revenueModel: string;
  targetMarket: string;
  marketSize: string;
  preferredFrontend: string;
  preferredBackend: string;
  preferredDb: string;
  preferredCloud: string;
  designStyle: string;
  brandColors: string[];
  githubRepoUrl: string;
  hasExistingCode: boolean;
}

interface BuildEvent {
  type: string;
  message: string;
  timestamp: number;
  data?: any;
}

interface BusinessState {
  businessId: number | null;
  profile: Partial<BusinessProfile>;
  team: TeamMember[];
  features: CoreFeature[];
  currentStep: number;
  compiledContext: string;
  currentBuildId: number | null;
  buildEvents: BuildEvent[];
  filesCreated: string[];
  deployUrl: string;
  isBuilding: boolean;
  activeProjectPath: string;
  setBusinessId: (id: number) => void;
  setProfile: (profile: Partial<BusinessProfile>) => void;
  setTeam: (team: TeamMember[]) => void;
  setFeatures: (features: CoreFeature[]) => void;
  setStep: (step: number) => void;
  setCompiledContext: (ctx: string) => void;
  addBuildEvent: (event: BuildEvent) => void;
  setFilesCreated: (files: string[]) => void;
  setDeployUrl: (url: string) => void;
  setIsBuilding: (v: boolean) => void;
  setBuildId: (id: number) => void;
  setActiveProjectPath: (path: string) => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      businessId: null,
      profile: {},
      team: [],
      features: [],
      currentStep: 1,
      compiledContext: '',
      currentBuildId: null,
      buildEvents: [],
      filesCreated: [],
      deployUrl: '',
      isBuilding: false,
      activeProjectPath: '',
      setBusinessId: (id) => set({ businessId: id }),
      setProfile: (profile) => set((s) => ({ profile: { ...s.profile, ...profile } })),
      setTeam: (team) => set({ team }),
      setFeatures: (features) => set({ features }),
      setStep: (step) => set({ currentStep: step }),
      setCompiledContext: (ctx) => set({ compiledContext: ctx }),
      addBuildEvent: (event) => set((s) => ({
        buildEvents: [...s.buildEvents.slice(-200), event]
      })),
      setFilesCreated: (files) => set({ filesCreated: files }),
      setDeployUrl: (url) => set({ deployUrl: url }),
      setIsBuilding: (v) => set({ isBuilding: v }),
      setBuildId: (id) => set({ currentBuildId: id }),
      setActiveProjectPath: (path) => set({ activeProjectPath: path }),
      reset: () => set({
        businessId: null, profile: {}, team: [], features: [],
        currentStep: 1, compiledContext: '', buildEvents: [],
        filesCreated: [], deployUrl: '', isBuilding: false, activeProjectPath: ''
      })
    }),
    {
      name: 'startupforge-business',
      partialize: (s) => ({
        businessId: s.businessId,
        profile: s.profile,
        team: s.team,
        features: s.features,
        currentStep: s.currentStep,
        activeProjectPath: s.activeProjectPath
      })
    }
  )
);
