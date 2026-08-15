import { useState, useCallback, useMemo } from "react";
import { gerarEDescarregarDemonstracoes, validarDemonstracoesLocal } from "./api";
import type { PacoteDemonstracoes } from "./tipos";

export interface UseDemonstracoesOptions {
  entidadePadrao?: string;
  anoPadrao?: number;
}

export function useDemonstracoes(options?: UseDemonstracoesOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatoAtivo, setFormatoAtivo] = useState<"docx" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [ultimoPacote, setUltimoPacote] = useState<PacoteDemonstracoes | null>(null);
  const [ano, setAno] = useState<number>(options?.anoPadrao || new Date().getFullYear());
  const [entidade, setEntidade] = useState<string>(options?.entidadePadrao || "Sociedade Comercial, Lda.");
  const [grandeza, setGrandeza] = useState<number>(1);
  const [incluirFuncoes, setIncluirFuncoes] = useState<boolean>(false);

  // Obter lançamentos atuais
  const getLancamentos = useCallback(() => {
    try {
      const saved = localStorage.getItem("ga_erp_accounting_entries");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Erro ao recuperar lançamentos do PGC:", e);
    }
    return [];
  }, []);

  // Validação em tempo real do fecho do Balanço
  const statusValidacao = useMemo(() => {
    const lancamentos = getLancamentos();
    return validarDemonstracoesLocal(lancamentos, ano, entidade, "Kz (AOA)", grandeza);
  }, [getLancamentos, ano, entidade, grandeza]);

  const gerarWord = useCallback(
    async (anoParam?: number, entidadeParam?: string, grandezaParam?: number) => {
      setIsGenerating(true);
      setFormatoAtivo("docx");
      setError(null);
      setErrosValidacao([]);

      const anoAlvo = anoParam || ano;
      const entidadeAlvo = entidadeParam || entidade;
      const grandezaAlvo = grandezaParam || grandeza;
      const lancamentos = getLancamentos();

      try {
        const res = await gerarEDescarregarDemonstracoes({
          entidadeId: "entidade_padrao",
          entidade: entidadeAlvo,
          ano: anoAlvo,
          formato: "docx",
          moeda: "Kz (AOA)",
          grandeza: grandezaAlvo,
          incluirFuncoes,
          lancamentosLocais: lancamentos,
        });

        setUltimoPacote(res.pacote);
        return res;
      } catch (err: any) {
        const msg = err.message || "Erro desconhecido ao gerar documento Word.";
        setError(msg);
        if (msg.includes("Balanço NÃO fecha") || msg.includes("inconsistente")) {
          setErrosValidacao([msg]);
        }
        throw err;
      } finally {
        setIsGenerating(false);
        setFormatoAtivo(null);
      }
    },
    [ano, entidade, grandeza, incluirFuncoes, getLancamentos]
  );

  const gerarExcel = useCallback(
    async (anoParam?: number, entidadeParam?: string, grandezaParam?: number) => {
      setIsGenerating(true);
      setFormatoAtivo("xlsx");
      setError(null);
      setErrosValidacao([]);

      const anoAlvo = anoParam || ano;
      const entidadeAlvo = entidadeParam || entidade;
      const grandezaAlvo = grandezaParam || grandeza;
      const lancamentos = getLancamentos();

      try {
        const res = await gerarEDescarregarDemonstracoes({
          entidadeId: "entidade_padrao",
          entidade: entidadeAlvo,
          ano: anoAlvo,
          formato: "xlsx",
          moeda: "Kz (AOA)",
          grandeza: grandezaAlvo,
          incluirFuncoes,
          lancamentosLocais: lancamentos,
        });

        setUltimoPacote(res.pacote);
        return res;
      } catch (err: any) {
        const msg = err.message || "Erro desconhecido ao gerar planilha Excel.";
        setError(msg);
        if (msg.includes("Balanço NÃO fecha") || msg.includes("inconsistente")) {
          setErrosValidacao([msg]);
        }
        throw err;
      } finally {
        setIsGenerating(false);
        setFormatoAtivo(null);
      }
    },
    [ano, entidade, grandeza, incluirFuncoes, getLancamentos]
  );

  return {
    isGenerating,
    formatoAtivo,
    error,
    errosValidacao,
    ultimoPacote,
    ano,
    setAno,
    entidade,
    setEntidade,
    grandeza,
    setGrandeza,
    incluirFuncoes,
    setIncluirFuncoes,
    statusValidacao,
    gerarWord,
    gerarExcel,
    getLancamentos,
  };
}
