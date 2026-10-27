import { useCallback, useEffect, useRef } from "react";

// Polling is only an observer. Aborting an HTTP request never stops a server task.
export default function useBackgroundRuns({
  enabled,
  ready,
  accountId,
  token,
  onSnapshot,
  onConnection,
}) {
  const callbacks = useRef({ onSnapshot, onConnection });
  callbacks.current = { onSnapshot, onConnection };
  const versions = useRef(new Map());
  const latest = useRef(new Map());
  const removed = useRef(new Set());
  const streaming = useRef(false);
  const account = useRef(accountId);
  account.current = accountId;
  const api = useCallback(
    async (path = "", method = "GET", body) => {
      const response = await fetch(`/api/openclaw/runs${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Workspace-Token": token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`后台任务请求失败 (${response.status})`);
      return response.json();
    },
    [token],
  );
  const accept = useCallback((entry) => {
    if (removed.current.has(entry.id)) return;
    const previous = latest.current.get(entry.id);
    if (
      previous &&
      ((previous.runId === entry.runId && previous.runVersion >= entry.runVersion) ||
        previous.startedAt > entry.startedAt)
    )
      return;
    latest.current.set(entry.id, entry);
    const version = `${entry.runId}:${entry.runVersion}`;
    if (versions.current.get(entry.id) === version) return;
    versions.current.set(entry.id, version);
    callbacks.current.onSnapshot(entry);
  }, []);
  const refresh = useCallback(async () => {
    const owner = accountId;
    const data = await api();
    if (owner !== account.current) return;
    for (const entry of data.runs || []) accept(entry);
    callbacks.current.onConnection(true);
    return data.runs || [];
  }, [api, accountId, accept]);
  useEffect(() => {
    versions.current.clear();
    latest.current.clear();
    removed.current.clear();
  }, [accountId]);
  useEffect(() => {
    if (!enabled || !ready || !accountId) return;
    const owner = accountId;
    const source = new EventSource("/api/openclaw/runs/stream");
    source.onopen = () => {
      streaming.current = true;
      callbacks.current.onConnection(true);
      refresh().catch(() => {});
    };
    source.addEventListener("snapshot", (event) => {
      if (owner !== account.current) return;
      try { accept(JSON.parse(event.data)); } catch { refresh().catch(() => {}); }
    });
    source.addEventListener("text", (event) => {
      if (owner !== account.current) return;
      try {
        const patch = JSON.parse(event.data);
        const previous = latest.current.get(patch.id);
        if (previous?.runId === patch.runId && previous.runVersion >= patch.runVersion) return;
        if (!previous || previous.runId !== patch.runId || previous.runVersion !== patch.fromVersion) {
          refresh().catch(() => {});
          return;
        }
        const messages = [...previous.messages];
        const last = messages.length - 1;
        messages[last] = { ...messages[last],
          content: (messages[last].content || "") + patch.content,
          thinking: (messages[last].thinking || "") + patch.thinking,
        };
        accept({ ...previous, runVersion: patch.runVersion, updatedAt: patch.updatedAt, messages });
      } catch { refresh().catch(() => {}); }
    });
    source.onerror = () => {
      streaming.current = false;
      refresh().catch(() => callbacks.current.onConnection(false));
    };
    return () => { source.close(); streaming.current = false; };
  }, [enabled, ready, accountId, refresh, accept]);
  useEffect(() => {
    if (!enabled || !ready || !accountId) return;
    let disposed = false,
      running = false,
      timer;
    const poll = async () => {
      if (disposed || running) return;
      clearTimeout(timer);
      running = true;
      try {
        await refresh();
      } catch {
        if (!disposed) callbacks.current.onConnection(false);
      } finally {
        running = false;
        if (!disposed) timer = setTimeout(poll, streaming.current ? 15000 : document.hidden ? 5000 : 1500);
      }
    };
    const wake = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", poll);
    poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", poll);
    };
  }, [enabled, ready, accountId, refresh]);
  return {
    latest,
    refresh,
    accept,
    start: async (body) => {
      try {
        const entry = await api("", "POST", body);
        accept(entry);
        return entry;
      } catch (error) {
        const entries = await refresh().catch(() => []);
        const entry = entries.find((item) => item.runId === body.runId);
        if (entry) return entry;
        throw error;
      }
    },
    stop: async (id, runId) => {
      const entry = await api(`/${id}/stop`, "POST", { runId });
      accept(entry);
    },
    remove: async (id) => {
      await api(`/${id}`, "DELETE");
      removed.current.add(id);
      versions.current.delete(id);
      latest.current.delete(id);
    },
  };
}
