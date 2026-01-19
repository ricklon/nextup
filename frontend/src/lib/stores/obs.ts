import { writable } from 'svelte/store';
import {
  connect as obsConnect,
  disconnect as obsDisconnect,
  onConnectionStateChange,
  onConnectionError,
  updateOverlay as obsUpdateOverlay
} from '../api/obs.js';
import type { Game, Player } from '../types/tournament.js';

export type OBSConnectionState = 'disconnected' | 'connecting' | 'connected';

export const obsConnectionState = writable<OBSConnectionState>('disconnected');
export const obsError = writable<string | null>(null);
export const obsUrl = writable<string>(import.meta.env.VITE_OBS_URL || 'ws://localhost:4455');
export const obsPassword = writable<string>(import.meta.env.VITE_OBS_PASSWORD || '');

onConnectionStateChange((state) => {
  obsConnectionState.set(state);
});

onConnectionError((error) => {
  obsError.set(error);
});

export async function connectOBS(url?: string, password?: string): Promise<void> {
  obsError.set(null);

  try {
    // Pass manualConnect=true to disable auto-reconnect for test button
    await obsConnect(url, password, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to OBS';
    obsError.set(errorMessage);
    throw error;
  }
}

export async function disconnectOBS(): Promise<void> {
  await obsDisconnect();
  obsError.set(null);
}

export async function updateOBSOverlay(
  game: Game,
  players: Player[],
  arenaName: string
): Promise<void> {
  try {
    await obsUpdateOverlay(game, players, arenaName);
  } catch (error) {
    obsError.set(error instanceof Error ? error.message : 'Failed to update OBS overlay');
    throw error;
  }
}
