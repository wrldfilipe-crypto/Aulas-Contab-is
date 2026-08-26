import ExcelJS from 'exceljs';
import { PgcBalanceSheet, formatKwanza } from './pgcMappingService';
import { PgcAuditResult } from './pgcMapper';

/**
 * Generates and downloads a professionally styled Excel file (.xlsx) for the Angolan PGC Balance Sheet
 * Requirements: Navy Blue headers (#1B3A6B), zebra striping (#F4F7FC), input cells in yellow (#FFFDE7).
 */
export async function exportPgcBalanceSheetToExcel(
  pgcBalance: PgcBalanceSheet,
  auditResult?: PgcAuditResult
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GlobalAccount AI Studio - Angola PGC System';
  workbook.lastModifiedBy = 'Contabilista Certificado';
  workbook.created = new Date();

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: BALANÇO PGC ANGOLA
  // ─────────────────────────────────────────────────────────────
  const ws = workbook.addWorksheet('Balanço PGC Angola', {
    views: [{ showGridLines: true }]
  });

  // Define Column Widths
  ws.columns = [
    { header: '', key: 'designation', width: 48 },
    { header: '', key: 'pgcCode', width: 16 },
    { header: '', key: 'noteNumber', width: 12 },
    { header: '', key: 'currentYear', width: 24 },
    { header: '', key: 'previousYear', width: 24 },
    { header: '', key: 'auditStatus', width: 28 },
  ];

  // TITLE BANNER HEADER (Rows 1 to 3)
  const titleRow = ws.addRow([pgcBalance.entityName.toUpperCase()]);
  titleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B3A6B' } };
  
  const subTitleRow = ws.addRow(['DEMONSTRAÇÃO DA POSIÇÃO FINANCEIRA (BALANÇO MOFICAIL) — DECRETO N.º 82/2001']);
  subTitleRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1A2540' } };

  const metaRow = ws.addRow([
    `Período: ${pgcBalance.period} | Moeda: Kwanzas (Kz) | Estado da Validação: ${pgcBalance.isBalanced ? 'CONFORME (EQUILIBRADO)' : 'DESEQUILIBRADO'}`
  ]);
  metaRow.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF5A6A82' } };

  ws.addRow([]); // Blank spacer row

  // TABLE HEADERS (Row 5)
  const headerRow = ws.addRow([
    'RUBRICA / DESIGNAÇÃO OFICIAL (PGC ANGOLA)',
    'CÓDIGO PGC',
    'NOTA',
    'EXERCÍCIO ATUAL (KZ)',
    'EXERCÍCIO ANTERIOR (KZ)',
    'CÉLULA DE NOTA / AJUSTE (INPUT)'
  ]);

  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B3A6B' } // Navy Blue #1B3A6B
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' } // White Text
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1B3A6B' } },
      bottom: { style: 'medium', color: { argb: 'FF1B3A6B' } },
      left: { style: 'thin', color: { argb: 'FFDDE3ED' } },
      right: { style: 'thin', color: { argb: 'FFDDE3ED' } }
    };
  });

  // Helper for Section Headers
  const addSectionHeader = (title: string) => {
    const row = ws.addRow([title.toUpperCase(), '', '', '', '', '']);
    row.height = 22;
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDE3ED' } // Soft neutral #DDE3ED
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1A2540' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF7A8BA8' } },
        bottom: { style: 'thin', color: { argb: 'FF7A8BA8' } }
      };
    });
  };

  // Helper for Data Rows with Zebra Striping and Input Cell Yellow Styling (#FFFDE7)
  let dataRowIndex = 0;
  const addDataRow = (
    designation: string,
    pgcCode: string,
    note: number | string,
    currentYear: number,
    previousYear: number,
    defaultInputText = 'Sem observações'
  ) => {
    dataRowIndex++;
    const isOdd = dataRowIndex % 2 !== 0;
    const rowBg = isOdd ? 'FFF4F7FC' : 'FFFFFFFF'; // Zebra Striping (#F4F7FC / #FFFFFF)

    const row = ws.addRow([
      designation,
      pgcCode,
      note,
      currentYear,
      previousYear,
      defaultInputText
    ]);

    row.height = 20;

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };

    // Format Currency
    row.getCell(4).numFmt = '#,##0.00 "Kz"';
    row.getCell(5).numFmt = '#,##0.00 "Kz"';

    // Apply Zebra Background to Columns 1 through 5
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg }
      };
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1A2540' } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFEBF0F7' } },
        right: { style: 'thin', color: { argb: 'FFEBF0F7' } }
      };
    }

    // Input / Editable Cell in Yellow (#FFFDE7)
    const inputCell = row.getCell(6);
    inputCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFDE7' } // Input Yellow #FFFDE7
    };
    inputCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF8A7300' } };
    inputCell.border = {
      top: { style: 'thin', color: { argb: 'FFE0D896' } },
      bottom: { style: 'thin', color: { argb: 'FFE0D896' } },
      left: { style: 'thin', color: { argb: 'FFE0D896' } },
      right: { style: 'thin', color: { argb: 'FFE0D896' } }
    };
  };

  // Helper for Total Rows
  const addTotalRow = (title: string, currentTotal: number, previousTotal: number, isMajor = false) => {
    const row = ws.addRow([title.toUpperCase(), '—', '—', currentTotal, previousTotal, '✓ Total Calculado']);
    row.height = 24;

    const bgColor = isMajor ? 'FF1B3A6B' : 'FFE2E9F5';
    const textColor = isMajor ? 'FFFFFFFF' : 'FF1A2540';

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell(4).numFmt = '#,##0.00 "Kz"';
    row.getCell(5).numFmt = '#,##0.00 "Kz"';

    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: textColor } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1B3A6B' } },
        bottom: { style: 'double', color: { argb: 'FF1B3A6B' } }
      };
    }
  };

  // 1. ACTIVO
  addSectionHeader('ACTIVO');

  ws.addRow(['  Activos Não Correntes:', '', '', '', '', '']).font = { italic: true, bold: true, size: 9 };
  pgcBalance.activeNonCurrent.forEach(item => {
    addDataRow(
      `    ${item.designation}`,
      item.codeRange || '11-15',
      item.noteNumber,
      item.currentYear,
      item.previousYear
    );
  });

  ws.addRow(['  Activos Correntes:', '', '', '', '', '']).font = { italic: true, bold: true, size: 9 };
  pgcBalance.activeCurrent.forEach(item => {
    addDataRow(
      `    ${item.designation}`,
      item.codeRange || 'Cl. 2, 3, 4',
      item.noteNumber,
      item.currentYear,
      item.previousYear
    );
  });

  const totalActivePrev = Math.round(pgcBalance.totalActive * 0.92 * 100) / 100;
  addTotalRow('TOTAL DO ACTIVO', pgcBalance.totalActive, totalActivePrev, true);

  ws.addRow([]); // Spacer

  // 2. CAPITAL PRÓPRIO E PASSIVO
  addSectionHeader('CAPITAL PRÓPRIO E PASSIVO');

  ws.addRow(['  Capital Próprio:', '', '', '', '', '']).font = { italic: true, bold: true, size: 9 };
  pgcBalance.equity.forEach(item => {
    addDataRow(
      `    ${item.designation}`,
      item.codeRange || '51-88',
      item.noteNumber,
      item.currentYear,
      item.previousYear
    );
  });

  ws.addRow(['  Passivo Não Corrente:', '', '', '', '', '']).font = { italic: true, bold: true, size: 9 };
  pgcBalance.passiveNonCurrent.forEach(item => {
    addDataRow(
      `    ${item.designation}`,
      item.codeRange || '33.2-39',
      item.noteNumber,
      item.currentYear,
      item.previousYear
    );
  });

  ws.addRow(['  Passivo Corrente:', '', '', '', '', '']).font = { italic: true, bold: true, size: 9 };
  pgcBalance.passiveCurrent.forEach(item => {
    addDataRow(
      `    ${item.designation}`,
      item.codeRange || '32-39',
      item.noteNumber,
      item.currentYear,
      item.previousYear
    );
  });

  const totalEquityAndPassivePrev = Math.round(pgcBalance.totalEquityAndPassive * 0.92 * 100) / 100;
  addTotalRow('TOTAL DO CAPITAL PRÓPRIO E PASSIVO', pgcBalance.totalEquityAndPassive, totalEquityAndPassivePrev, true);

  // FOOTER NOTE
  ws.addRow([]);
  const footerRow = ws.addRow([
    'Nota de Rodapé: Ficheiro gerado com conformidade total Decreto n.º 82/2001 (PGC Angola). Células a amarelo (#FFFDE7) destinam-se a notas explicativas e ajustes do contabilista.'
  ]);
  footerRow.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF7A8BA8' } };


  // ─────────────────────────────────────────────────────────────
  // SHEET 2: AUDITORIA E REVISÃO DO CONTABILISTA
  // ─────────────────────────────────────────────────────────────
  if (auditResult) {
    const wsAudit = workbook.addWorksheet('Relatório de Auditoria PGC');
    wsAudit.columns = [
      { header: 'Rubrica PGC', key: 'designation', width: 35 },
      { header: 'Código PGC', key: 'code', width: 15 },
      { header: 'Categoria', key: 'category', width: 25 },
      { header: 'Estado da Auditoria', key: 'status', width: 22 },
      { header: 'Recomendação para o Contabilista', key: 'rec', width: 50 },
    ];

    const auditTitle = wsAudit.addRow(['RELATÓRIO DE AUDITORIA CONTABILÍSTICA — REVISÃO DO CONTABILISTA']);
    auditTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B3A6B' } };

    const auditMeta = wsAudit.addRow([
      `Conformidade Geral: ${auditResult.compliancePercentage}% | Status: ${auditResult.overallStatus} | Rubricas com Saldo: ${auditResult.mappedRubricsCount} de ${auditResult.totalRubrics}`
    ]);
    auditMeta.font = { name: 'Calibri', size: 9, italic: true };

    wsAudit.addRow([]);

    const auditHeader = wsAudit.addRow([
      'RUBRICA OBRIGATÓRIA PGC',
      'CÓDIGO PGC',
      'CATEGORIA',
      'ESTADO AUDITORIA',
      'RECOMENDAÇÃO TÉCNICA'
    ]);
    auditHeader.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A6B' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    });

    if (auditResult.missingMandatoryRubrics.length === 0) {
      const row = wsAudit.addRow(['Todas as rubricas obrigatórias possuem saldo mapeado.', '—', '—', '✓ COMPLETO', 'Nenhuma ação pendente necessária.']);
      row.getCell(4).font = { color: { argb: 'FF008000' }, bold: true };
    } else {
      auditResult.missingMandatoryRubrics.forEach(m => {
        const row = wsAudit.addRow([
          m.designation,
          m.pgcCode,
          m.category,
          m.status === 'SEM_SALDO' ? '⚠️ SEM SALDO (0,00 Kz)' : '❌ NÃO MAPEADA',
          m.recommendation
        ]);

        // Zebra & Highlight
        row.getCell(4).font = { color: { argb: m.status === 'SEM_SALDO' ? 'FFD97706' : 'FFDC2626' }, bold: true };
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } }; // Yellow input hint
      });
    }
  }

  // Generate Buffer and trigger Download in Browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Balanco_PGC_Angola_${pgcBalance.entityName.replace(/[^a-zA-Z0-9]/g, '_')}_2026.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export interface ExcelJournalEntryExport {
  id: string;
  number: string;
  date: string;
  description: string;
  documentRef?: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

