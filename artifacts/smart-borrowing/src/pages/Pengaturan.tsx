import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Settings, RefreshCw, LogOut, Wifi, WifiOff, Loader2, Copy, Check } from "lucide-react";

const API_URL = "https://script.google.com/macros/s/AKfycbyDlUHBa-YPsv2EN3iprkSMPLdWC7o_hZ80ixXnux1huALJmeFB0a-Uxh5L-F7g7ObH/exec";

function InfoRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm text-foreground font-medium truncate">{value}</span>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors p-1 rounded"
          title="Salin"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function Pengaturan() {
  const { pin, logout } = useAuth();
  const { showToast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "success" | "error">("idle");
  const [refreshing, setRefreshing] = useState(false);

  const handleTestKoneksi = async () => {
    setTesting(true);
    setTestResult("idle");
    const res = await api({ action: "login", pin });
    setTesting(false);
    if (res.ok) {
      setTestResult("success");
      showToast("Koneksi ke API berhasil!", "success");
    } else {
      setTestResult("error");
      showToast(res.error || "Koneksi gagal.", "error");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await api({ action: "bootstrap", pin });
    setRefreshing(false);
    if (res.ok) {
      showToast("Data berhasil di-refresh.", "success");
    } else {
      showToast(res.error || "Gagal refresh data.", "error");
    }
  };

  const handleLogout = () => {
    logout();
    showToast("Berhasil logout.", "info");
  };

  return (
    <div className="page-transition max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Informasi sistem dan konfigurasi</p>
      </div>

      {/* System Info */}
      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Informasi Sistem</h2>
        </div>
        <div className="px-6">
          <InfoRow label="Nama Sistem" value="Smart Borrowing System" />
          <InfoRow label="Platform" value="IoT Berbasis ESP32" />
          <InfoRow label="Sheet Siswa" value="Data" />
          <InfoRow label="Sheet Barang" value="Barang" />
          <InfoRow label="Sheet Riwayat" value="Riwayat" />
          <InfoRow label="URL API" value={API_URL} />
        </div>
      </div>

      {/* Test Koneksi */}
      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Koneksi API</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Test koneksi ke Google Apps Script untuk memastikan API dapat diakses dengan benar.
          </p>
          {testResult !== "idle" && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
              testResult === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              {testResult === "success"
                ? <><Wifi className="w-4 h-4" />Koneksi berhasil — API dapat dijangkau</>
                : <><WifiOff className="w-4 h-4" />Koneksi gagal — periksa URL atau deployment</>
              }
            </div>
          )}
          <button
            onClick={handleTestKoneksi}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {testing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Testing...</>
              : <><Wifi className="w-4 h-4" />Test Koneksi API</>
            }
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border border-card-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Aksi</h2>
        </div>
        <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold border border-border bg-background rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {refreshing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Refreshing...</>
              : <><RefreshCw className="w-4 h-4" />Refresh Data</>
            }
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground/60 pb-4">
        Smart Borrowing System — IoT ESP32 &mdash; Admin Dashboard v1.0
      </div>
    </div>
  );
}
