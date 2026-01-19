<script lang="ts">
  import Card from './shared/Card.svelte';
  import LoadingSpinner from './shared/LoadingSpinner.svelte';
  import {
    currentTournament,
    tournamentLoading,
    players
  } from '../lib/stores/tournament.js';
  import { arenaAssignments } from '../lib/stores/assignments.js';
  import { getBracketShortName } from '../lib/utils/bracketNames.js';
  import type { Game } from '../lib/types/tournament.js';

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
</script>

<div class="arena-board">
  {#if $tournamentLoading && !$currentTournament}
    <div class="loading-container">
      <LoadingSpinner size="large" />
      <p>Loading...</p>
    </div>
  {:else}
    <div class="arena-grid">
      {#each $arenaAssignments as { arena, assignment, game } (arena.id)}
        <Card>
          <div class="arena-card" class:occupied={!!assignment}>
            <div class="arena-header">
              <span class="arena-name">{arena.name}</span>
              <span class="status-indicator" class:active={!!assignment}></span>
            </div>

            {#if assignment && game}
              <div class="assignment-details">
                <div class="match-players">{getMatchDescription(game)}</div>
                <div class="match-info">{getMatchInfo(game)}</div>
              </div>
            {:else}
              <div class="empty-arena">
                <span>Available</span>
              </div>
            {/if}
          </div>
        </Card>
      {/each}
    </div>

    {#if $arenaAssignments.length === 0}
      <div class="empty-state">
        <p>No arenas configured</p>
        <p class="hint">Add locations in your True Finals tournament settings</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .arena-board {
    flex: 1;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 48px 16px;
    color: var(--color-text-muted, #888);
  }

  .arena-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    padding: 16px;
  }

  .arena-card {
    min-height: 120px;
    display: flex;
    flex-direction: column;
  }

  .arena-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .arena-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text, #e0e0e0);
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--color-success, #4caf50);
  }

  .status-indicator.active {
    background-color: var(--color-warning, #ffb74d);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .assignment-details {
    flex: 1;
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

  .empty-arena {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted, #888);
    font-size: 14px;
  }

  .empty-state {
    text-align: center;
    padding: 48px 16px;
    color: var(--color-text-muted, #888);
  }

  .empty-state .hint {
    font-size: 14px;
    margin-top: 8px;
  }
</style>
