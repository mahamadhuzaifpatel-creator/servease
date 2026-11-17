import { ServEaseDataset } from '../types';
import { buildDemoSeed } from '../data/demoSeed';

const DATASET_STORAGE_KEY = 'servease_demo_dataset_v1';
const SESSION_STORAGE_KEY = 'servease_demo_session_v1';

export interface DemoSession {
  authenticated: boolean;
  providerId: string;
  rememberMe: boolean;
  lastSignedInAt: string;
}

/**
 * Clearly isolated local demo persistence layer.
 * Note: Passwords and sensitive secrets are NEVER persisted to localStorage.
 * Prepared for replacement by FastAPI + Supabase Auth + PostgreSQL REST calls.
 */
export const demoStorage = {
  loadDataset(): ServEaseDataset | null {
    try {
      const raw = window.localStorage.getItem(DATASET_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ServEaseDataset;
    } catch {
      return null;
    }
  },

  saveDataset(dataset: ServEaseDataset): void {
    try {
      window.localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(dataset));
    } catch {
      // Ignore quota errors in restricted environments
    }
  },

  loadSession(): DemoSession | null {
    try {
      const raw =
        window.localStorage.getItem(SESSION_STORAGE_KEY) ||
        window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DemoSession;
    } catch {
      return null;
    }
  },

  saveSession(session: DemoSession): void {
    try {
      const serialized = JSON.stringify(session);
      if (session.rememberMe) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, serialized);
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  },

  clearSession(): void {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  },

  resetToDemoSeed(): ServEaseDataset {
    const seed = buildDemoSeed();
    this.saveDataset(seed);
    return seed;
  },

  clearAllDemoData(currentProvider: ServEaseDataset['provider']): ServEaseDataset {
    const clean: ServEaseDataset = {
      provider: currentProvider,
      customers: [],
      jobs: [],
      quotations: [],
      payments: [],
      activities: [],
    };
    this.saveDataset(clean);
    return clean;
  },
};
