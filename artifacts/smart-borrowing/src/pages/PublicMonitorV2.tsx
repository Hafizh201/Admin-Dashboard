import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, isDipinjam } from "@/lib/api";
import {
  getEffectiveDeadline,
  getItemDeadline,
  isItemNeedsAttention,
  isItemOverdue,
  isItemWithoutExtension,
  isLoanNeedsAttention,
  isLoanWithoutExtension,
  parseLoanDate,
  sortItemsByDeadline,
} from "@/lib/loanStatus";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Package,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

const LOGO_URL = "https://yt3.googleusercontent.com/ytc/AIdro_n4l9RD0z9dNM9TclMMAteJZjT5sLy2Vumh1v-D9oa8bxA=s900-c-k-c0x00ffffff-no-rj";
const CACHE_KEY = "sbs_public_monitor_cache_v2";
const REFRESH_INTERVAL = 2000;

type ViewMode = "none" | "asc" | "desc" | "overdue" | "no_extension";

type BarangRow = {
  uidbarang: string;
  namabarang: string;
  kategori: string;
  dipinjam: string;
  lastuser: string;
  lastkelas: string;
  lastupdate: string;
  lastuid: string;
};

type RiwayatRow = {
  uidpeminjam: string;
  Idbarang: string;
  nama: string;
  kelas: string;
  mode: string;
  waktu: string;
  Tenggat?: string;
  extend_token?: string;
  Perpanjang?: string;
  perpanjang_text?: string;
  perpanjang_hari?: string;
};

type PerpanjangRow = {
  uidpeminjam: string;
  nama: string;
  kelas: string;
  Idbarang: string;
  extend_token: string;
  tenggat_lama: string;
  tenggat_baru: string;
  waktu_perpanjang: string;
  alasan: string;
};

