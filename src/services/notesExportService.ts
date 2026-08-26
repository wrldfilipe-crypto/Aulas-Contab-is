import jsPDF from 'jspdf';
import { NoteItem } from '../components/NotasPage';

/**
 * Sanitizes a title string for use in safe filenames
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40) || 'nota';
}

/**
 * Formats timestamps to standard Portuguese readable strings
 */
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Exports all notes of a specific category into a styled PDF document
 */
export function exportCategoryNotesAsPDF(notes: NoteItem[], category: string): void {
  const categoryNotes = category === 'Todas' ? notes : notes.filter(n => n.category === category);
  const safeCategory = sanitizeFilename(category);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `notas_${safeCategory}_${dateStr}.pdf`;
  exportNotesAsPDF(categoryNotes, filename, `Caderno de Notas - Categoria: ${category}`);
}

/**
 * Exports all notes of a specific category into a Markdown (.md) file
 */
export function exportCategoryNotesAsMarkdown(notes: NoteItem[], category: string): void {
  const categoryNotes = category === 'Todas' ? notes : notes.filter(n => n.category === category);
  const safeCategory = sanitizeFilename(category);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `notas_${safeCategory}_${dateStr}.md`;
  exportNotesAsMarkdown(categoryNotes, filename, `# Caderno de Notas - Categoria: ${category}\n\n`);
}

/**
 * Exports an array of notes to a structured Markdown (.md) file
 */
