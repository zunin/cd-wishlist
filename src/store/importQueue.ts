import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ParsedAlbum, RawCSVData, ColumnMappingConfig, ColumnMapping } from '../utils/csvParser.ts';
import type { MusicbrainzMeta } from '../models/MusicbrainzMeta.ts';

export type MatchStatus = 'pending' | 'matching' | 'matched' | 'unmatched' | 'multiple' | 'error';

export interface ImportItem {
  id: string;
  artist: string;
  album: string;
  year?: number;
  status: MatchStatus;
  matches: MusicbrainzMeta[];
  selectedMatch: MusicbrainzMeta | null;
  error?: string;
}

export interface PendingItem {
  id: string;
  artist: string;
  album: string;
  year?: number;
  attempts: number;
  addedAt: number;
}

export interface ImportQueueState {
  pendingItems: PendingItem[];
  currentImport: {
    items: ImportItem[];
    status: 'idle' | 'mapping' | 'matching' | 'preview' | 'importing';
    progress: { current: number; total: number } | null;
    rawData?: RawCSVData;
    columnMapping?: ColumnMappingConfig;
  };
}

const PENDING_STORAGE_KEY = 'cdwishlist-import-pending';

function loadPendingFromStorage(): PendingItem[] {
  try {
    const stored = localStorage.getItem(PENDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

function savePendingToStorage(items: PendingItem[]) {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

const initialState: ImportQueueState = {
  pendingItems: loadPendingFromStorage(),
  currentImport: {
    items: [],
    status: 'idle',
    progress: null,
  },
};

export const importQueueSlice = createSlice({
  name: 'importQueue',
  initialState,
  reducers: {
    startImport: (state, action: PayloadAction<ParsedAlbum[]>) => {
      const albums = action.payload;
      state.currentImport = {
        items: albums.map((album, index) => ({
          id: `import-${Date.now()}-${index}`,
          artist: album.artist,
          album: album.album,
          year: album.year,
          status: 'pending',
          matches: [],
          selectedMatch: null,
        })),
        status: 'preview',
        progress: null,
      };
    },

    startCSVImport: (state, action: PayloadAction<RawCSVData>) => {
      const rawData = action.payload;
      // Initialize with empty mappings (all 'skip')
      const mappings: ColumnMapping[] = rawData.rows[0]?.map(() => 'skip') || [];
      
      state.currentImport = {
        items: [],
        status: 'mapping',
        progress: null,
        rawData,
        columnMapping: {
          mappings,
          hasHeaderRow: false,
          delimiter: rawData.delimiter,
        },
      };
    },

    updateColumnMapping: (state, action: PayloadAction<{
      columnIndex: number;
      mapping: ColumnMapping;
    }>) => {
      const { columnIndex, mapping } = action.payload;
      if (state.currentImport.columnMapping) {
        state.currentImport.columnMapping.mappings[columnIndex] = mapping;
      }
    },

    updateHasHeaderRow: (state, action: PayloadAction<boolean>) => {
      if (state.currentImport.columnMapping) {
        state.currentImport.columnMapping.hasHeaderRow = action.payload;
      }
    },

    updateDelimiter: (state, action: PayloadAction<string>) => {
      if (state.currentImport.columnMapping) {
        state.currentImport.columnMapping.delimiter = action.payload;
      }
    },

    applyColumnMappingAndContinue: (state, action: PayloadAction<ParsedAlbum[]>) => {
      const albums = action.payload;
      state.currentImport.items = albums.map((album, index) => ({
        id: `import-${Date.now()}-${index}`,
        artist: album.artist,
        album: album.album,
        year: album.year,
        status: 'pending',
        matches: [],
        selectedMatch: null,
      }));
      state.currentImport.status = 'preview';
      state.currentImport.progress = null;
    },

    startMatching: (state) => {
      state.currentImport.status = 'matching';
      state.currentImport.progress = {
        current: 0,
        total: state.currentImport.items.length,
      };
    },

    updateMatchProgress: (state, action: PayloadAction<{ current: number; total: number }>) => {
      state.currentImport.progress = action.payload;
    },

    finishMatching: (state) => {
      state.currentImport.status = 'preview';
      state.currentImport.progress = null;
    },

    updateItemMatch: (state, action: PayloadAction<{
      itemId: string;
      status: MatchStatus;
      matches: MusicbrainzMeta[];
      selectedMatch?: MusicbrainzMeta | null;
      error?: string;
    }>) => {
      const { itemId, status, matches, selectedMatch, error } = action.payload;
      const item = state.currentImport.items.find(i => i.id === itemId);
      if (item) {
        item.status = status;
        item.matches = matches;
        if (selectedMatch !== undefined) {
          item.selectedMatch = selectedMatch;
        }
        if (error) {
          item.error = error;
        }
      }
    },

    selectMatch: (state, action: PayloadAction<{
      itemId: string;
      match: MusicbrainzMeta | null;
    }>) => {
      const { itemId, match } = action.payload;
      const item = state.currentImport.items.find(i => i.id === itemId);
      if (item) {
        item.selectedMatch = match;
        if (match) {
          item.status = 'matched';
        }
      }
    },

    startImporting: (state) => {
      state.currentImport.status = 'importing';
    },

    clearCurrentImport: (state) => {
      state.currentImport = {
        items: [],
        status: 'idle',
        progress: null,
      };
    },

    saveUnmatchedToPending: (state) => {
      const unmatchedItems = state.currentImport.items.filter(
        item => item.status === 'unmatched' || item.status === 'multiple'
      );

      const newPendingItems: PendingItem[] = unmatchedItems.map(item => ({
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        artist: item.artist,
        album: item.album,
        attempts: 1,
        addedAt: Date.now(),
      }));

      state.pendingItems = [...state.pendingItems, ...newPendingItems];
      savePendingToStorage(state.pendingItems);
    },

    removeFromPending: (state, action: PayloadAction<string>) => {
      state.pendingItems = state.pendingItems.filter(item => item.id !== action.payload);
      savePendingToStorage(state.pendingItems);
    },

    loadPendingIntoImport: (state, action: PayloadAction<string[]>) => {
      const itemIds = action.payload;
      const itemsToLoad = state.pendingItems.filter(item => itemIds.includes(item.id));

      if (itemsToLoad.length > 0) {
        state.currentImport = {
          items: itemsToLoad.map((item, index) => ({
            id: `import-${Date.now()}-${index}`,
            artist: item.artist,
            album: item.album,
            status: 'pending',
            matches: [],
            selectedMatch: null,
          })),
          status: 'preview',
          progress: null,
        };

        // Remove loaded items from pending
        state.pendingItems = state.pendingItems.filter(item => !itemIds.includes(item.id));
        savePendingToStorage(state.pendingItems);
      }
    },

    clearAllPending: (state) => {
      state.pendingItems = [];
      savePendingToStorage([]);
    },
  },
});

export const {
  startImport,
  startCSVImport,
  updateColumnMapping,
  updateHasHeaderRow,
  updateDelimiter,
  applyColumnMappingAndContinue,
  startMatching,
  updateMatchProgress,
  finishMatching,
  updateItemMatch,
  selectMatch,
  startImporting,
  clearCurrentImport,
  saveUnmatchedToPending,
  removeFromPending,
  loadPendingIntoImport,
  clearAllPending,
} = importQueueSlice.actions;

export default importQueueSlice.reducer;
