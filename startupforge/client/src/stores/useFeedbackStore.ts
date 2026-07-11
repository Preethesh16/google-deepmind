import { create } from 'zustand';

export interface FeedbackItem {
  id: number;
  externalId: string;
  source: string;
  userName: string;
  email: string;
  projectPath: string;
  category: 'bug' | 'error' | 'feature' | 'ux' | 'performance' | 'other' | string;
  message: string;
  priority: 'high' | 'medium' | 'low' | string;
  urgency: 'critical' | 'high' | 'normal' | 'low' | string;
  score: number;
  status: 'open' | 'fixing' | 'pending_approval' | 'completed' | 'rejected' | string;
  buildId: number | null;
  filesChanged: string[];
  fixSummary: string;
  createdAt: string;
  fixedAt: string;
  approvedAt: string;
}

export interface FeedbackStats {
  total: number;
  open: number;
  fixing: number;
  pending: number;
  completed: number;
  rejected: number;
}

interface FeedbackState {
  items: FeedbackItem[];
  stats: FeedbackStats;
  workbookPath: string;
  loading: boolean;
  activeFixId: number | null;
  setItems: (items: FeedbackItem[]) => void;
  upsertItem: (item: FeedbackItem) => void;
  setStats: (stats: FeedbackStats) => void;
  setWorkbookPath: (p: string) => void;
  setLoading: (v: boolean) => void;
  setActiveFixId: (id: number | null) => void;
}

const emptyStats: FeedbackStats = {
  total: 0, open: 0, fixing: 0, pending: 0, completed: 0, rejected: 0
};

function computeStats(items: FeedbackItem[]): FeedbackStats {
  return {
    total: items.length,
    open: items.filter((i) => i.status === 'open').length,
    fixing: items.filter((i) => i.status === 'fixing').length,
    pending: items.filter((i) => i.status === 'pending_approval').length,
    completed: items.filter((i) => i.status === 'completed').length,
    rejected: items.filter((i) => i.status === 'rejected').length
  };
}

// Ranking mirrors the server: active work first, then score desc, then newest.
const STATUS_RANK: Record<string, number> = {
  fixing: 0, pending_approval: 1, open: 2, completed: 3, rejected: 4
};

function sortItems(items: FeedbackItem[]): FeedbackItem[] {
  return [...items].sort((a, b) => {
    const sr = (STATUS_RANK[a.status] ?? 5) - (STATUS_RANK[b.status] ?? 5);
    if (sr !== 0) return sr;
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  items: [],
  stats: emptyStats,
  workbookPath: '',
  loading: false,
  activeFixId: null,
  setItems: (items) => set({ items: sortItems(items), stats: computeStats(items) }),
  upsertItem: (item) =>
    set((s) => {
      const exists = s.items.some((i) => i.id === item.id);
      const next = exists
        ? s.items.map((i) => (i.id === item.id ? item : i))
        : [...s.items, item];
      const sorted = sortItems(next);
      return {
        items: sorted,
        stats: computeStats(sorted),
        activeFixId: item.status === 'fixing' ? item.id : s.activeFixId === item.id ? null : s.activeFixId
      };
    }),
  setStats: (stats) => set({ stats }),
  setWorkbookPath: (p) => set({ workbookPath: p }),
  setLoading: (v) => set({ loading: v }),
  setActiveFixId: (id) => set({ activeFixId: id })
}));
