<script lang="ts">
  import Button from './shared/Button.svelte';
  import { settings } from '../lib/stores/settings.js';
  import { connectOBS, disconnectOBS, obsConnectionState, obsError as obsErrorStore } from '../lib/stores/obs.js';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Local state for form fields
  let tfUserId = $state($settings.tfUserId);
  let tfApiKey = $state($settings.tfApiKey);
  let obsUrl = $state($settings.obsUrl);
  let obsPassword = $state($settings.obsPassword);
  let arenasText = $state($settings.defaultArenas.join(', '));
  let tournamentPollInterval = $state($settings.tournamentPollInterval / 1000);
  let assignmentPollInterval = $state($settings.assignmentPollInterval / 1000);

  let obsConnecting = $state(false);
  let obsErrorDetails = $state<string | null>(null);
  let saveMessage = $state<string | null>(null);

  // Compute error details when obsErrorStore changes
  $effect(() => {
    if ($obsErrorStore) {
      obsErrorDetails = getObsErrorDiagnosis($obsErrorStore);
    } else {
      obsErrorDetails = null;
    }
  });

  // Password visibility toggles
  let showApiKey = $state(false);
  let showObsPassword = $state(false);

  function getObsErrorDiagnosis(error: string): string {
    if (error.includes('ECONNREFUSED') || error.includes('ERR_CONNECTION_REFUSED')) {
      return 'OBS is not running or WebSocket server is disabled. Open OBS → Tools → WebSocket Server Settings → Enable WebSocket server';
    }
    if (error.includes('Authentication') || error.includes('auth')) {
      return 'Password mismatch. Check OBS → Tools → WebSocket Server Settings for the correct password, or disable authentication';
    }
    if (error.includes('4444') || error.includes('4455')) {
      return 'Port mismatch. OBS v28+ uses port 4455 by default. Older versions use 4444. Check your OBS WebSocket Server Settings';
    }
    if (error.includes('timeout') || error.includes('Timeout')) {
      return 'Connection timed out. Check if OBS is running and the URL/port are correct';
    }
    if (error.includes('WebSocket')) {
      return 'WebSocket connection failed. Verify the URL format is ws://hostname:port (e.g., ws://localhost:4455)';
    }
    return 'Check that OBS is running with WebSocket server enabled (Tools → WebSocket Server Settings)';
  }

  async function handleOBSConnect() {
    obsConnecting = true;

    try {
      await connectOBS(obsUrl, obsPassword);
    } catch {
      // Error is handled by the store
    } finally {
      obsConnecting = false;
    }
  }

  async function handleOBSDisconnect() {
    await disconnectOBS();
  }

  function handleSave() {
    const arenas = arenasText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    settings.set({
      tfUserId,
      tfApiKey,
      obsUrl,
      obsPassword,
      defaultArenas: arenas,
      tournamentPollInterval: Math.max(500, tournamentPollInterval * 1000),
      assignmentPollInterval: Math.max(500, assignmentPollInterval * 1000)
    });

    saveMessage = 'Settings saved!';
    setTimeout(() => {
      saveMessage = null;
    }, 2000);
  }

  function handleReset() {
    settings.reset();
    // Reload values from store
    tfUserId = $settings.tfUserId;
    tfApiKey = $settings.tfApiKey;
    obsUrl = $settings.obsUrl;
    obsPassword = $settings.obsPassword;
    arenasText = $settings.defaultArenas.join(', ');
    tournamentPollInterval = $settings.tournamentPollInterval / 1000;
    assignmentPollInterval = $settings.assignmentPollInterval / 1000;
    saveMessage = 'Settings reset to defaults';
    setTimeout(() => {
      saveMessage = null;
    }, 2000);
  }
</script>

