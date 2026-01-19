import OBSWebSocket from 'obs-websocket-js';
import type { Game, Player } from '../types/tournament.js';
import { getBracketName } from '../utils/bracketNames.js';

let obs: OBSWebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let lastError: string | null = null;
let stateListeners: Set<(state: typeof connectionState) => void> = new Set();
let errorListeners: Set<(error: string | null) => void> = new Set();
let autoReconnectEnabled = true;

const RECONNECT_DELAY = 5000;

function notifyStateChange(state: typeof connectionState) {
  connectionState = state;
  stateListeners.forEach(listener => listener(state));
}

function notifyError(error: string | null) {
  lastError = error;
  errorListeners.forEach(listener => listener(error));
}

export function onConnectionStateChange(listener: (state: 'disconnected' | 'connecting' | 'connected') => void) {
  stateListeners.add(listener);
  listener(connectionState);
  return () => stateListeners.delete(listener);
}

export function onConnectionError(listener: (error: string | null) => void) {
  errorListeners.add(listener);
  listener(lastError);
  return () => errorListeners.delete(listener);
}

export function getConnectionState() {
  return connectionState;
}

export function getLastError() {
  return lastError;
}

export async function connect(url?: string, password?: string, manualConnect = false): Promise<void> {
  if (obs && connectionState === 'connected') {
    return;
  }

  const obsUrl = url || import.meta.env.VITE_OBS_URL || 'ws://localhost:4455';
  const obsPassword = password || import.meta.env.VITE_OBS_PASSWORD || undefined;

  // Disable auto-reconnect for manual connections (test button)
  if (manualConnect) {
    autoReconnectEnabled = false;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Clean up any existing connection
  if (obs) {
    try {
      await obs.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    obs = null;
  }

  notifyStateChange('connecting');
  notifyError(null);

  console.log('[OBS] Attempting connection to:', obsUrl, 'with password:', obsPassword ? 'yes' : 'no');

  try {
    obs = new OBSWebSocket();

    // Create a promise that rejects on connection error
    const connectionPromise = new Promise<void>((resolve, reject) => {
      let resolved = false;

      obs!.on('ConnectionClosed', (data) => {
        console.log('[OBS] ConnectionClosed event:', data);
        const reason = data?.message || 'Connection closed unexpectedly';
        notifyStateChange('disconnected');
        if (!resolved) {
          resolved = true;
          notifyError(reason);
          reject(new Error(reason));
        } else {
          notifyError(reason);
          if (autoReconnectEnabled) {
            scheduleReconnect(obsUrl, obsPassword);
          }
        }
      });

      obs!.on('ConnectionError', (error) => {
        console.log('[OBS] ConnectionError event:', error);
        const errorMsg = String(error?.message || error?.code || 'Connection error');
        notifyStateChange('disconnected');
        if (!resolved) {
          resolved = true;
          notifyError(errorMsg);
          reject(new Error(errorMsg));
        } else {
          notifyError(errorMsg);
          if (autoReconnectEnabled) {
            scheduleReconnect(obsUrl, obsPassword);
          }
        }
      });

      // Actually attempt the connection
      obs!.connect(obsUrl, obsPassword)
        .then(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        })
        .catch((err) => {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });
    });

    // Add a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Connection timeout - could not reach ${obsUrl}. Is OBS running with WebSocket server enabled?`));
      }, 10000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('[OBS] Connected successfully');
    notifyStateChange('connected');
    notifyError(null);
    autoReconnectEnabled = true; // Re-enable for future disconnects
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OBS] Connection failed:', errorMessage);
    notifyStateChange('disconnected');
    notifyError(errorMessage);
    obs = null;
    if (autoReconnectEnabled) {
      scheduleReconnect(obsUrl, obsPassword);
    }
    throw error;
  }
}

function scheduleReconnect(url: string, password?: string) {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(url, password).catch(() => {});
  }, RECONNECT_DELAY);
}

export async function disconnect(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (obs) {
    await obs.disconnect();
    obs = null;
  }

  notifyStateChange('disconnected');
}

export async function switchScene(sceneName: string): Promise<void> {
  if (!obs || connectionState !== 'connected') {
    throw new Error('OBS not connected');
  }

  await obs.call('SetCurrentProgramScene', { sceneName });
}

export async function updateTextSource(sourceName: string, text: string): Promise<void> {
  if (!obs || connectionState !== 'connected') {
    throw new Error('OBS not connected');
  }

  await obs.call('SetInputSettings', {
    inputName: sourceName,
    inputSettings: { text }
  });
}

export async function updateOverlay(
  game: Game,
  players: Player[],
  arenaName: string
): Promise<void> {
  if (!obs || connectionState !== 'connected') {
    throw new Error('OBS not connected');
  }

  const player1 = game.slots[0].player_id
    ? players.find(p => p.id === game.slots[0].player_id)
    : null;
  const player2 = game.slots[1].player_id
    ? players.find(p => p.id === game.slots[1].player_id)
    : null;

  const scoreToWin = Math.ceil(game.best_of / 2);
  const matchName = `${getBracketName(game.bracket)} Round ${game.round}`;

  const updates: [string, string][] = [
    ['MatchName', matchName],
    ['BracketName', getBracketName(game.bracket)],
    ['RoundNumber', `Round ${game.round}`],
    ['ScoreToWin', `First to ${scoreToWin}`],
    ['Player1Name', player1?.name || 'TBD'],
    ['Player1Tag', player1?.tag || ''],
    ['Player1Seed', player1?.seed?.toString() || ''],
    ['Player2Name', player2?.name || 'TBD'],
    ['Player2Tag', player2?.tag || ''],
    ['Player2Seed', player2?.seed?.toString() || '']
  ];

  await Promise.all(
    updates.map(([source, text]) =>
      updateTextSource(source, text).catch(err => {
        console.warn(`Failed to update ${source}:`, err);
      })
    )
  );

  await switchScene(arenaName);
}