type MonitorData = {
  barang: BarangRow[];
  riwayat: RiwayatRow[];
  perpanjang: PerpanjangRow[];
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isLoginOnly(row: RiwayatRow) {
  const mode = normalize(row.mode).replace(/[_-]+/g, " ");
  return mode === "login only" || mode === "loginonly" || mode.includes("login only");
}

function extensionText(row: RiwayatRow) {
  const value = row.perpanjang_text || row.Perpanjang || row.perpanjang_hari || "";
  if (!value) return "—";
  return /^\d+$/.test(String(value)) ? `${value} Hari` : String(value);
}

function modeBadgeClass(mode: string) {
  const value = normalize(mode);
  if (value === "pinjam") return "bg-red-100 text-red-700 ring-red-200";
  if (value === "kembali") return "bg-green-100 text-green-700 ring-green-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function statusBadgeClass(value: string) {
  return isDipinjam(value)
    ? "bg-blue-100 text-blue-700 ring-blue-200"
    : "bg-green-100 text-green-700 ring-green-200";
}

function readCache(): (MonitorData & { updatedAt?: string }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(data: MonitorData & { updatedAt: string }) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function normalizeData(data: any): MonitorData {
  return {
    barang: data?.barang ?? [],
    riwayat: (data?.riwayat ?? []).filter((row: RiwayatRow) => !isLoginOnly(row)),
    perpanjang: data?.perpanjang ?? [],
  };
}

function sortRiwayatByDeadline(rows: RiwayatRow[], extensions: PerpanjangRow[], direction: "asc" | "desc") {
  return [...rows].sort((a, b) => {
    const aDate = parseLoanDate(getEffectiveDeadline(a, extensions));
    const bDate = parseLoanDate(getEffectiveDeadline(b, extensions));
    const empty = direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const aTime = aDate ? aDate.getTime() : empty;
    const bTime = bDate ? bDate.getTime() : empty;
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AlertInfo() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Merah berkedip: <strong>belum kembali / belum perpanjang</strong>.</span>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[260px] flex-1">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectBox({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

export default function PublicMonitorV2() {
  const [barang, setBarang] = useState<BarangRow[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatRow[]>([]);
  const [perpanjang, setPerpanjang] = useState<PerpanjangRow[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [error, setError] = useState("");
  const fingerprint = useRef("");

  const [barangSearch, setBarangSearch] = useState("");
  const [barangStatus, setBarangStatus] = useState("");
  const [barangView, setBarangView] = useState<ViewMode>("none");
  const [barangNewest, setBarangNewest] = useState(true);

  const [riwayatSearch, setRiwayatSearch] = useState("");
  const [riwayatMode, setRiwayatMode] = useState("");
  const [riwayatDate, setRiwayatDate] = useState("");
  const [riwayatView, setRiwayatView] = useState<ViewMode>("none");
  const [riwayatNewest, setRiwayatNewest] = useState(true);

  const applyData = useCallback((data: MonitorData) => {
    const fp = JSON.stringify(data);
    if (fp === fingerprint.current) return;
    fingerprint.current = fp;
    setBarang(data.barang);
    setRiwayat(data.riwayat);
    setPerpanjang(data.perpanjang);
  }, []);

  const sync = useCallback(async (silent = false) => {
    if (!navigator.onLine) return;
    if (!silent) setLoading(true);
    try {
      const res = await api({ action: "publicMonitor" });
      if (!res.ok) throw new Error(res.error || "Server error");
      const data = normalizeData(res.data);
      applyData(data);
      const now = new Date().toISOString();
      setLastSync(now);
      setError("");
      writeCache({ ...data, updatedAt: now });
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const cache = readCache();
    if (cache) {
      applyData(cache);
      if (cache.updatedAt) setLastSync(cache.updatedAt);
    }
    sync();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => sync(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [sync]);

  const borrowedCount = useMemo(() => barang.filter((row) => isDipinjam(row.dipinjam)).length, [barang]);
  const availableCount = barang.length - borrowedCount;
  const hasBarangAlert = useMemo(() => barang.some((row) => isItemNeedsAttention(row, riwayat, perpanjang)), [barang, riwayat, perpanjang]);
  const hasRiwayatAlert = useMemo(() => riwayat.some((row) => isLoanNeedsAttention(row, riwayat, perpanjang)), [riwayat, perpanjang]);

  const filteredBarang = useMemo(() => {
    let rows = barangView === "asc" || barangView === "desc"
      ? sortItemsByDeadline(barang, riwayat, perpanjang, barangView)
      : barangNewest ? [...barang].reverse() : [...barang];

    if (barangView === "overdue") rows = rows.filter((row) => isItemOverdue(row, riwayat, perpanjang));
    if (barangView === "no_extension") rows = rows.filter((row) => isItemWithoutExtension(row, riwayat, perpanjang));

    return rows.filter((row) => {
      const query = normalize(barangSearch);
      const deadline = getItemDeadline(row, riwayat, perpanjang);
      const matchSearch = !query || [row.uidbarang, row.namabarang, row.kategori, row.lastuser, row.lastkelas, deadline]
        .some((value) => normalize(value).includes(query));
      const matchStatus = !barangStatus || (barangStatus === "dipinjam" ? isDipinjam(row.dipinjam) : !isDipinjam(row.dipinjam));
      return matchSearch && matchStatus;
    });
  }, [barang, riwayat, perpanjang, barangSearch, barangStatus, barangView, barangNewest]);

  const filteredRiwayat = useMemo(() => {
    let rows = riwayatView === "asc" || riwayatView === "desc"
      ? sortRiwayatByDeadline(riwayat, perpanjang, riwayatView)
      : riwayatNewest ? [...riwayat].reverse() : [...riwayat];

    if (riwayatView === "overdue") rows = rows.filter((row) => isLoanNeedsAttention(row, riwayat, perpanjang));
    if (riwayatView === "no_extension") rows = rows.filter((row) => isLoanWithoutExtension(row, riwayat, perpanjang));

    return rows.filter((row) => {
      const query = normalize(riwayatSearch);
      const deadline = getEffectiveDeadline(row, perpanjang);
      const matchSearch = !query || [row.Idbarang, row.nama, row.kelas, row.mode, row.waktu, deadline, row.extend_token, extensionText(row)]
        .some((value) => normalize(value).includes(query));
      const matchMode = !riwayatMode || normalize(row.mode) === normalize(riwayatMode);
      const matchDate = !riwayatDate || String(row.waktu || "").startsWith(riwayatDate);
      return matchSearch && matchMode && matchDate;
    });
  }, [riwayat, perpanjang, riwayatSearch, riwayatMode, riwayatDate, riwayatView, riwayatNewest]);

  const syncLabel = lastSync ? new Date(lastSync).toLocaleTimeString("id-ID") : "Belum sync";

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <style>{`
        @keyframes sbsFlickerRed { 0%, 100% { background-color: rgba(254, 226, 226, .98); } 50% { background-color: rgba(248, 113, 113, .52); } }
        .sbs-row-alert { animation: sbsFlickerRed 1.05s ease-in-out infinite; }
        .sbs-row-alert td { color: #7f1d1d !important; font-weight: 700; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={LOGO_URL} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-950">Smart Borrowing</h1>
              <p className="text-xs font-medium text-slate-500">Monitoring publik barang dan riwayat</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:inline-flex ${online ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {online ? "Online" : "Offline"}
            </span>
            <div className="hidden text-right md:block">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Terakhir sync</p>
              <p className="text-xs font-bold text-slate-600">{syncLabel}</p>
            </div>
            <button
              onClick={() => sync()}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>
      </header>

      {error && <div className="border-b border-red-200 bg-red-50 py-2 text-center text-sm font-medium text-red-700">{error}</div>}

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">ESP32 IoT System</p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Monitoring Smart Borrowing</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Pantau status barang, riwayat peminjaman, tenggat pengembalian, dan data yang perlu segera ditindaklanjuti.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Refresh otomatis setiap <span className="text-blue-600">2 detik</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Barang" value={barang.length} icon={Package} tone="bg-purple-100 text-purple-700" />
          <StatCard label="Barang Tersedia" value={availableCount} icon={CheckCircle2} tone="bg-green-100 text-green-700" />
          <StatCard label="Barang Dipinjam" value={borrowedCount} icon={BookOpen} tone="bg-blue-100 text-blue-700" />
          <StatCard label="Total Riwayat" value={riwayat.length} icon={ClipboardList} tone="bg-orange-100 text-orange-700" />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-950"><Package className="h-5 w-5 text-blue-600" />Daftar Barang</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{filteredBarang.length} dari {barang.length} barang ditampilkan</p>
            </div>
          </div>
          {hasBarangAlert && <AlertInfo />}
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput value={barangSearch} onChange={setBarangSearch} placeholder="Cari UID barang, nama barang, kategori, max kembali..." />
            <SelectBox value={barangStatus} onChange={setBarangStatus}>
              <option value="">Semua Status</option>
              <option value="tersedia">Tersedia</option>
              <option value="dipinjam">Dipinjam</option>
            </SelectBox>
            <SelectBox value={barangView} onChange={(value) => setBarangView(value as ViewMode)}>
              <option value="none">View Tenggat: Default</option>
              <option value="asc">Tenggat Terdekat</option>
              <option value="desc">Tenggat Terjauh</option>
              <option value="overdue">Belum Kembali</option>
              <option value="no_extension">Belum Perpanjang</option>
            </SelectBox>
            <button onClick={() => { setBarangNewest(!barangNewest); setBarangView("none"); }} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              {barangNewest ? "↓ Terbaru" : "↑ Terlama"}
            </button>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    {['UID Barang', 'Nama Barang', 'Kategori', 'Status', 'Max Kembali', 'Last User', 'Last Kelas'].map((head) => <th key={head} className="px-5 py-4 text-left whitespace-nowrap">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBarang.map((row, index) => (
                    <tr key={row.uidbarang || index} className={isItemNeedsAttention(row, riwayat, perpanjang) ? "sbs-row-alert" : "hover:bg-slate-50"}>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{row.uidbarang || "—"}</td>
                      <td className="px-5 py-4 font-bold text-slate-950 whitespace-nowrap">{row.namabarang || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{row.kategori || "—"}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusBadgeClass(row.dipinjam)}`}>{isDipinjam(row.dipinjam) ? "Dipinjam" : "Tersedia"}</span></td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{getItemDeadline(row, riwayat, perpanjang) || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{row.lastuser || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{row.lastkelas || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-950"><ClipboardList className="h-5 w-5 text-blue-600" />Riwayat Peminjaman</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{filteredRiwayat.length} dari {riwayat.length} riwayat ditampilkan</p>
            </div>
          </div>
          {hasRiwayatAlert && <AlertInfo />}
          <div className="mb-4 flex flex-wrap gap-3">
            <SearchInput value={riwayatSearch} onChange={setRiwayatSearch} placeholder="Cari ID barang, nama, kelas, mode, token..." />
            <SelectBox value={riwayatMode} onChange={setRiwayatMode}>
              <option value="">Semua Mode</option>
              <option value="Pinjam">Pinjam</option>
              <option value="Kembali">Kembali</option>
              <option value="Update">Update</option>
            </SelectBox>
            <SelectBox value={riwayatView} onChange={(value) => setRiwayatView(value as ViewMode)}>
              <option value="none">View Tenggat: Default</option>
              <option value="asc">Tenggat Terdekat</option>
              <option value="desc">Tenggat Terjauh</option>
              <option value="overdue">Belum Kembali</option>
              <option value="no_extension">Belum Perpanjang</option>
            </SelectBox>
            <div className="flex items-center gap-2">
              <input type="date" value={riwayatDate} onChange={(event) => setRiwayatDate(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
              {riwayatDate && <button onClick={() => setRiwayatDate("")} className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-slate-500"><X className="h-4 w-4" /></button>}
            </div>
            <button onClick={() => { setRiwayatNewest(!riwayatNewest); setRiwayatView("none"); }} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              {riwayatNewest ? "↓ Terbaru" : "↑ Terlama"}
            </button>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    {['ID Barang', 'Nama', 'Kelas', 'Mode', 'Waktu', 'Tenggat', 'Perpanjang'].map((head) => <th key={head} className="px-5 py-4 text-left whitespace-nowrap">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRiwayat.map((row, index) => (
                    <tr key={index} className={isLoanNeedsAttention(row, riwayat, perpanjang) ? "sbs-row-alert" : "hover:bg-slate-50"}>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{row.Idbarang || "—"}</td>
                      <td className="px-5 py-4 font-bold text-slate-950 whitespace-nowrap">{row.nama || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{row.kelas || "—"}</td>
                      <td className="px-5 py-4 whitespace-nowrap"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${modeBadgeClass(row.mode)}`}>{row.mode || "—"}</span></td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{row.waktu || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{getEffectiveDeadline(row, perpanjang) || "—"}</td>
                      <td className="px-5 py-4 font-medium text-slate-600 whitespace-nowrap">{extensionText(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs font-medium text-slate-400 sm:flex-row">
          <span>Smart Borrowing System — ESP32 IoT</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Terakhir sync: {syncLabel}</span>
        </footer>
      </main>
    </div>
  );
}
