import { useEffect, useState } from "react";
import { api, Barang, isDipinjam } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { BookOpen, Loader2, RotateCcw, RefreshCw, AlertTriangle, X } from "lucide-react";

type ConfirmAction = { type: "kembalikan" | "perpanjang"; uidbarang: string; namabarang: string } | null;

export default function PeminjamanAktif() {
  const { pin } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [perpanjangVal, setPerpanjangVal] = useState("");
  const [acting, setActing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await api<{ barang: Barang[] } | Barang[]>({ action: "getBarang", pin });
    setLoading(false);
    if (res.ok && res.data) {
      const d = res.data as any;
      const all: Barang[] = Array.isArray(d?.barang) ? d.barang : Array.isArray(d) ? d : [];
      setData(all.filter(b => isDipinjam(b.dipinjam)));
    } else {
      showToast(res.error || "Gagal memuat data.", "error");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirm = async () => {
    if (!confirm) return;
    setActing(true);
    let res;
    if (confirm.type === "kembalikan") {
      res = await api({ action: "returnBarang", pin, uidbarang: confirm.uidbarang });
    } else {
      res = await api({ action: "perpanjang", pin, uidbarang: confirm.uidbarang, Perpanjang: perpanjangVal });
    }
    setActing(false);
    if (res.ok) {
      showToast(
        confirm.type === "kembalikan"
          ? `${confirm.namabarang} berhasil dikembalikan.`
          : `${confirm.namabarang} berhasil diperpanjang.`,
        "success"
      );
      setConfirm(null);
      setPerpanjangVal("");
      fetchData();
    } else {
      showToast(res.error || "Gagal melakukan aksi.", "error");
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />Peminjaman Aktif
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.length} barang sedang dipinjam</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada peminjaman aktif</p>
          <p className="text-xs mt-1">Semua barang tersedia</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b, i) => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-shadow space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm leading-tight">{b.namabarang || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.kategori || "—"}</p>
                </div>
                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">Dipinjam</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">UID Barang</span>
                  <span className="font-mono text-foreground truncate">{b.uidbarang || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">Last User</span>
                  <span className="text-foreground truncate">{b.lastuser || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">Kelas</span>
                  <span className="text-foreground">{b.lastkelas || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">Last UID</span>
                  <span className="font-mono text-foreground truncate">{b.lastuid || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">Last Update</span>
                  <span className="text-foreground truncate">{b.lastupdate || "—"}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirm({ type: "kembalikan", uidbarang: b.uidbarang, namabarang: b.namabarang })}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />Kembalikan
                </button>
                <button
                  onClick={() => { setPerpanjangVal(""); setConfirm({ type: "perpanjang", uidbarang: b.uidbarang, namabarang: b.namabarang }); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />Perpanjang
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <h2 className="text-base font-semibold text-foreground">
                  {confirm.type === "kembalikan" ? "Konfirmasi Kembalikan" : "Konfirmasi Perpanjang"}
                </h2>
              </div>
              <button onClick={() => setConfirm(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                {confirm.type === "kembalikan"
                  ? <>Apakah Anda yakin ingin mengembalikan <strong className="text-foreground">{confirm.namabarang}</strong>?</>
                  : <>Perpanjang peminjaman <strong className="text-foreground">{confirm.namabarang}</strong>?</>
                }
              </p>
              {confirm.type === "perpanjang" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Keterangan Perpanjang</label>
                  <input
                    type="text"
                    value={perpanjangVal}
                    onChange={e => setPerpanjangVal(e.target.value)}
                    placeholder="Contoh: 7 hari"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                >Batal</button>
                <button
                  onClick={handleConfirm}
                  disabled={acting}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-white ${
                    confirm.type === "kembalikan" ? "bg-green-600" : "bg-yellow-500"
                  }`}
                >
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
