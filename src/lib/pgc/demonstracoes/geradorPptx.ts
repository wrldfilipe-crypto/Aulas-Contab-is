import pptxgen from "pptxgenjs";
import type { PacoteDemonstracoes, Demonstracao } from "./tipos";

const COR_PRIMARIA = "1B3A6B";      // Azul Escuro PGC (#1B3A6B)
const COR_SECUNDARIA = "2E5FA3";    // Azul Médio PGC (#2E5FA3)
const COR_DESTAQUE = "0A2140";      // Azul Profundo PGC (#0A2140)
const COR_FUNDO_CABECALHO = "F0F4FA";
const COR_TEXTO = "1E293B";

function formatarValor(val: number): string {
  if (val === 0) return "-";
  return val.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function gerarPptx(pacote: PacoteDemonstracoes): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Global Account ERP";
  pptx.company = pacote.entidade;
  pptx.title = `Demonstrações Financeiras — ${pacote.entidade} (${pacote.periodo})`;

  // SLIDE 1: Capa Executiva
  const slideCapa = pptx.addSlide();
  slideCapa.background = { color: COR_DESTAQUE };

  // Faixa decorativa
  slideCapa.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.3,
    fill: { color: COR_SECUNDARIA },
  });

  slideCapa.addText(pacote.entidade.toUpperCase(), {
    x: 1.0,
    y: 2.2,
    w: 11.33,
    h: 0.8,
    fontSize: 28,
    bold: true,
    color: "FFFFFF",
    align: "left",
    fontFace: "Calibri",
  });

  slideCapa.addText("DEMONSTRAÇÕES FINANCEIRAS OFICIAIS", {
    x: 1.0,
    y: 3.1,
    w: 11.33,
    h: 0.6,
    fontSize: 20,
    bold: true,
    color: "93C5FD",
    align: "left",
    fontFace: "Calibri",
  });

  slideCapa.addText(`Exercício Económico de ${pacote.ano} · ${pacote.grandezaTexto}`, {
    x: 1.0,
    y: 3.8,
    w: 11.33,
    h: 0.5,
    fontSize: 14,
    color: "E2E8F0",
    align: "left",
    fontFace: "Calibri",
  });

  slideCapa.addText("Conforme o Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001, de 16 de Novembro)", {
    x: 1.0,
    y: 5.5,
    w: 11.33,
    h: 0.4,
    fontSize: 11,
    italic: true,
    color: "94A3B8",
    align: "left",
    fontFace: "Calibri",
  });

  // Função auxiliar para criar slides tabulares
  const criarSlideTabela = (titulo: string, subtitulo: string, d: Demonstracao) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Barra de topo
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.85,
      fill: { color: COR_PRIMARIA },
    });

    slide.addText(titulo.toUpperCase(), {
      x: 0.6,
      y: 0.12,
      w: 8.5,
      h: 0.35,
      fontSize: 14,
      bold: true,
      color: "FFFFFF",
      fontFace: "Calibri",
    });

    slide.addText(`${pacote.entidade} · ${subtitulo} · ${pacote.moeda} ${pacote.grandezaTexto}`, {
      x: 0.6,
      y: 0.45,
      w: 8.5,
      h: 0.3,
      fontSize: 10,
      color: "BFDBFE",
      fontFace: "Calibri",
    });

    // Badge PGC Angola
    slide.addText("PGC Angola (Dec. 82/01)", {
      x: 9.5,
      y: 0.22,
      w: 3.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      align: "right",
      fontFace: "Calibri",
    });

    // Preparar dados da tabela
    const rows: any[][] = [];

    // Cabeçalho da Tabela
    rows.push([
      { text: "Rubrica Oficial PGC", options: { bold: true, fill: { color: COR_SECUNDARIA }, color: "FFFFFF", fontSize: 9 } },
      { text: "Notas", options: { bold: true, fill: { color: COR_SECUNDARIA }, color: "FFFFFF", fontSize: 9, align: "center" } },
      { text: `Exercício ${pacote.ano}`, options: { bold: true, fill: { color: COR_SECUNDARIA }, color: "FFFFFF", fontSize: 9, align: "right" } },
      { text: `Exercício ${pacote.ano - 1}`, options: { bold: true, fill: { color: COR_SECUNDARIA }, color: "FFFFFF", fontSize: 9, align: "right" } },
    ]);

    // Linhas (limitar a 16 linhas por slide para legibilidade limpa)
    d.linhas.slice(0, 18).forEach((l) => {
      const isTotal = l.ehTotal || l.rubrica.startsWith("TOTAL") || l.rubrica.startsWith("RESULTADO");
      const isSection = l.ehTotal && !l.rubrica.startsWith("TOTAL") && !l.rubrica.startsWith("  ");

      const bgColor = isSection ? "E2E8F0" : isTotal ? "EEF2FF" : "FFFFFF";
      const textColor = isSection ? COR_DESTAQUE : isTotal ? COR_PRIMARIA : COR_TEXTO;

      rows.push([
        { text: l.rubrica, options: { bold: isTotal || isSection, color: textColor, fontSize: 8.5, fill: { color: bgColor } } },
        { text: l.notas !== undefined ? String(l.notas) : "", options: { color: "64748B", fontSize: 8, align: "center", fill: { color: bgColor } } },
        { text: isSection && l.actual === 0 ? "" : formatarValor(l.actual), options: { bold: isTotal, color: textColor, fontSize: 8.5, align: "right", fill: { color: bgColor } } },
        { text: isSection && l.anterior === 0 ? "" : formatarValor(l.anterior), options: { bold: isTotal, color: textColor, fontSize: 8.5, align: "right", fill: { color: bgColor } } },
      ]);
    });

    slide.addTable(rows, {
      x: 0.6,
      y: 1.05,
      w: 12.13,
      colW: [7.33, 1.0, 1.9, 1.9],
      border: { pt: 0.5, color: "CBD5E1" },
      margin: [2, 3, 2, 3],
    });
  };

  // SLIDE 2: Balanço Patrimonial
  criarSlideTabela("1. Balanço Patrimonial", "Estrutura Vertical Oficial", pacote.balanco);

  // SLIDE 3: Demonstração de Resultados
  criarSlideTabela("2. Demonstração de Resultados", "Por Natureza (Classes 6 e 7)", pacote.resultados);

  // SLIDE 4: Fluxos de Caixa
  criarSlideTabela("3. Demonstração de Fluxos de Caixa", "Actividades Operacionais, Investimento e Financiamento", pacote.fluxosCaixa);

  // SLIDE 5: Alterações nos Capitais Próprios
  criarSlideTabela("4. Demonstração de Alterações no Capital Próprio", "Evolução das Reservas e Resultados", pacote.alteracoesCP);

  // Descarregar ficheiro PPTX no browser
  const nomeFicheiro = `Demonstracoes_Financeiras_${pacote.entidade.replace(/[^a-zA-Z0-9]/g, "_")}_${pacote.ano}.pptx`;
  await pptx.writeFile({ fileName: nomeFicheiro });
}
