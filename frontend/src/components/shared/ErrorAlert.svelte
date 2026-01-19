<script lang="ts">
  interface Props {
    message: string;
    onRetry?: () => void;
  }

  let { message, onRetry }: Props = $props();
</script>

<div class="error-alert">
  <div class="error-message">{message}</div>
  {#if onRetry}
    <button class="retry-button" onclick={onRetry}>Retry</button>
  {/if}
</div>

<style>
  .error-alert {
    background-color: var(--color-error-bg, #3d1f1f);
    border: 1px solid var(--color-error, #ff4f4f);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .error-message {
    color: var(--color-error, #ff4f4f);
    font-size: 14px;
  }

  .retry-button {
    background-color: var(--color-error, #ff4f4f);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    min-height: 48px;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background-color: var(--color-error-hover, #ff6b6b);
  }

  .retry-button:active {
    transform: scale(0.98);
  }
</style>
