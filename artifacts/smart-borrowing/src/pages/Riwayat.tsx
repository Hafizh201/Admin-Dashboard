import { useState, useMemo } from "react";
import { Riwayat } from "@/lib/api";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { Search, Loader2, ClipboardList, Filter, Plus, X, AlertTriangle } from "lucide-react";
import { useProgressiveRows } from "@/hooks/useProgressiveRows";
import SortToggle from "@/components/SortToggle";
import { getSortMode, setSortMode, CACHE_KEYS } from "@/lib/cache";

const MODES = ["Pinjam", "Kembali", "Update"];

function ModeBadge({ mode }: { mode: string }) {
  const normalized = String(mode || "").trim().toLowerCase();
  const colors: Record<string, string> = {
    pinjam: "bg-red-100 text-red-700",
    kembali: "bg-green-100 text-green-700",
    update: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[normalized] || "bg-gray-100 text-gray-600"}`}>
      {mode || "-"}
    </span>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function SyncBadge({ localId, pendingIds, failedIds }: { localId?: string; pendingIds: Set<string>; failedIds: Set<string> }) {
  if (!localId) return null;
  if (failedIds.has(localId)) return <Badge color="bg-red-100 text-red-600">Gagal sinkron</Badge>;
  if (pendingIds.has(localId)) return <Badge color="bg-yellow-100 text-yellow-600">Menyinkronkan</Badge>;
  return null;
}

function formatPerpanjang(r: Riwayat) {
  const value = r.perpanjang_text || r.Perpanjang || r.perpanjang_hari || "";
  if (!value) return "-";
  if (/^\d+$/.test(String(value))) return `${value} Hari`;
  return String(value);
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function parseDeadline(value?: string) {
  if (!value) return null;
  const date = new Date(String(value).trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPinjam(row: Riwayat) {
  return normalize(row.mode) === "pinjam";
}

function isKembali(row: Riwayat) {
  return normalize(row.mode) === "kembali";
}

function sameUserAndLoanCode(a: Riwayat, b: Riwayat) {
  const userA = normalize(a.uidpeminjam);
  const userB = normalize(b.uidpeminjam);
  const codeA = normalize(a.extend_token);
  const codeB = normalize(b.extend_token);
  return Boolean(userA && codeA && userA === userB && codeA === codeB);
}

const EMPTY: Riwayat = { uidpeminjam: "", Idbarang: "", nama: "", kelas: "", mode: "Pinjam", waktu: "", Tenggat: "", extend_token: "" };

export default function RiwayatPage() {
  const { riwayat, perpanjang, addRiwayatItem, isLoading, pendingIds, failedIds } = useData();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Riwayat>(EMPTY);
  const [sortMode, setSortModeState] = useState<"newest_first" | "oldest_first">(() =>
    getSortMode(CACHE_KEYS.sortRiwayat)
  );

  const handleSortChange = (mode: "newest_first" | "oldest_first") => {
    setSortModeState(mode);
    setSortMode(CACHE_KEYS.sortRiwayat, mode);
  };

  const hasMatchingReturn = (loan: Riwayat) => riwayat.some((row) => isKembali(row) && sameUserAndLoanCode(loan, row));

  const getEffectiveDeadline = (loan: Riwayat) => {
    const user = normalize(loan.uidpeminjam);
    const code = normalize(loan.extend_token);
    const related = user && code
      ? perpanjang.filter((p) => normalize(p.uidpeminjam) === user && normalize(p.extend_token) === code)
      : [];
    const latestExtension = related[related.length - 1];
    return latestExtension?.tenggat_baru || loan.Tenggat || "";
  };

  const isBelumKembali = (r: Riwayat) => {
    if (!isPinjam(r)) return false;
    if (hasMatchingReturn(r)) return false;
    const deadline = parseDeadline(getEffectiveDeadline(r));
    return Boolean(deadline && deadline.getTime() < Date.now());
  };

  const filtered = useMemo(() => {
    const sorted = sortMode === "newest_first" ? [...riwayat].reverse() : [...riwayat];
    return sorted.filter(r => {
      const matchSearch = !search || [r.uidpeminjam, r.Idbarang, r.nama, r.kelas, r.mode, r.waktu, getEffectiveDeadline(r), r.extend_token, formatPerpanjang(r)]
        .some(v => String(v || "").toLowerCase().includes(search.toLowerCase()));
      const matchMode = !filterMode || String(r.mode || "").toLowerCase() === filterMode.toLowerCase();
      const matchDate = !filterDate || r.waktu?.startsWith(filterDate);
      return matchSearch && matchMode && matchDate;
    });
  }, [riwayat, search, filterMode, filterDate, sortMode, perpanjang]);

  const { rows, hasMore, total, shown } = useProgressiveRows(filtered);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addRiwayatItem(form);
      showToast("Riwayat ditambahkan (menyinkronkan...).", "success");
      setShowModal(false);
      setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-transition space-y-5">
      <style>{`
        @keyframes belumKembaliFlickerAdmin {
          0%, 100% { background-color: rgba(254, 226, 226, 0.98); }
          50% { background-color: rgba(248, 113, 113, 0.52); }
        }
        .belum-kembali-row-admin {
          animation: belumKembaliFlickerAdmin 1.05s ease-in-out infinite;
        }
        .belum-kembali-row-admin td {
          color: #7f1d1d !important;
          font-weight: 700;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" />Riwayat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{riwayat.length} entri riwayat</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />Tambah Riwayat
        </button>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Baris yang berkedip merah berarti <strong>belum kembali</strong>: data PINJAM sudah melewati tenggat dan belum ada mode KEMBALI dengan UID peminjam + token yang sama.</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search" placeholder="Cari nama, UID peminjam, ID barang, token..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50">
            <option value="">Semua Mode</option>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="py-2 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50" />
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            )}
          </div>
          <SortToggle mode={sortMode} onChange={handleSortChange} />
        </div>
      </div>

      {hasMore && (
        <p className="text-xs text-muted-foreground px-1">Menampilkan {shown} dari {total} data...</p>
      )}

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {isLoading && !riwayat.length ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada riwayat ditemukan</p>
            <p className="text-xs mt-1">Ubah filter atau pencarian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["UID Peminjam", "ID Barang", "Nama", "Kelas", "Mode", "Waktu", "Tenggat", "Token", "Perpanjang"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const localId = (r as any)._localId as string | undefined;
                  const belumKembali = isBelumKembali(r);
                  return (
                    <tr key={i} className={`${belumKembali ? "belum-kembali-row-admin" : "hover:bg-muted/30"} transition-colors`}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.uidpeminjam || "-"}
                          <SyncBadge localId={localId} pendingIds={pendingIds} failedIds={failedIds} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.Idbarang || "-"}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{r.nama || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.kelas || "-"}</td>
                      <td className="px-4 py-3"><ModeBadge mode={r.mode} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{r.waktu || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{getEffectiveDeadline(r) || "-"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{r.extend_token || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatPerpanjang(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Tambah Riwayat</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {([
                { field: "uidpeminjam", label: "UID Peminjam" },
                { field: "Idbarang", label: "ID Barang" },
                { field: "nama", label: "Nama" },
                { field: "kelas", label: "Kelas" },
                { field: "waktu", label: "Waktu (YYYY-MM-DD HH:mm:ss)" },
                { field: "Tenggat", label: "Tenggat (YYYY-MM-DD HH:mm:ss)" },
                { field: "extend_token", label: "Token Peminjaman" },
              ] as { field: keyof Riwayat; label: string }[]).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                  <input type="text" value={String(form[field] || "")}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    required={field === "uidpeminjam" || field === "Idbarang" || field === "nama"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mode</label>
                <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50">
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
