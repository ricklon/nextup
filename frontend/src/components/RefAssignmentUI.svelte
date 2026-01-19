<script lang="ts">
  import Card from './shared/Card.svelte';
  import Button from './shared/Button.svelte';
  import TabBar from './shared/TabBar.svelte';
  import LoadingSpinner from './shared/LoadingSpinner.svelte';
  import ErrorAlert from './shared/ErrorAlert.svelte';
  import {
    currentTournament,
    tournamentLoading,
    tournamentError,
    arenas,
    players,
    readyGames,
    upcomingGames,
    availableBrackets,
    selectedBracketFilter,
    loadTournament
  } from '../lib/stores/tournament.js';
  import { formatWaitTime, getWaitMinutes } from '../lib/utils/formatTime.js';
  import {
    assignmentsByArena,
    unassignedGames,
    assignMatch,
    unassignMatch
  } from '../lib/stores/assignments.js';
  import { obsConnectionState, updateOBSOverlay } from '../lib/stores/obs.js';
  import { getBracketShortName } from '../lib/utils/bracketNames.js';
  import type { Game, Location, BracketType } from '../lib/types/tournament.js';

  let selectedArena = $state<Location | null>(null);
  let selectedMatch = $state<Game | null>(null);
  let assigning = $state(false);
  let assignError = $state<string | null>(null);

  const filteredUnassignedGames = $derived(
    $unassignedGames.filter(game => {
      return $selectedBracketFilter === 'all' || game.bracket === $selectedBracketFilter;
    })
  );

  const bracketTabs = $derived([
    { id: 'all', label: 'All' },
    ...$availableBrackets.map(b => ({ id: b, label: getBracketShortName(b) }))
  ]);

  function selectArena(arena: Location) {
    selectedArena = arena;
    selectedMatch = null;
  }

  function selectMatch(game: Game) {
    selectedMatch = game;
  }

  function getPlayerName(playerId: string | null): string {
    if (!playerId) return 'TBD';
    const player = $players.find(p => p.id === playerId);
    return player?.name || 'Unknown';
  }

  function getMatchDescription(game: Game): string {
    const p1 = getPlayerName(game.slots[0].player_id);
    const p2 = getPlayerName(game.slots[1].player_id);
    return `${p1} vs ${p2}`;
  }

  function getMatchInfo(game: Game): string {
    return `${getBracketShortName(game.bracket)} R${game.round} - Bo${game.best_of}`;
  }

  function getWaitTimeClass(game: Game): string {
    const minutes = getWaitMinutes(game.availableSince);
    if (minutes >= 15) return 'wait-urgent';
    if (minutes >= 5) return 'wait-warning';
    return '';
  }

  function getUpcomingDescription(game: Game): string {
    const prereq0 = game.slots[0].prereq_match_id;
    const prereq1 = game.slots[1].prereq_match_id;
    const prereqs = [prereq0, prereq1].filter(Boolean);
    if (prereqs.length === 0) return 'Ready soon';
    if (prereqs.length === 1) return `After ${prereqs[0]}`;
    return `After ${prereqs.join(' & ')}`;
  }

  async function handleAssign() {
    if (!selectedArena || !selectedMatch) return;

    assigning = true;
    assignError = null;

    try {
      await assignMatch(
        selectedMatch.id,
        selectedArena.id,
        selectedArena.name
      );

      if ($obsConnectionState === 'connected') {
        await updateOBSOverlay(selectedMatch, $players, selectedArena.name);
      }

      selectedArena = null;
      selectedMatch = null;
    } catch (error) {
      assignError = error instanceof Error ? error.message : 'Failed to assign match';
    } finally {
      assigning = false;
    }
  }

  async function handleUnassign(matchId: string) {
    try {
      await unassignMatch(matchId);
    } catch (error) {
      assignError = error instanceof Error ? error.message : 'Failed to unassign match';
    }
  }

  function handleBracketFilter(id: string) {
    selectedBracketFilter.set(id as BracketType | 'all');
  }
</script>

