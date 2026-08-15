import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle
} from "docx";
import type { PacoteDemonstracoes, Demonstracao } from "./tipos";

function formatarNumero(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function criarTabelaDemonstracao(d: Demonstracao, pacote: PacoteDemonstracoes): Table {
  const bordaNula = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const bordaLinha = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
  const bordaCabecalho = { style: BorderStyle.SINGLE, size: 2, color: "1E3A8A" };

  const cabecalho = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 55, type: WidthType.PERCENTAGE },
        borders: { top: bordaCabecalho, bottom: bordaCabecalho, left: bordaNula, right: bordaNula },
        children: [new Paragraph({ children: [new TextRun({ text: "Rubricas / Designação Oficial", bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        borders: { top: bordaCabecalho, bottom: bordaCabecalho, left: bordaNula, right: bordaNula },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Notas", bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 17.5, type: WidthType.PERCENTAGE },
        borders: { top: bordaCabecalho, bottom: bordaCabecalho, left: bordaNula, right: bordaNula },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Actual (${pacote.moeda})`, bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 17.5, type: WidthType.PERCENTAGE },
        borders: { top: bordaCabecalho, bottom: bordaCabecalho, left: bordaNula, right: bordaNula },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Anterior (${pacote.moeda})`, bold: true, size: 18 })] })],
      }),
    ],
  });

  const linhas = d.linhas.map((l) => {
    const isHeaderOnly = l.ehTotal && l.actual === 0 && l.anterior === 0;
    const isTotal = l.ehTotal;

    return new TableRow({
      children: [
        new TableCell({
          borders: { top: isTotal ? bordaLinha : bordaNula, bottom: isTotal ? bordaLinha : bordaNula, left: bordaNula, right: bordaNula },
          children: [new Paragraph({ children: [new TextRun({ text: l.rubrica, bold: isTotal, size: isTotal ? 19 : 17 })] })],
        }),
        new TableCell({
          borders: { top: isTotal ? bordaLinha : bordaNula, bottom: isTotal ? bordaLinha : bordaNula, left: bordaNula, right: bordaNula },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l.notas !== undefined ? String(l.notas) : "", size: 16 })] })],
        }),
        new TableCell({
          borders: { top: isTotal ? bordaLinha : bordaNula, bottom: isTotal ? bordaLinha : bordaNula, left: bordaNula, right: bordaNula },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: isHeaderOnly ? "" : formatarNumero(l.actual), bold: isTotal, size: isTotal ? 19 : 17 })] })],
        }),
        new TableCell({
          borders: { top: isTotal ? bordaLinha : bordaNula, bottom: isTotal ? bordaLinha : bordaNula, left: bordaNula, right: bordaNula },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: isHeaderOnly ? "" : formatarNumero(l.anterior), bold: isTotal, size: isTotal ? 19 : 17 })] })],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cabecalho, ...linhas],
  });
}

export async function gerarDocx(pacote: PacoteDemonstracoes): Promise<Buffer> {
  const sectionsChildren: any[] = [
    new Paragraph({
      text: pacote.entidade.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `DEMONSTRAÇÕES FINANCEIRAS — ${pacote.periodo}`,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Conforme o Decreto n.º 82/2001 (Plano Geral de Contabilidade de Angola) ${pacote.grandezaTexto}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),

    // 1. Balanço
    new Paragraph({ text: `1. ${pacote.balanco.titulo}`, heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
    criarTabelaDemonstracao(pacote.balanco, pacote),

    // 2. Demonstração de Resultados por Natureza
    new Paragraph({ text: `2. ${pacote.resultados.titulo}`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }),
    criarTabelaDemonstracao(pacote.resultados, pacote),

    // 3. Demonstração de Fluxos de Caixa
    new Paragraph({ text: `3. ${pacote.fluxosCaixa.titulo}`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }),
    criarTabelaDemonstracao(pacote.fluxosCaixa, pacote),

    // 4. Demonstração de Alterações no Capital Próprio
    new Paragraph({ text: `4. ${pacote.alteracoesCP.titulo}`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }),
    criarTabelaDemonstracao(pacote.alteracoesCP, pacote),
  ];

  if (pacote.demonstracaoFuncoes) {
    sectionsChildren.push(
      new Paragraph({ text: `5. ${pacote.demonstracaoFuncoes.titulo}`, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }),
      criarTabelaDemonstracao(pacote.demonstracaoFuncoes, pacote)
    );
  }

  // 6. Notas às Contas
  sectionsChildren.push(
    new Paragraph({ text: "NOTAS ÀS DEMONSTRAÇÕES FINANCEIRAS", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } })
  );

  pacote.notas.forEach((n) => {
    sectionsChildren.push(
      new Paragraph({
        text: `Nota ${n.numero} — ${n.titulo}`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 50 },
      }),
      new Paragraph({
        text: n.texto,
        spacing: { after: 100 },
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sectionsChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
