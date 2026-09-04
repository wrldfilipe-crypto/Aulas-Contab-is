import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
import { saveAs } from 'file-saver';

export type DocumentType = 'word' | 'excel' | 'pptx';

export interface WordDocQuestion {
  number: number;
  statement: string;
  type?: 'multipla_escolha' | 'dissertativa' | 'verdadeiro_falso';
  options?: string[];
  correctAnswer?: string;
  points?: number;
}

export interface WordDocData {
  title: string;
  subject?: string;
  instructions?: string;
  questions?: WordDocQuestion[];
  paragraphs?: string[];
  tables?: {
    headers: string[];
    rows: string[][];
  }[];
}

export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ExcelDocData {
  title: string;
  sheets: ExcelSheetData[];
}

export interface PptxSlideData {
  title: string;
  bullets: string[];
  notes?: string;
}

export interface PptxDocData {
  title: string;
  subtitle?: string;
  slides: PptxSlideData[];
}

/**
 * Detecta a intenção do utilizador de gerar documentos (.docx, .xlsx, .pptx)
 */
export function detectDocumentIntent(message: string): DocumentType | null {
  const lower = message.toLowerCase();
  
  // Word / DOCX
  if (/(prova|exame|question[aá]rio|relat[oó]rio|word|documento|\.docx|gerar docx|criar docx|trabalho escrito|contrato|parecer t[eé]cnico)/i.test(lower)) {
    return 'word';
  }
  
  // Excel / XLSX
  if (/(planilha|excel|tabela|or[çc]amento|balancete|fluxo de caixa|demonstra[çc][aã]o|mapa|lan[çc]amentos|\.xlsx|gerar xlsx|criar xlsx|folha de c[aá]lculo)/i.test(lower)) {
    return 'excel';
  }
  
  // PowerPoint / PPTX
  if (/(apresenta[çc][aã]o|slides|powerpoint|pptx|\.pptx|gerar pptx|criar pptx|diapositivos)/i.test(lower)) {
    return 'pptx';
  }
  
  return null;
}

/**
 * TAREFA 2 — CONVERSOR DE FORMATAÇÃO INLINE (Negrito, Itálico, Código Monospace)
 */
export function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Regex para capturar **negrito**, *itálico* e `código`
  const regex = /(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.slice(lastIndex, match.index),
        font: 'Segoe UI'
      }));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(new TextRun({
        text: token.slice(2, -2),
        bold: true,
        font: 'Segoe UI'
      }));
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        font: 'Courier New',
        color: '1E293B',
        shading: {
          fill: 'F1F5F9'
        }
      }));
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        italics: true,
        font: 'Segoe UI'
      }));
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.slice(lastIndex),
      font: 'Segoe UI'
    }));
  }

  return runs.length ? runs : [new TextRun({ text, font: 'Segoe UI' })];
}

/**
 * TAREFA 2 — CONVERSOR DE MARKDOWN → WORD GENÉRICO
 * Converte 100% do texto markdown do Yohan AI para elementos DOCX sem perder nada.
 */
