import { useData } from "@/contexts/DataContext";
import { CheckCircle2, CloudOff, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export default function SyncIndicator() {
  const { syncStats, isSyncing, isOffline, isFromCache, lastUpdate, retryAllFailed } = useData();

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[11px] font-medium">
        <CloudOff className="w-3 h-3 flex-shrink-0" />
        <span>Offline</span>
      </div>
    );
  }

  if (syncStats.failed > 0) {
    return (
      <button
        onClick={retryAllFailed}
        title="Klik untuk coba ulang"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/15 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/25 transition-colors"
      >
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        <span>Gagal {syncStats.failed}</span>
      </button>
    );
  }

  if (isSyncing || syncStats.pending > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium">
        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
        <span>Sync {syncStats.pending > 0 ? syncStats.pending : ""}...</span>
      </div>
    );
  }

  if (isFromCache) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[11px] font-medium">
        <RefreshCw className="w-3 h-3 flex-shrink-0" />
        <span>Memuat terbaru...</span>
      </div>
    );
  }

  const timeStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/20 text-green-400 text-[11px] font-medium">
      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
      <span className="hidden sm:inline">{timeStr ? `Tersinkron ${timeStr}` : "Tersinkron"}</span>
    </div>
  );
}
