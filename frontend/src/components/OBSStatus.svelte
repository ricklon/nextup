<script lang="ts">
  import { obsConnectionState, obsError } from '../lib/stores/obs.js';

  interface Props {
    onclick?: () => void;
  }

  let { onclick }: Props = $props();

  const stateLabels = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected'
  };
</script>

<button class="obs-status {$obsConnectionState}" {onclick} title={$obsError || stateLabels[$obsConnectionState]}>
  <span class="indicator"></span>
  <span class="label">OBS</span>
</button>

<style>
  .obs-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--color-surface, #1e1e3f);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 20px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .obs-status:hover {
    border-color: var(--color-primary, #4f9eff);
  }

  .indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: background-color 0.3s;
  }

  .disconnected .indicator {
    background-color: var(--color-error, #ff4f4f);
  }

  .connecting .indicator {
    background-color: var(--color-warning, #ffb74d);
    animation: pulse 1s infinite;
  }

  .connected .indicator {
    background-color: var(--color-success, #4caf50);
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
