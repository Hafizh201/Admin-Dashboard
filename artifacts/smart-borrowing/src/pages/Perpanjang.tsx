import { useMemo, useState } from "react";
import { Perpanjang } from "@/lib/api";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { Search, Filter, RefreshCw, Loader2, Clock, CalendarDays, MessageSquare, X, Trash2, AlertTriangle } from "lucide-react";
import SortToggle from "@/components/SortToggle";
import SyncButton from "@/components/SyncButton";
import { getSortMode, setSortMode } from "@/lib/cache";
import { useProgressiveRows } from "@/hooks/useProgressiveRows";

const SORT_KEY = "sbs_table_sort_mode_perpanjang";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(String(value).trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start?: string, end?: string) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return "-";
  const days = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} Hari` : "-";
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-xs flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function PerpanjangPage() {
  const { perpanjang, barang, isLoading, refreshSilent, cancelPerpanjangByToken } = useData();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortMode, setSortModeState] = useState<"newest_first" | "oldest_first">(() => getSortMode(SORT_KEY));
  const [cancelTarget, setCancelTarget] = useState<Perpanjang | null>(null);
  const [canceling, setCanceling] = useState(false);

  const barangMap = useMemo(() => {
    const map = new Map<string, string>();
    barang.forEach((b) => map.set(normalize(b.uidbarang), b.namabarang || ""));
    return map;
  }, [barang]);

  const totalHari = useMemo(() => {
    return perpanjang.reduce((sum, row) => {
      const a = parseDate(row.tenggat_lama);
      const b = parseDate(row.tenggat_baru);
      if (!a || !b) return sum;
      const days = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? sum + days : sum;
    }, 0);
  }, [perpanjang]);

  const perpanjangHariIni = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return perpanjang.filter((row) => String(row.waktu_perpanjang || "").startsWith(today)).length;
  }, [perpanjang]);

  const handleSortChange = (mode: "newest_first" | "oldest_first") => {
    setSortModeState(mode);
    setSortMode(SORT_KEY, mode);
  };

  const filtered = useMemo(() => {
    const sorted = sortMode === "newest_first" ? [...perpanjang].reverse() : [...perpanjang];

    return sorted.filter((row) => {
      const namaBarang = barangMap.get(normalize(row.Idbarang)) || "";
      const tambahHari = diffDays(row.tenggat_lama, row.tenggat_baru);
      const matchSearch = !search || [
        row.uidpeminjam,
        row.nama,
        row.kelas,
        row.Idbarang,
        namaBarang,
        row.extend_token,
        row.tenggat_lama,
        row.tenggat_baru,
        row.waktu_perpanjang,
        row.alasan,
        tambahHari,
      ].some((value) => normalize(value).includes(normalize(search)));

      const matchDate = !filterDate || String(row.waktu_perpanjang || "").startsWith(filterDate);
      return matchSearch && matchDate;
    });
  }, [perpanjang, search, filterDate, sortMode, barangMap]);

  const { rows, hasMore, total, shown } = useProgressiveRows(filtered);

  const tokenCount = useMemo(() => {
    const map = new Map<string, number>();
    perpanjang.forEach((row) => {
      const token = String(row.extend_token || "").trim();
      if (!token) return;
      map.set(token, (map.get(token) || 0) + 1);
    });
    return map;
  }, [perpanjang]);

  const handleCancel = async () => {
    if (!cancelTarget?.extend_token) return;
    setCanceling(true);
    try {
      await cancelPerpanjangByToken(cancelTarget.extend_token);
      showToast("Perpanjangan dibatalkan dan akan disinkronkan.", "success");
      setCancelTarget(null);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />Pantau Perpanjang
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{perpanjang.length} data perpanjangan</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <button
            onClick={refreshSilent}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Perpanjangan" value={perpanjang.length} icon={RefreshCw} />
        <StatCard label="Perpanjang Hari Ini" value={perpanjangHariIni} icon={CalendarDays} />
        <StatCard label="Total Tambahan Hari" value={`${totalHari} Hari`} icon={Clock} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Cancel perpanjangan akan menghapus semua data perpanjangan dengan token yang sama.</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari nama, kelas, ID barang, token, alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="py-2 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50"
            />
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <SortToggle mode={sortMode} onChange={handleSortChange} />
        </div>
      </div>

      {hasMore && <p className="text-xs text-muted-foreground px-1">Menampilkan {shown} dari {total} data...</p>}

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {isLoading && !perpanjang.length ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada data perpanjangan</p>
            <p className="text-xs mt-1">{search || filterDate ? "Ubah filter atau pencarian" : "Data akan muncul saat ada perpanjangan"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {[
                    "Waktu Perpanjang",
                    "Nama",
                    "Kelas",
                    "ID Barang",
                    "Nama Barang",
                    "Token",
                    "Tenggat Lama",
                    "Tenggat Baru",
                    "Tambah",
                    "Alasan",
                    "Aksi",
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row: Perpanjang, index) => {
                  const namaBarang = barangMap.get(normalize(row.Idbarang)) || "-";
                  const count = tokenCount.get(String(row.extend_token || "").trim()) || 0;
                  return (
                    <tr key={`${row.extend_token}-${row.waktu_perpanjang}-${index}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{row.waktu_perpanjang || "-"}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.nama || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.kelas || "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{row.Idbarang || "-"}</td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{namaBarang}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{row.extend_token || "-"}</span>
                          {count > 1 && <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">{count}x</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{row.tenggat_lama || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{row.tenggat_baru || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700">
                          {diffDays(row.tenggat_lama, row.tenggat_baru)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground min-w-48">
                        <div className="flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/60 flex-shrink-0" />
                          <span>{row.alasan || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setCancelTarget(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <h2 className="text-base font-semibold text-foreground">Cancel Perpanjangan</h2>
              </div>
              <button onClick={() => setCancelTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Hapus perpanjangan dengan token berikut?
              </p>
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1 text-sm">
                <div><span className="text-muted-foreground">Token:</span> <span className="font-mono font-semibold text-foreground">{cancelTarget.extend_token || "-"}</span></div>
                <div><span className="text-muted-foreground">Nama:</span> <span className="font-semibold text-foreground">{cancelTarget.nama || "-"}</span></div>
                <div><span className="text-muted-foreground">ID Barang:</span> <span className="font-mono text-foreground">{cancelTarget.Idbarang || "-"}</span></div>
                <div><span className="text-muted-foreground">Jumlah row token ini:</span> <span className="font-semibold text-red-600">{tokenCount.get(String(cancelTarget.extend_token || "").trim()) || 1} row</span></div>
              </div>
              <p className="text-xs text-red-600">Data akan dihapus berdasarkan token yang sama.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCancelTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Batal</button>
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {canceling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {canceling ? "Menghapus..." : "Ya, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