export function exportNotesAsMarkdown(notes: NoteItem[], filename?: string, customHeader?: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const targetFilename = filename || `caderno_notas_contabilidade_${dateStr}.md`;

  let md = customHeader || `# Caderno de Notas & Apontamentos Contabilísticos\n\n`;
  md += `> **Data de Exportação:** ${formatDateTime(Date.now())}  \n`;
  md += `> **Total de Notas:** ${notes.length} | **Notas Fixadas:** ${notes.filter(n => n.pinned).length}\n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## Índice de Notas\n\n`;
  notes.forEach((note, index) => {
    const pinBadge = note.pinned ? ' ⭐ [Fixada]' : '';
    md += `${index + 1}. [${note.title}](#${sanitizeFilename(note.title)}) - *(${note.category})${pinBadge}*\n`;
  });
  md += `\n---\n\n`;

  // Notes Details
  notes.forEach((note, index) => {
    const pinBadge = note.pinned ? ' ⭐ *(Fixada no Topo)*' : '';
    const tagsFormatted = note.tags && note.tags.length > 0
      ? note.tags.map(t => `\`#${t}\``).join(' ')
      : '_Sem etiquetas_';

    md += `### ${index + 1}. ${note.title} <a id="${sanitizeFilename(note.title)}"></a>\n\n`;
    md += `- **Categoria:** \`${note.category}\`${pinBadge}\n`;
    md += `- **Etiquetas:** ${tagsFormatted}\n`;
    md += `- **Criado em:** ${formatDateTime(note.createdAt)}\n`;
    md += `- **Última modificação:** ${formatDateTime(note.updatedAt || note.createdAt)}\n\n`;
    md += `#### Conteúdo:\n\n`;
    md += `${note.content || '_Sem conteúdo registado._'}\n\n`;
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = targetFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single note to a Markdown (.md) file
 */
export function exportSingleNoteAsMarkdown(note: NoteItem): void {
  const safeTitle = sanitizeFilename(note.title);
  const filename = `nota_${safeTitle}_${new Date().toISOString().split('T')[0]}.md`;

  const pinBadge = note.pinned ? ' ⭐ *(Fixada no Topo)*' : '';
  const tagsFormatted = note.tags && note.tags.length > 0
    ? note.tags.map(t => `\`#${t}\``).join(' ')
    : '_Sem etiquetas_';

  let md = `# ${note.title}\n\n`;
  md += `> **Categoria:** \`${note.category}\`${pinBadge}  \n`;
  md += `> **Etiquetas:** ${tagsFormatted}  \n`;
  md += `> **Última Atualização:** ${formatDateTime(note.updatedAt || note.createdAt)}  \n`;
  md += `> **Criado em:** ${formatDateTime(note.createdAt)}\n\n`;
  md += `---\n\n`;
  md += `## Conteúdo\n\n`;
  md += `${note.content || '_Sem conteúdo registado._'}\n\n`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports all notes into a styled multi-page PDF document
 */
export function exportNotesAsPDF(notes: NoteItem[], filename?: string, customTitle?: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 18;

  // Header Banner on First Page
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, 34, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(customTitle || 'Caderno de Notas & Apontamentos', marginX + 8, currentY + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Sistema de Gestão & Contabilidade PGC Angola | Data: ${formatDateTime(Date.now())}`, marginX + 8, currentY + 20);

  const pinnedCount = notes.filter(n => n.pinned).length;
  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`Total de Notas: ${notes.length}   •   Fixadas: ${pinnedCount}`, marginX + 8, currentY + 27);

  currentY += 42;

  // Render each note as a formatted card
  notes.forEach((note, index) => {
    // Estimate note content height
    const splitContent = doc.splitTextToSize(note.content || '(Sem conteúdo)', contentWidth - 14);
    const contentLineCount = splitContent.length;
    const estimatedHeight = 32 + (contentLineCount * 4.5) + (note.tags?.length ? 8 : 0);

    // If card doesn't fit on current page, create a new page
    if (currentY + estimatedHeight > pageHeight - 22) {
      doc.addPage();
      currentY = 18;
    }

    const cardTop = currentY;

    // Card background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(marginX, cardTop, contentWidth, estimatedHeight, 3, 3, 'FD');

    // Category Pill / Status
    if (note.pinned) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.roundedRect(marginX + 6, cardTop + 5, 24, 5, 1.5, 1.5, 'FD');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('★ FIXADA', marginX + 9, cardTop + 8.8);
    }

    // Category Badge
    doc.setFillColor(224, 231, 255); // indigo-100
    doc.setDrawColor(99, 102, 241); // indigo-500
    const catX = note.pinned ? marginX + 33 : marginX + 6;
    doc.roundedRect(catX, cardTop + 5, 30, 5, 1.5, 1.5, 'FD');
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(note.category.toUpperCase(), catX + 3, cardTop + 8.8);

    // Date
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const dateText = formatDateTime(note.updatedAt || note.createdAt);
    doc.text(dateText, marginX + contentWidth - doc.getTextWidth(dateText) - 6, cardTop + 9);

    // Note Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    const titleLines = doc.splitTextToSize(`${index + 1}. ${note.title}`, contentWidth - 14);
    doc.text(titleLines, marginX + 7, cardTop + 17);

    // Content Body
    let textY = cardTop + 23;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(splitContent, marginX + 7, textY);

    textY += (contentLineCount * 4.5);

    // Tags
    if (note.tags && note.tags.length > 0) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(79, 70, 229); // indigo-600
      const tagsText = note.tags.map(t => `#${t}`).join('  ');
      doc.text(tagsText, marginX + 7, textY + 3);
    }

    currentY += estimatedHeight + 6;
  });

  // Add Footers & Page numbers across all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${totalPages}   •   Exportado via Plataforma Contabilística PGC Angola`,
      marginX,
      pageHeight - 9
    );
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const targetFilename = filename || `caderno_notas_contabilidade_${dateStr}.pdf`;
  doc.save(targetFilename);
}

/**
 * Exports a single note to a styled PDF document
 */
export function exportSingleNoteAsPDF(note: NoteItem): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  let currentY = 20;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Nota de Apontamento Contabilístico', marginX + 8, currentY + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Categoria: ${note.category}   •   Exportado em: ${formatDateTime(Date.now())}`, marginX + 8, currentY + 18);

  currentY += 34;

  // Note Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(note.title, contentWidth);
  doc.text(titleLines, marginX, currentY);
  currentY += (titleLines.length * 6) + 4;

  // Metadata Bar (Created / Updated)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Criado em: ${formatDateTime(note.createdAt)}   |   Última modificação: ${formatDateTime(note.updatedAt || note.createdAt)}`, marginX, currentY);
  currentY += 6;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  currentY += 8;

  // Note Body
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const splitContent = doc.splitTextToSize(note.content || '(Sem conteúdo registado)', contentWidth);
  
  // Multi-page handling for long single note content
  splitContent.forEach((line: string) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, marginX, currentY);
    currentY += 5.2;
  });

  currentY += 6;

  // Tags Section
  if (note.tags && note.tags.length > 0) {
    if (currentY > pageHeight - 25) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    const tagsFormatted = note.tags.map(t => `#${t}`).join('   ');
    doc.text(`Etiquetas: ${tagsFormatted}`, marginX, currentY);
  }

  // Add Footers & Page numbers across all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages}   •   Documento gerado pela plataforma de Contabilidade PGC Angola`,
      marginX,
      pageHeight - 9
    );
  }

  const safeTitle = sanitizeFilename(note.title);
  const targetFilename = `nota_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(targetFilename);
}
