<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './shared/Button.svelte';
  import {
    configStatus,
    checkAllServices,
    checkTrueFinalsCredentials,
    checkWorkerAPI,
    requiredServicesReady,
    isChecking,
    type ServiceStatus
  } from '../lib/stores/configStatus.js';

  interface Props {
    onContinue?: () => void;
    showContinue?: boolean;
  }

  let { onContinue, showContinue = true }: Props = $props();

  function getStatusIcon(status: ServiceStatus): string {
    switch (status) {
      case 'ok': return 'check';
      case 'error': return 'error';
      case 'checking': return 'loading';
      default: return 'unchecked';
    }
  }

  async function handleRetry() {
    await checkAllServices();
  }

  async function retryTrueFinals() {
    await checkTrueFinalsCredentials();
  }

  async function retryWorker() {
    await checkWorkerAPI();
  }

  onMount(async () => {
    const ready = await checkAllServices();
    if (ready && showContinue && onContinue) {
      onContinue();
    }
  });
</script>

<div class="config-status">
  <div class="header">
    <h1>NextUp Configuration</h1>
    <p class="subtitle">Checking service connections...</p>
  </div>

  <div class="services">
    <div class="service" class:ok={$configStatus.trueFinals.status === 'ok'} class:error={$configStatus.trueFinals.status === 'error'}>
      <div class="service-icon {getStatusIcon($configStatus.trueFinals.status)}">
        {#if $configStatus.trueFinals.status === 'checking'}
          <span class="spinner"></span>
        {:else if $configStatus.trueFinals.status === 'ok'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        {:else if $configStatus.trueFinals.status === 'error'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        {/if}
      </div>
      <div class="service-info">
        <div class="service-name">True Finals API</div>
        <div class="service-message">{$configStatus.trueFinals.message}</div>
      </div>
      {#if $configStatus.trueFinals.status === 'error'}
        <button class="retry-btn" onclick={retryTrueFinals}>
          Retry
        </button>
      {/if}
    </div>

    <div class="service" class:ok={$configStatus.worker.status === 'ok'} class:error={$configStatus.worker.status === 'error'}>
      <div class="service-icon {getStatusIcon($configStatus.worker.status)}">
        {#if $configStatus.worker.status === 'checking'}
          <span class="spinner"></span>
        {:else if $configStatus.worker.status === 'ok'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        {:else if $configStatus.worker.status === 'error'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        {/if}
      </div>
      <div class="service-info">
        <div class="service-name">Worker API</div>
        <div class="service-message">{$configStatus.worker.message}</div>
      </div>
      {#if $configStatus.worker.status === 'error'}
        <button class="retry-btn" onclick={retryWorker}>
          Retry
        </button>
      {/if}
    </div>

    <div class="service optional" class:ok={$configStatus.obs.status === 'ok'} class:error={$configStatus.obs.status === 'error'}>
      <div class="service-icon {getStatusIcon($configStatus.obs.status)}">
        {#if $configStatus.obs.status === 'checking'}
          <span class="spinner"></span>
        {:else if $configStatus.obs.status === 'ok'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        {:else if $configStatus.obs.status === 'error'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        {/if}
      </div>
      <div class="service-info">
        <div class="service-name">
          OBS WebSocket
          <span class="optional-badge">optional</span>
        </div>
        <div class="service-message">{$configStatus.obs.message}</div>
      </div>
    </div>
  </div>

  <div class="actions">
    {#if $isChecking}
      <Button variant="secondary" disabled>Checking...</Button>
    {:else if $requiredServicesReady && showContinue}
      <Button variant="primary" onclick={onContinue}>Continue to App</Button>
    {:else}
      <Button variant="secondary" onclick={handleRetry}>Retry All</Button>
    {/if}
  </div>
</div>

<style>
  .config-status {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    max-width: 480px;
    margin: 0 auto;
    width: 100%;
  }

  .header {
    text-align: center;
    margin-bottom: 32px;
  }

  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-primary, #4f9eff);
    margin: 0 0 8px 0;
  }

  .subtitle {
    font-size: 14px;
    color: var(--color-text-muted, #888);
    margin: 0;
  }

  .services {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .service {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background-color: var(--color-surface, #1e1e3f);
    border-radius: 12px;
    border: 2px solid var(--color-border, #2a2a4a);
    transition: border-color 0.2s;
  }

  .service.ok {
    border-color: var(--color-success, #4caf50);
  }

  .service.error:not(.optional) {
    border-color: var(--color-error, #ff4f4f);
  }

  .service.optional.error {
    border-color: var(--color-border, #2a2a4a);
  }

  .service-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--color-bg, #0f0f23);
  }

  .service-icon svg {
    width: 18px;
    height: 18px;
  }

  .service-icon.check {
    color: var(--color-success, #4caf50);
    background-color: rgba(76, 175, 80, 0.15);
  }

  .service-icon.error {
    color: var(--color-error, #ff4f4f);
    background-color: rgba(255, 79, 79, 0.15);
  }

  .optional .service-icon.error {
    color: var(--color-text-muted, #888);
    background-color: var(--color-bg, #0f0f23);
  }

  .service-icon.loading,
  .service-icon.unchecked {
    color: var(--color-text-muted, #888);
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border, #2a2a4a);
    border-top-color: var(--color-primary, #4f9eff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .service-info {
    flex: 1;
    min-width: 0;
  }

  .service-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .optional-badge {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted, #888);
    background-color: var(--color-bg, #0f0f23);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .service-message {
    font-size: 13px;
    color: var(--color-text-muted, #888);
    margin-top: 2px;
  }

  .retry-btn {
    padding: 8px 16px;
    background-color: var(--color-bg, #0f0f23);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 8px;
    color: var(--color-text, #e0e0e0);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }

  .retry-btn:hover:not(:disabled) {
    background-color: var(--color-surface, #1e1e3f);
    border-color: var(--color-primary, #4f9eff);
  }

  .retry-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    justify-content: center;
  }
</style>
