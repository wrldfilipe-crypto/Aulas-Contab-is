import jsPDF from 'jspdf';
import { NoteItem } from '../components/NotasPage';

/**
 * Mapeamento e detetor de referências ao PGC Angola (Decreto n.º 82/01)
 */
const PGC_ACCOUNTS_MAP: Record<string, string> = {
  '11': 'Imobilizações Corpóreas',
  '12': 'Imobilizações Incorpóreas',
  '13': 'Investimentos Financeiros',
  '14': 'Imobilizações em Curso',
  '21': 'Mercadorias Gerais',
  '22': 'Matérias-Primas, Subsidiárias e de Consumo',
  '23': 'Produtos Fabricados e Acabados',
  '24': 'Produtos Intermédios',
  '25': 'Subprodutos, Desperdícios e Resíduos',
  '26': 'Produtos e Trabalhos em Curso',
  '27': 'Mercadorias / Matérias em Trânsito',
  '31': 'Fornecedores c/c',
  '32': 'Clientes c/c',
  '33': 'Empréstimos Obtidos',
  '34': 'Estado e Outros Entes Públicos',
  '34.1': 'Imposto Sobre o Valor Acrescentado (IVA)',
  '34.2': 'Imposto Industrial',
  '34.3': 'Imposto sobre o Rendimento do Trabalho (IRT)',
  '34.5': 'Segurança Social (INSS 8% + 3%)',
  '34.6': 'Imposto de Selo',
  '35': 'Entidades do Grupo e Associadas',
  '36': 'Pessoal (Remunerações a Pagar)',
  '37': 'Outros Valores a Receber e a Pagar',
  '38': 'Provisões para Riscos e Encargos',
  '41': 'Títulos Negociáveis',
  '42': 'Depósitos a Prazo',
  '43': 'Depósitos à Ordem',
  '43.1': 'Depósitos à Ordem em Moeda Nacional (Kz)',
  '43.2': 'Depósitos à Ordem em Moeda Estrangeira',
  '45': 'Caixa',
  '45.1': 'Caixa Geral',
  '45.2': 'Caixas Pequenas / Fundo de Maneio',
  '51': 'Capital Social Subscrito',
  '52': 'Ações ou Quotas Próprias',
  '53': 'Prémios de Emissão',
  '54': 'Reservas Legais',
  '55': 'Reservas Estatutárias e Livres',
  '56': 'Resultados Transitados',
  '61': 'Vendas de Mercadorias e Produtos',
  '61.1': 'Vendas de Mercadorias no Mercado Nacional',
  '62': 'Prestações de Serviços',
  '63': 'Outros Proveitos Operacionais',
  '64': 'Trabalhos para a Própria Empresa',
  '65': 'Subsídios à Exploração',
  '66': 'Proveitos Financeiros Gerais',
  '67': 'Ganhos em Filiais e Associadas',
  '68': 'Outros Proveitos Não Operacionais',
  '69': 'Proveitos Extraordinários',
  '71': 'Custo das Mercadorias Vendidas e Matérias Consumidas (CMVMC)',
  '72': 'Custos com o Pessoal (Salários e Encargos Sociais)',
  '73': 'Fornecimentos e Serviços de Terceiros (FST)',
  '74': 'Impostos e Taxas Operacionais',
  '75': 'Amortizações e Depreciações do Exercício',
  '76': 'Provisões do Exercício',
  '77': 'Custos e Perdas Financeiras',
  '78': 'Outros Custos Não Operacionais',
  '79': 'Custos Extraordinários',
  '81': 'Resultados Operacionais',
  '82': 'Resultados Financeiros',
  '83': 'Resultados Correntes',
  '84': 'Resultados Extraordinários',
  '85': 'Resultados Antes de Impostos (RAI)',
  '86': 'Imposto Sobre o Rendimento (Imposto Industrial)',
  '87': 'Resultado Líquido do Exercício (RLE)',
  '88': 'Dividendos Antecipados',
  '89': 'Resultados Transitados Apurados'
};

/**
 * Deteta referências normativas e contas do PGC dentro do texto de uma nota
 */