<div class="settings">
  <div class="settings-header">
    <h1>Settings</h1>
    <button class="close-button" onclick={onClose}>&times;</button>
  </div>

  <div class="settings-content">
    <!-- True Finals API -->
    <section class="settings-section">
      <h2>True Finals API</h2>
      <div class="field">
        <label for="tf-user-id">User ID</label>
        <input
          id="tf-user-id"
          type="text"
          bind:value={tfUserId}
          placeholder="Your True Finals User ID"
        />
      </div>
      <div class="field">
        <label for="tf-api-key">API Key</label>
        <div class="input-with-toggle">
          <input
            id="tf-api-key"
            type={showApiKey ? 'text' : 'password'}
            bind:value={tfApiKey}
            placeholder="Your True Finals API Key"
          />
          <button
            type="button"
            class="toggle-visibility"
            onclick={() => showApiKey = !showApiKey}
            title={showApiKey ? 'Hide' : 'Show'}
          >
            {showApiKey ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <p class="hint">Get these from your True Finals account settings</p>
    </section>

    <!-- OBS Connection -->
    <section class="settings-section">
      <h2>OBS WebSocket</h2>
      <div class="field">
        <label for="obs-url">WebSocket URL</label>
        <input
          id="obs-url"
          type="text"
          bind:value={obsUrl}
          placeholder="ws://localhost:4455"
        />
      </div>
      <div class="field">
        <label for="obs-password">Password (optional)</label>
        <div class="input-with-toggle">
          <input
            id="obs-password"
            type={showObsPassword ? 'text' : 'password'}
            bind:value={obsPassword}
            placeholder="Leave empty if no password"
          />
          <button
            type="button"
            class="toggle-visibility"
            onclick={() => showObsPassword = !showObsPassword}
            title={showObsPassword ? 'Hide' : 'Show'}
          >
            {showObsPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
      <div class="obs-status">
        <span class="status-label">Status:</span>
        <span class="status-value {$obsConnectionState}">{$obsConnectionState}</span>
        {#if $obsConnectionState === 'connected'}
          <Button variant="danger" size="small" onclick={handleOBSDisconnect}>Disconnect</Button>
        {:else}
          <Button variant="primary" size="small" loading={obsConnecting} onclick={handleOBSConnect}>Test Connection</Button>
        {/if}
      </div>

      <!-- Connection details -->
      <div class="obs-connection-info">
        <div class="connection-detail">
          <span class="detail-label">URL:</span>
          <code class="detail-value">{obsUrl || 'ws://localhost:4455'}</code>
        </div>
        <div class="connection-detail">
          <span class="detail-label">Auth:</span>
          <span class="detail-value">{obsPassword ? 'Password set (' + obsPassword.length + ' chars)' : 'No password'}</span>
        </div>
      </div>

      {#if $obsConnectionState === 'connecting'}
        <div class="info-box">
          <div class="info-title">Connecting...</div>
          <div class="info-message">Attempting to connect to {obsUrl || 'ws://localhost:4455'}</div>
        </div>
      {/if}

      {#if $obsErrorStore && $obsConnectionState === 'disconnected'}
        <div class="error-box">
          <div class="error-title">Connection Failed</div>
          <div class="error-message">{$obsErrorStore}</div>
          {#if obsErrorDetails}
            <div class="error-diagnosis">
              <strong>Suggestion:</strong> {obsErrorDetails}
            </div>
          {/if}
        </div>
      {/if}

      {#if $obsConnectionState === 'connected'}
        <div class="success-box">
          <div class="success-title">Connected to OBS</div>
          <div class="success-message">WebSocket connection established successfully</div>
        </div>
      {/if}

      <p class="hint">OBS v28+ default port is 4455. Check Tools → WebSocket Server Settings in OBS.</p>
    </section>

    <!-- Default Arenas -->
    <section class="settings-section">
      <h2>Default Arenas</h2>
      <div class="field">
        <label for="arenas">Arena Names (comma-separated)</label>
        <input
          id="arenas"
          type="text"
          bind:value={arenasText}
          placeholder="Arena 1, Arena 2, Arena 3"
        />
      </div>
      <p class="hint">Used when tournament doesn't have locations configured</p>
    </section>

    <!-- Polling Intervals -->
    <section class="settings-section">
      <h2>Polling Intervals</h2>
      <div class="field">
        <label for="tournament-poll">Tournament refresh (seconds)</label>
        <input
          id="tournament-poll"
          type="number"
          min="0.5"
          max="60"
          step="0.5"
          bind:value={tournamentPollInterval}
        />
      </div>
      <div class="field">
        <label for="assignment-poll">Assignments refresh (seconds)</label>
        <input
          id="assignment-poll"
          type="number"
          min="0.5"
          max="60"
          step="0.5"
          bind:value={assignmentPollInterval}
        />
      </div>
      <p class="hint">Lower values = more responsive but more API calls</p>
    </section>
  </div>

  <div class="settings-footer">
    {#if saveMessage}
      <span class="save-message">{saveMessage}</span>
    {/if}
    <div class="footer-buttons">
      <Button variant="secondary" onclick={handleReset}>Reset to Defaults</Button>
      <Button variant="primary" onclick={handleSave}>Save Settings</Button>
    </div>
  </div>
</div>

<style>
  .settings {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--color-border, #2a2a4a);
  }

  .settings-header h1 {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text, #e0e0e0);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--color-text-muted, #888);
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
  }

  .close-button:hover {
    color: var(--color-text, #e0e0e0);
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .settings-section {
    margin-bottom: 32px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-primary, #4f9eff);
    margin: 0 0 16px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .field {
    margin-bottom: 12px;
  }

  .field label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted, #888);
    margin-bottom: 6px;
  }

  .field input {
    width: 100%;
    background-color: var(--color-bg, #0f0f23);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    color: var(--color-text, #e0e0e0);
    box-sizing: border-box;
  }

  .field input:focus {
    outline: none;
    border-color: var(--color-primary, #4f9eff);
  }

  .field input[type="number"] {
    max-width: 120px;
  }

  .input-with-toggle {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }

  .input-with-toggle input {
    flex: 1;
  }

  .toggle-visibility {
    background-color: var(--color-surface, #1e1e3f);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 16px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .toggle-visibility:hover {
    border-color: var(--color-primary, #4f9eff);
  }

  .hint {
    font-size: 12px;
    color: var(--color-text-muted, #888);
    margin: 8px 0 0 0;
  }

  .obs-status {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .status-label {
    font-size: 14px;
    color: var(--color-text-muted, #888);
  }

  .status-value {
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-value.disconnected {
    color: var(--color-error, #ff4f4f);
  }

  .status-value.connecting {
    color: var(--color-warning, #ffb74d);
  }

  .status-value.connected {
    color: var(--color-success, #4caf50);
  }

  .obs-connection-info {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--color-bg, #0f0f23);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .connection-detail {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .detail-label {
    color: var(--color-text-muted, #888);
    min-width: 40px;
  }

  .detail-value {
    color: var(--color-text, #e0e0e0);
  }

  code.detail-value {
    font-family: monospace;
    background-color: var(--color-surface, #1e1e3f);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .error-box {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--color-error-bg, #3d1f1f);
    border: 1px solid var(--color-error, #ff4f4f);
    border-radius: 8px;
  }

  .error-title {
    font-weight: 600;
    color: var(--color-error, #ff4f4f);
    margin-bottom: 6px;
  }

  .error-message {
    font-size: 13px;
    color: var(--color-error, #ff4f4f);
    font-family: monospace;
    word-break: break-all;
    margin-bottom: 8px;
  }

  .error-diagnosis {
    font-size: 13px;
    color: var(--color-text, #e0e0e0);
    padding-top: 8px;
    border-top: 1px solid rgba(255, 79, 79, 0.3);
  }

  .success-box {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--color-success-bg, #1f3d1f);
    border: 1px solid var(--color-success, #4caf50);
    border-radius: 8px;
  }

  .success-title {
    font-weight: 600;
    color: var(--color-success, #4caf50);
    margin-bottom: 4px;
  }

  .success-message {
    font-size: 13px;
    color: var(--color-text-muted, #888);
  }

  .info-box {
    margin-top: 12px;
    padding: 12px;
    background-color: var(--color-primary-bg, #1f2d3d);
    border: 1px solid var(--color-primary, #4f9eff);
    border-radius: 8px;
  }

  .info-title {
    font-weight: 600;
    color: var(--color-primary, #4f9eff);
    margin-bottom: 4px;
  }

  .info-message {
    font-size: 13px;
    color: var(--color-text-muted, #888);
  }

  .error {
    margin-top: 8px;
    padding: 8px 12px;
    background-color: var(--color-error-bg, #3d1f1f);
    border: 1px solid var(--color-error, #ff4f4f);
    border-radius: 6px;
    color: var(--color-error, #ff4f4f);
    font-size: 13px;
  }

  .settings-footer {
    padding: 16px;
    border-top: 1px solid var(--color-border, #2a2a4a);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .save-message {
    font-size: 14px;
    color: var(--color-success, #4caf50);
  }

  .footer-buttons {
    display: flex;
    gap: 12px;
    margin-left: auto;
  }
</style>
