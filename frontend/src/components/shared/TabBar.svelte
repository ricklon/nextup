<script lang="ts">
  interface Tab {
    id: string;
    label: string;
  }

  interface Props {
    tabs: Tab[];
    selected: string;
    onSelect: (id: string) => void;
  }

  let { tabs, selected, onSelect }: Props = $props();
</script>

<div class="tab-bar">
  {#each tabs as tab (tab.id)}
    <button
      class="tab"
      class:selected={selected === tab.id}
      onclick={() => onSelect(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .tab-bar::-webkit-scrollbar {
    display: none;
  }

  .tab {
    flex-shrink: 0;
    min-height: 48px;
    padding: 12px 20px;
    background-color: var(--color-surface, #1e1e3f);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 24px;
    color: var(--color-text-muted, #888);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab:hover {
    border-color: var(--color-primary, #4f9eff);
    color: var(--color-text, #e0e0e0);
  }

  .tab.selected {
    background-color: var(--color-primary, #4f9eff);
    border-color: var(--color-primary, #4f9eff);
    color: white;
  }

  .tab:active {
    transform: scale(0.98);
  }
</style>
