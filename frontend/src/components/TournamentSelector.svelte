<script lang="ts">
  import { onMount } from 'svelte';
  import Card from './shared/Card.svelte';
  import LoadingSpinner from './shared/LoadingSpinner.svelte';
  import ErrorAlert from './shared/ErrorAlert.svelte';
  import {
    tournaments,
    tournamentsLoading,
    tournamentsError,
    loadTournaments
  } from '../lib/stores/tournament.js';

  interface Props {
    onSelect: (tournamentId: string) => void;
  }

  let { onSelect }: Props = $props();

  onMount(() => {
    loadTournaments();
  });

  function getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'in_progress':
        return 'status-active';
      case 'complete':
        return 'status-complete';
      default:
        return 'status-pending';
    }
  }

  function formatStatus(status: string | undefined): string {
    if (!status) return 'unknown';
    return status.replace('_', ' ');
  }
</script>

<div class="tournament-selector">
  <h1>Select Tournament</h1>

  {#if $tournamentsLoading && $tournaments.length === 0}
    <div class="loading-container">
      <LoadingSpinner size="large" />
      <p>Loading tournaments...</p>
    </div>
  {:else if $tournamentsError}
    <ErrorAlert message={$tournamentsError} onRetry={loadTournaments} />
  {:else if $tournaments.length === 0}
    <div class="empty-state">
      <p>No tournaments found</p>
      <p class="hint">Create a tournament on True Finals to get started</p>
    </div>
  {:else}
    <div class="tournament-list">
      {#each $tournaments as tournament (tournament.id)}
        <Card onclick={() => onSelect(tournament.id)}>
          <div class="tournament-card">
            <div class="tournament-name">{tournament.name}</div>
            <span class="status-badge {getStatusBadgeClass(tournament.status)}">
              {formatStatus(tournament.status)}
            </span>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tournament-selector {
    padding: 16px;
  }

  h1 {
    font-size: 24px;
    margin: 0 0 24px 0;
    color: var(--color-text, #e0e0e0);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 48px 0;
    color: var(--color-text-muted, #888);
  }

  .empty-state {
    text-align: center;
    padding: 48px 0;
    color: var(--color-text-muted, #888);
  }

  .empty-state .hint {
    font-size: 14px;
    margin-top: 8px;
  }

  .tournament-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tournament-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .tournament-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }

  .status-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 12px;
    text-transform: capitalize;
  }

  .status-active {
    background-color: var(--color-success-bg, #1f3d1f);
    color: var(--color-success, #4caf50);
  }

  .status-complete {
    background-color: var(--color-surface-light, #2a2a4a);
    color: var(--color-text-muted, #888);
  }

  .status-pending {
    background-color: var(--color-warning-bg, #3d3d1f);
    color: var(--color-warning, #ffb74d);
  }
</style>
