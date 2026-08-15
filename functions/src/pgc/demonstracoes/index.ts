import { Balancete, criarBalanceteDeLancamentos } from "./balancete";
import { construirPacote } from "./calculos";
import { validarFechoBalanco, validarResultadoLiquido, validarFluxosCaixa } from "./validacao";
import { gerarDocx } from "./geradorDocx";
import { gerarXlsx } from "./geradorXlsx";
import type { PedidoGeracao, RespostaGeracao, PacoteDemonstracoes } from "./tipos";

export * from "./tipos";
export * from "./balancete";
export * from "./modelos";
export * from "./calculos";
export * from "./validacao";
export * from "./geradorDocx";
export * from "./geradorXlsx";

/**
 * Processador principal de geração das Demonstrações Financeiras PGC Angola
 */
export async function processarGeracaoDemonstracoes(
  pedido: PedidoGeracao
): Promise<{
  pacote: PacoteDemonstracoes;
  buffer: Buffer;
  nomeFicheiro: string;
  contentType: string;
  validacoes: RespostaGeracao["validacoes"];
  erros: string[];
}> {
  const moeda = pedido.moeda || "Kz (AOA)";
  const grandeza = pedido.grandeza || 1;
  const ano = pedido.ano || new Date().getFullYear();

  // 1. Preparar Balancetes a partir dos lançamentos contábeis reais
  const lancamentos = pedido.lancamentosLocais || [];
  const atual = criarBalanceteDeLancamentos(lancamentos, ano);
  const anterior = criarBalanceteDeLancamentos(lancamentos, ano - 1);

  // 2. Construir pacote completo de demonstrações
  const pacote = construirPacote(
    pedido.entidade || "Empresa Angolana, Lda.",
    ano,
    moeda,
    grandeza,
    atual,
    anterior,
    pedido.incluirFuncoes
  );

  // 3. Validações estritas do Decreto n.º 82/2001
  const validacaoBalanco = validarFechoBalanco(pacote.balanco);
  const validacaoRLE = validarResultadoLiquido(pacote.resultados, atual.saldoExato("88"));
  const variacaoRealCaixa = atual.somar("41", "42", "43", "44", "45", "48") - anterior.somar("41", "42", "43", "44", "45", "48");
  const validacaoFluxos = validarFluxosCaixa(pacote.fluxosCaixa, variacaoRealCaixa);

  const erros = [
    ...validacaoBalanco.erros,
    ...validacaoRLE.erros,
    ...validacaoFluxos.erros,
  ];

  if (erros.length > 0 && !pedido.ignorarAvisos) {
    return {
      pacote,
      buffer: Buffer.from([]),
      nomeFicheiro: "",
      contentType: "",
      validacoes: {
        fecho: validacaoBalanco.valido ? "ok" : "erro",
        resultadoLiquido: validacaoRLE.valido ? "ok" : "erro",
        fluxos: validacaoFluxos.valido ? "ok" : "erro",
      },
      erros,
    };
  }

  // 4. Geração do ficheiro oficial
  const buffer = pedido.formato === "docx"
    ? await gerarDocx(pacote)
    : await gerarXlsx(pacote);

  const extensao = pedido.formato === "docx" ? "docx" : "xlsx";
  const sanitizedEntidade = (pedido.entidade || "Entidade").replace(/[^a-zA-Z0-9_-]/g, "_");
  const nomeFicheiro = `Demonstracoes_Financeiras_PGC_${sanitizedEntidade}_${ano}.${extensao}`;
  const contentType = pedido.formato === "docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return {
    pacote,
    buffer,
    nomeFicheiro,
    contentType,
    validacoes: {
      fecho: validacaoBalanco.valido ? "ok" : "erro",
      resultadoLiquido: validacaoRLE.valido ? "ok" : "erro",
      fluxos: validacaoFluxos.valido ? "ok" : "erro",
    },
    erros,
  };
}
