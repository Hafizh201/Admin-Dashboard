import {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode,
} from "react";
import { api, Siswa, Barang, Riwayat, Perpanjang, Stats, BootstrapData, isDipinjam } from "@/lib/api";
import { getCache, setCache, CACHE_KEYS } from "@/lib/cache";
import { addToQueue, processQueue, getQueueStats, retryFailed, SyncItem, getQueue } from "@/lib/syncQueue";
import { useAuth } from "./AuthContext";

export interface PerpanjangPayload {
  uidbarang: string;
  hari: string;
  alasan?: string;
  extend_token?: string;
  nama?: string;
  kelas?: string;
  Idbarang?: string;
  tenggat_lama?: string;
  tenggat_baru?: string;
  waktu_perpanjang?: string;
}

interface DataContextType {
  siswa: Siswa[];
  barang: Barang[];
  riwayat: Riwayat[];
  perpanjang: Perpanjang[];
  stats: Stats | null;
  lastUpdate: string | null;
  isLoading: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  pendingIds: Set<string>;
  failedIds: Set<string>;
  syncStats: { pending: number; failed: number; total: number };
  isSyncing: boolean;
  refreshSilent: () => Promise<void>;
  addSiswa: (data: Siswa) => Promise<void>;
  updateSiswaItem: (uid: string, data: Siswa) => Promise<void>;
  addBarangItem: (data: Barang) => Promise<void>;
  updateBarangItem: (uidbarang: string, data: Barang) => Promise<void>;
  returnBarangItem: (uidbarang: string) => Promise<void>;
  perpanjangBarangItem: (payload: PerpanjangPayload) => Promise<void>;
  cancelPerpanjangByToken: (extendToken: string) => Promise<void>;
  addRiwayatItem: (data: Riwayat) => Promise<void>;
  pinjamBarangItem: (uidpeminjam: string, uidbarang: string, tenggat?: string) => Promise<void>;
  retryAllFailed: () => void;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

function buildSyncSets(queue: SyncItem[]) {
  const pendingIds = new Set<string>();
  const failedIds = new Set<string>();
  queue.forEach((item) => {
    const id = (item.payload as any)._localId as string | undefined;
    if (!id) return;
    if (item.status === "pending" || item.status === "uploading") pendingIds.add(id);
    if (item.status === "failed") failedIds.add(id);
  });
  return { pendingIds, failedIds };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { pin, isAuthenticated } = useAuth();
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [perpanjang, setPerpanjang] = useState<Perpanjang[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSyncState = useCallback(() => {
    const q = getQueue();
    const stats = getQueueStats();
    setSyncStats(stats);
    const sets = buildSyncSets(q);
    setPendingIds(sets.pendingIds);
    setFailedIds(sets.failedIds);
  }, []);

  const applyBootstrapData = useCallback((d: BootstrapData, fromCache = false) => {
    const newSiswa = d.siswa ?? d.data ?? [];
    const newBarang = d.barang ?? [];
    const newRiwayat = d.riwayat ?? [];
    const newPerpanjang = d.perpanjang ?? [];
    const newStats = d.stats ?? null;
    const now = new Date().toISOString();

    setSiswa(newSiswa);
    setBarang(newBarang);
    setRiwayat(newRiwayat);
    setPerpanjang(newPerpanjang);
    if (newStats) setStats(newStats);
    setLastUpdate(now);
    setIsFromCache(fromCache);

    if (!fromCache) {
      setCache(CACHE_KEYS.data, newSiswa);
      setCache(CACHE_KEYS.barang, newBarang);
      setCache(CACHE_KEYS.riwayat, newRiwayat);
      setCache(CACHE_KEYS.perpanjang, newPerpanjang);
      if (newStats) setCache(CACHE_KEYS.stats, newStats);
      setCache(CACHE_KEYS.lastUpdate, now);
    }
  }, []);

  const refreshSilent = useCallback(async () => {
    if (!pin || !isAuthenticated) return;
    const res = await api<BootstrapData>({ action: "bootstrap", pin });
    if (res.ok && res.data) applyBootstrapData(res.data, false);
  }, [pin, isAuthenticated, applyBootstrapData]);

  useEffect(() => {
    if (!isAuthenticated || !pin) return;

    const cachedSiswa = getCache<Siswa[]>(CACHE_KEYS.data);
    const cachedBarang = getCache<Barang[]>(CACHE_KEYS.barang);
    const cachedRiwayat = getCache<Riwayat[]>(CACHE_KEYS.riwayat);
    const cachedPerpanjang = getCache<Perpanjang[]>(CACHE_KEYS.perpanjang);
    const cachedStats = getCache<Stats>(CACHE_KEYS.stats);
    const cachedLastUpdate = getCache<string>(CACHE_KEYS.lastUpdate);

    if (cachedSiswa || cachedBarang || cachedRiwayat || cachedPerpanjang) {
      setSiswa(cachedSiswa ?? []);
      setBarang(cachedBarang ?? []);
      setRiwayat(cachedRiwayat ?? []);
      setPerpanjang(cachedPerpanjang ?? []);
      if (cachedStats) setStats(cachedStats);
      if (cachedLastUpdate) setLastUpdate(cachedLastUpdate);
      setIsFromCache(true);
      setIsLoading(false);
    }

    (async () => {
      const res = await api<BootstrapData>({ action: "bootstrap", pin });
      if (res.ok && res.data) applyBootstrapData(res.data, false);
      setIsLoading(false);
    })();

    refreshSyncState();
  }, [isAuthenticated, pin, applyBootstrapData, refreshSyncState]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (pin) processQueue(pin, () => { refreshSyncState(); refreshSilent(); }).finally(() => setIsSyncing(false));
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pin, refreshSilent, refreshSyncState]);

  useEffect(() => {
    if (!isAuthenticated || !pin) return;
    syncIntervalRef.current = setInterval(async () => {
      if (!navigator.onLine) return;
      setIsSyncing(true);
      await processQueue(pin, () => { refreshSyncState(); refreshSilent(); });
      refreshSyncState();
      setIsSyncing(false);
    }, 7000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [isAuthenticated, pin, refreshSilent, refreshSyncState]);

  const runSync = useCallback(async () => {
    if (!pin || !navigator.onLine) return;
    setIsSyncing(true);
    await processQueue(pin, () => { refreshSyncState(); refreshSilent(); });
    refreshSyncState();
    setIsSyncing(false);
  }, [pin, refreshSilent, refreshSyncState]);

  const addSiswa = useCallback(async (data: Siswa) => {
    const localId = "s-" + Date.now();
    const item = { ...data, _localId: localId } as Siswa & { _localId: string };
    setSiswa((prev) => {
      if (prev.find((s) => s.uid === data.uid)) return prev;
      return [item, ...prev];
    });
    addToQueue("addData", { data, _localId: localId });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const updateSiswaItem = useCallback(async (uid: string, data: Siswa) => {
    setSiswa((prev) => prev.map((s) => s.uid === uid ? { ...data, uid } : s));
    addToQueue("updateData", { uid, data });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const addBarangItem = useCallback(async (data: Barang) => {
    const localId = "b-" + Date.now();
    const item = { ...data, _localId: localId } as Barang & { _localId: string };
    setBarang((prev) => {
      if (prev.find((b) => b.uidbarang === data.uidbarang)) return prev;
      return [item, ...prev];
    });
    addToQueue("addBarang", { data, _localId: localId });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const updateBarangItem = useCallback(async (uidbarang: string, data: Barang) => {
    setBarang((prev) => prev.map((b) => b.uidbarang === uidbarang ? { ...data, uidbarang } : b));
    addToQueue("updateBarang", { uidbarang, data });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const returnBarangItem = useCallback(async (uidbarang: string) => {
    setBarang((prev) =>
      prev.map((b) =>
        b.uidbarang === uidbarang
          ? { ...b, dipinjam: "false", lastuser: "", lastkelas: "", lastuid: "", lastupdate: "" }
          : b
      )
    );
    addToQueue("returnBarang", { uidbarang });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const perpanjangBarangItem = useCallback(async (payload: PerpanjangPayload) => {
    setBarang((prev) =>
      prev.map((b) =>
        b.uidbarang === payload.uidbarang ? { ...b, lastupdate: new Date().toLocaleString("id-ID") } : b
      )
    );
    addToQueue("perpanjang", {
      uidbarang: payload.uidbarang,
      hari: payload.hari,
      alasan: payload.alasan || "",
      extend_token: payload.extend_token || "",
      tenggat_lama: payload.tenggat_lama || "",
      tenggat_baru: payload.tenggat_baru || "",
    });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const cancelPerpanjangByToken = useCallback(async (extendToken: string) => {
    const token = String(extendToken || "").trim();
    if (!token) return;

    if (!pin) throw new Error("PIN belum tersedia. Login ulang dulu.");
    if (!navigator.onLine) throw new Error("Tidak bisa cancel saat offline.");

    setIsSyncing(true);
    try {
      const res = await api({ action: "deletePerpanjangByToken", pin, extend_token: token });
      if (!res.ok) {
        throw new Error(res.error || "Gagal cancel perpanjangan.");
      }

      setPerpanjang((prev) => prev.filter((row) => String(row.extend_token || "").trim() !== token));

      // Penting: setelah perpanjangan dihapus, ambil ulang bootstrap dari server.
      // Tanpa ini, riwayat lokal masih bisa membawa Tenggat hasil enrich lama sehingga row belum kembali tidak langsung merah.
      await refreshSilent();
    } finally {
      refreshSyncState();
      setIsSyncing(false);
    }
  }, [pin, refreshSilent, refreshSyncState]);

  const addRiwayatItem = useCallback(async (data: Riwayat) => {
    const localId = "r-" + Date.now();
    const item = { ...data, _localId: localId } as Riwayat & { _localId: string };
    setRiwayat((prev) => [item, ...prev]);
    addToQueue("addRiwayat", { data, _localId: localId });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const pinjamBarangItem = useCallback(async (uidpeminjam: string, uidbarang: string, tenggat = "") => {
    setBarang((prev) =>
      prev.map((b) =>
        b.uidbarang === uidbarang
          ? { ...b, dipinjam: "true", lastuid: uidpeminjam, lastupdate: new Date().toLocaleString("id-ID") }
          : b
      )
    );
    addToQueue("pinjamBarang", { uidpeminjam, uidbarang, Tenggat: tenggat });
    refreshSyncState();
    runSync();
  }, [refreshSyncState, runSync]);

  const retryAllFailed = useCallback(() => {
    if (!pin) return;
    retryFailed(pin, () => { refreshSyncState(); refreshSilent(); });
    refreshSyncState();
  }, [pin, refreshSilent, refreshSyncState]);

  return (
    <DataContext.Provider
      value={{
        siswa, barang, riwayat, perpanjang, stats, lastUpdate,
        isLoading, isFromCache, isOffline, isSyncing,
        pendingIds, failedIds, syncStats,
        refreshSilent,
        addSiswa, updateSiswaItem,
        addBarangItem, updateBarangItem, returnBarangItem, perpanjangBarangItem, cancelPerpanjangByToken,
        addRiwayatItem, pinjamBarangItem, retryAllFailed,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

export { isDipinjam };
