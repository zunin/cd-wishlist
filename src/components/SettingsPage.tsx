import type { FC } from "react";
import { useState, useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../reduxhooks.ts";
import { updateSetting, resetToDefaults, generateMemorableRoom } from "../store/settings.ts";

type DataSourceStatus = "untested" | "testing" | "success" | "error";

export const SettingsPage: FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const [dataSourceStatuses, setDataSourceStatuses] = useState<Record<string, DataSourceStatus>>({});
  const [dataSources, setDataSources] = useState<string[]>(settings.dataSources);
  const [shareLink, setShareLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const testDataSource = async (url: string) => {
    setDataSourceStatuses((prev) => ({ ...prev, [url]: "testing" }));
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid format");
      }
      setDataSourceStatuses((prev) => ({ ...prev, [url]: "success" }));
    } catch {
      setDataSourceStatuses((prev) => ({ ...prev, [url]: "error" }));
    }
  };

  const generateShareLink = async () => {
    const room = settings.roomName || "default";
    const password = settings.password;
    const baseUrl = window.location.origin;
    const link = password ? `${baseUrl}?room=${encodeURIComponent(room)}&password=${encodeURIComponent(password)}` : `${baseUrl}?room=${encodeURIComponent(room)}`;
    setShareLink(link);

    try {
      const QRCode = await import("qrcode");
      const canvas = qrCanvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, link, { width: 200, margin: 2 });
        setQrCodeUrl(canvas.toDataURL());
      }
    } catch (e) {
      console.error("Failed to generate QR code:", e);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    const testAll = () => {
      settings.dataSources.forEach((url) => {
        if (url.trim()) testDataSource(url.trim());
      });
    };
    if (settings.dataSources.length > 0) {
      testAll();
    }
  }, [settings.dataSources]);

  const updateDataSource = (index: number, value: string) => {
    const updated = [...dataSources];
    updated[index] = value;
    setDataSources(updated);
    dispatch(updateSetting({ key: "dataSources", value: updated.filter((s) => s.trim()) }));
  };

  const addDataSource = () => {
    const updated = [...dataSources, ""];
    setDataSources(updated);
  };

  const removeDataSource = (index: number) => {
    const updated = dataSources.filter((_, i) => i !== index);
    setDataSources(updated);
    dispatch(updateSetting({ key: "dataSources", value: updated.filter((s) => s.trim()) }));
  };

  return (
    <div className="settings-page">
      <h2>Synchronization Settings</h2>

      <div className="settings-group settings-group--sync">
        <label>Sync Room</label>
        <div className="sync-room">
          <div className="sync-room__fields">
            <div className="sync-room__field">
              <label htmlFor="roomName">Room Name</label>
              <div className="room-name-input">
                <input
                  id="roomName"
                  type="text"
                  value={settings.roomName}
                  onChange={(e) => dispatch(updateSetting({ key: "roomName", value: e.target.value }))}
                  placeholder="CosmicPanda"
                />
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={() => dispatch(updateSetting({ key: "roomName", value: generateMemorableRoom() }))}
                  title="Generate new room name"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="sync-room__field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={settings.password}
                onChange={(e) => dispatch(updateSetting({ key: "password", value: e.target.value }))}
                placeholder="(optional)"
              />
            </div>
          </div>
          <div className="sync-room__share">
            <button
              type="button"
              className="btn btn--success"
              onClick={generateShareLink}
            >
              Generate Share Link
            </button>
            {shareLink && (
              <div className="share-link">
                <div className="share-link__row">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="share-link__input"
                  />
                  <button
                    type="button"
                    className={`btn ${copied ? "btn--success" : "btn--secondary"}`}
                    onClick={copyToClipboard}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                {qrCodeUrl && (
                  <div className="share-link__qr">
                    <img src={qrCodeUrl} alt="QR Code" />
                  </div>
                )}
              </div>
            )}
            <canvas ref={qrCanvasRef} style={{ display: "none" }} />
          </div>
        </div>
        <span className="setting-hint">Set a room name and optional password, then generate a share link to sync with others.</span>
      </div>

      <div className="settings-group">
        <label htmlFor="signalingUrl">Signaling Server URL</label>
        <input
          id="signalingUrl"
          type="text"
          value={settings.signalingUrl}
          onChange={(e) => dispatch(updateSetting({ key: "signalingUrl", value: e.target.value }))}
          placeholder="wss://cdwishlist-signaling.deno.dev"
        />
        <span className="setting-hint">WebSocket URL for the WebRTC signaling server. One per line for multiple.</span>
      </div>

      <div className="settings-group">
        <label htmlFor="maxConns">Max Connections</label>
        <input
          id="maxConns"
          type="number"
          min={1}
          max={100}
          value={settings.maxConns}
          onChange={(e) => dispatch(updateSetting({ key: "maxConns", value: Number.parseInt(e.target.value, 10) || 25 }))}
        />
        <span className="setting-hint">Maximum number of WebRTC connections per client.</span>
      </div>

      <div className="settings-group settings-group--checkbox">
        <label htmlFor="filterBcConns">
          <input
            id="filterBcConns"
            type="checkbox"
            checked={settings.filterBcConns}
            onChange={(e) => dispatch(updateSetting({ key: "filterBcConns", value: e.target.checked }))}
          />
          Filter BroadcastChannel Connections
        </label>
        <span className="setting-hint">When enabled, tabs in the same browser share data via BroadcastChannel instead of WebRTC.</span>
      </div>

      <div className="settings-group settings-group--checkbox">
        <label htmlFor="localNetworkOnly">
          <input
            id="localNetworkOnly"
            type="checkbox"
            checked={settings.localNetworkOnly}
            onChange={(e) => dispatch(updateSetting({ key: "localNetworkOnly", value: e.target.checked }))}
          />
          Local Network Only
        </label>
        <span className="setting-hint">When enabled, WebRTC connections are restricted to local network peers only (no TURN relay).</span>
      </div>

      <div className="settings-group">
        <label>Data Sources</label>
        <div className="data-source-list">
          <div className="data-source-list__header">
            <span>URL</span>
            <span>Status</span>
            <span></span>
          </div>
          {dataSources.map((url, i) => (
            <div key={i} className="data-source-list__row">
              <input
                type="text"
                value={url}
                onChange={(e) => updateDataSource(i, e.target.value)}
                placeholder="https://raw.githubusercontent.com/user/repo/master/cds.json"
                className="data-source-list__input"
              />
              <span className={`data-source-list__status data-source-list__status--${url ? (dataSourceStatuses[url] || "untested") : "empty"}`}>
                {url ? (
                  dataSourceStatuses[url] === "testing" ? "Testing..." :
                  dataSourceStatuses[url] === "success" ? "✓ OK" :
                  dataSourceStatuses[url] === "error" ? "✗ Failed" :
                  "—"
                ) : "—"}
              </span>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => url && testDataSource(url)}
                disabled={!url || dataSourceStatuses[url] === "testing"}
                title="Test this source"
              >
                {url && dataSourceStatuses[url] === "testing" ? "..." : "Test"}
              </button>
              <button
                type="button"
                className="btn btn--small btn--danger"
                onClick={() => removeDataSource(i)}
                title="Remove this source"
              >
                ×
              </button>
            </div>
          ))}
          <div className="data-source-list__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={addDataSource}
            >
              + Add Source
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => dataSources.forEach((url) => url.trim() && testDataSource(url.trim()))}
            >
              Test All
            </button>
          </div>
        </div>
        <span className="setting-hint">URLs to JSON files containing CD wishlist data.</span>
      </div>

      <div className="settings-group">
        <label htmlFor="iceServers">ICE Servers (one per line)</label>
        <textarea
          id="iceServers"
          rows={5}
          value={settings.iceServers}
          onChange={(e) => dispatch(updateSetting({ key: "iceServers", value: e.target.value }))}
          placeholder="stun:stun.l.google.com:19302"
        />
        <span className="setting-hint">STUN/TURN servers for NAT traversal. One URL per line.</span>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => dispatch(resetToDefaults())}
        >
          Reset to Defaults
        </button>
      </div>

      {settings.needsProviderRestart && (
        <div className="settings-notice">
          Settings will apply on next page reload.
        </div>
      )}
    </div>
  );
};
