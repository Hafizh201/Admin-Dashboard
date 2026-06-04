import { useData } from "@/contexts/DataContext";
import { isDipinjam } from "@/lib/api";
import {
  Users, Package, BookOpen, Activity, TrendingUp, RefreshCw, Loader2,
  UserCheck, UserX, CheckCircle, Clock, BarChart2, ArrowUpRight, RotateCcw, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#1d4ed8", "#16a34a", "#ca8a04", "#9333ea", "#dc2626", "#0891b2", "#ea580c"];

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4 shadow-xs hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value ?? "—"}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      <BarChart2 className="w-4 h-4 text-primary" />{children}
    </h2>
  );
}

export default function Dashboard() {
  const { siswa, barang, riwayat, stats, isLoading, isFromCache, lastUpdate, refreshSilent } = useData();

  if (isLoading && !siswa.length && !barang.length) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const now = new Date();
  const today = new Date().toISOString().slice(0, 10);

  const totalSiswa = stats?.total_siswa ?? siswa.length;
  const siswaAktif = stats?.siswa_aktif ?? siswa.filter(s => new Date(s.Kadaluarsa) >= now).length;
  const siswaKadaluarsa = stats?.siswa_kadaluarsa ?? (totalSiswa - siswaAktif);
  const totalBarang = stats?.total_barang ?? barang.length;
  const barangDipinjam = stats?.barang_dipinjam ?? barang.filter(b => isDipinjam(b.dipinjam)).length;
  const barangTersedia = stats?.barang_tersedia ?? (totalBarang - barangDipinjam);
  const totalRiwayat = stats?.total_riwayat ?? riwayat.length;
  const riwayatHariIni = stats?.riwayat_hari_ini ?? riwayat.filter(r => r.waktu?.startsWith(today)).length;
  const modePinjam = stats?.total_pinjam ?? riwayat.filter(r => r.mode === "Pinjam").length;
  const modeKembali = stats?.total_kembali ?? riwayat.filter(r => r.mode === "Kembali").length;
  const modePerpanjang = stats?.total_perpanjang ?? riwayat.filter(r => r.mode === "Perpanjang").length;

  const kategoriData = stats?.kategori_barang
    ? Object.entries(stats.kategori_barang).map(([name, value]) => ({ name, value }))
    : [];
  const statusData = stats?.status_barang
    ? Object.entries(stats.status_barang).map(([name, value]) => ({ name, value }))
    : [{ name: "Tersedia", value: barangTersedia }, { name: "Dipinjam", value: barangDipinjam }];
  const modeData = stats?.mode_riwayat
    ? Object.entries(stats.mode_riwayat).map(([name, value]) => ({ name, value }))
    : [
        { name: "Pinjam", value: modePinjam },
        { name: "Kembali", value: modeKembali },
        { name: "Perpanjang", value: modePerpanjang },
      ];
  const aktivitasData = stats?.aktivitas_7_hari
    ? Object.entries(stats.aktivitas_7_hari).map(([name, value]) => ({ name: name.slice(5), value }))
    : [];

  return (
    <div className="page-transition space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Smart Borrowing System — Monitoring IoT</p>
        </div>
        <button
          onClick={refreshSilent}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {isFromCache && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-medium">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Menampilkan data dari cache. Memuat data terbaru...
        </div>
      )}

      {/* Siswa */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Siswa</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Siswa" value={totalSiswa} icon={Users} color="bg-blue-100 text-blue-700" />
          <StatCard label="Siswa Aktif" value={siswaAktif} icon={UserCheck} color="bg-green-100 text-green-700" />
          <StatCard label="Siswa Kadaluarsa" value={siswaKadaluarsa} icon={UserX} color="bg-red-100 text-red-700" />
        </div>
      </div>

      {/* Barang */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Barang</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Barang" value={totalBarang} icon={Package} color="bg-purple-100 text-purple-700" />
          <StatCard label="Tersedia" value={barangTersedia} icon={CheckCircle} color="bg-green-100 text-green-700" />
          <StatCard label="Dipinjam" value={barangDipinjam} icon={BookOpen} color="bg-blue-100 text-blue-700" />
        </div>
      </div>

      {/* Riwayat */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riwayat</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Total Riwayat" value={totalRiwayat} icon={Activity} color="bg-orange-100 text-orange-700" />
          <StatCard label="Hari Ini" value={riwayatHariIni} icon={Clock} color="bg-cyan-100 text-cyan-700" />
          <StatCard label="Mode Pinjam" value={modePinjam} icon={ArrowUpRight} color="bg-blue-100 text-blue-700" />
          <StatCard label="Mode Kembali" value={modeKembali} icon={TrendingUp} color="bg-green-100 text-green-700" />
          <StatCard label="Perpanjang" value={modePerpanjang} icon={RotateCcw} color="bg-yellow-100 text-yellow-700" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {aktivitasData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Aktivitas 7 Hari Terakhir</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aktivitasData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Aktivitas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {modeData.filter(m => m.value > 0).length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Mode Riwayat</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modeData.filter(m => m.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {kategoriData.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Kategori Barang</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kategoriData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Jumlah">
                  {kategoriData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {statusData.filter(s => s.value > 0).length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs">
            <SectionTitle>Status Barang</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData.filter(s => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {statusData.map((_, i) => <Cell key={i} fill={["#16a34a", "#1d4ed8"][i % 2]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {aktivitasData.length === 0 && modeData.every(m => m.value === 0) && (
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada data grafik</p>
          </div>
        )}
      </div>

      {lastUpdate && (
        <p className="text-xs text-muted-foreground/50 text-right">
          Terakhir diperbarui: {new Date(lastUpdate).toLocaleString("id-ID")}
        </p>
      )}
    </div>
  );
}
