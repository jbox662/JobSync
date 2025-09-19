// Simple sync service stubs using fetch-compatible signatures
// These are built to work with a generic REST backend (e.g., Supabase Edge Functions).
// Provide SyncConfig from the store; until configured they no-op gracefully.

import type { ChangeEvent, SyncConfig } from "../types";

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

// Business endpoints
export async function createBusiness(name: string, ownerEmail: string, cfg?: SyncConfig): Promise<{ workspaceId: string; inviteCode: string } | null> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    return { workspaceId: `ws-${Date.now()}`, inviteCode: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify({ name, ownerEmail }),
    });
    if (!res.ok) throw new Error("Failed to create workspace");
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}

export async function createInvites(workspaceId: string, emails: string[], cfg?: SyncConfig): Promise<Array<{ email: string; inviteCode: string }>> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    return emails.map((e) => ({ email: e, inviteCode: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}` }));
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify({ workspaceId, emails }),
    });
    if (!res.ok) throw new Error("Failed to create invites");
    return (await res.json()) as any;
  } catch (e) {
    return [];
  }
}

export async function acceptInvite(email: string, inviteCode: string, deviceId: string, cfg?: SyncConfig): Promise<{ workspaceId: string; role: "owner" | "member" } | null> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    return { workspaceId: `ws-${inviteCode}`, role: "member" } as any;
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${okCfg.apiKey}` },
      body: JSON.stringify({ email, inviteCode, deviceId }),
    });
    if (!res.ok) throw new Error("Failed to accept invite");
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}

export async function listMembers(workspaceId: string, cfg?: SyncConfig): Promise<Array<{ email: string; role: string; createdAt: string }>> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) return [];
  try {
    const url = new URL(`${okCfg.baseUrl}/members`);
    url.searchParams.set("workspaceId", workspaceId);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${okCfg.apiKey}` } });
    if (!res.ok) throw new Error("Failed to list members");
    return (await res.json()) as any;
  } catch (e) {
    return [];
  }
}

// Sync endpoints
export async function pushChanges(payload: PushPayload, cfg?: SyncConfig): Promise<boolean> {
  const okCfg = ensureConfig(cfg);
  if (!okCfg) {
    return true;
  }
  try {
    const res = await fetch(`${okCfg.baseUrl}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${okCfg.apiKey}` },
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
    return { changes: [], serverTime: new Date().toISOString() };
  }
  try {
    const url = new URL(`${okCfg.baseUrl}/pull`);
    if (since) url.searchParams.set("since", since);
    url.searchParams.set("workspaceId", workspaceId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${okCfg.apiKey}` },
    });
    if (!res.ok) throw new Error("Failed to pull changes");
    return (await res.json()) as any;
  } catch (e) {
    return null;
  }
}
