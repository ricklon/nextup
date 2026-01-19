import { writable, get } from 'svelte/store';

export interface AppSettings {
  // True Finals API
  tfUserId: string;
  tfApiKey: string;

  // OBS Connection
  obsUrl: string;
  obsPassword: string;

  // Arenas
  defaultArenas: string[];

  // Polling
  tournamentPollInterval: number; // ms
  assignmentPollInterval: number; // ms
}

const STORAGE_KEY = 'nextup-settings';

function getDefaultSettings(): AppSettings {
  return {
    tfUserId: import.meta.env.VITE_TF_USER_ID || '',
    tfApiKey: import.meta.env.VITE_TF_API_KEY || '',
    obsUrl: import.meta.env.VITE_OBS_URL || 'ws://localhost:4455',
    obsPassword: import.meta.env.VITE_OBS_PASSWORD || '',
    defaultArenas: (import.meta.env.VITE_DEFAULT_ARENAS || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0),
    tournamentPollInterval: 2000,
    assignmentPollInterval: 2000
  };
}

function loadSettings(): AppSettings {
  const defaults = getDefaultSettings();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }

  return defaults;
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<AppSettings>(loadSettings());

  return {
    subscribe,
    set: (value: AppSettings) => {
      set(value);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (e) {
        console.warn('Failed to save settings to localStorage:', e);
      }
    },
    update: (updater: (settings: AppSettings) => AppSettings) => {
      update(current => {
        const updated = updater(current);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save settings to localStorage:', e);
        }
        return updated;
      });
    },
    reset: () => {
      const defaults = getDefaultSettings();
      set(defaults);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to remove settings from localStorage:', e);
      }
    }
  };
}

export const settings = createSettingsStore();

// Helper to get current settings synchronously
export function getSettings(): AppSettings {
  return get(settings);
}
