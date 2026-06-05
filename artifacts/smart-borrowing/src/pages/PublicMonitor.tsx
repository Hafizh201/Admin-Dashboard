import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { isDipinjam } from "@/lib/api";
import {
  Package, ClipboardList, CheckCircle, BookOpen, RefreshCw, Wifi, WifiOff,
  Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Cpu, LogIn,
  Activity, Clock,
} from "lucide-react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzP6PvRs2LSZ6m3oR5-ZkRkMsOpYUX-wKzS97qpUQDCkyt9gLjqDF4LoBWg7JzloMRI/exec";

const CACHE_KEY = "sbs_public_monitor_cache";
const REFRESH_INTERVAL = 2000;

interface BarangRow {
  uidbarang: string;
  namabarang: string;
  kategori: string;
  dipinjam: string;
  lastuser: string;
  lastkelas: string;
  lastupdate: string;
  lastuid: string;
}

interface RiwayatRow {
  uidpeminjam: string;
  Idbarang: string;
  nama: string;
  kelas: string;
  mode: string;
  waktu: string;
  Perpanjang: string;
}

interface CachePayload {
  barang: BarangRow[];
  riwayat: RiwayatRow[];
  updatedAt: string;
}

async function fetchPublicMonitor(): Promise<{ barang: BarangRow[]; riwayat: RiwayatRow[] }> {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "publicMonitor" }),
  });
  const text = await res.text();
  const json = JSON.parse(text);
  if (!json.ok) throw new Error(json.error || "Server error");
  return { barang: json.data?.barang ?? [], riwayat: json.data?.riwayat ?? [] };
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

function fingerprint(data: { barang: BarangRow[]; riwayat: RiwayatRow[] }) {
  return JSON.stringify(data);
}

