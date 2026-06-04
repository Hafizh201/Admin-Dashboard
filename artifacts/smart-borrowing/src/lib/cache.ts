const PREFIX = "sbs_";

export const CACHE_KEYS = {
  data: "cache_data",
  barang: "cache_barang",
  riwayat: "cache_riwayat",
  stats: "cache_stats",
  lastUpdate: "cache_last_update",
  sortData: "table_sort_mode_data",
  sortBarang: "table_sort_mode_barang",
  sortRiwayat: "table_sort_mode_riwayat",
  sortPeminjaman: "table_sort_mode_peminjaman",
} as const;

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {}
}

export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(PREFIX + key);
  } else {
    Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(PREFIX + k));
  }
}

export function getSortMode(key: string): "newest_first" | "oldest_first" {
  const stored = localStorage.getItem(PREFIX + key);
  return (stored as "newest_first" | "oldest_first") || "newest_first";
}

export function setSortMode(key: string, mode: "newest_first" | "oldest_first"): void {
  localStorage.setItem(PREFIX + key, mode);
}
