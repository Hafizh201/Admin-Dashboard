function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <SkeletonLine className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-7 w-20" />
          <SkeletonLine className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable({ columns = 6, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-xs">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <SkeletonLine key={index} className="h-4 w-24" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="px-4 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))` }}>
              {Array.from({ length: columns }).map((__, col) => (
                <SkeletonLine key={col} className={`h-4 ${col === 1 ? "w-32" : "w-24"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="page-transition space-y-5" aria-busy="true" aria-label="Memuat data">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-36" />
        </div>
        <SkeletonLine className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SkeletonLine className="h-10 flex-1 rounded-lg" />
        <SkeletonLine className="h-10 w-40 rounded-lg" />
        <SkeletonLine className="h-10 w-40 rounded-lg" />
      </div>

      <SkeletonTable columns={6} rows={7} />
    </div>
  );
}

function PublicSkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

function PublicStatSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-4">
        <PublicSkeletonLine className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <PublicSkeletonLine className="h-8 w-16" />
          <PublicSkeletonLine className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

function PublicTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="grid min-w-[760px] grid-cols-7 gap-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <PublicSkeletonLine key={index} className="h-4 w-24" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="px-5 py-4">
            <div className="grid min-w-[760px] grid-cols-7 gap-5">
              {Array.from({ length: 7 }).map((__, col) => (
                <PublicSkeletonLine key={col} className={`h-4 ${col === 1 ? "w-32" : "w-24"}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicMonitorSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8" aria-busy="true" aria-label="Memuat data monitoring">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
        <PublicSkeletonLine className="h-4 w-40" />
        <div className="mt-4 space-y-3">
          <PublicSkeletonLine className="h-10 w-full max-w-xl" />
          <PublicSkeletonLine className="h-5 w-full max-w-2xl" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PublicStatSkeleton />
        <PublicStatSkeleton />
        <PublicStatSkeleton />
        <PublicStatSkeleton />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <PublicSkeletonLine className="h-7 w-44" />
          <PublicSkeletonLine className="h-4 w-36" />
        </div>
        <div className="flex flex-wrap gap-3">
          <PublicSkeletonLine className="h-12 min-w-[260px] flex-1" />
          <PublicSkeletonLine className="h-12 w-40" />
          <PublicSkeletonLine className="h-12 w-52" />
          <PublicSkeletonLine className="h-12 w-28" />
        </div>
        <PublicTableSkeleton />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <PublicSkeletonLine className="h-7 w-52" />
          <PublicSkeletonLine className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap gap-3">
          <PublicSkeletonLine className="h-12 min-w-[260px] flex-1" />
          <PublicSkeletonLine className="h-12 w-40" />
          <PublicSkeletonLine className="h-12 w-52" />
          <PublicSkeletonLine className="h-12 w-40" />
          <PublicSkeletonLine className="h-12 w-28" />
        </div>
        <PublicTableSkeleton />
      </section>
    </main>
  );
}
