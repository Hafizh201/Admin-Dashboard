import { api } from "./api";

export interface SyncItem {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "uploading" | "synced" | "failed";
  createdAt: string;
  retry: number;
}

const QUEUE_KEY = "pending_sync_queue";
const MAX_RETRY = 3;

export function getQueue(): SyncItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SyncItem[];
    return parsed.filter((i) => i.status !== "synced");
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((i) => i.status !== "synced")));
  } catch {}
}

export function addToQueue(action: string, payload: Record<string, unknown>): string {
  const id = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const queue = getQueue();
  queue.push({ id, action, payload, status: "pending", createdAt: new Date().toISOString(), retry: 0 });
  saveQueue(queue);
  return id;
}

export function getQueueStats() {
  const queue = getQueue();
  return {
    pending: queue.filter((i) => i.status === "pending" || i.status === "uploading").length,
    failed: queue.filter((i) => i.status === "failed").length,
    total: queue.length,
  };
}

function updateItem(id: string, patch: Partial<SyncItem>): void {
  const queue = getQueue();
  const idx = queue.findIndex((i) => i.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...patch };
    saveQueue(queue);
  }
}

let isProcessing = false;

export async function processQueue(pin: string, onDone?: () => void): Promise<void> {
  if (isProcessing) return;
  if (!navigator.onLine) return;

  const queue = getQueue();
  const toProcess = queue.filter(
    (i) => i.status === "pending" || (i.status === "failed" && i.retry < MAX_RETRY)
  );
  if (toProcess.length === 0) return;

  isProcessing = true;
  let anySuccess = false;

  try {
    for (const item of toProcess) {
      updateItem(item.id, { status: "uploading" });
      try {
        const res = await api({ ...item.payload, action: item.action, pin });
        if (res.ok) {
          updateItem(item.id, { status: "synced" });
          anySuccess = true;
        } else {
          const newRetry = item.retry + 1;
          updateItem(item.id, {
            status: newRetry >= MAX_RETRY ? "failed" : "pending",
            retry: newRetry,
          });
        }
      } catch {
        const newRetry = item.retry + 1;
        updateItem(item.id, {
          status: newRetry >= MAX_RETRY ? "failed" : "pending",
          retry: newRetry,
        });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  } finally {
    isProcessing = false;
    if (anySuccess && onDone) onDone();
  }
}

export function retryFailed(pin: string, onDone?: () => void): void {
  const queue = getQueue();
  queue.filter((i) => i.status === "failed").forEach((i) => updateItem(i.id, { status: "pending", retry: 0 }));
  processQueue(pin, onDone);
}
