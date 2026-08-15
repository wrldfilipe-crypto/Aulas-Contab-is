import ExcelJS from "exceljs";
import type { PacoteDemonstracoes, Demonstracao } from "./tipos";

const COR_NAVY = "FF1E3A8A";
const COR_FUNDO_TOTAL = "FFF1F5F9";
const COR_FUNDO_SECAO = "FFE2E8F0";

function criarFolhaDemonstracao(
  wb: ExcelJS.Workbook,
  nome: string,
  d: Demonstracao,
  pacote: PacoteDemonstracoes
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(nome);

  // Freeze panes nas duas primeiras linhas de cabeçalho
  ws.views = [{ state: "frozen", ySplit: 3, xSplit: 0 }];

  ws.columns = [
    { header: "Rubrica / Designação Oficial", key: "rubrica", width: 58 },
    { header: "Notas", key: "notas", width: 10 },
    { header: `Actual (${pacote.moeda})`, key: "actual", width: 22 },
    { header: `Período Anterior (${pacote.moeda})`, key: "anterior", width: 22 },
  ];

  // Linha 1: Título da Demonstração e Entidade
  ws.spliceRows(1, 0, [
    `${d.titulo.toUpperCase()} — ${pacote.entidade.toUpperCase()} (${pacote.periodo}) ${pacote.grandezaTexto}`,
  ]);
  ws.mergeCells("A1:D1");
  const cellA1 = ws.getCell("A1");
  cellA1.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" }, name: "Calibri" };
  cellA1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_NAVY } };
  cellA1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  // Linha 2: Norma e Regulamento
  ws.spliceRows(2, 0, [
    "Elaborado em estrita conformidade com o Decreto n.º 82/01, de 16 de Novembro (Plano Geral de Contabilidade de Angola)",
  ]);
  ws.mergeCells("A2:D2");
  const cellA2 = ws.getCell("A2");
  cellA2.font = { italic: true, size: 10, color: { argb: "FF334155" }, name: "Calibri" };
  cellA2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20;

  // Linha 3: Cabeçalho das Colunas
  ws.getRow(3).values = [
    "Rubrica / Designação Oficial",
    "Notas",
    `Actual (${pacote.moeda})`,
    `Período Anterior (${pacote.moeda})`,
  ];
  ws.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
  ws.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_NAVY } };
  ws.getRow(3).alignment = { vertical: "middle" };
  ws.getRow(3).height = 24;
  ws.getCell("B3").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("C3").alignment = { horizontal: "right", vertical: "middle" };
  ws.getCell("D3").alignment = { horizontal: "right", vertical: "middle" };

  let startSectionRow = 4;

  d.linhas.forEach((l, idx) => {
    const rowNum = 4 + idx;
    const isMainSection = l.ehTotal && !l.rubrica.startsWith("TOTAL") && !l.rubrica.startsWith("  ");
    const isTotal = l.ehTotal || l.rubrica.startsWith("TOTAL") || l.rubrica.startsWith("Caixa Líquida") || l.rubrica.startsWith("AUMENTO") || l.rubrica.startsWith("RESULTADO");

    const row = ws.addRow([
      l.rubrica,
      l.notas ?? "",
      isMainSection && l.actual === 0 ? "" : l.actual,
      isMainSection && l.anterior === 0 ? "" : l.anterior,
    ]);

    row.height = isTotal ? 22 : 19;
    row.font = {
      bold: isTotal || isMainSection,
      color: { argb: isMainSection ? COR_NAVY : "FF0F172A" },
      size: isMainSection ? 11 : 10,
      name: "Calibri",
    };

    if (isMainSection) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_FUNDO_SECAO } };
      startSectionRow = rowNum + 1;
    } else if (isTotal) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_FUNDO_TOTAL } };
      // Fórmula nativa Excel SUM se houver itens anteriores na secção
      if (rowNum > startSectionRow && !l.rubrica.includes("TOTAL DO ACTIVO") && !l.rubrica.includes("TOTAL CAPITAL PRÓPRIO E PASSIVO") && !l.rubrica.includes("RESULTADO LÍQUIDO")) {
        row.getCell(3).value = { formula: `SUM(C${startSectionRow}:C${rowNum - 1})`, result: l.actual };
        row.getCell(4).value = { formula: `SUM(D${startSectionRow}:D${rowNum - 1})`, result: l.anterior };
      }
      startSectionRow = rowNum + 1;
    }

    // Formatação de números
    const cellC = row.getCell(3);
    const cellD = row.getCell(4);
    cellC.numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
    cellD.numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
    cellC.alignment = { horizontal: "right", vertical: "middle" };
    cellD.alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

    // Bordas
    for (let col = 1; col <= 4; col++) {
      row.getCell(col).border = {
        top: { style: isTotal ? "thin" : "hair", color: { argb: "FFCBD5E1" } },
        bottom: { style: isTotal ? "double" : "hair", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }
  });

  return ws;
}