export function markdownToDocxElements(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split('\n');
  const elements: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Linha em branco
    if (line === '') {
      elements.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      i++;
      continue;
    }

    // 2. Linha divisória horizontal ---
    if (line === '---' || line === '***' || line === '___') {
      elements.push(new Paragraph({
        text: '',
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        },
        spacing: { before: 140, after: 140 }
      }));
      i++;
      continue;
    }

    // 3. Título Nível 4 (####)
    if (line.startsWith('#### ')) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.slice(5)),
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 180, after: 80 }
      }));
      i++;
      continue;
    }

    // 4. Título Nível 3 (###)
    if (line.startsWith('### ')) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.slice(4)),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 100 }
      }));
      i++;
      continue;
    }

    // 5. Título Nível 2 (##)
    if (line.startsWith('## ')) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.slice(3)),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 }
      }));
      i++;
      continue;
    }

    // 6. Título Nível 1 (#)
    if (line.startsWith('# ')) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.slice(2)),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 }
      }));
      i++;
      continue;
    }

    // 7. Tabelas em Markdown (| Col 1 | Col 2 |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Primeira linha = cabeçalhos
        const headerCells = tableLines[0].split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const rows: TableRow[] = [];

        // Adicionar cabeçalho da tabela
        rows.push(new TableRow({
          tableHeader: true,
          children: headerCells.map(h => new TableCell({
            width: { size: Math.floor(9000 / Math.max(headerCells.length, 1)), type: WidthType.DXA },
            shading: { fill: '1E3A8A' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: h.replace(/\*\*/g, ''), bold: true, color: 'FFFFFF', font: 'Segoe UI' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 }
              })
            ]
          }))
        }));

        // Linhas de dados (pulando a linha de separador |--|--|)
        for (let rowIdx = 1; rowIdx < tableLines.length; rowIdx++) {
          const rowText = tableLines[rowIdx];
          if (/^\|[\s\-:|]+\|$/.test(rowText)) continue; // Separador

          const cells = rowText.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          rows.push(new TableRow({
            children: cells.map(cellText => new TableCell({
              width: { size: Math.floor(9000 / Math.max(headerCells.length, 1)), type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: parseInlineFormatting(cellText),
                  spacing: { before: 40, after: 40 }
                })
              ]
            }))
          }));
        }

        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' }
          }
        }));

        elements.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }
    }

    // 8. Lista com marcadores (* ou - ou •)
    if (/^[*\-•]\s+/.test(line)) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.replace(/^[*\-•]\s+/, '')),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 }
      }));
      i++;
      continue;
    }

    // 9. Lista numerada (1. 2. 3.)
    if (/^\d+[\.\)]\s+/.test(line)) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line),
        indent: { left: 360 },
        spacing: { before: 40, after: 40 }
      }));
      i++;
      continue;
    }

    // 10. Citação ou Bloco de Nota (> ...)
    if (line.startsWith('> ')) {
      elements.push(new Paragraph({
        children: parseInlineFormatting(line.slice(2)),
        indent: { left: 400 },
        border: {
          left: { color: '2563EB', space: 8, style: BorderStyle.SINGLE, size: 12 }
        },
        spacing: { before: 60, after: 60 }
      }));
      i++;
      continue;
    }

    // 11. Parágrafo normal de texto
    elements.push(new Paragraph({
      children: parseInlineFormatting(line),
      spacing: { before: 40, after: 80 }
    }));
    i++;
  }

  return elements;
}

/**
 * TAREFA 1 & TAREFA 3 — EXPORTAR PARA WORD (Garante binário .docx real e MIME type correto)
 */
export async function exportToWord(elements: (Paragraph | Table)[], fileName: string): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 polegada (25.4mm)
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: elements
      }
    ]
  });

  // OBRIGATÓRIO: use toBlob no browser (nunca toString() ou XML cru)
  const blob = await Packer.toBlob(doc);

  // Confirme o MIME type oficial do formato OpenXML Word (.docx)
  const finalBlob = new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const cleanFileName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  saveAs(finalBlob, cleanFileName);
  return finalBlob;
}

/**
 * TAREFA 3 — EXPORTAR RESPOSTA LIVRE DO YOHAN AI PARA WORD (.docx)
 * Preserva 100% da formatação e estrutura do chat.
 */
export async function exportChatMessageToWord(messageMarkdown: string, title?: string): Promise<Blob> {
  const safeTitle = (title || 'resposta_yohan_ai').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚãõÃÕçÇ ]/g, '_').trim();
  const elements = markdownToDocxElements(messageMarkdown);
  return await exportToWord(elements, safeTitle);
}

/**
 * Extrai e estrutura dados JSON de documentos a partir da resposta do modelo ou texto livre
 */
