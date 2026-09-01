import React from 'react';

/**
 * Granular KPI Card Skeleton for metric counters and summary widgets
 */
export const KpiCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-7 w-32 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          <div className="flex items-center gap-2 pt-1">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-850 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Granular Table Rows Skeleton for journal entries, trial balances, and transactions
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden animate-pulse">
      {/* Table Header Skeleton */}
      <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={`h-3.5 bg-slate-200 dark:bg-slate-700 rounded ${i === 0 ? 'w-20' : i === 1 ? 'w-48' : 'w-24'}`} />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-4 flex items-center justify-between gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className={`h-3 bg-slate-100 dark:bg-slate-800 rounded ${
                  cIdx === 0 ? 'w-16' : cIdx === 1 ? 'w-52' : cIdx === columns - 1 ? 'w-20' : 'w-28'
                }`} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Granular Chart / Graph Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={`w-full ${height} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col justify-between animate-pulse`}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="flex items-end justify-between gap-3 h-40 pt-4 px-2">
        {[40, 65, 30, 80, 55, 90, 70, 45, 85, 60, 75, 95].map((h, i) => (
          <div 
            key={i} 
            className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t-md" 
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
    </div>
  );
};

/**
 * Granular List Item Skeleton for Recent activities, notes, and study modules
 */
export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
};

/**
 * Full Granular Accounting Workspace Skeleton
 */
export const AccountingWorkspaceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto p-4 sm:p-6" id="accounting-skeleton">
      {/* Top Banner Skeleton */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-4 w-36 bg-slate-700 rounded-full" />
        <div className="h-7 w-64 bg-slate-600 rounded-lg" />
        <div className="h-3.5 w-full max-w-md bg-slate-700 rounded" />
      </div>

      {/* KPI Cards Skeleton */}
      <KpiCardSkeleton count={4} />

      {/* Filters & Actions Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-pulse">
        <div className="h-9 w-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-36 bg-indigo-600/30 rounded-xl" />
        </div>
      </div>

      {/* Main Table Skeleton */}
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
};
