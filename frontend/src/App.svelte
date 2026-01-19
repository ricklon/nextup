<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import TournamentSelector from './components/TournamentSelector.svelte';
  import RefAssignmentUI from './components/RefAssignmentUI.svelte';
  import ArenaStatusBoard from './components/ArenaStatusBoard.svelte';
  import OBSStatus from './components/OBSStatus.svelte';
  import ConfigStatus from './components/ConfigStatus.svelte';
  import Settings from './components/Settings.svelte';
  import TabBar from './components/shared/TabBar.svelte';
  import LoadingSpinner from './components/shared/LoadingSpinner.svelte';
  import ErrorAlert from './components/shared/ErrorAlert.svelte';
  import {
    currentTournament,
    tournamentLoading,
    tournamentError,
    selectTournament,
    clearTournament,
    stopPolling,
    loadTournament
  } from './lib/stores/tournament.js';
  import {
    startAssignmentPolling,
    stopAssignmentPolling,
    clearAssignments
  } from './lib/stores/assignments.js';
  import { connectOBS } from './lib/stores/obs.js';

  type View = 'config' | 'tournaments' | 'assign' | 'status' | 'settings';

  let currentView = $state<View>('config');
  let previousView = $state<View>('tournaments');
  let selectedTournamentId = $state<string | null>(null);

  const viewTabs = [
    { id: 'assign', label: 'Assign' },
    { id: 'status', label: 'Status' }
  ];

  function handleSelectTournament(tournamentId: string) {
    selectedTournamentId = tournamentId;
    selectTournament(tournamentId);
    startAssignmentPolling(tournamentId);
    currentView = 'assign';
  }

  function handleRetryTournament() {
    if (selectedTournamentId) {
      loadTournament(selectedTournamentId);
    }
  }

  function handleBack() {
    clearTournament();
    clearAssignments();
    currentView = 'tournaments';
  }

  function handleViewChange(id: string) {
    currentView = id as View;
  }

  function handleConfigReady() {
    const defaultTournamentId = import.meta.env.VITE_TOURNAMENT_ID;
    if (defaultTournamentId) {
      handleSelectTournament(defaultTournamentId);
    } else {
      currentView = 'tournaments';
    }
  }

  function showSettings() {
    previousView = currentView;
    currentView = 'settings';
  }

  function closeSettings() {
    currentView = previousView;
  }

  onMount(() => {
    connectOBS().catch(() => {});
  });

  onDestroy(() => {
    stopPolling();
    stopAssignmentPolling();
  });
</script>

<div class="app">
  {#if currentView === 'config'}
    <ConfigStatus onContinue={handleConfigReady} />
  {:else if currentView === 'settings'}
    <Settings onClose={closeSettings} />
  {:else if currentView === 'tournaments'}
    <div class="header-bar">
      <div class="header-title">NextUp</div>
      <div class="header-actions">
        <button class="config-button" onclick={showSettings} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <OBSStatus onclick={showSettings} />
      </div>
    </div>
    <TournamentSelector onSelect={handleSelectTournament} />
  {:else}
    <div class="header-bar">
      <button class="back-button" onclick={handleBack}>&larr;</button>
      <div class="header-content">
        <div class="tournament-name">{$currentTournament?.name || 'Tournament'}</div>
        <TabBar
          tabs={viewTabs}
          selected={currentView}
          onSelect={handleViewChange}
        />
      </div>
      <div class="header-actions">
        <button class="config-button" onclick={showSettings} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <OBSStatus onclick={showSettings} />
      </div>
    </div>

    {#if $tournamentLoading && !$currentTournament}
      <div class="loading-container">
        <LoadingSpinner size="large" />
        <p>Loading tournament...</p>
      </div>
    {:else if $tournamentError}
      <div class="error-container">
        <ErrorAlert message={$tournamentError} onRetry={handleRetryTournament} />
      </div>
    {:else if currentView === 'assign'}
      <RefAssignmentUI />
    {:else if currentView === 'status'}
      <ArenaStatusBoard />
    {/if}
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background-color: var(--color-surface, #1e1e3f);
    border-bottom: 1px solid var(--color-border, #2a2a4a);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-primary, #4f9eff);
  }

  .back-button {
    background: none;
    border: none;
    font-size: 24px;
    color: var(--color-text, #e0e0e0);
    cursor: pointer;
    padding: 8px;
    margin: -8px;
    min-width: 48px;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .tournament-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .config-button {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: var(--color-text-muted, #888);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: color 0.2s, background-color 0.2s;
  }

  .config-button:hover {
    color: var(--color-text, #e0e0e0);
    background-color: var(--color-bg, #0f0f23);
  }

  .config-button svg {
    width: 20px;
    height: 20px;
  }

  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 48px 16px;
    color: var(--color-text-muted, #888);
  }

  .error-container {
    flex: 1;
    padding: 16px;
  }

  @media (min-width: 640px) {
    .header-content {
      flex-direction: row;
      align-items: center;
      gap: 24px;
    }

    .tournament-name {
      font-size: 16px;
    }
  }
</style>
