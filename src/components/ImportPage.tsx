import type { FC } from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../reduxhooks.ts";
import {
  startImport,
  startCSVImport,
  startMatching,
  updateMatchProgress,
  finishMatching,
  updateItemMatch,
  loadPendingIntoImport,
  removeFromPending,
  clearAllPending,
  clearCurrentImport,
} from "../store/importQueue.ts";
import { parseRawCSV, serializeToCSV, parsePlainText } from "../utils/csvParser.ts";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { delay } from "@std/async/delay";
import { ImportPreview } from "./ImportPreview.tsx";
import { ImportColumnMapper } from "./ImportColumnMapper.tsx";

const musicBrainzClient = new MusicBrainzClient();

export const ImportPage: FC = () => {
  const dispatch = useAppDispatch();
  const { pendingItems, currentImport } = useAppSelector(
    (state) => state.importQueue
  );
  const [inputText, setInputText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Check if content looks like CSV (has multiple columns)
  const looksLikeCSV = useCallback((content: string): boolean => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return false;
    
    // Check if any line has commas, tabs, semicolons, or pipes
    const delimiters = [',', '\t', ';', '|'];
    return lines.some(line => 
      delimiters.some(delim => line.includes(delim))
    );
  }, []);

  // Handle plain text import (non-CSV)
  const handlePlainTextImport = useCallback((content: string) => {
    setParseError(null);

    try {
      const albums = parsePlainText(content);

      if (albums.length === 0) {
        setParseError("No albums found in the input. Expected format: Artist - Album");
        return;
      }

      dispatch(startImport(albums));
    } catch (error) {
      setParseError(`Failed to parse input: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [dispatch]);

  // Handle CSV import with column mapping
  const handleCSVImport = useCallback((content: string) => {
    setParseError(null);

    try {
      const rawData = parseRawCSV(content);

      if (rawData.rows.length === 0) {
        setParseError("No data found in the CSV file.");
        return;
      }

      // Check if we have at least 2 columns
      if ((rawData.rows[0]?.length || 0) < 2) {
        setParseError("CSV must have at least 2 columns to map Artist and Album.");
        return;
      }

      dispatch(startCSVImport(rawData));
    } catch (error) {
      setParseError(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [dispatch]);

  const handleParseInput = useCallback((content: string) => {
    if (looksLikeCSV(content)) {
      handleCSVImport(content);
    } else {
      handlePlainTextImport(content);
    }
  }, [looksLikeCSV, handleCSVImport, handlePlainTextImport]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setParseError("Please upload a .csv or .txt file");
      return;
    }

    try {
      const content = await file.text();
      // Always go to column mapping for CSV files
      if (file.name.endsWith('.csv')) {
        handleCSVImport(content);
      } else {
        // For .txt, check if it looks like CSV
        handleParseInput(content);
      }
    } catch (error) {
      setParseError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [handleCSVImport, handleParseInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Effect to handle matching when import starts
  const hasStartedMatching = useRef(false);
  
  useEffect(() => {
    // Reset the flag when import is idle (new import starting)
    if (currentImport.status === 'idle') {
      hasStartedMatching.current = false;
      return;
    }
    
    // Only start matching if we're in preview mode and haven't started yet
    if (currentImport.status === 'preview' && !hasStartedMatching.current && currentImport.items.length > 0) {
      hasStartedMatching.current = true;
      
      const matchAlbums = async () => {
        dispatch(startMatching());

        const items = currentImport.items;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          dispatch(updateMatchProgress({ current: i + 1, total: items.length }));

          try {
            const matches = await musicBrainzClient.getMusicBrainzHits(
              item.artist,
              item.album,
              item.year
            );

            if (matches.length === 0) {
              dispatch(
                updateItemMatch({
                  itemId: item.id,
                  status: "unmatched",
                  matches: [],
                  selectedMatch: null,
                })
              );
            } else if (matches.length === 1) {
              dispatch(
                updateItemMatch({
                  itemId: item.id,
                  status: "matched",
                  matches,
                  selectedMatch: matches[0],
                })
              );
            } else {
              dispatch(
                updateItemMatch({
                  itemId: item.id,
                  status: "multiple",
                  matches,
                  selectedMatch: null,
                })
              );
            }

            // Rate limiting: 200ms delay between requests
            if (i < items.length - 1) {
              await delay(200);
            }
          } catch (error) {
            dispatch(
              updateItemMatch({
                itemId: item.id,
                status: "error",
                matches: [],
                selectedMatch: null,
                error: error instanceof Error ? error.message : String(error),
              })
            );
          }
        }
        
        // Mark matching as complete
        dispatch(finishMatching());
      };

      matchAlbums();
    }
  }, [currentImport.status, currentImport.items, dispatch]);

  const handleExportPending = useCallback(() => {
    const csv = serializeToCSV(
      pendingItems.map((p) => ({ artist: p.artist, album: p.album }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending-imports-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Pending items exported to CSV");
  }, [pendingItems, showNotification]);

  const handleLoadPending = useCallback((itemIds: string[]) => {
    dispatch(loadPendingIntoImport(itemIds));
  }, [dispatch]);

  // Render based on current import status
  if (currentImport.status === 'mapping') {
    return (
      <ImportColumnMapper
        onBack={() => {
          dispatch(clearCurrentImport());
          setInputText("");
        }}
      />
    );
  }

  if (currentImport.status !== "idle") {
    return (
      <ImportPreview
        onBack={() => dispatch(clearCurrentImport())}
        onComplete={() => {
          showNotification("Import completed!");
        }}
      />
    );
  }

  return (
    <div className="import-page">
      <h2>Import Wishlist</h2>

      {notification && (
        <div className="notification notification--success">{notification}</div>
      )}

      <div className="import-section">
        <h3>Import from File or Text</h3>
        <p className="import-hint">
          Upload a CSV file or paste your list. For CSV files, you'll be able to map which columns contain the Artist and Album information.
          <br />
          You can export your Spotify library using tools like{" "}
          <a
            href="https://exportify.net/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Exportify
          </a>{" "}
          or{" "}
          <a
            href="https://spotlistr.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spotlistr
          </a>
          , then upload the CSV file here.
        </p>

        <div
          className={`file-drop-zone ${isDragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <div className="file-drop-content">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drop a CSV file here, or click to browse</p>
            <span className="file-types">Supports .csv and .txt files</span>
          </div>
        </div>

        <div className="or-divider">
          <span>or paste text</span>
        </div>

        <textarea
          className="import-textarea"
          rows={10}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`For CSV format:
Artist,Album,Year
Radiohead,OK Computer,1997
The Beatles,Abbey Road,1969

Or plain text format:
Radiohead - OK Computer
The Beatles - Abbey Road`}
        />

        {parseError && (
          <div className="error-message">{parseError}</div>
        )}

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => handleParseInput(inputText)}
          disabled={!inputText.trim()}
        >
          Preview & Match
        </button>
      </div>

      {pendingItems.length > 0 && (
        <div className="import-section import-section--pending">
          <h3>Pending Queue ({pendingItems.length} items)</h3>
          <p className="import-hint">
            These items were previously unmatched. You can retry matching them or
            export for later.
          </p>

          <div className="pending-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() =>
                handleLoadPending(pendingItems.map((p) => p.id))
              }
            >
              Retry All
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleExportPending}
            >
              Export to CSV
            </button>
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() => {
                if (confirm("Clear all pending items?")) {
                  dispatch(clearAllPending());
                }
              }}
            >
              Clear All
            </button>
          </div>

          <div className="pending-list">
            {pendingItems.slice(0, 5).map((item) => (
              <div key={item.id} className="pending-item">
                <span className="pending-item__text">
                  {item.artist} — {item.album}
                </span>
                <div className="pending-item__actions">
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => handleLoadPending([item.id])}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => dispatch(removeFromPending(item.id))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {pendingItems.length > 5 && (
              <p className="pending-more">
                ...and {pendingItems.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
