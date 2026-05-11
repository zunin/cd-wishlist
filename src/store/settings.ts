import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface SyncSettings {
  roomName: string;
  signalingUrl: string;
  password: string;
  maxConns: number;
  filterBcConns: boolean;
  iceServers: string;
}

export const DEFAULT_SETTINGS: SyncSettings = {
  roomName: "com.github.cdwishlist",
  signalingUrl: "wss://cdwishlist-signaling.deno.dev",
  password: "",
  maxConns: 25,
  filterBcConns: false,
  iceServers: "stun:stun.l.google.com:19302\nstun:stun1.l.google.com:19302\nstun:stun2.l.google.com:19302\nstun:stun3.l.google.com:19302\nstun:stun4.l.google.com:19302",
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
export default settingsSlice.reducer;