export function parseDocumentData(text: string, type: DocumentType): any {
  // 1. Tentar parsear JSON direto
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();
    if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
      const parsed = JSON.parse(jsonString);
      return parsed;
    }
  } catch (e) {
    // Continua para o parser inteligente
  }

  // 2. Parser Heurístico para Excel
  if (type === 'excel') {
    const rows: (string | number)[][] = [];
    const lines = text.split('\n').filter(l => l.includes('|'));
    let headers: string[] = [];

    if (lines.length >= 2) {
      headers = lines[0].split('|').map(c => c.trim()).filter(Boolean);
      for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length > 0) {
          rows.push(cells.map(c => {
            const num = Number(c.replace(/[^0-9.-]+/g, ''));
            return !isNaN(num) && c.match(/[0-9]/) && !c.match(/[a-zA-Z]/) ? num : c;
          }));
        }
      }
    }

    return {
      title: 'Planilha Contabilística PGC Angola',
      sheets: [
        {
          name: 'Dados Contabilísticos',
          headers: headers.length > 0 ? headers : ['Código', 'Descrição da Conta', 'Débito (Kz)', 'Crédito (Kz)', 'Saldo'],
          rows: rows.length > 0 ? rows : [
            ['43.1', 'Depósitos à Ordem - BFA', 15000000, 0, 15000000],
            ['61.1', 'Vendas de Mercadorias', 0, 15000000, 15000000]
          ]
        }
      ]
    };
  }

  // 3. Parser Heurístico para PowerPoint
  if (type === 'pptx') {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const slides: PptxSlideData[] = [];
    let currentSlide: PptxSlideData | null = null;

    for (const line of lines) {
      if (line.startsWith('#') || /^slide\s*\d+/i.test(line)) {
        if (currentSlide) slides.push(currentSlide);
        currentSlide = {
          title: line.replace(/^[#\s*]+/, '').replace(/^slide\s*\d+[:\.\-]?\s*/i, '').trim(),
          bullets: []
        };
      } else if (currentSlide && (line.startsWith('-') || line.startsWith('*') || line.startsWith('•') || /^\d+\./.test(line))) {
        currentSlide.bullets.push(line.replace(/^[-*•\d\.]+\s*/, '').trim());
      } else if (currentSlide && line.length > 3) {
        currentSlide.bullets.push(line);
      }
    }
    if (currentSlide) slides.push(currentSlide);

    return {
      title: 'Apresentação Contabilidade PGC Angola',
      subtitle: 'Estrutura e Aplicação Prática',
      slides: slides.length > 0 ? slides : [
        {
          title: 'Introdução ao PGC Angola',
          bullets: [
            'Aprovado pelo Decreto n.º 82/01 de 16 de Novembro',
            'Composto por 8 classes fundamentais',
            'Enquadramento fiscal segundo as normas da AGT'
          ]
        }
      ]
    };
  }

  // Para Word estruturado caso explicitamente solicitado como exame
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines.find(l => l.startsWith('#'))?.replace(/^[#\s*]+/, '') || 'Documento PGC Angola';
  return {
    title: title.replace(/[*#]/g, '').trim(),
    subject: 'Contabilidade Geral & PGC Angola (Decreto 82/01)',
    instructions: 'Leia atentamente as questões e apresente as resoluções e lançamentos contabilísticos necessários.'
  };
}

/**
 * Gera e transfere um ficheiro Word (.docx) estruturado (exames / provas com questões)
 */
export async function generateWordDoc(docData: WordDocData, fileName?: string): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: docData.title || 'Documento Contabilístico PGC Angola',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  ];

  if (docData.subject) {
    children.push(
      new Paragraph({
        text: docData.subject,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 }
      })
    );
  }

  if (docData.instructions) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Instruções: ',
            bold: true,
            color: '2B6CB0'
          }),
          new TextRun({
            text: docData.instructions,
            italics: true
          })
        ],
        spacing: { after: 240 }
      })
    );
  }

  // Questões estruturadas (exames / provas / quizzes)
  if (docData.questions && docData.questions.length > 0) {
    docData.questions.forEach((q, idx) => {
      const qNum = q.number || (idx + 1);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Questão ${qNum}. `,
              bold: true,
              color: '1A365D'
            }),
            new TextRun({
              text: q.statement,
              bold: true
            }),
            ...(q.points ? [new TextRun({ text: ` [${q.points} pt]`, italics: true, color: '718096' })] : [])
          ],
          spacing: { before: 180, after: 100 }
        })
      );

      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(97 + optIdx);
          const isCorrect = q.correctAnswer && (q.correctAnswer.toLowerCase() === letter || q.correctAnswer === opt);
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `   ${letter}) `,
                  bold: true
                }),
                new TextRun({
                  text: opt,
                  color: isCorrect ? '2F855A' : '2D3748'
                })
              ],
              spacing: { after: 60 }
            })
          );
        });
      }

      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    });
  }

  // Parágrafos regulares se não for exame
  if (docData.paragraphs && docData.paragraphs.length > 0) {
    docData.paragraphs.forEach(p => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: p, size: 22 })],
          spacing: { after: 120 }
        })
      );
    });
  }

  return await exportToWord(children, fileName || docData.title || 'documento_pgc');
}

/**
 * Gera e transfere um ficheiro Excel (.xlsx) real usando exceljs
 */
export async function generateExcelDoc(docData: ExcelDocData, fileName?: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Yohan AI - Consultoria PGC Angola';
  workbook.created = new Date();

  const sheets = docData.sheets && docData.sheets.length > 0 ? docData.sheets : [
    {
      name: 'Resumo Contabilístico',
      headers: ['Código Conta', 'Descrição', 'Débito (Kz)', 'Crédito (Kz)', 'Saldo (Kz)'],
      rows: [
        ['43.1', 'Depósitos à Ordem em Moeda Nacional', 25000000, 0, 25000000],
        ['21.1', 'Mercadorias Gerais em Armazém', 12000000, 0, 12000000],
        ['31.1', 'Fornecedores c/c', 0, 12000000, -12000000],
        ['61.1', 'Vendas de Mercadorias', 0, 25000000, 25000000]
      ]
    }
  ];

  sheets.forEach(sheetData => {
    const sheet = workbook.addWorksheet(sheetData.name.slice(0, 31) || 'Contabilidade');

    // Cabeçalho estilizado
    const headerRow = sheet.addRow(sheetData.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Navy blue elegante
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' }
      };
    });

    // Linhas de dados
    sheetData.rows.forEach(row => {
      const dataRow = sheet.addRow(row);
      dataRow.height = 20;
      dataRow.alignment = { vertical: 'middle' };
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        // Formatar valores numéricos monetários
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00 "Kz"';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    });

    // Auto-ajustar larguras de coluna
    sheet.columns.forEach(column => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const cellLen = cell.value ? String(cell.value).length : 0;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      column.width = Math.min(maxLen + 4, 45);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = (fileName || docData.title || 'planilha_contabilistica_pgc').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚãõÃÕçÇ ]/g, '_');
  saveAs(blob, `${safeName}.xlsx`);
  return blob;
}

/**
 * Gera e transfere uma apresentação PowerPoint (.pptx) real usando pptxgenjs
 */
export async function generatePptxDoc(docData: PptxDocData, fileName?: string): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen moderno

  // Slide Mestre / Título
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F172A' }; // Slate escuro sofisticado
  
  titleSlide.addText(docData.title || 'Contabilidade Geral e PGC Angola', {
    x: 0.8,
    y: 2.2,
    w: 11.5,
    h: 1.5,
    fontSize: 34,
    bold: true,
    color: 'FFFFFF',
    align: 'left'
  });

  titleSlide.addText(docData.subtitle || 'Estrutura, Lançamentos e Normas Fiscais AGT', {
    x: 0.8,
    y: 3.8,
    w: 11.5,
    h: 0.8,
    fontSize: 18,
    color: '93C5FD',
    align: 'left'
  });

  titleSlide.addText('Gerado por Yohan AI • Sistema de Contabilidade Unificada', {
    x: 0.8,
    y: 6.2,
    w: 11.5,
    h: 0.5,
    fontSize: 12,
    color: '64748B',
    align: 'left'
  });

  // Slides de Conteúdo
  const slides = docData.slides && docData.slides.length > 0 ? docData.slides : [
    {
      title: 'Estrutura do PGC Angola',
      bullets: [
        'Classes 1 a 5: Balanço Patrimonial (Ativo, Passivo e Capital Próprio)',
        'Classes 6 e 7: Demonstração de Resultados (Proveitos e Custos por Natureza)',
        'Classe 8: Apuramento e Distribuição de Resultados'
      ]
    }
  ];

  slides.forEach((slideData, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8FAFC' };

    // Barra de topo azul
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.1,
      fill: { color: '2563EB' }
    });

    // Título do Slide
    slide.addText(slideData.title || `Tópico ${idx + 1}`, {
      x: 0.8,
      y: 0.5,
      w: 11.5,
      h: 0.8,
      fontSize: 22,
      bold: true,
      color: '0F172A'
    });

    // Linha divisória
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 1.35,
      w: 11.5,
      h: 0,
      line: { color: 'CBD5E1', width: 1 }
    });

    // Bullets de Conteúdo
    const bulletItems = (slideData.bullets && slideData.bullets.length > 0 ? slideData.bullets : ['Ponto de análise contabilística'])
      .map(b => ({
        text: b,
        options: {
          bullet: true,
          breakLine: true,
          fontSize: 15,
          color: '334155',
          spacing: { after: 14 }
        }
      }));

    slide.addText(bulletItems, {
      x: 0.8,
      y: 1.6,
      w: 11.5,
      h: 4.8
    });

    // Notas de rodapé
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  });

  const safeName = (fileName || docData.title || 'apresentacao_pgc').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚãõÃÕçÇ ]/g, '_');
  await pptx.writeFile({ fileName: `${safeName}.pptx` });
}
