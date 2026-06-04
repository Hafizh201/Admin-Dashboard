import { RefreshCw } from "lucide-react";
import { useData } from "@/contexts/DataContext";

export default function SyncButton() {
  const { refreshSilent, isSyncing } = useData();

  return (
    <button
      type="button"
      onClick={refreshSilent}
      disabled={isSyncing}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Sync</span>
    </button>
  );
}
