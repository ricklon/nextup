<script lang="ts">
  interface Props {
    size?: 'small' | 'medium' | 'large';
  }

  let { size = 'medium' }: Props = $props();

  const sizeMap = {
    small: '20px',
    medium: '32px',
    large: '48px'
  };
</script>

<div class="spinner" style:--size={sizeMap[size]}></div>

<style>
  .spinner {
    width: var(--size);
    height: var(--size);
    border: 3px solid var(--color-surface-light, #333);
    border-top-color: var(--color-primary, #4f9eff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
