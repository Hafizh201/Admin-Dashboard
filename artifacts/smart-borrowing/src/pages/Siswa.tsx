import { useState, useMemo } from "react";
import { Siswa, isKadaluarsa } from "@/lib/api";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/components/Toast";
import { Plus, Search, Edit2, Loader2, Users, X } from "lucide-react";
import { useProgressiveRows } from "@/hooks/useProgressiveRows";
import SortToggle from "@/components/SortToggle";
import SyncButton from "@/components/SyncButton";
import { getSortMode, setSortMode, CACHE_KEYS } from "@/lib/cache";

const EMPTY: Siswa = { nama: "", level: "Siswa", uid: "", no_wa: "", Kadaluarsa: "", kelas: "" };

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>{children}</span>;
}

function SyncBadge({ localId, pendingIds, failedIds }: { localId?: string; pendingIds: Set<string>; failedIds: Set<string> }) {
  if (!localId) return null;
  if (failedIds.has(localId)) return <Badge color="bg-red-100 text-red-600">Gagal sinkron</Badge>;
  if (pendingIds.has(localId)) return <Badge color="bg-yellow-100 text-yellow-600">Menyinkronkan</Badge>;
  return null;
}

export default function SiswaPage() {
  const { siswa, addSiswa, updateSiswaItem, isLoading, pendingIds, failedIds } = useData();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUid, setEditUid] = useState<string | null>(null);
  const [form, setForm] = useState<Siswa>(EMPTY);
  const [sortMode, setSortModeState] = useState<"newest_first" | "oldest_first">(() =>
    getSortMode(CACHE_KEYS.sortData)
  );

  const handleSortChange = (mode: "newest_first" | "oldest_first") => {
    setSortModeState(mode);
    setSortMode(CACHE_KEYS.sortData, mode);
  };

  const filtered = useMemo(() => {
    const sorted = sortMode === "newest_first" ? [...siswa].reverse() : [...siswa];
    if (!search) return sorted;
    return sorted.filter(s =>
      [s.nama, s.level, s.uid, s.no_wa, s.Kadaluarsa, s.kelas].some(v =>
        v?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [siswa, search, sortMode]);

  const { rows, hasMore, total, shown } = useProgressiveRows(filtered);

  const openAdd = () => { setForm(EMPTY); setEditUid(null); setShowModal(true); };
  const openEdit = (s: Siswa) => { setForm({ ...EMPTY, ...s }); setEditUid(s.uid); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUid) {
        await updateSiswaItem(editUid, form);
        showToast("Data user diperbarui.", "success");
      } else {
        if (siswa.find(s => s.uid === form.uid)) {
          showToast("UID sudah terdaftar.", "error");
          setSaving(false);
          return;
        }
        await addSiswa(form);
        showToast("User ditambahkan (menyinkronkan...).", "success");
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-transition space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Data User</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{siswa.length} user terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" />Tambah User
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search" placeholder="Cari nama, UID, nomor WA, kelas, level..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <SortToggle mode={sortMode} onChange={handleSortChange} />
      </div>

      {hasMore && (
        <p className="text-xs text-muted-foreground px-1">Menampilkan {shown} dari {total} data...</p>
      )}

      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        {isLoading && !siswa.length ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Tidak ada data user</p>
            <p className="text-xs mt-1">{search ? "Coba ubah kata kunci" : "Tambah user untuk memulai"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Nama", "Level", "UID", "No WA", "Kadaluarsa", "Kelas", "Aksi"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s, i) => {
                  const localId = (s as any)._localId as string | undefined;
                  return (
                    <tr key={s.uid || i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.nama || "-"}
                          <SyncBadge localId={localId} pendingIds={pendingIds} failedIds={failedIds} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={s.level === "Admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>{s.level || "-"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.uid || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.no_wa || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={isKadaluarsa(s.Kadaluarsa) ? "text-red-600 font-medium" : "text-foreground"}>
                          {s.Kadaluarsa || "-"}
                        </span>
                        {isKadaluarsa(s.Kadaluarsa) && <Badge color="bg-red-100 text-red-700 ml-2">Kadaluarsa</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.kelas || "-"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                          <Edit2 className="w-3 h-3" />Edit
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">{editUid ? "Edit User" : "Tambah User"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {(["nama", "uid", "no_wa", "Kadaluarsa", "kelas"] as (keyof Siswa)[]).map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 capitalize">
                    {field === "Kadaluarsa" ? "Kadaluarsa (tahun atau YYYY-MM-DD)" : field === "no_wa" ? "Nomor WA" : field}
                  </label>
                  <input
                    type="text"
                    value={form[field] || ""}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    required={field !== "kelas" && field !== "no_wa"}
                    disabled={field === "uid" && !!editUid}
                    placeholder={field === "Kadaluarsa" ? "Contoh: 2027 atau 2027-12-31" : field === "no_wa" ? "Contoh: 6281234567890" : undefined}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Level</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50">
                  <option>Siswa</option><option>Admin</option><option>Guru</option>
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