<div class="ref-assignment">
  {#if $tournamentLoading && !$currentTournament}
    <div class="loading-container">
      <LoadingSpinner size="large" />
      <p>Loading tournament...</p>
    </div>
  {:else if $tournamentError}
    <ErrorAlert
      message={$tournamentError}
      onRetry={() => $currentTournament && loadTournament($currentTournament.id)}
    />
  {:else}
    <!-- Step 1: Select Arena -->
    <section class="section">
      <h2>1. Select Arena</h2>
      <div class="arena-tabs">
        {#each $arenas as arena (arena.id)}
          {@const assignment = $assignmentsByArena.get(arena.id)}
          <button
            class="arena-tab"
            class:selected={selectedArena?.id === arena.id}
            class:occupied={!!assignment}
            onclick={() => selectArena(arena)}
          >
            <span class="arena-name">{arena.name}</span>
            {#if assignment}
              <span class="arena-status">In Use</span>
            {/if}
          </button>
        {/each}
      </div>

      {#if selectedArena}
        {@const currentAssignment = $assignmentsByArena.get(selectedArena.id)}
        {#if currentAssignment}
          {@const assignedGame = $readyGames.find(g => g.id === currentAssignment.match_id)}
          <div class="current-assignment">
            <div class="assignment-info">
              <span class="label">Currently assigned:</span>
              {#if assignedGame}
                <span class="match">{getMatchDescription(assignedGame)}</span>
                <span class="info">{getMatchInfo(assignedGame)}</span>
              {:else}
                <span class="match">Match #{currentAssignment.match_id}</span>
              {/if}
            </div>
            <Button variant="danger" onclick={() => handleUnassign(currentAssignment.match_id)}>
              Unassign
            </Button>
          </div>
        {/if}
      {/if}
    </section>

    <!-- Step 2: Select Match -->
    <section class="section">
      <h2>2. Select Match</h2>

      {#if bracketTabs.length > 1}
        <TabBar
          tabs={bracketTabs}
          selected={$selectedBracketFilter}
          onSelect={handleBracketFilter}
        />
      {/if}

      {#if filteredUnassignedGames.length === 0}
        <div class="empty-state">
          <p>No unassigned matches available</p>
        </div>
      {:else}
        <div class="match-list">
          {#each filteredUnassignedGames as game (game.id)}
            <Card
              selected={selectedMatch?.id === game.id}
              onclick={() => selectMatch(game)}
            >
              <div class="match-card {getWaitTimeClass(game)}">
                <div class="match-main">
                  <div class="match-players">{getMatchDescription(game)}</div>
                  <div class="match-info">{getMatchInfo(game)}</div>
                </div>
                {#if game.availableSince}
                  <div class="wait-time">{formatWaitTime(game.availableSince)}</div>
                {/if}
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Upcoming Matches -->
    {#if $upcomingGames.length > 0}
      <section class="section upcoming-section">
        <h2>Up Next</h2>
        <div class="upcoming-list">
          {#each $upcomingGames.slice(0, 4) as game (game.id)}
            <div class="upcoming-card">
              <div class="upcoming-main">
                <div class="upcoming-players">{getMatchDescription(game)}</div>
                <div class="upcoming-info">{getMatchInfo(game)}</div>
              </div>
              <div class="upcoming-prereq">{getUpcomingDescription(game)}</div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Step 3: Confirm -->
    {#if selectedArena && selectedMatch}
      <section class="section confirm-section">
        <h2>3. Confirm Assignment</h2>

        {#if assignError}
          <ErrorAlert message={assignError} />
        {/if}

        <div class="confirm-card">
          <div class="confirm-details">
            <div class="confirm-row">
              <span class="label">Arena:</span>
              <span class="value">{selectedArena.name}</span>
            </div>
            <div class="confirm-row">
              <span class="label">Match:</span>
              <span class="value">{getMatchDescription(selectedMatch)}</span>
            </div>
            <div class="confirm-row">
              <span class="label">Bracket:</span>
              <span class="value">{getMatchInfo(selectedMatch)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            loading={assigning}
            onclick={handleAssign}
          >
            Assign to {selectedArena.name}
          </Button>
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .ref-assignment {
    flex: 1;
    padding-bottom: 32px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 48px 16px;
    color: var(--color-text-muted, #888);
  }

  .section {
    padding: 16px;
  }

  .section h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-muted, #888);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .arena-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 0;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .arena-tabs::-webkit-scrollbar {
    display: none;
  }

  .arena-tab {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 100px;
    min-height: 64px;
    padding: 12px 16px;
    background-color: var(--color-surface, #1e1e3f);
    border: 2px solid var(--color-border, #2a2a4a);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .arena-tab:hover {
    border-color: var(--color-primary, #4f9eff);
  }

  .arena-tab.selected {
    background-color: var(--color-primary, #4f9eff);
    border-color: var(--color-primary, #4f9eff);
  }

  .arena-tab.occupied:not(.selected) {
    background-color: var(--color-warning-bg, #3d3d1f);
    border-color: var(--color-warning, #ffb74d);
  }

  .arena-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }

  .arena-status {
    font-size: 10px;
    color: var(--color-warning, #ffb74d);
  }

  .arena-tab.selected .arena-name,
  .arena-tab.selected .arena-status {
    color: white;
  }

  .current-assignment {
    margin-top: 12px;
    padding: 16px;
    background-color: var(--color-surface, #1e1e3f);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .assignment-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .assignment-info .label {
    font-size: 12px;
    color: var(--color-text-muted, #888);
  }

  .assignment-info .match {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }

  .assignment-info .info {
    font-size: 12px;
    color: var(--color-text-muted, #888);
  }

  .empty-state {
    text-align: center;
    padding: 32px 16px;
    color: var(--color-text-muted, #888);
  }

  .match-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  .match-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .match-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .match-players {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }

  .match-info {
    font-size: 12px;
    color: var(--color-text-muted, #888);
  }

  .wait-time {
    font-size: 11px;
    color: var(--color-text-muted, #888);
    text-align: right;
    white-space: nowrap;
  }

  .match-card.wait-warning .wait-time {
    color: var(--color-warning, #ffb74d);
  }

  .match-card.wait-urgent .wait-time {
    color: var(--color-error, #f44336);
    font-weight: 600;
  }

  /* Upcoming Matches */
  .upcoming-section {
    border-top: 1px solid var(--color-border, #2a2a4a);
    background-color: var(--color-surface-light, #252550);
  }

  .upcoming-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .upcoming-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: var(--color-surface, #1e1e3f);
    border: 1px dashed var(--color-border, #2a2a4a);
    border-radius: 8px;
    opacity: 0.7;
  }

  .upcoming-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .upcoming-players {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-muted, #888);
  }

  .upcoming-info {
    font-size: 11px;
    color: var(--color-text-muted, #666);
  }

  .upcoming-prereq {
    font-size: 11px;
    color: var(--color-primary, #4f9eff);
    text-align: right;
  }

  .confirm-section {
    background-color: var(--color-surface, #1e1e3f);
    border-top: 1px solid var(--color-border, #2a2a4a);
    position: sticky;
    bottom: 0;
  }

  .confirm-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .confirm-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .confirm-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .confirm-row .label {
    font-size: 14px;
    color: var(--color-text-muted, #888);
  }

  .confirm-row .value {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text, #e0e0e0);
  }
</style>
