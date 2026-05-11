import type { FC } from "react";
import { useAppSelector, useAppDispatch } from "../reduxhooks.ts";
import { updateSetting, resetToDefaults, DEFAULT_SETTINGS } from "../store/settings.ts";

export const SettingsPage: FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  return (
    <div className="settings-page">
      <h2>Synchronization Settings</h2>

      <div className="settings-group">
        <label htmlFor="roomName">Room Name</label>
        <input
          id="roomName"
          type="text"
          value={settings.roomName}
          onChange={(e) => dispatch(updateSetting({ key: "roomName", value: e.target.value }))}
          placeholder="com.github.cdwishlist"
        />
        <span className="setting-hint">Unique identifier for the sync room. All clients in the same room share data.</span>
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
        <label htmlFor="password">Room Password</label>
        <input
          id="password"
          type="password"
          value={settings.password}
          onChange={(e) => dispatch(updateSetting({ key: "password", value: e.target.value }))}
          placeholder="(optional)"
        />
        <span className="setting-hint">Encrypts communication over the signaling server. All clients must use the same password.</span>
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
