import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="page-skeleton-loader">
      {/* Header Banner Skeleton */}
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="h-4 w-40 bg-slate-700/50 rounded-full" />
        <div className="h-8 w-72 bg-slate-700/60 rounded-xl" />
        <div className="h-4 w-full max-w-xl bg-slate-700/40 rounded-lg" />
        <div className="flex gap-3 pt-2">
          <div className="h-9 w-28 bg-slate-700/50 rounded-xl" />
          <div className="h-9 w-32 bg-indigo-600/40 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/80 border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-2xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-200" />
            </div>
            <div className="h-7 w-32 bg-slate-300 rounded-lg" />
            <div className="h-3 w-40 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center">
            <div className="h-5 w-48 bg-slate-200 rounded-md" />
            <div className="h-4 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="h-56 w-full bg-slate-100/80 rounded-xl flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-4/5 bg-slate-100 rounded" />
          </div>
        </div>

        <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
