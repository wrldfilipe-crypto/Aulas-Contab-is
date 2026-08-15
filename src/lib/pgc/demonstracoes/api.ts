import type { PedidoGeracao, RespostaGeracao, PacoteDemonstracoes } from "./tipos";
import { Balancete, criarBalanceteDeLancamentos } from "./balancete";
import { construirPacote } from "./calculos";
import { validarFechoBalanco, validarResultadoLiquido, validarFluxosCaixa } from "./validacao";

/**
 * Faz o pedido de geração server-side ao endpoint Express / Cloud Function
 * e descarrega o ficheiro gerado (.docx ou .xlsx)
 */
export async function gerarEDescarregarDemonstracoes(params: PedidoGeracao): Promise<{
  sucesso: boolean;
  nomeFicheiro: string;
  pacote: PacoteDemonstracoes;
  validacoes: RespostaGeracao["validacoes"];
}> {
  // 1. Obter lançamentos contábeis reais do localStorage se não forem passados
  let lancamentos = params.lancamentosLocais;
  if (!lancamentos || lancamentos.length === 0) {
    try {
      const saved = localStorage.getItem("ga_erp_accounting_entries");
      if (saved) {
        lancamentos = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Erro ao ler lançamentos locais:", e);
    }
  }

  const payload: PedidoGeracao = {
    ...params,
    lancamentosLocais: lancamentos,
  };

  // 2. Chamar o backend server-side
  const resp = await fetch("/api/pgc/gerar-demonstracoes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = resp.headers.get("content-type") || "";

  // Se o servidor retornou o ficheiro binário diretamente (.docx / .xlsx)
  if (resp.ok && (contentType.includes("openxmlformats") || contentType.includes("octet-stream") || contentType.includes("vnd.ms-excel"))) {
    const blob = await resp.blob();
    const disposition = resp.headers.get("content-disposition") || "";
    let filename = `Demonstracoes_PGC_${params.ano}.${params.formato}`;
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }

    // Download no browser
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Calcular pacote local para o estado da UI
    const ano = params.ano || new Date().getFullYear();
    const atual = criarBalanceteDeLancamentos(lancamentos || [], ano);
    const anterior = criarBalanceteDeLancamentos(lancamentos || [], ano - 1);
    const pacote = construirPacote(params.entidade || "Empresa", ano, params.moeda, params.grandeza, atual, anterior, params.incluirFuncoes);

    return {
      sucesso: true,
      nomeFicheiro: filename,
      pacote,
      validacoes: { fecho: "ok", resultadoLiquido: "ok", fluxos: "ok" },
    };
  }

  // Se o servidor retornou JSON (erro de validação ou payload de resposta)
  let data: any = {};
  try {
    data = await resp.json();
  } catch (e) {
    throw new Error(`Falha na resposta do servidor (HTTP ${resp.status})`);
  }

  if (!resp.ok || !data.ok) {
    const detalhes = (data.detalhes || []).join("\n• ");
    const mensagemErro = `${data.erro || "Geração recusada pelo validador PGC"}${detalhes ? "\n\nDetalhes dos desvios:\n• " + detalhes : ""}`;
    throw new Error(mensagemErro);
  }

  // Se retornou JSON com base64 ou URL
  if (data.base64) {
    const byteCharacters = atob(data.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mime = params.formato === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const blob = new Blob([byteArray], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.nome || `Demonstracoes_PGC_${params.ano}.${params.formato}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return {
    sucesso: true,
    nomeFicheiro: data.nome,
    pacote: data.pacote,
    validacoes: data.validacoes || { fecho: "ok", resultadoLiquido: "ok", fluxos: "ok" },
  };
}

/**
 * Valida o balancete e o fecho das demonstrações localmente antes de disparar o download
 */
export function validarDemonstracoesLocal(
  lancamentos: any[],
  ano: number,
  entidade: string,
  moeda = "Kz (AOA)",
  grandeza = 1
): {
  valido: boolean;
  erros: string[];
  pacote: PacoteDemonstracoes;
} {
  const atual = criarBalanceteDeLancamentos(lancamentos, ano);
  const anterior = criarBalanceteDeLancamentos(lancamentos, ano - 1);
  const pacote = construirPacote(entidade, ano, moeda, grandeza, atual, anterior);

  const fecho = validarFechoBalanco(pacote.balanco);
  const rle = validarResultadoLiquido(pacote.resultados, atual.saldoExato("88"));
  const variacaoRealCaixa = atual.somar("41", "42", "43", "44", "45", "48") - anterior.somar("41", "42", "43", "44", "45", "48");
  const fc = validarFluxosCaixa(pacote.fluxosCaixa, variacaoRealCaixa);

  const erros = [...fecho.erros, ...rle.erros, ...fc.erros];

  return {
    valido: erros.length === 0,
    erros,
    pacote,
  };
}
