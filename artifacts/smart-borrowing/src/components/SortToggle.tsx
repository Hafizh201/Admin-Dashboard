import { ArrowDownUp } from "lucide-react";

interface Props {
  mode: "newest_first" | "oldest_first";
  onChange: (mode: "newest_first" | "oldest_first") => void;
}

export default function SortToggle({ mode, onChange }: Props) {
  const isNewest = mode === "newest_first";
  return (
    <button
      onClick={() => onChange(isNewest ? "oldest_first" : "newest_first")}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
      title="Ubah urutan tabel"
    >
      <ArrowDownUp className="w-3.5 h-3.5 text-muted-foreground" />
      {isNewest ? "Terbaru di atas" : "Terlama di atas"}
    </button>
  );
}
