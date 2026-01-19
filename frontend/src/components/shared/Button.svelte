<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    onclick,
    children
  }: Props = $props();
</script>

<button
  class="button {variant} {size}"
  class:full-width={fullWidth}
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <span class="spinner"></span>
  {/if}
  <span class="content" class:hidden={loading}>
    {@render children()}
  </span>
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
    position: relative;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .full-width {
    width: 100%;
  }

  .small {
    min-height: 36px;
    padding: 8px 16px;
    font-size: 14px;
  }

  .small .spinner {
    width: 16px;
    height: 16px;
  }

  .primary {
    background-color: var(--color-primary, #4f9eff);
    color: white;
  }

  .primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover, #3d8ae8);
  }

  .secondary {
    background-color: var(--color-surface-light, #2a2a4a);
    color: var(--color-text, #e0e0e0);
  }

  .secondary:hover:not(:disabled) {
    background-color: var(--color-surface-lighter, #3a3a5a);
  }

  .danger {
    background-color: var(--color-error, #ff4f4f);
    color: white;
  }

  .danger:hover:not(:disabled) {
    background-color: var(--color-error-hover, #ff6b6b);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    position: absolute;
  }

  .content.hidden {
    visibility: hidden;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
