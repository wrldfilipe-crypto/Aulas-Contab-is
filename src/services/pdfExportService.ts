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
