<script lang="ts">
  import Button from './shared/Button.svelte';
  import { obsConnectionState, obsUrl, obsPassword, obsError, connectOBS, disconnectOBS } from '../lib/stores/obs.js';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let url = $state($obsUrl);
  let password = $state($obsPassword);
  let connecting = $state(false);
  let localError = $state<string | null>(null);

  async function handleConnect() {
    connecting = true;
    localError = null;

    try {
      await connectOBS(url, password);
      obsUrl.set(url);
      obsPassword.set(password);
      onClose();
    } catch (error) {
      localError = error instanceof Error ? error.message : 'Failed to connect';
    } finally {
      connecting = false;
    }
  }

  async function handleDisconnect() {
    await disconnectOBS();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose}>
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && onClose()}>
    <div class="modal-header">
      <h2>OBS Settings</h2>
      <button class="close-button" onclick={onClose}>&times;</button>
    </div>

    <div class="modal-body">
      <div class="field">
        <label for="obs-url">WebSocket URL</label>
        <input
          id="obs-url"
          type="text"
          bind:value={url}
          placeholder="ws://localhost:4444"
        />
      </div>

      <div class="field">
        <label for="obs-password">Password (optional)</label>
        <input
          id="obs-password"
          type="password"
          bind:value={password}
          placeholder="Leave empty if no password"
        />
      </div>

      {#if localError || $obsError}
        <div class="error">{localError || $obsError}</div>
      {/if}

      <div class="status">
        Status: <span class="status-value {$obsConnectionState}">{$obsConnectionState}</span>
      </div>
    </div>

    <div class="modal-footer">
      {#if $obsConnectionState === 'connected'}
        <Button variant="danger" onclick={handleDisconnect}>Disconnect</Button>
      {:else}
        <Button variant="primary" loading={connecting} onclick={handleConnect}>Connect</Button>
      {/if}
      <Button variant="secondary" onclick={onClose}>Close</Button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1000;
  }

  .modal {
    background-color: var(--color-surface, #1e1e3f);
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border, #2a2a4a);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: var(--color-text, #e0e0e0);
  }

  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-text-muted, #888);
    cursor: pointer;
    padding: 4px 8px;
  }

  .close-button:hover {
    color: var(--color-text, #e0e0e0);
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted, #888);
  }

  .field input {
    background-color: var(--color-bg, #0f0f23);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    color: var(--color-text, #e0e0e0);
    min-height: 48px;
  }

  .field input:focus {
    outline: none;
    border-color: var(--color-primary, #4f9eff);
  }

  .error {
    background-color: var(--color-error-bg, #3d1f1f);
    border: 1px solid var(--color-error, #ff4f4f);
    border-radius: 8px;
    padding: 12px;
    color: var(--color-error, #ff4f4f);
    font-size: 14px;
  }

  .status {
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

  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--color-border, #2a2a4a);
  }
</style>
