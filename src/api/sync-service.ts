// Simple sync service stubs using fetch-compatible signatures
// These are built to work with a generic REST backend (e.g., Supabase PostgREST or custom).
// Wire them by providing SyncConfig from the store; until configured they no-op gracefully.

import type { ChangeEvent, SyncConfig } from '../types';

export type PushPayload = {
  workspaceId: string;
  deviceId: string;
  changes: ChangeEvent[];
};

export type PullResponse = {
  changes: ChangeEvent[];
  serverTime: string;
};

const ensureConfig = (cfg?: SyncConfig) => {
  if (!cfg || !cfg.baseUrl || !cfg.apiKey) return null;
  return cfg;
};

export async function createWorkspace(name: string, cfg?: SyncConfig): Promise<{ workspaceId: string; inviteCode: string } | null> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    // Local-only fallback
    return { workspaceId: `ws-${Date.now()}`, inviteCode: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
  }
  // Example POST; adjust endpoint to your backend
  try {
    const res = await fetch(`${okCfg.baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}

export async function joinWorkspace(inviteCode: string, cfg?: SyncConfig): Promise<{ workspaceId: string } | null> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    // Local-only fallback simulating a join
    return { workspaceId: `ws-${inviteCode}` };
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify({ inviteCode }),
    });
    if (!res.ok) throw new Error('Failed to join workspace');
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}

export async function pushChanges(payload: PushPayload, cfg?: SyncConfig): Promise<boolean> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    // Local-only fallback: treat as success
    return true;
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function pullChanges(workspaceId: string, since: string | null, cfg?: SyncConfig): Promise<PullResponse | null> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    // Local-only fallback returns no changes
    return { changes: [], serverTime: new Date().toISOString() };
  }
  try {
    const url = new URL(`${okCfg.baseUrl}/pull`);
    if (since) url.searchParams.set('since', since);
    url.searchParams.set('workspaceId', workspaceId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${okCfg.apiKey}` },
    });
    if (!res.ok) throw new Error('Failed to pull changes');
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}
