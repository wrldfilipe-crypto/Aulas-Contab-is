import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QueueItemBreakdown {
  label: string;
  count: number;
  color: string;
  key: string;
}

interface OfflineSyncQueueD3ChartProps {
  compact?: boolean;
  onOpenModal?: () => void;
  className?: string;
}

export const OfflineSyncQueueD3Chart: React.FC<OfflineSyncQueueD3ChartProps> = ({
  compact = false,
  onOpenModal,
  className = ''
}) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    successfulSyncCount,
    triggerSync,
    lastSyncTime
  } = useOfflineSync();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<number | null>(null);

  // Compute breakdown segments for the D3 Donut / Ring
  const synced = Math.max(0, successfulSyncCount || 0);
  const pending = Math.max(0, pendingCount - failedCount);
  const failed = Math.max(0, failedCount || 0);
  const syncing = isSyncing ? Math.max(1, pending) : 0;

  const total = synced + pending + failed + (syncing > 0 && pending === 0 ? 1 : 0);

  // Trigger ripple animation on queue change
  const prevPendingRef = useRef(pendingCount);
  useEffect(() => {
    if (pendingCount !== prevPendingRef.current) {
      setLastSubmittedTime(Date.now());
      prevPendingRef.current = pendingCount;
    }
  }, [pendingCount]);

  // Render / update D3 animation
  useEffect(() => {
    if (!svgRef.current) return;

    const width = compact ? 34 : 46;
    const height = compact ? 34 : 46;
    const margin = 2;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.65;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Prepare data
    let dataset: QueueItemBreakdown[] = [];

    if (total === 0) {
      // Default idle state
      dataset = [
        { label: 'Sincronizado', count: 1, color: isOnline ? '#10B981' : '#F59E0B', key: 'synced' }
      ];
    } else {
      if (synced > 0) dataset.push({ label: 'Sincronizados', count: synced, color: '#10B981', key: 'synced' });
      if (pending > 0) dataset.push({ label: 'Na Fila', count: pending, color: '#3B82F6', key: 'pending' });
      if (syncing > 0) dataset.push({ label: 'Em Envio', count: syncing, color: '#6366F1', key: 'syncing' });
      if (failed > 0) dataset.push({ label: 'Com Falha', count: failed, color: '#EF4444', key: 'failed' });
    }

    const pie = d3.pie<QueueItemBreakdown>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.06);

    const arc = d3.arc<d3.PieArcDatum<QueueItemBreakdown>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(2);

    // Background track ring
    g.append('circle')
      .attr('r', (radius + innerRadius) / 2)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148, 163, 184, 0.2)')
      .attr('stroke-width', radius - innerRadius);

    // Render Pie Arcs with smooth D3 Tween Transition
    const arcs = g.selectAll('.arc')
      .data(pie(dataset))
      .enter()
      .append('path')
      .attr('class', 'arc')
      .attr('fill', (d) => d.data.color)
      .style('cursor', 'pointer');

    arcs.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return arc(interpolate(t)) || '';
        };
      });

    // Center icon/indicator with D3
    if (isSyncing) {
      const syncGroup = g.append('g')
        .attr('class', 'sync-indicator');
      
      syncGroup.append('circle')
        .attr('r', innerRadius * 0.75)
        .attr('fill', '#3B82F6')
        .attr('opacity', 0.2);
    }

    // Ripple wave effect when new items arrive
    if (lastSubmittedTime && Date.now() - lastSubmittedTime < 2500) {
      const ripple = g.append('circle')
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', pending > 0 ? '#3B82F6' : '#10B981')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);

      ripple.transition()
        .duration(1200)
        .ease(d3.easeQuadOut)
        .attr('r', radius + 6)
        .attr('opacity', 0)
        .remove();
    }
  }, [synced, pending, failed, syncing, total, isOnline, isSyncing, compact, lastSubmittedTime]);

  const handleContainerClick = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      triggerSync();
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      id="d3-offline-queue-gauge-container"
    >
      <button
        type="button"
        onClick={handleContainerClick}
        className="group relative flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
        title="Monitor de Fila de Sincronização D3 — Clique para abrir o gestor offline"
        aria-label="Estado da Fila de Sincronização"
      >
        {/* D3 Rendered Canvas / SVG */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg ref={svgRef} className={`transition-transform duration-300 ${isSyncing ? 'animate-spin' : 'group-hover:scale-105'}`} />
          
          {/* Centered micro-status badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isSyncing ? (
              <RefreshCw className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : pendingCount > 0 ? (
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            ) : (
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            )}
          </div>
        </div>

        {/* Text Details in non-compact mode */}
        {!compact && (
          <div className="flex flex-col text-left pr-1 min-w-[70px]">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fila Offline
              </span>
              {isSyncing && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              )}
            </div>
            <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 leading-tight truncate">
              {isSyncing 
                ? 'A Sincronizar...' 
                : pendingCount > 0 
                ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` 
                : '100% Sincronizado'}
            </span>
          </div>
        )}
      </button>

      {/* Floating Detailed D3 Queue Popover Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-[9999] w-64 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border border-slate-700/90 shadow-2xl space-y-2.5 font-sans pointer-events-none select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-black tracking-tight text-white">Estado da Fila D3</span>
              </div>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] block">Pendentes</span>
                <strong className="text-sm font-black text-blue-400">{pendingCount}</strong>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] block">Sincronizados</span>
                <strong className="text-sm font-black text-emerald-400">{synced}</strong>
              </div>
            </div>

            {failedCount > 0 && (
              <div className="flex items-center gap-1.5 text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2 rounded-xl text-[10px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{failedCount} item(ns) requerem nova tentativa de envio.</span>
              </div>
            )}

            <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
              <span>Último sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recente'}</span>
              <span className="text-blue-400 font-semibold">Clique para gerir ↗</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfflineSyncQueueD3Chart;
