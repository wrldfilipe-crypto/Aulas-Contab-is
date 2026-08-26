import React, { useMemo, useRef } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { exportTableElementToLandscapePDF } from '../services/pdfExportService';

// Initialize marked once at module level (singleton pattern)
const markedInstance = new Marked({
  breaks: true,
  gfm: true
});

// Custom hooks to wrap all tables with the "Exportar para PDF" container
markedInstance.use({
  hooks: {
    postprocess(html: string) {
      return html.replace(
        /<table>([\s\S]*?)<\/table>/gi,
        `<div class="pgc-table-container relative my-3.5 rounded-xl border border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0A1628] shadow-2xs overflow-hidden">
  <div class="pgc-table-header-bar flex items-center justify-between px-3 py-1.5 bg-slate-50/90 dark:bg-[#131e33] border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)]">
    <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-sans">
      <span>📊</span>
      <span>Tabela & Demonstrações PGC Angola</span>
    </span>
    <button
      type="button"
      class="pgc-export-pdf-btn inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-medium bg-white dark:bg-[#1A2540] hover:bg-indigo-50 dark:hover:bg-[#1E3A8A] text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs transition-colors cursor-pointer"
      title="Exportar para PDF (Formato A4 Paisagem PGC)"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
      <span>Exportar para PDF</span>
    </button>
  </div>
  <div class="pgc-table-scroll-wrapper overflow-x-auto overflow-y-auto max-h-[500px]">
    <table>$1</table>
  </div>
</div>`
      );
    }
  }
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse markdown using the singleton instance and sanitize
  const htmlContent = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = markedInstance.parse(content) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel', 'class', 'type', 'title', 'fill', 'stroke', 'viewBox', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'd'],
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'span', 'div', 'button', 'svg', 'path', 'hr', 'mark', 'kbd', 'del', 'sup', 'sub'
        ]
      });
    } catch (e) {
      console.error('[MarkdownRenderer] Error parsing markdown:', e);
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  // Event delegation for table export to PDF
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const exportBtn = target.closest('.pgc-export-pdf-btn');
    if (exportBtn) {
      e.preventDefault();
      e.stopPropagation();
      const tableContainer = exportBtn.closest('.pgc-table-container');
      const tableEl = tableContainer?.querySelector('table') as HTMLTableElement | null;
      if (tableEl) {
        exportTableElementToLandscapePDF(tableEl, 'Demonstracao_Financeira_PGC_Angola');
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      className={`prose-accountant prose-sm max-w-none text-inherit leading-relaxed font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
