import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface SyncSettings {
  roomName: string;
  signalingUrl: string;
  password: string;
  maxConns: number;
  filterBcConns: boolean;
  iceServers: string;
  dataSources: string[];
}

const ADJECTIVES = [
  "Cosmic", "Swift", "Lazy", "Bold", "Silver", "Mystic", "Wild", "Jolly",
  "Crisp", "Velvet", "Golden", "Azure", "Crimson", "Emerald", "Solar", "Lunar",
  "Stellar", "Gentle", "Fierce", "Calm", "Proud", "Keen", "Noble", "Vivid",
  "Silent", "Bright", "Serene", "Mighty", "Zephyr", "Aurora", "Frost", "Ivy",
];

const NOUNS = [
  "Panda", "Fox", "River", "Star", "Moon", "Eagle", "Wolf", "Owl",
  "Hawk", "Bear", "Lynx", "Crane", "Raven", "Tiger", "Falcon", "Orca",
  "Phoenix", "Dragon", "Heron", "Otter", "Mink", "Viper", "Cobra", "Bison",
  "Puma", "Moose", "Marten", "Quail", "Finch", " Wren", "Kite", "Lark",
];

function generateMemorableRoom(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return adj + noun;
}

function getDefaultSignalingUrl(): string {
  return (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SIGNALING_URL)
    || "wss://cdwishlist-signaling.nikolaioellegaard.deno.net";
}

export const DEFAULT_SETTINGS: SyncSettings = {
  roomName: generateMemorableRoom(),
  signalingUrl: getDefaultSignalingUrl(),
  password: "",
  maxConns: 25,
  filterBcConns: true,
  iceServers: "stun:stun.l.google.com:19302\nstun:stun1.l.google.com:19302\nstun:stun2.l.google.com:19302\nstun:stun3.l.google.com:19302\nstun:stun4.l.google.com:19302",
  dataSources: [
    "https://raw.githubusercontent.com/zunin/cd6000.dk-history/master/cds.json",
    "https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/master/cds.json",
  ],
};

const STORAGE_KEY = "cdwishlist-sync-settings";

function loadFromStorage(): SyncSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveToStorage(settings: SyncSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export type SettingsState = SyncSettings & {
  needsProviderRestart: boolean;
};

const initialState: SettingsState = {
  ...loadFromStorage(),
  needsProviderRestart: false,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    updateSetting: <K extends keyof SyncSettings>(
      state: SettingsState,
      action: PayloadAction<{ key: K; value: SyncSettings[K] }>,
    ) => {
      (state as SyncSettings)[action.payload.key] = action.payload.value;
      state.needsProviderRestart = true;
      saveToStorage(state as SyncSettings);
    },
    resetToDefaults: (state: SettingsState) => {
      const defaults = { ...DEFAULT_SETTINGS, needsProviderRestart: true };
      Object.assign(state, defaults);
      saveToStorage(DEFAULT_SETTINGS);
    },
    clearRestartFlag: (state: SettingsState) => {
      state.needsProviderRestart = false;
    },
  },
});

export const { updateSetting, resetToDefaults, clearRestartFlag } = settingsSlice.actions;
export { generateMemorableRoom };
export default settingsSlice.reducer;