export function extractPGCReferences(text: string): { accounts: string[]; laws: string[] } {
  const accountsFound = new Set<string>();
  const lawsFound = new Set<string>();

  // Detetar contas no formato Conta XX ou XX.X ou Conta XX.X
  const accountRegex = /\b(?:Conta\s+)?([1-8][1-9](?:\.[1-9])?)\b/g;
  let match: RegExpExecArray | null;
  while ((match = accountRegex.exec(text)) !== null) {
    const code = match[1];
    if (PGC_ACCOUNTS_MAP[code]) {
      accountsFound.add(`Conta ${code} — ${PGC_ACCOUNTS_MAP[code]}`);
    }
  }

  // Detetar Classes PGC
  const classRegex = /\bClasse\s*([1-8])\b/gi;
  while ((match = classRegex.exec(text)) !== null) {
    const cNum = match[1];
    const classNames: Record<string, string> = {
      '1': 'Classe 1 (Meios Fixos e Investimentos)',
      '2': 'Classe 2 (Existências / Inventários)',
      '3': 'Classe 3 (Terceiros / Clientes e Fornecedores)',
      '4': 'Classe 4 (Meios Monetários e Tesouraria)',
      '5': 'Classe 5 (Capital Próprio e Reservas)',
      '6': 'Classe 6 (Proveitos por Natureza)',
      '7': 'Classe 7 (Custos por Natureza)',
      '8': 'Classe 8 (Resultados e Apuramento)'
    };
    if (classNames[cNum]) {
      accountsFound.add(classNames[cNum]);
    }
  }

  // Detetar Leis e Decretos de Angola
  const lower = text.toLowerCase();
  if (lower.includes('decreto 82/01') || lower.includes('pgc') || lower.includes('decreto n.º 82/01')) {
    lawsFound.add('Decreto n.º 82/01 de 16 de Novembro (Aprova o Plano Geral de Contabilidade - PGC Angola)');
  }
  if (lower.includes('iva') || lower.includes('lei 7/19') || lower.includes('modelo 7')) {
    lawsFound.add('Lei n.º 7/19 de 24 de Abril (Código do Imposto Sobre o Valor Acrescentado - IVA Angola)');
  }
  if (lower.includes('imposto industrial') || lower.includes('lei 19/14') || lower.includes('lei 26/20')) {
    lawsFound.add('Lei n.º 19/14 e Lei n.º 26/20 (Código do Imposto Industrial)');
  }
  if (lower.includes('irt') || lower.includes('lei 18/14') || lower.includes('lei 28/20')) {
    lawsFound.add('Lei n.º 18/14 alterada pela Lei n.º 28/20 (Código do IRT)');
  }
  if (lower.includes('saft') || lower.includes('saf-t') || lower.includes('agt')) {
    lawsFound.add('Decreto Presidencial n.º 312/18 (Regulamento de Faturação e Ficheiro SAF-T AO - AGT)');
  }

  return {
    accounts: Array.from(accountsFound),
    laws: Array.from(lawsFound)
  };
}

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
  const filename = `caderno_notas_${safeCategory}_${dateStr}.pdf`;
  exportNotesAsPDF(categoryNotes, filename, `Caderno de Notas — Categoria: ${category}`);
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
  md += `> **Referencial Técnico:** Plano Geral de Contabilidade de Angola (Decreto n.º 82/01)\n`;
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

    const pgcRefs = extractPGCReferences(note.content);

    md += `### ${index + 1}. ${note.title} <a id="${sanitizeFilename(note.title)}"></a>\n\n`;
    md += `- **Categoria:** \`${note.category}\`${pinBadge}\n`;
    md += `- **Etiquetas:** ${tagsFormatted}\n`;
    md += `- **Criado em:** ${formatDateTime(note.createdAt)}\n`;
    md += `- **Última modificação:** ${formatDateTime(note.updatedAt || note.createdAt)}\n\n`;

    if (pgcRefs.accounts.length > 0 || pgcRefs.laws.length > 0) {
      md += `> **Enquadramento PGC Angola:**\n`;
      pgcRefs.laws.forEach(l => { md += `> - 📜 ${l}\n`; });
      pgcRefs.accounts.forEach(a => { md += `> - 📊 ${a}\n`; });
      md += `\n`;
    }

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

  const pgcRefs = extractPGCReferences(note.content);

  let md = `# ${note.title}\n\n`;
  md += `> **Categoria:** \`${note.category}\`${pinBadge}  \n`;
  md += `> **Etiquetas:** ${tagsFormatted}  \n`;
  md += `> **Última Atualização:** ${formatDateTime(note.updatedAt || note.createdAt)}  \n`;
  md += `> **Criado em:** ${formatDateTime(note.createdAt)}\n\n`;

  if (pgcRefs.accounts.length > 0 || pgcRefs.laws.length > 0) {
    md += `### 🏛️ Referências PGC Angola\n\n`;
    pgcRefs.laws.forEach(l => { md += `- 📜 ${l}\n`; });
    pgcRefs.accounts.forEach(a => { md += `- 📊 ${a}\n`; });
    md += `\n`;
  }

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
 * Exports all notes into a professional styled multi-page PDF document with PGC References
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
  let currentY = 16;

  // Header Banner on First Page (República de Angola & PGC)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, 38, 4, 4, 'F');

  // Top sub-header
  doc.setTextColor(147, 197, 253); // blue-300
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPÚBLICA DE ANGOLA • SISTEMA DE CONTABILIDADE UNIFICADA', marginX + 8, currentY + 8);

  // Main Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(customTitle || 'Caderno Técnico de Notas & Apontamentos', marginX + 8, currentY + 17);

  // Subtitle with PGC reference
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Enquadramento: PGC Angola (Decreto n.º 82/01) & Normas AGT | Data: ${formatDateTime(Date.now())}`, marginX + 8, currentY + 25);

  const pinnedCount = notes.filter(n => n.pinned).length;
  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`Total de Notas: ${notes.length}   •   Notas Fixadas: ${pinnedCount}`, marginX + 8, currentY + 33);

  currentY += 46;

  // Render each note as a structured professional card
  notes.forEach((note, index) => {
    const pgcRefs = extractPGCReferences(note.content);
    const splitContent = doc.splitTextToSize(note.content || '(Sem conteúdo registado)', contentWidth - 14);
    const contentLineCount = splitContent.length;
    
    // Estimate extra height for PGC references
    let pgcBlockHeight = 0;
    if (pgcRefs.accounts.length > 0 || pgcRefs.laws.length > 0) {
      pgcBlockHeight = 12 + (Math.min(pgcRefs.accounts.length + pgcRefs.laws.length, 4) * 4.5);
    }

    const estimatedHeight = 30 + (contentLineCount * 4.4) + (note.tags?.length ? 7 : 0) + pgcBlockHeight;

    // Page overflow handling
    if (currentY + estimatedHeight > pageHeight - 22) {
      doc.addPage();
      currentY = 16;
    }

    const cardTop = currentY;

    // Card background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(marginX, cardTop, contentWidth, estimatedHeight, 3, 3, 'FD');

    // Left accent bar
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(marginX, cardTop, 2.5, estimatedHeight, 'F');

    // Category Pill / Status
    if (note.pinned) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.roundedRect(marginX + 6, cardTop + 5, 22, 5, 1.2, 1.2, 'FD');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('★ FIXADA', marginX + 8.5, cardTop + 8.6);
    }

    // Category Badge
    doc.setFillColor(224, 231, 255); // indigo-100
    doc.setDrawColor(99, 102, 241); // indigo-500
    const catX = note.pinned ? marginX + 31 : marginX + 6;
    doc.roundedRect(catX, cardTop + 5, 28, 5, 1.2, 1.2, 'FD');
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(note.category.toUpperCase(), catX + 3, cardTop + 8.6);

    // Date
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const dateText = formatDateTime(note.updatedAt || note.createdAt);
    doc.text(dateText, marginX + contentWidth - doc.getTextWidth(dateText) - 6, cardTop + 8.8);

    // Note Title
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    const titleLines = doc.splitTextToSize(`${index + 1}. ${note.title}`, contentWidth - 14);
    doc.text(titleLines, marginX + 7, cardTop + 16);

    // Content Body
    let textY = cardTop + 22;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(splitContent, marginX + 7, textY);
    textY += (contentLineCount * 4.4);

    // PGC References Block
    if (pgcRefs.accounts.length > 0 || pgcRefs.laws.length > 0) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(marginX + 6, textY + 1, contentWidth - 12, pgcBlockHeight - 3, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text('⚖️ REFERÊNCIAS AO PGC ANGOLA & LEGISLAÇÃO FISCAL:', marginX + 9, textY + 6);

      let refY = textY + 10;
      const allRefs = [...pgcRefs.laws, ...pgcRefs.accounts].slice(0, 4);
      allRefs.forEach(ref => {
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const refLines = doc.splitTextToSize(`• ${ref}`, contentWidth - 20);
        doc.text(refLines, marginX + 9, refY);
        refY += 4.2;
      });

      textY += pgcBlockHeight;
    }

    // Tags
    if (note.tags && note.tags.length > 0) {
      doc.setFontSize(7);
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
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Contabilidade Unificada • PGC Angola (Decreto n.º 82/01)', marginX, pageHeight - 7);

    const pageStr = `Página ${i} de ${totalPages}`;
    doc.text(pageStr, marginX + contentWidth - doc.getTextWidth(pageStr), pageHeight - 7);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const targetFilename = filename || `caderno_notas_contabilidade_${dateStr}.pdf`;
  doc.save(targetFilename);
}

/**
 * Exports a single note to a professional styled PDF document with PGC References
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
  let currentY = 18;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, contentWidth, 30, 3, 3, 'F');

  doc.setTextColor(147, 197, 253);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPÚBLICA DE ANGOLA • SISTEMA DE CONTABILIDADE UNIFICADA', marginX + 8, currentY + 8);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Nota Técnica de Apontamento Contabilístico', marginX + 8, currentY + 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Categoria: ${note.category}   •   Exportado em: ${formatDateTime(Date.now())}`, marginX + 8, currentY + 23);

  currentY += 38;

  // Note Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(note.title, contentWidth);
  doc.text(titleLines, marginX, currentY);
  currentY += (titleLines.length * 5.5) + 3;

  // Metadata Bar (Created / Updated)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Criado em: ${formatDateTime(note.createdAt)}   |   Última modificação: ${formatDateTime(note.updatedAt || note.createdAt)}`, marginX, currentY);
  currentY += 5;

  // PGC References Callout if found
  const pgcRefs = extractPGCReferences(note.content);
  if (pgcRefs.accounts.length > 0 || pgcRefs.laws.length > 0) {
    currentY += 3;
    const refCount = pgcRefs.laws.length + pgcRefs.accounts.length;
    const boxHeight = 11 + (refCount * 4.8);

    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(marginX, currentY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('🏛️ REFERÊNCIAS NORMATIVAS AO PGC ANGOLA:', marginX + 5, currentY + 6);

    let rY = currentY + 11;
    [...pgcRefs.laws, ...pgcRefs.accounts].forEach(ref => {
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`• ${ref}`, marginX + 5, rY);
      rY += 4.5;
    });

    currentY += boxHeight + 4;
  }

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  currentY += 7;

  // Note Body
  doc.setFontSize(9);
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
    currentY += 5;
  });

  currentY += 6;

  // Tags Section
  if (note.tags && note.tags.length > 0) {
    if (currentY > pageHeight - 25) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    const tagsFormatted = note.tags.map(t => `#${t}`).join('   ');
    doc.text(`Etiquetas: ${tagsFormatted}`, marginX, currentY);
  }

  // Add Footers & Page numbers across all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Contabilidade Unificada • PGC Angola (Decreto n.º 82/01)', marginX, pageHeight - 7);

    const pageStr = `Página ${i} de ${totalPages}`;
    doc.text(pageStr, marginX + contentWidth - doc.getTextWidth(pageStr), pageHeight - 7);
  }

  const safeTitle = sanitizeFilename(note.title);
  const targetFilename = `nota_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(targetFilename);
}
