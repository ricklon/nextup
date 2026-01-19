import { writable, derived, get } from 'svelte/store';
import { obsConnectionState } from './obs.js';
import { getSettings } from './settings.js';

export type ServiceStatus = 'unchecked' | 'checking' | 'ok' | 'error';

export interface ServiceState {
  status: ServiceStatus;
  message: string;
}

export interface ConfigState {
  trueFinals: ServiceState;
  worker: ServiceState;
  obs: ServiceState;
}

const initialState: ConfigState = {
  trueFinals: { status: 'unchecked', message: 'Not checked' },
  worker: { status: 'unchecked', message: 'Not checked' },
  obs: { status: 'unchecked', message: 'Not checked' }
};

export const configStatus = writable<ConfigState>(initialState);

export const requiredServicesReady = derived(configStatus, ($status): boolean => {
  return $status.trueFinals.status === 'ok' && $status.worker.status === 'ok';
});

export const isChecking = derived(configStatus, ($status): boolean => {
  return $status.trueFinals.status === 'checking' ||
         $status.worker.status === 'checking' ||
         $status.obs.status === 'checking';
});

function updateService(service: keyof ConfigState, state: ServiceState) {
  configStatus.update(s => ({ ...s, [service]: state }));
}

export async function checkTrueFinalsCredentials(): Promise<boolean> {
  updateService('trueFinals', { status: 'checking', message: 'Checking credentials...' });

  const settings = getSettings();
  const userId = settings.tfUserId;
  const apiKey = settings.tfApiKey;

  if (!userId || !apiKey) {
    updateService('trueFinals', {
      status: 'error',
      message: 'Missing credentials - configure in Settings'
    });
    return false;
  }

  try {
    const response = await fetch('https://truefinals.com/api/v1/user/tournaments', {
      headers: {
        'x-api-user-id': userId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      updateService('trueFinals', {
        status: 'error',
        message: `API error: ${response.status} ${response.statusText}`
      });
      return false;
    }

    updateService('trueFinals', { status: 'ok', message: 'Connected' });
    return true;
  } catch (error) {
    updateService('trueFinals', {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed'
    });
    return false;
  }
}

export async function checkWorkerAPI(): Promise<boolean> {
  updateService('worker', { status: 'checking', message: 'Checking Worker API...' });

  const workerUrl = import.meta.env.VITE_WORKER_URL;

  if (!workerUrl) {
    updateService('worker', {
      status: 'error',
      message: 'Missing VITE_WORKER_URL'
    });
    return false;
  }

  try {
    const response = await fetch(`${workerUrl}/api/assignments?tournamentId=test`);

    if (!response.ok && response.status !== 404) {
      updateService('worker', {
        status: 'error',
        message: `API error: ${response.status} ${response.statusText}`
      });
      return false;
    }

    updateService('worker', { status: 'ok', message: 'Ready' });
    return true;
  } catch (error) {
    updateService('worker', {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed'
    });
    return false;
  }
}

export function checkOBSStatus(): void {
  const state = get(obsConnectionState);

  switch (state) {
    case 'connected':
      updateService('obs', { status: 'ok', message: 'Connected' });
      break;
    case 'connecting':
      updateService('obs', { status: 'checking', message: 'Connecting...' });
      break;
    case 'disconnected':
      updateService('obs', { status: 'error', message: 'Not connected' });
      break;
  }
}

// Subscribe to OBS connection state changes to keep in sync
obsConnectionState.subscribe(state => {
  switch (state) {
    case 'connected':
      updateService('obs', { status: 'ok', message: 'Connected' });
      break;
    case 'connecting':
      updateService('obs', { status: 'checking', message: 'Connecting...' });
      break;
    case 'disconnected':
      const current = get(configStatus);
      if (current.obs.status !== 'unchecked') {
        updateService('obs', { status: 'error', message: 'Not connected' });
      }
      break;
  }
});

export async function checkAllServices(): Promise<boolean> {
  checkOBSStatus();

  const [tfOk, workerOk] = await Promise.all([
    checkTrueFinalsCredentials(),
    checkWorkerAPI()
  ]);

  return tfOk && workerOk;
}

export function resetConfigStatus(): void {
  configStatus.set(initialState);
}
