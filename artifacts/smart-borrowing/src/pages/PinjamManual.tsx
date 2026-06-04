import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { PlusCircle, Loader2, AlertTriangle, X } from "lucide-react";

export default function PinjamManual() {
  const { pinjamBarangItem, barang, siswa } = useData();
  const { showToast } = useToast();
  const [form, setForm] = useState({ uidpeminjam: "", uidbarang: "", Perpanjang: "" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirm(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setConfirm(false);
    try {
      await pinjamBarangItem(form.uidpeminjam, form.uidbarang, form.Perpanjang);
      showToast("Peminjaman dicatat (menyinkronkan ke server...).", "success");
      setForm({ uidpeminjam: "", uidbarang: "", Perpanjang: "" });
    } finally {
      setSaving(false);
    }
  };

  // Look up siswa and barang info for confirmation preview
  const siswaInfo = siswa.find(s => s.uid === form.uidpeminjam);
  const barangInfo = barang.find(b => b.uidbarang === form.uidbarang);

  return (
    <div className="page-transition max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" />Form Pinjam Manual
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Input peminjaman barang secara manual</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl shadow-xs p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">UID Peminjam</label>
            <input
              type="text" value={form.uidpeminjam}
              onChange={e => setForm({ ...form, uidpeminjam: e.target.value })}
              placeholder="Contoh: c7 6e 03 07" required
              className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {siswaInfo && (
              <p className="text-xs text-green-600 mt-1 font-medium">✓ {siswaInfo.nama} — {siswaInfo.kelas}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">UID kartu RFID siswa peminjam</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">UID Barang</label>
            <input
              type="text" value={form.uidbarang}
              onChange={e => setForm({ ...form, uidbarang: e.target.value })}
              placeholder="Contoh: BRG001" required
              className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {barangInfo && (
              <p className={`text-xs mt-1 font-medium ${
                barangInfo.dipinjam === "true" || barangInfo.dipinjam === "Dipinjam"
                  ? "text-orange-600" : "text-green-600"
              }`}>
                ✓ {barangInfo.namabarang} — {barangInfo.kategori} —{" "}
                {barangInfo.dipinjam === "true" || barangInfo.dipinjam === "Dipinjam" ? "⚠ Sedang dipinjam" : "Tersedia"}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">UID barang yang akan dipinjam</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              Perpanjang <span className="font-normal normal-case">(opsional)</span>
            </label>
            <input
              type="text" value={form.Perpanjang}
              onChange={e => setForm({ ...form, Perpanjang: e.target.value })}
              placeholder="Contoh: 7 hari"
              className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <button
            type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Memproses...</>
              : <><PlusCircle className="w-4 h-4" />Proses Peminjaman</>
            }
          </button>
        </form>
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold">Konfirmasi Peminjaman</h2>
              </div>
              <button onClick={() => setConfirm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">Konfirmasi detail peminjaman:</p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {[
                  ["UID Peminjam", form.uidpeminjam],
                  ...(siswaInfo ? [["Siswa", `${siswaInfo.nama} — ${siswaInfo.kelas}`]] : []),
                  ["UID Barang", form.uidbarang],
                  ...(barangInfo ? [["Barang", barangInfo.namabarang]] : []),
                  ...(form.Perpanjang ? [["Perpanjang", form.Perpanjang]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-3 text-sm">
                    <span className="text-muted-foreground w-28 flex-shrink-0 text-xs font-medium">{label}</span>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">Batal</button>
                <button onClick={handleConfirm} className="flex-1 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                  Ya, Proses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