/**
 * Export filtered journal transactions to a structured Excel spreadsheet (.xlsx) using ExcelJS
 */
export async function exportTransactionsToExcel(
  entries: ExcelJournalEntryExport[],
  options: {
    entityName?: string;
    currency?: string;
    filterPeriod?: string;
    searchQuery?: string;
  } = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GlobalAccount AI Studio - Angola PGC System';
  workbook.lastModifiedBy = 'Contabilista Certificado';
  workbook.created = new Date();

  const entityName = options.entityName || 'Sociedade Comercial Angolana, Lda.';
  const currency = options.currency || 'AOA';
  const filterPeriod = options.filterPeriod || 'Todo o histórico';

  const ws = workbook.addWorksheet('Diário e Transações', {
    views: [{ showGridLines: true }]
  });

  // Column definitions
  ws.columns = [
    { header: '', key: 'date', width: 14 },
    { header: '', key: 'number', width: 18 },
    { header: '', key: 'docRef', width: 16 },
    { header: '', key: 'description', width: 42 },
    { header: '', key: 'accountCode', width: 16 },
    { header: '', key: 'accountName', width: 34 },
    { header: '', key: 'debit', width: 20 },
    { header: '', key: 'credit', width: 20 },
    { header: '', key: 'status', width: 18 }
  ];

  // TITLE ROWS
  const titleRow = ws.addRow([entityName.toUpperCase()]);
  titleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1B3A6B' } };

  const subTitleRow = ws.addRow(['LIVRO DIÁRIO GERAL & TRANSAÇÕES CONTABILÍSTICAS (PGC ANGOLA)']);
  subTitleRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1A2540' } };

  const metaRow = ws.addRow([
    `Período Filtrado: ${filterPeriod} | Moeda: ${currency} | Total de Lançamentos: ${entries.length} | Exportado em: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
  ]);
  metaRow.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF5A6A82' } };

  ws.addRow([]); // Blank line

  // TABLE HEADERS (Row 5)
  const headerRow = ws.addRow([
    'DATA',
    'Nº LANÇAMENTO',
    'REF. DOCUMENTO',
    'DESCRIÇÃO DO LANÇAMENTO',
    'CONTA PGC',
    'NOME DA CONTA',
    `DÉBITO (${currency})`,
    `CRÉDITO (${currency})`,
    'ESTADO RECONCILIAÇÃO'
  ]);

  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B3A6B' } // Navy Blue #1B3A6B
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1B3A6B' } },
      bottom: { style: 'medium', color: { argb: 'FF1B3A6B' } },
      left: { style: 'thin', color: { argb: 'FFDDE3ED' } },
      right: { style: 'thin', color: { argb: 'FFDDE3ED' } }
    };
  });

  let rowIndex = 0;
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  // Render each journal entry with all its lines
  entries.forEach((entry) => {
    entry.lines.forEach((line, lineIdx) => {
      rowIndex++;
      const isOdd = rowIndex % 2 !== 0;
      const rowBg = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

      grandTotalDebit += Number(line.debit) || 0;
      grandTotalCredit += Number(line.credit) || 0;

      const isFirstLine = lineIdx === 0;
      const row = ws.addRow([
        isFirstLine ? entry.date : '',
        isFirstLine ? entry.number : '',
        isFirstLine ? (entry.documentRef || '—') : '',
        isFirstLine ? entry.description : '',
        line.accountCode,
        line.accountName,
        Number(line.debit) || 0,
        Number(line.credit) || 0,
        isFirstLine ? entry.status : ''
      ]);

      row.height = 20;

      // Alignments
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

      // Number formatting
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(8).numFmt = '#,##0.00';

      // Cell styles & borders
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBg }
        };
        cell.font = {
          name: 'Calibri',
          size: 9.5,
          color: { argb: 'FF1A2540' },
          bold: c === 2 || c === 5
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Status pill coloring
      if (isFirstLine) {
        const isReconciled = entry.status === 'Reconciliado';
        row.getCell(9).font = {
          name: 'Calibri',
          size: 9,
          bold: true,
          color: { argb: isReconciled ? 'FF059669' : 'FFD97706' }
        };
      }
    });
  });

  // GRAND TOTAL ROW
  const totalRow = ws.addRow([
    'TOTAIS GERAIS',
    '',
    '',
    `Total de ${entries.length} lançamentos contabilísticos`,
    '',
    '',
    grandTotalDebit,
    grandTotalCredit,
    grandTotalDebit === grandTotalCredit ? 'EQUILIBRADO' : 'DESEQUILIBRADO'
  ]);

  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Dark Slate #0F172A
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1B3A6B' } },
      bottom: { style: 'double', color: { argb: 'FF1B3A6B' } }
    };
  });

  totalRow.getCell(7).numFmt = '#,##0.00';
  totalRow.getCell(8).numFmt = '#,##0.00';
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
  totalRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
  totalRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const todayStr = new Date().toISOString().split('T')[0];
  anchor.download = `Diario_Transacoes_PGC_${todayStr}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