// ─── Badge components ────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string }) {
  const borrowed = isDipinjam(value);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${borrowed ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
      {borrowed ? "Dipinjam" : "Tersedia"}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    Pinjam: "bg-blue-100 text-blue-700",
    Kembali: "bg-green-100 text-green-700",
    Perpanjang: "bg-yellow-100 text-yellow-700",
    Update: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[mode] || "bg-gray-100 text-gray-600"}`}>
      {mode || "—"}
    </span>
  );
}

// ─── Sort toggle ─────────────────────────────────────────────────────────────

function SortBtn({ mode, onChange }: { mode: "newest" | "oldest"; onChange: (m: "newest" | "oldest") => void }) {
  return (
    <button
      onClick={() => onChange(mode === "newest" ? "oldest" : "newest")}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
    >
      {mode === "newest"
        ? <><ArrowDown className="w-3.5 h-3.5 text-primary" />Terbaru</>
        : <><ArrowUp className="w-3.5 h-3.5 text-primary" />Terlama</>
      }
    </button>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-xs">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PublicMonitor() {
  const [, setLocation] = useLocation();
  const [barang, setBarang] = useState<BarangRow[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatRow[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [newDataToast, setNewDataToast] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const lastFingerprintRef = useRef<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Barang filters
  const [barangSearch, setBarangSearch] = useState("");
  const [barangStatus, setBarangStatus] = useState("");
  const [barangSort, setBarangSort] = useState<"newest" | "oldest">("newest");

  // ── Riwayat filters
  const [riwayatSearch, setRiwayatSearch] = useState("");
  const [riwayatMode, setRiwayatMode] = useState("");
  const [riwayatDate, setRiwayatDate] = useState("");
  const [riwayatSort, setRiwayatSort] = useState<"newest" | "oldest">("newest");

  // Offline detection
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const showNewDataToast = useCallback(() => {
    setNewDataToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNewDataToast(false), 4000);
  }, []);

  const applyData = useCallback((data: { barang: BarangRow[]; riwayat: RiwayatRow[] }, silent = false) => {
    const fp = fingerprint(data);
    if (fp !== lastFingerprintRef.current) {
      lastFingerprintRef.current = fp;
      setBarang(data.barang);
      setRiwayat(data.riwayat);
      if (silent) showNewDataToast();
    }
  }, [showNewDataToast]);

  const doFetch = useCallback(async (silent = false) => {
    if (isOffline) return;
    if (!silent) setIsSyncing(true);
    try {
      const data = await fetchPublicMonitor();
      applyData(data, silent);
      const now = new Date().toISOString();
      setLastSync(now);
      setFromCache(false);
      writeCache({ ...data, updatedAt: now });
    } catch {
      // silently ignore network errors during auto-refresh
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [isOffline, applyData]);

  // Load cache on mount, then fetch
  useEffect(() => {
    const cache = readCache();
    if (cache) {
      applyData(cache, false);
      setLastSync(cache.updatedAt);
      setFromCache(true);
    }
    doFetch(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 2s
  useEffect(() => {
    const id = setInterval(() => doFetch(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [doFetch]);

  // ── Computed stats
  const totalBarang = barang.length;
  const dipinjamCount = useMemo(() => barang.filter(b => isDipinjam(b.dipinjam)).length, [barang]);
  const tersediaCount = totalBarang - dipinjamCount;
  const totalRiwayat = riwayat.length;

  // ── Barang filtered + sorted
  const filteredBarang = useMemo(() => {
    const sorted = barangSort === "newest" ? [...barang].reverse() : [...barang];
    return sorted.filter(b => {
      const matchSearch = !barangSearch || [b.uidbarang, b.namabarang, b.kategori, b.lastuser, b.lastkelas, b.lastuid]
        .some(v => v?.toLowerCase().includes(barangSearch.toLowerCase()));
      const matchStatus = !barangStatus || (barangStatus === "dipinjam" ? isDipinjam(b.dipinjam) : !isDipinjam(b.dipinjam));
      return matchSearch && matchStatus;
    });
  }, [barang, barangSearch, barangStatus, barangSort]);

  // ── Riwayat filtered + sorted
  const filteredRiwayat = useMemo(() => {
    const sorted = riwayatSort === "newest" ? [...riwayat].reverse() : [...riwayat];
    return sorted.filter(r => {
      const matchSearch = !riwayatSearch || [r.uidpeminjam, r.Idbarang, r.nama, r.kelas, r.mode, r.waktu, r.Perpanjang]
        .some(v => v?.toLowerCase().includes(riwayatSearch.toLowerCase()));
      const matchMode = !riwayatMode || r.mode === riwayatMode;
      const matchDate = !riwayatDate || r.waktu?.startsWith(riwayatDate);
      return matchSearch && matchMode && matchDate;
    });
  }, [riwayat, riwayatSearch, riwayatMode, riwayatDate, riwayatSort]);

  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Smart Borrowing</p>
              <p className="text-[10px] text-gray-500 leading-tight hidden sm:block">Sistem Peminjaman Berbasis IoT</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/offline */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOffline ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {isOffline ? "Offline" : "Online"}
            </div>

            {/* Last sync */}
            {lastSyncLabel && !isOffline && (
              <span className="hidden md:block text-xs text-gray-400">
                {fromCache ? "Cache" : "Sync"} {lastSyncLabel}
              </span>
            )}

            {/* Manual sync */}
            <button
              onClick={() => doFetch(false)}
              disabled={isSyncing || isOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Login admin */}
            <button
              onClick={() => setLocation("/admin")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login Admin
            </button>
          </div>
        </div>
      </header>

      {/* ── "New data" toast ── */}
      {newDataToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg">
          <Activity className="w-3.5 h-3.5" />
          Data baru terdeteksi, tabel diperbarui otomatis.
        </div>
      )}

      {/* ── Offline banner ── */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-200 text-orange-700 text-xs font-medium justify-center">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — menampilkan data cache terakhir.
        </div>
      )}

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Smart Borrowing</h1>
          <p className="text-sm text-gray-500 mt-1">Halaman publik monitoring barang dan riwayat peminjaman</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Barang" value={totalBarang} icon={Package} color="bg-purple-100 text-purple-700" />
          <StatCard label="Barang Tersedia" value={tersediaCount} icon={CheckCircle} color="bg-green-100 text-green-700" />
          <StatCard label="Barang Dipinjam" value={dipinjamCount} icon={BookOpen} color="bg-blue-100 text-blue-700" />
          <StatCard label="Total Riwayat" value={totalRiwayat} icon={ClipboardList} color="bg-orange-100 text-orange-700" />
        </div>

        {/* ── Tabel Barang ── */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />Daftar Barang
            <span className="text-xs font-normal text-gray-400 ml-1">({filteredBarang.length} dari {totalBarang})</span>
          </h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="search" placeholder="Cari UID, nama, kategori, last user..."
                value={barangSearch} onChange={e => setBarangSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={barangStatus} onChange={e => setBarangStatus(e.target.value)}
                className="py-2 pl-3 pr-7 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                <option value="">Semua Status</option>
                <option value="tersedia">Tersedia</option>
                <option value="dipinjam">Dipinjam</option>
              </select>
              <SortBtn mode={barangSort} onChange={setBarangSort} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {filteredBarang.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{totalBarang === 0 ? "Belum ada data barang" : "Tidak ada barang sesuai filter"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["UID Barang", "Nama Barang", "Kategori", "Status", "Last User", "Last Kelas", "Last Update", "Last UID"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBarang.map((b, i) => (
                      <tr key={b.uidbarang || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{b.uidbarang || "—"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{b.namabarang || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.kategori || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge value={b.dipinjam} /></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.lastuser || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.lastkelas || "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{b.lastupdate || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{b.lastuid || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabel Riwayat ── */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />Riwayat Peminjaman
            <span className="text-xs font-normal text-gray-400 ml-1">({filteredRiwayat.length} dari {totalRiwayat})</span>
          </h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="search" placeholder="Cari nama, UID peminjam, ID barang..."
                value={riwayatSearch} onChange={e => setRiwayatSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={riwayatMode} onChange={e => setRiwayatMode(e.target.value)}
                className="py-2 pl-3 pr-7 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400">
                <option value="">Semua Mode</option>
                {["Pinjam", "Kembali", "Perpanjang", "Update"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <input type="date" value={riwayatDate} onChange={e => setRiwayatDate(e.target.value)}
                  className="py-2 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
                {riwayatDate && (
                  <button onClick={() => setRiwayatDate("")} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                )}
              </div>
              <SortBtn mode={riwayatSort} onChange={setRiwayatSort} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {filteredRiwayat.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{totalRiwayat === 0 ? "Belum ada riwayat" : "Tidak ada riwayat sesuai filter"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["UID Peminjam", "ID Barang", "Nama", "Kelas", "Mode", "Waktu", "Perpanjang"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRiwayat.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.uidpeminjam || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.Idbarang || "—"}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.nama || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.kelas || "—"}</td>
                        <td className="px-4 py-3"><ModeBadge mode={r.mode} /></td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.waktu || "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.Perpanjang || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Smart Borrowing System — ESP32 IoT</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {lastSyncLabel ? `Terakhir sync: ${lastSyncLabel}` : "Menghubungkan..."}
          </div>
        </div>
      </div>
    </div>
  );
}
