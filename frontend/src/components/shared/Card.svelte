<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    selected?: boolean;
    onclick?: () => void;
    children: Snippet;
  }

  let { selected = false, onclick, children }: Props = $props();
</script>

{#if onclick}
  <button
    class="card interactive"
    class:selected
    {onclick}
  >
    {@render children()}
  </button>
{:else}
  <div class="card" class:selected>
    {@render children()}
  </div>
{/if}

<style>
  .card {
    background-color: var(--color-surface, #1e1e3f);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 12px;
    padding: 16px;
    text-align: left;
    width: 100%;
  }

  .card.selected {
    border-color: var(--color-primary, #4f9eff);
    background-color: var(--color-surface-selected, #252550);
  }

  .interactive {
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s, transform 0.1s;
    font: inherit;
    color: inherit;
  }

  .interactive:hover {
    border-color: var(--color-primary, #4f9eff);
  }

  .interactive:active {
    transform: scale(0.99);
  }
</style>