export async function gerarXlsx(pacote: PacoteDemonstracoes): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema Unificado de Contabilidade — PGC Angola (Decreto n.º 82/2001)";
  wb.lastModifiedBy = "Contador IA";
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Balanço
  const wsBalanco = criarFolhaDemonstracao(wb, "Balanço", pacote.balanco, pacote);

  // 2. Demonstração de Resultados
  criarFolhaDemonstracao(wb, "Dem. Resultados", pacote.resultados, pacote);

  // 3. Fluxos de Caixa
  criarFolhaDemonstracao(wb, "Fluxos de Caixa", pacote.fluxosCaixa, pacote);

  // 4. Alterações nos Capitais Próprios
  criarFolhaDemonstracao(wb, "Alt. Capitais Próprios", pacote.alteracoesCP, pacote);

  // 5. Opcional: Demonstração por Funções
  if (pacote.demonstracaoFuncoes) {
    criarFolhaDemonstracao(wb, "Dem. Funções", pacote.demonstracaoFuncoes, pacote);
  }

  // 6. Notas às Contas
  const wsNotas = wb.addWorksheet("Notas às Contas");
  wsNotas.views = [{ state: "frozen", ySplit: 2, xSplit: 0 }];
  wsNotas.columns = [
    { header: "N.º", key: "numero", width: 8 },
    { header: "Título da Divulgação", key: "titulo", width: 45 },
    { header: "Texto e Detalhes da Nota", key: "texto", width: 85 },
    { header: `Valor Actual (${pacote.moeda})`, key: "actual", width: 22 },
    { header: `Valor Anterior (${pacote.moeda})`, key: "anterior", width: 22 },
  ];

  // Header Notas
  wsNotas.spliceRows(1, 0, [
    `NOTAS ANEXAS ÀS CONTAS — ${pacote.entidade.toUpperCase()} (${pacote.periodo})`,
  ]);
  wsNotas.mergeCells("A1:E1");
  const cellN1 = wsNotas.getCell("A1");
  cellN1.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" }, name: "Calibri" };
  cellN1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_NAVY } };
  cellN1.alignment = { horizontal: "center", vertical: "middle" };
  wsNotas.getRow(1).height = 28;

  wsNotas.getRow(2).values = [
    "N.º",
    "Título da Divulgação",
    "Texto e Detalhes da Nota",
    `Valor Actual (${pacote.moeda})`,
    `Valor Anterior (${pacote.moeda})`,
  ];
  wsNotas.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
  wsNotas.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_NAVY } };
  wsNotas.getRow(2).height = 24;

  pacote.notas.forEach((n) => {
    const row = wsNotas.addRow([
      n.numero,
      n.titulo,
      n.texto,
      n.valorActual || "",
      n.valorAnterior || "",
    ]);
    row.getCell(1).alignment = { horizontal: "center", vertical: "top" };
    row.getCell(2).alignment = { vertical: "top" };
    row.getCell(3).alignment = { vertical: "top", wrapText: true };
    row.getCell(4).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
    row.getCell(5).numFmt = '#,##0.00;[Red]-#,##0.00;"-"';
    row.getCell(4).alignment = { horizontal: "right", vertical: "top" };
    row.getCell(5).alignment = { horizontal: "right", vertical: "top" };
  });

  // Formatação condicional: se o Balanço não fechar, destaca a vermelho
  const totalActivoRow = pacote.balanco.linhas.findIndex((l) => l.rubrica === "TOTAL DO ACTIVO") + 4;
  const totalCPPassivoRow = pacote.balanco.linhas.findIndex((l) => l.rubrica === "TOTAL DO CAPITAL PRÓPRIO E PASSIVO") + 4;

  if (totalActivoRow > 0 && totalCPPassivoRow > 0) {
    wsBalanco.addConditionalFormatting({
      ref: `C${totalCPPassivoRow}`,
      rules: [
        {
          priority: 1,
          type: "expression",
          formulae: [`C${totalCPPassivoRow}<>C${totalActivoRow}`],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: "FFFFC7CE" },
              fgColor: { argb: "FFFFC7CE" },
            },
            font: { color: { argb: "FF9C0006" }, bold: true },
          },
        },
      ],
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
