import jsPDF from 'jspdf';

export interface PDFTransactionItem {
  id: string;
  date: string;
  documentRef: string;
  description: string;
  accountCode?: string;
  debit: number;
  credit: number;
  balance?: number;
}

export interface PDFCurrentAccountOptions {
  entityName: string;
  taxId?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  accountNumber?: string;
}

/**
 * Formats currency values nicely for PDF rendering
 */
function formatCurrencyPDF(amount: number, currency: string = 'AOA'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Export Current Account Statement / Account Summary as PDF using jsPDF
 */
export function exportCurrentAccountPDF(
  options: PDFCurrentAccountOptions,
  transactions: PDFTransactionItem[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currency = options.currency || 'AOA';
  const entityName = options.entityName || 'Entidade Corporativa';
  const taxId = options.taxId || 'AO-50000000';
  const today = new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // Header Background Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EXTRATO DE CONTA CORRENTE & TRANSAÇÕES', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Sistema de Contabilidade Unificada — PGC Angola`, 14, 23);
  doc.text(`Data de Emissão: ${today}`, pageWidth - 14, 23, { align: 'right' });

  currentY = 40;

  // Entity Details Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(entityName, 18, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIF / Tax ID: ${taxId}`, 18, currentY + 15);
  doc.text(`Conta de Razão: ${options.accountNumber || '31.1.1 — Clientes / Conta Corrente'}`, 18, currentY + 21);

  doc.text(`Moeda Base: ${currency}`, pageWidth - 18, currentY + 15, { align: 'right' });
  doc.text(`Período: ${options.startDate || '01/01/2026'} até ${options.endDate || today}`, pageWidth - 18, currentY + 21, { align: 'right' });

  currentY += 34;

  // Table Header
  const tableHeaderY = currentY;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, tableHeaderY, pageWidth - 28, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.text('Data', 18, tableHeaderY + 5.5);
  doc.text('Nº Doc / Ref', 38, tableHeaderY + 5.5);
  doc.text('Descrição / Histórico', 72, tableHeaderY + 5.5);
  doc.text('Débito', 132, tableHeaderY + 5.5, { align: 'right' });
  doc.text('Crédito', 162, tableHeaderY + 5.5, { align: 'right' });
  doc.text('Saldo', pageWidth - 18, tableHeaderY + 5.5, { align: 'right' });

  currentY += 10;

  // Table Rows
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  transactions.forEach((tx, idx) => {
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;

      // Repeat Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Data', 18, currentY + 5.5);
      doc.text('Nº Doc / Ref', 38, currentY + 5.5);
      doc.text('Descrição / Histórico', 72, currentY + 5.5);
      doc.text('Débito', 132, currentY + 5.5, { align: 'right' });
      doc.text('Crédito', 162, currentY + 5.5, { align: 'right' });
      doc.text('Saldo', pageWidth - 18, currentY + 5.5, { align: 'right' });
      currentY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    runningBalance += (tx.debit - tx.credit);
    totalDebit += tx.debit;
    totalCredit += tx.credit;

    // Alternating background
    if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(14, currentY - 3.5, pageWidth - 28, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.text(tx.date, 18, currentY + 1);
    doc.text(tx.documentRef.substring(0, 16), 38, currentY + 1);

    const descTruncated = tx.description.length > 30 ? tx.description.substring(0, 28) + '...' : tx.description;
    doc.text(descTruncated, 72, currentY + 1);

    doc.setTextColor(16, 185, 129); // emerald-600 for debit
    doc.text(tx.debit > 0 ? formatCurrencyPDF(tx.debit, currency) : '—', 132, currentY + 1, { align: 'right' });

    doc.setTextColor(225, 29, 72); // rose-600 for credit
    doc.text(tx.credit > 0 ? formatCurrencyPDF(tx.credit, currency) : '—', 162, currentY + 1, { align: 'right' });

    doc.setTextColor(15, 23, 42); // slate-900 for running balance
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyPDF(runningBalance, currency), pageWidth - 18, currentY + 1, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    currentY += 7;
  });

  // Table Bottom Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // Summary Card
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  doc.text('TOTAL GERAL DE DÉBITOS:', 18, currentY + 8);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrencyPDF(totalDebit, currency), 75, currentY + 8);

  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GERAL DE CRÉBITOS:', 18, currentY + 16);
  doc.setTextColor(225, 29, 72);
  doc.text(formatCurrencyPDF(totalCredit, currency), 75, currentY + 16);

  doc.setTextColor(15, 23, 42);
  doc.text('SALDO FINAL LÍQUIDO:', pageWidth - 80, currentY + 12);
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // indigo-900
  doc.text(formatCurrencyPDF(runningBalance, currency), pageWidth - 18, currentY + 12, { align: 'right' });

  currentY += 30;

  // Signature Block & Stamp Placeholder
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.line(18, currentY + 12, 80, currentY + 12);
  doc.text('O Técnico de Contabilidade (CPCJ/AGT)', 18, currentY + 17);

  doc.line(pageWidth - 80, currentY + 12, pageWidth - 18, currentY + 12);
  doc.text('O Diretor Financeiro / Responsável', pageWidth - 80, currentY + 17);

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Este documento foi emitido e certificado eletronicamente nos termos do Regulamento PGC de Angola.', pageWidth / 2, 287, { align: 'center' });

  // Save the generated PDF
  const filename = `Extrato_ContaCorrente_${entityName.replace(/[^a-zA-Z0-9]/g, '_')}_${today.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

/**
 * Export any HTML Table from .prose-accountant to official PGC Angola A4 Landscape PDF
 */
export function exportTableElementToLandscapePDF(
  tableElement: HTMLTableElement,
  customTitle?: string
): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const today = new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

    // 1. Extract Headers and Rows from DOM
    const headerRows = Array.from(tableElement.querySelectorAll('thead tr, tr:has(th)'));
    const bodyRows = Array.from(tableElement.querySelectorAll('tbody tr')).length > 0
      ? Array.from(tableElement.querySelectorAll('tbody tr'))
      : Array.from(tableElement.querySelectorAll('tr')).filter(r => !headerRows.includes(r));

    const headers: string[] = [];
    const firstHeaderRow = headerRows[0] || tableElement.querySelector('tr');
    if (firstHeaderRow) {
      firstHeaderRow.querySelectorAll('th, td').forEach((cell) => {
        headers.push(cell.textContent?.trim() || '');
      });
    }

    const dataRows: string[][] = [];
    bodyRows.forEach((row) => {
      const rowCells: string[] = [];
      row.querySelectorAll('td, th').forEach((cell) => {
        rowCells.push(cell.textContent?.trim() || '');
      });
      if (rowCells.some(c => c.length > 0)) {
        dataRows.push(rowCells);
      }
    });

    const colCount = Math.max(headers.length, ...dataRows.map(r => r.length), 1);
    const leftMargin = 14;
    const rightMargin = 14;
    const tableWidth = pageWidth - leftMargin - rightMargin; // 269mm

    // Calculate column widths: Give column 0 (Rubrica Oficial) more space if multiple cols
    const colWidths: number[] = [];
    if (colCount === 1) {
      colWidths.push(tableWidth);
    } else if (colCount === 2) {
      colWidths.push(tableWidth * 0.6, tableWidth * 0.4);
    } else if (colCount === 3) {
      colWidths.push(tableWidth * 0.45, tableWidth * 0.275, tableWidth * 0.275);
    } else if (colCount === 4) {
      colWidths.push(tableWidth * 0.38, tableWidth * 0.20, tableWidth * 0.21, tableWidth * 0.21);
    } else {
      const firstColWidth = Math.max(tableWidth * 0.28, 45);
      const otherColWidth = (tableWidth - firstColWidth) / (colCount - 1);
      colWidths.push(firstColWidth);
      for (let i = 1; i < colCount; i++) {
        colWidths.push(otherColWidth);
      }
    }

    const drawHeader = (docInstance: jsPDF, pageNum: number) => {
      // Top Header Navy Banner
      docInstance.setFillColor(15, 23, 42); // slate-900
      docInstance.rect(0, 0, pageWidth, 24, 'F');

      // Decorative gold accent line
      docInstance.setFillColor(217, 119, 6); // amber-600
      docInstance.rect(0, 24, pageWidth, 1.2, 'F');

      docInstance.setTextColor(255, 255, 255);
      docInstance.setFont('helvetica', 'bold');
      docInstance.setFontSize(13);
      docInstance.text(
        customTitle || 'DEMONSTRAÇÃO E MAPA FINANCEIRO — PGC ANGOLA',
        leftMargin,
        11
      );

      docInstance.setFont('helvetica', 'normal');
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(203, 213, 225); // slate-300
      docInstance.text('Normativo Contabilístico Oficial (Decreto n.º 82/2001) | Relatório Executivo', leftMargin, 18);

      docInstance.text(`Data: ${today} às ${time}`, pageWidth - rightMargin, 11, { align: 'right' });
      docInstance.text(`Página ${pageNum}`, pageWidth - rightMargin, 18, { align: 'right' });
    };

    let currentPage = 1;
    drawHeader(doc, currentPage);

    let currentY = 32;

    const drawTableHeader = () => {
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(leftMargin, currentY, tableWidth, 9, 'F');
      doc.setDrawColor(51, 65, 85);
      doc.rect(leftMargin, currentY, tableWidth, 9, 'S');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);

      let curX = leftMargin;
      for (let i = 0; i < colCount; i++) {
        const title = headers[i] || `Coluna ${i + 1}`;
        const w = colWidths[i];
        
        // Draw vertical divider between headers
        if (i > 0) {
          doc.setDrawColor(71, 85, 105);
          doc.line(curX, currentY, curX, currentY + 9);
        }

        const isNumeric = i > 0;
        if (isNumeric) {
          doc.text(title, curX + w - 3, currentY + 6, { align: 'right' });
        } else {
          doc.text(title, curX + 3, currentY + 6);
        }
        curX += w;
      }
      currentY += 9;
    };

    drawTableHeader();

    // 2. Render Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    dataRows.forEach((row, rowIdx) => {
      // Check page break
      if (currentY > pageHeight - 22) {
        doc.addPage();
        currentPage++;
        drawHeader(doc, currentPage);
        currentY = 32;
        drawTableHeader();
      }

      const rowHeight = 7.5;
      const isEven = rowIdx % 2 === 1;

      // Row background
      if (isEven) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(leftMargin, currentY, tableWidth, rowHeight, 'F');
      }

      // First column solid background accent
      if (isEven) {
        doc.setFillColor(241, 245, 249);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(leftMargin, currentY, colWidths[0], rowHeight, 'F');

      let curX = leftMargin;
      for (let c = 0; c < colCount; c++) {
        const text = row[c] || '';
        const w = colWidths[c];

        // Vertical border
        doc.setDrawColor(226, 232, 240);
        if (c > 0) {
          doc.line(curX, currentY, curX, currentY + rowHeight);
        }

        const isNumeric = c > 0 && /[\d.,]+/.test(text) && !/[a-zA-Z]{4,}/.test(text);

        if (c === 0) {
          doc.setTextColor(15, 23, 42); // slate-900
          doc.setFont('helvetica', 'bold');
        } else if (isNumeric) {
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
        }

        const maxTextWidth = w - 6;
        let formattedText = text;
        if (doc.getTextWidth(formattedText) > maxTextWidth) {
          while (formattedText.length > 3 && doc.getTextWidth(formattedText + '...') > maxTextWidth) {
            formattedText = formattedText.slice(0, -1);
          }
          formattedText += '...';
        }

        if (isNumeric) {
          doc.text(formattedText, curX + w - 3, currentY + 5, { align: 'right' });
        } else {
          doc.text(formattedText, curX + 3, currentY + 5);
        }

        curX += w;
      }

      // Horizontal bottom line
      doc.setDrawColor(226, 232, 240);
      doc.line(leftMargin, currentY + rowHeight, leftMargin + tableWidth, currentY + rowHeight);

      currentY += rowHeight;
    });

    // Outer border
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftMargin, 32, tableWidth, currentY - 32, 'S');

    // Footer note
    const footerY = pageHeight - 8;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Relatório exportado em conformidade com o Plano Geral de Contabilidade de Angola (PGC).', leftMargin, footerY);
    doc.text('Sistema Contabilístico Navigator Pro AI', pageWidth - rightMargin, footerY, { align: 'right' });

    // Download file
    const safeTitle = (customTitle || 'Mapa_Financeiro_PGC_Angola').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTitle}_A4_Paisagem_${today.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('[pdfExportService] Error exporting table to landscape PDF:', error);
    alert('Não foi possível exportar a tabela para PDF. Por favor, tente novamente.');
  }
}

/**
 * Export General Transactions / Journal Report PDF
 */
export function exportTransactionsReportPDF(
  transactions: any[],
  reportTitle: string = 'Relatório de Transações do Razão PGC'
): void {
  const formattedItems: PDFTransactionItem[] = transactions.map((t, idx) => ({
    id: t.id || `tx-${idx}`,
    date: t.date || new Date().toISOString().split('T')[0],
    documentRef: t.documentRef || t.number || `FT-${idx + 1}`,
    description: t.description || 'Lançamento Contábil',
    debit: t.debit || (t.type === 'Debit' ? parseFloat(t.amount || 0) : 0),
    credit: t.credit || (t.type === 'Credit' ? parseFloat(t.amount || 0) : 0)
  }));

  exportCurrentAccountPDF(
    {
      entityName: reportTitle,
      taxId: 'AO-CONS-2026',
      currency: 'AOA'
    },
    formattedItems
  );
}

export interface SingleTransactionPDFData {
  id: string;
  number: string;
  date: string;
  description: string;
  documentRef?: string;
  entityName?: string;
  currency?: string;
  status?: 'Reconciliado' | 'Pendente' | string;
  totalDebit: number;
  totalCredit: number;
  lines: Array<{
    id?: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

/**
 * Export a Single Transaction / Journal Entry Detail Voucher to PDF
 */
export function exportSingleTransactionVoucherPDF(
  entry: SingleTransactionPDFData,
  companyName: string = 'GlobalAccount AI Studio'
): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 16;
    const rightMargin = 16;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const currency = entry.currency || 'AOA';

    // 1. TOP HEADER BANNER (Deep Navy Blue #1B3A6B)
    doc.setFillColor(27, 58, 107);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(companyName.toUpperCase(), leftMargin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(200, 220, 255);
    doc.text('COMPROVATIVO DE LANÇAMENTO CONTABILÍSTICO — PGC ANGOLA & IFRS', leftMargin, 18);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`, leftMargin, 23);

    // Document Number on Right Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(entry.number || 'LANÇAMENTO', pageWidth - rightMargin, 13, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(210, 230, 255);
    doc.text(`Ref: ${entry.documentRef || 'N/D'}`, pageWidth - rightMargin, 20, { align: 'right' });

    let currentY = 36;

    // 2. TRANSACTION METADATA CARD
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, currentY, contentWidth, 34, 3, 3, 'FD');

    // Column 1: Date & Voucher
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DATA DO MOVIMENTO', leftMargin + 6, currentY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(entry.date, leftMargin + 6, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nº DE LANÇAMENTO', leftMargin + 6, currentY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(27, 58, 107);
    doc.text(entry.number, leftMargin + 6, currentY + 28);

    // Column 2: Document Reference & Status
    const col2X = leftMargin + 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DOCUMENTO SUPORTE', col2X, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(entry.documentRef || 'Geral / N/A', col2X, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ESTADO DE RECONCILIAÇÃO', col2X, currentY + 22);

    const isReconciled = entry.status === 'Reconciliado' || !entry.status;
    if (isReconciled) {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(col2X, currentY + 24, 32, 6, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(5, 150, 105);
      doc.text('● RECONCILIADO', col2X + 3, currentY + 28.5);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(253, 230, 138);
      doc.roundedRect(col2X, currentY + 24, 28, 6, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text('● PENDENTE', col2X + 3, currentY + 28.5);
    }

    // Column 3: Description Summary
    const col3X = leftMargin + 115;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DESCRIÇÃO DO LANÇAMENTO', col3X, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const splitDesc = doc.splitTextToSize(entry.description || 'Sem descrição', contentWidth - 120);
    doc.text(splitDesc, col3X, currentY + 13);

    currentY += 42;

    // 3. LINES TABLE HEADER
    doc.setFillColor(27, 58, 107);
    doc.rect(leftMargin, currentY, contentWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('CONTA PGC', leftMargin + 4, currentY + 5.5);
    doc.text('DESIGNAÇÃO DA CONTA', leftMargin + 32, currentY + 5.5);
    doc.text(`DÉBITO (${currency})`, leftMargin + contentWidth - 55, currentY + 5.5, { align: 'right' });
    doc.text(`CRÉDITO (${currency})`, leftMargin + contentWidth - 6, currentY + 5.5, { align: 'right' });

    currentY += 8;

    // 4. TABLE ROWS (Lines of the entry)
    doc.setFontSize(8.5);
    entry.lines.forEach((line, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(leftMargin, currentY, contentWidth, 8.5, 'F');

      // Grid borders
      doc.setDrawColor(226, 232, 240);
      doc.line(leftMargin, currentY + 8.5, leftMargin + contentWidth, currentY + 8.5);

      // Account code
      doc.setFont('courier', 'bold');
      doc.setTextColor(27, 58, 107);
      doc.text(line.accountCode || '-', leftMargin + 4, currentY + 5.5);

      // Account name
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const nameShort = (line.accountName || '').length > 42 
        ? (line.accountName || '').substring(0, 40) + '...' 
        : (line.accountName || '');
      doc.text(nameShort, leftMargin + 32, currentY + 5.5);

      // Debit
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      const debStr = Number(line.debit) > 0 ? Number(line.debit).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '-';
      doc.text(debStr, leftMargin + contentWidth - 55, currentY + 5.5, { align: 'right' });

      // Credit
      doc.setTextColor(79, 70, 229);
      const credStr = Number(line.credit) > 0 ? Number(line.credit).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '-';
      doc.text(credStr, leftMargin + contentWidth - 6, currentY + 5.5, { align: 'right' });

      currentY += 8.5;
    });

    // 5. TOTALS ROW
    doc.setFillColor(241, 245, 249);
    doc.rect(leftMargin, currentY, contentWidth, 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(leftMargin, currentY, leftMargin + contentWidth, currentY);
    doc.line(leftMargin, currentY + 10, leftMargin + contentWidth, currentY + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAIS DO LANÇAMENTO:', leftMargin + 4, currentY + 6.5);

    doc.setTextColor(5, 150, 105);
    doc.text(`${Number(entry.totalDebit).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} ${currency}`, leftMargin + contentWidth - 55, currentY + 6.5, { align: 'right' });

    doc.setTextColor(79, 70, 229);
    doc.text(`${Number(entry.totalCredit).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} ${currency}`, leftMargin + contentWidth - 6, currentY + 6.5, { align: 'right' });

    currentY += 16;

    // 6. BALANCE VERIFICATION BADGE
    const isBalanced = entry.totalDebit > 0 && entry.totalDebit === entry.totalCredit;
    doc.setFillColor(isBalanced ? 236 : 254, isBalanced ? 253 : 242, isBalanced ? 245 : 242);
    doc.setDrawColor(isBalanced ? 167 : 254, isBalanced ? 243 : 202, isBalanced ? 208 : 202);
    doc.roundedRect(leftMargin, currentY, contentWidth, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(isBalanced ? 5 : 185, isBalanced ? 150 : 28, isBalanced ? 105 : 28);
    const balanceText = isBalanced
      ? '✓ Lançamento Equilibrado: As Partidas Dobradas estão em perfeita conformidade (Débito = Crédito).'
      : '⚠ Atenção: Lançamento desequilibrado! Há divergência entre os valores a Débito e Crédito.';
    doc.text(balanceText, leftMargin + 6, currentY + 7.5);

    currentY += 24;

    // 7. SIGNATURES & VALIDATION BLOCKS
    const sigBoxWidth = (contentWidth - 12) / 3;
    
    // Elaborado por
    doc.setDrawColor(203, 213, 225);
    doc.line(leftMargin, currentY + 18, leftMargin + sigBoxWidth, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('ELABORADO POR', leftMargin + sigBoxWidth / 2, currentY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Técnico de Contabilidade', leftMargin + sigBoxWidth / 2, currentY + 27, { align: 'center' });

    // Revisto por / Contabilista
    doc.line(leftMargin + sigBoxWidth + 6, currentY + 18, leftMargin + sigBoxWidth * 2 + 6, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('REVISTO POR', leftMargin + sigBoxWidth * 1.5 + 6, currentY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Contabilista Certificado (OPC)', leftMargin + sigBoxWidth * 1.5 + 6, currentY + 27, { align: 'center' });

    // Aprovado por / Direcção
    doc.line(leftMargin + (sigBoxWidth + 6) * 2, currentY + 18, leftMargin + contentWidth, currentY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('APROVADO POR', leftMargin + (sigBoxWidth + 6) * 2 + sigBoxWidth / 2, currentY + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Direção Financeira', leftMargin + (sigBoxWidth + 6) * 2 + sigBoxWidth / 2, currentY + 27, { align: 'center' });

    // 8. FOOTER NOTE
    const footerY = pageHeight - 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento gerado eletronicamente em conformidade com o Decreto n.º 82/2001 (PGC Angola).', leftMargin, footerY);
    doc.text('Sistema Contabilístico GlobalAccount AI Studio', pageWidth - rightMargin, footerY, { align: 'right' });

    // Download PDF file
    const safeNumber = (entry.number || 'Lancamento').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Comprovativo_${safeNumber}_${entry.date}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('[pdfExportService] Erro ao exportar comprovativo individual para PDF:', error);
    alert('Não foi possível gerar o comprovativo em PDF. Por favor, tente novamente.');
  }
}
