import { useState, useMemo } from "react";
import { isDipinjam } from "@/lib/api";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { BookOpen, Loader2, RotateCcw, RefreshCw, AlertTriangle, X } from "lucide-react";
import SortToggle from "@/components/SortToggle";
import { getSortMode, setSortMode, CACHE_KEYS } from "@/lib/cache";
import { getEffectiveDeadline, parseLoanDate } from "@/lib/loanStatus";

type ConfirmAction = { type: "kembalikan" | "perpanjang"; uidbarang: string; namabarang: string } | null;

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function addDaysFromDeadline(value: string, days: string) {
  const base = parseLoanDate(value);
  if (!base) return "";

  const d = new Date(base);
  d.setDate(d.getDate() + Number(days || 0));
  return formatDateTime(d);
}

export default function PeminjamanAktif() {
  const { barang, riwayat, perpanjang, returnBarangItem, perpanjangBarangItem, isLoading, refreshSilent } = useData();
  const { showToast } = useToast();
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [hariTambah, setHariTambah] = useState("1");
  const [alasan, setAlasan] = useState("");
  const [acting, setActing] = useState(false);
  const [sortMode, setSortModeState] = useState<"newest_first" | "oldest_first">(() =>
    getSortMode(CACHE_KEYS.sortPeminjaman)
  );

  const handleSortChange = (mode: "newest_first" | "oldest_first") => {
    setSortModeState(mode);
    setSortMode(CACHE_KEYS.sortPeminjaman, mode);
  };

  const activeLoans = useMemo(() => {
    const all = barang.filter(b => isDipinjam(b.dipinjam));
    return sortMode === "newest_first" ? [...all].reverse() : all;
  }, [barang, sortMode]);

  const getLatestLoan = (uidbarang: string) => [...riwayat].reverse().find((r) =>
    String(r.Idbarang || "").trim() === String(uidbarang || "").trim() &&
    String(r.mode || "").trim().toLowerCase() === "pinjam"
  );

  const getCurrentDeadline = (loan: ReturnType<typeof getLatestLoan> | undefined, fallback = "") => {
    const current = getEffectiveDeadline(loan, perpanjang);
    return current || fallback || "";
  };

  const selectedBarang = confirm ? barang.find((b) => b.uidbarang === confirm.uidbarang) : undefined;
  const selectedLoan = confirm ? getLatestLoan(confirm.uidbarang) : undefined;
  const tenggatLama = getCurrentDeadline(selectedLoan, selectedBarang?.lastupdate || "");
  const tenggatBaru = confirm?.type === "perpanjang" ? addDaysFromDeadline(tenggatLama, hariTambah) : "";
  const waktuPerpanjang = formatDateTime(new Date());

  const handleConfirm = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirm.type === "kembalikan") {
        await returnBarangItem(confirm.uidbarang);
        showToast(`${confirm.namabarang} berhasil dikembalikan.`, "success");
      } else {
        if (!hariTambah || Number(hariTambah) <= 0) {
          showToast("Jumlah hari perpanjangan harus lebih dari 0.", "error");
          setActing(false);
          return;
        }

        if (!parseLoanDate(tenggatLama) || !tenggatBaru) {
          showToast("Tenggat lama tidak valid. Sync ulang data dulu sebelum perpanjang.", "error");
          setActing(false);
          return;
        }

        await perpanjangBarangItem({
          uidbarang: confirm.uidbarang,
          hari: hariTambah,
          alasan,
          extend_token: selectedLoan?.extend_token || "",
          tenggat_lama: tenggatLama,
          tenggat_baru: tenggatBaru,
        });
        showToast(`${confirm.namabarang} berhasil diperpanjang dari tenggat lama.`, "success");
      }
      setConfirm(null);
      setHariTambah("1");
      setAlasan("");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />Peminjaman Aktif
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeLoans.length} barang sedang dipinjam</p>
        </div>
        <div className="flex items-center gap-2">
          <SortToggle mode={sortMode} onChange={handleSortChange} />
          <button onClick={refreshSilent} className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {isLoading && !barang.length ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : activeLoans.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada peminjaman aktif</p>
          <p className="text-xs mt-1">Semua barang tersedia</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeLoans.map((b, i) => {
            const loan = getLatestLoan(b.uidbarang);
            const currentDeadline = getCurrentDeadline(loan, b.lastupdate || "");
            return (
              <div key={b.uidbarang || i} className="bg-card border border-card-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">{b.namabarang || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.kategori || "—"}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">Dipinjam</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    ["UID Barang", b.uidbarang, true],
                    ["Last User", b.lastuser, false],
                    ["Kelas", b.lastkelas, false],
                    ["Kode", loan?.extend_token || "", true],
                    ["Tenggat", currentDeadline || "", false],
                    ["Last Update", b.lastupdate, false],
                  ].map(([label, val, mono]) => (
                    <div key={label as string} className="flex gap-2">
                      <span className="text-muted-foreground w-20 flex-shrink-0">{label as string}</span>
                      <span className={`text-foreground truncate ${mono ? "font-mono" : ""}`}>{val as string || "—"}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setConfirm({ type: "kembalikan", uidbarang: b.uidbarang, namabarang: b.namabarang })} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />Kembalikan
                  </button>
                  <button onClick={() => { setHariTambah("1"); setAlasan(""); setConfirm({ type: "perpanjang", uidbarang: b.uidbarang, namabarang: b.namabarang }); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />Perpanjang
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <h2 className="text-base font-semibold text-foreground">{confirm.type === "kembalikan" ? "Konfirmasi Kembalikan" : "Konfirmasi Perpanjang"}</h2>
              </div>
              <button onClick={() => setConfirm(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {confirm.type === "kembalikan" ? (
                <p className="text-sm text-muted-foreground">Kembalikan <strong className="text-foreground">{confirm.namabarang}</strong>?</p>
              ) : (
                <>
                  {[
                    ["Nama", selectedLoan?.nama || selectedBarang?.lastuser || "—"],
                    ["Kelas", selectedLoan?.kelas || selectedBarang?.lastkelas || "—"],
                    ["ID Barang", confirm.uidbarang],
                    ["Kode", selectedLoan?.extend_token || "—"],
                    ["Tenggat Lama", tenggatLama || "—"],
                    ["Tenggat Baru", tenggatBaru || "—"],
                    ["Waktu Perpanjang", waktuPerpanjang],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                      <input type="text" value={value} disabled className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg text-muted-foreground" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tambah Hari</label>
                    <input type="number" min="1" value={hariTambah} onChange={e => setHariTambah(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10" />
                    <p className="mt-1 text-[11px] text-muted-foreground">Hari tambahan dihitung dari Tenggat Lama, bukan dari waktu pengisian form.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alasan <span className="font-normal">(opsional)</span></label>
                    <textarea value={alasan} onChange={e => setAlasan(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 resize-none" />
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirm(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Batal</button>
                <button onClick={handleConfirm} disabled={acting} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-white ${confirm.type === "kembalikan" ? "bg-green-600" : "bg-yellow-500"}`}>
                  {acting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {acting ? "Memproses..." : confirm.type === "kembalikan" ? "Ya, Kembalikan" : "Ya, Perpanjang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
