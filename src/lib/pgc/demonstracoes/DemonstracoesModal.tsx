import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  Scale,
  DollarSign,
  Info,
  Loader2,
  Presentation,
  PieChart,
  RotateCcw,
  Sparkles,
  Edit3,
  Save,
  Check
} from "lucide-react";
import { useDemonstracoes } from "./useDemonstracoes";
import { gerarPptx } from "./geradorPptx";
import { abrirInfograficoHTML } from "./geradorInfografico";
import type { PacoteDemonstracoes, Demonstracao } from "./tipos";

interface DemonstracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  entidade?: string;
  ano?: number;
}

const STORAGE_KEY_OVERRIDES = "ga_pgc_demonstracoes_overrides";

export const DemonstracoesModal: React.FC<DemonstracoesModalProps> = ({
  isOpen,
  onClose,
  entidade: initialEntidade,
  ano: initialAno,
}) => {
  const [activeTab, setActiveTab] = useState<"balanco" | "dr" | "fluxos" | "cp" | "notas">("balanco");

  const {
    isGenerating,
    formatoAtivo,
    error,
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
  } = useDemonstracoes({
    entidadePadrao: initialEntidade || "Sociedade Comercial, Lda.",
    anoPadrao: initialAno || new Date().getFullYear(),
  });

  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { actual?: number; anterior?: number }>>({});
  const [modoEdicao, setModoEdicao] = useState(true);

  // Carregar overrides do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OVERRIDES);
      if (saved) {
        setOverrides(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Erro ao carregar overrides de demonstrações:", e);
    }
  }, []);

  // Guardar overrides no localStorage
  const salvarOverrides = (novos: Record<string, { actual?: number; anterior?: number }>) => {
    setOverrides(novos);
    try {
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(novos));
    } catch (e) {
      console.warn("Erro ao salvar overrides:", e);
    }
  };

  const handleCellChange = (
    mapa: "balanco" | "dr" | "fluxos" | "cp",
    index: number,
    coluna: "actual" | "anterior",
    valorStr: string
  ) => {
    const val = parseFloat(valorStr) || 0;
    const chave = `${mapa}_${index}`;
    const existente = overrides[chave] || {};
    const atualizado = {
      ...overrides,
      [chave]: {
        ...existente,
        [coluna]: val,
      },
    };
    salvarOverrides(atualizado);
  };

  const handleResetOverrides = () => {
    setOverrides({});
    try {
      localStorage.removeItem(STORAGE_KEY_OVERRIDES);
    } catch (_) {}
    setDownloadSuccess("Valores originais repostos com sucesso a partir dos lançamentos contábeis.");
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const pacoteBase = statusValidacao.pacote;

  // Aplicar overrides e recalcular totais dinamicamente
  const pacoteCalculado = useMemo<PacoteDemonstracoes>(() => {
    // Clone profundo
    const p: PacoteDemonstracoes = JSON.parse(JSON.stringify(pacoteBase));

    // 1. Aplicar overrides no Balanço
    let totalANCActual = 0;
    let totalANCAnterior = 0;
    let totalACActual = 0;
    let totalACAnterior = 0;
    let totalCPActual = 0;
    let totalCPAnterior = 0;
    let totalPNCActual = 0;
    let totalPNCAnterior = 0;
    let totalPCActual = 0;
    let totalPCAnterior = 0;

    let secaoAtual: "anc" | "ac" | "cp" | "pnc" | "pc" | null = null;

    p.balanco.linhas.forEach((l, idx) => {
      const chave = `balanco_${idx}`;
      if (overrides[chave]) {
        if (overrides[chave].actual !== undefined) l.actual = overrides[chave].actual!;
        if (overrides[chave].anterior !== undefined) l.anterior = overrides[chave].anterior!;
      }

      if (l.rubrica === "ACTIVO NÃO CORRENTE") { secaoAtual = "anc"; return; }
      if (l.rubrica === "ACTIVO CORRENTE") { secaoAtual = "ac"; return; }
      if (l.rubrica === "CAPITAL PRÓPRIO") { secaoAtual = "cp"; return; }
      if (l.rubrica === "PASSIVO NÃO CORRENTE") { secaoAtual = "pnc"; return; }
      if (l.rubrica === "PASSIVO CORRENTE") { secaoAtual = "pc"; return; }

      if (!l.ehTotal) {
        if (secaoAtual === "anc") { totalANCActual += l.actual; totalANCAnterior += l.anterior; }
        if (secaoAtual === "ac") { totalACActual += l.actual; totalACAnterior += l.anterior; }
        if (secaoAtual === "cp") { totalCPActual += l.actual; totalCPAnterior += l.anterior; }
        if (secaoAtual === "pnc") { totalPNCActual += l.actual; totalPNCAnterior += l.anterior; }
        if (secaoAtual === "pc") { totalPCActual += l.actual; totalPCAnterior += l.anterior; }
      }
    });

    // Atualizar linhas de totais do Balanço
    p.balanco.linhas.forEach((l) => {
      if (l.rubrica === "TOTAL DO ACTIVO NÃO CORRENTE") { l.actual = totalANCActual; l.anterior = totalANCAnterior; }
      if (l.rubrica === "TOTAL DO ACTIVO CORRENTE") { l.actual = totalACActual; l.anterior = totalACAnterior; }
      if (l.rubrica === "TOTAL DO ACTIVO") { l.actual = totalANCActual + totalACActual; l.anterior = totalANCAnterior + totalACAnterior; }
      if (l.rubrica === "TOTAL DO CAPITAL PRÓPRIO") { l.actual = totalCPActual; l.anterior = totalCPAnterior; }
      if (l.rubrica === "TOTAL DO PASSIVO NÃO CORRENTE") { l.actual = totalPNCActual; l.anterior = totalPNCAnterior; }
      if (l.rubrica === "TOTAL DO PASSIVO CORRENTE") { l.actual = totalPCActual; l.anterior = totalPCAnterior; }
      if (l.rubrica === "TOTAL DO PASSIVO") { l.actual = totalPNCActual + totalPCActual; l.anterior = totalPNCAnterior + totalPCAnterior; }
      if (l.rubrica === "TOTAL DO CAPITAL PRÓPRIO E PASSIVO") {
        l.actual = totalCPActual + totalPNCActual + totalPCActual;
        l.anterior = totalCPAnterior + totalPNCAnterior + totalPCAnterior;
      }
    });

    const totalActivo = totalANCActual + totalACActual;
    const totalPassivo = totalPNCActual + totalPCActual;
    const totalCPPassivo = totalCPActual + totalPassivo;
    const difFecho = totalActivo - totalCPPassivo;

    p.balanco.totais = {
      activoNaoCorrente: totalANCActual,
      activoCorrente: totalACActual,
      activo: totalActivo,
      capitalProprio: totalCPActual,
      passivoNaoCorrente: totalPNCActual,
      passivoCorrente: totalPCActual,
      passivo: totalPassivo,
      capitalProprioEPassivo: totalCPPassivo,
      diferencaFecho: difFecho,
    };

    // 2. Aplicar overrides na Demonstração de Resultados
    p.resultados.linhas.forEach((l, idx) => {
      const chave = `dr_${idx}`;
      if (overrides[chave]) {
        if (overrides[chave].actual !== undefined) l.actual = overrides[chave].actual!;
        if (overrides[chave].anterior !== undefined) l.anterior = overrides[chave].anterior!;
      }
    });

    // 3. Aplicar overrides nos Fluxos de Caixa
    p.fluxosCaixa.linhas.forEach((l, idx) => {
      const chave = `fluxos_${idx}`;
      if (overrides[chave]) {
        if (overrides[chave].actual !== undefined) l.actual = overrides[chave].actual!;
        if (overrides[chave].anterior !== undefined) l.anterior = overrides[chave].anterior!;
      }
    });

    // 4. Aplicar overrides nas Alterações de CP
    p.alteracoesCP.linhas.forEach((l, idx) => {
      const chave = `cp_${idx}`;
      if (overrides[chave]) {
        if (overrides[chave].actual !== undefined) l.actual = overrides[chave].actual!;
        if (overrides[chave].anterior !== undefined) l.anterior = overrides[chave].anterior!;
      }
    });

    return p;
  }, [pacoteBase, overrides]);

  if (!isOpen) return null;

  const balanco = pacoteCalculado.balanco;
  const resultados = pacoteCalculado.resultados;
  const fluxos = pacoteCalculado.fluxosCaixa;
  const alteracoesCP = pacoteCalculado.alteracoesCP;
  const notas = pacoteCalculado.notas;

  const diferencaFecho = balanco.totais.diferencaFecho || 0;
  const fechoOk = Math.abs(diferencaFecho) <= 0.05;

  const handleDownloadWord = async () => {
    try {
      setDownloadSuccess(null);
      const res = await gerarWord(ano, entidade, grandeza);
      setDownloadSuccess(`Word (.docx) descarregado com sucesso: ${res.nomeFicheiro}`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadSuccess(null);
      const res = await gerarExcel(ano, entidade, grandeza);
      setDownloadSuccess(`Excel (.xlsx) descarregado com sucesso: ${res.nomeFicheiro}`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDownloadPptx = async () => {
    try {
      setIsGeneratingPptx(true);
      setDownloadSuccess(null);
      await gerarPptx(pacoteCalculado);
      setDownloadSuccess(`Apresentação PowerPoint (.pptx) gerada com sucesso!`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (e: any) {
      console.error("Erro ao gerar PPTX:", e);
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  const handleAbrirInfografico = () => {
    abrirInfograficoHTML(pacoteCalculado);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0A2140] via-[#1B3A6B] to-[#0A2140] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-500/30 border border-blue-400/40 text-blue-200 rounded">
                PGC Angola · Decreto n.º 82/2001
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Demonstrações Financeiras Oficiais</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {entidade} · {pacoteCalculado.periodo} {pacoteCalculado.grandezaTexto}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadWord}
              disabled={isGenerating}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 transition shadow"
              id="btn-modal-download-word"
            >
              {isGenerating && formatoAtivo === "docx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Word (.docx)</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isGenerating}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 transition shadow"
              id="btn-modal-download-excel"
            >
              {isGenerating && formatoAtivo === "xlsx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadPptx}
              disabled={isGeneratingPptx}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg disabled:opacity-50 transition shadow"
              id="btn-modal-download-pptx"
            >
              {isGeneratingPptx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Presentation className="w-3.5 h-3.5" />
              )}
              <span>PowerPoint (.pptx)</span>
            </button>

            <button
              onClick={handleAbrirInfografico}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow"
              id="btn-modal-infografico"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Infográfico</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Controls: Entity, Year, Magnitude, Validation Status, Edit Mode */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={entidade}
                onChange={(e) => setEntidade(e.target.value)}
                placeholder="Nome da Entidade"
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Exercício {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={grandeza}
                onChange={(e) => setGrandeza(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700"
              >
                <option value={1}>Em Unidades (Kz)</option>
                <option value={1000}>Em Milhares de Kz</option>
                <option value={1000000}>Em Milhões de Kz</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-900 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Células amarelas (#FFFDE7) = Editáveis</span>
            </div>

            {Object.keys(overrides).length > 0 && (
              <button
                onClick={handleResetOverrides}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded transition cursor-pointer"
                title="Repor valores calculados diretamente a partir dos lançamentos"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Repor do Razão</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {fechoOk ? (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Balanço Fechado (100% Equilibrado)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-1 rounded-full font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Desvio no Balanço: {diferencaFecho.toLocaleString("pt-PT")} Kz
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 overflow-x-auto">
          {[
            { id: "balanco", label: "1. Balanço", icon: Scale },
            { id: "dr", label: "2. Dem. Resultados", icon: DollarSign },
            { id: "fluxos", label: "3. Fluxos de Caixa", icon: Layers },
            { id: "cp", label: "4. Alt. Capitais Próprios", icon: Building2 },
            { id: "notas", label: "5. Notas às Contas", icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-[#1B3A6B] text-[#1B3A6B] bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {downloadSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}

          {/* TAB 1: BALANÇO */}
          {activeTab === "balanco" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-[#1B3A6B] text-white flex justify-between items-center text-xs font-bold">
                <span>Balanço — Estrutura Vertical Oficial PGC (Decreto n.º 82/2001)</span>
                <span>Valores em {pacoteCalculado.moeda} {pacoteCalculado.grandezaTexto}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Rubrica Oficial</th>
                      <th className="py-2.5 px-3 text-center w-16">Notas</th>
                      <th className="py-2.5 px-3 text-right w-44">Exercício {ano} (Actual)</th>
                      <th className="py-2.5 px-3 text-right w-44">Exercício {ano - 1} (Anterior)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanco.linhas.map((l, i) => {
                      const isMain = l.ehTotal && !l.rubrica.startsWith("TOTAL") && !l.rubrica.startsWith("  ");
                      const isTotal = l.ehTotal || l.rubrica.startsWith("TOTAL");
                      const isGrandTotal = l.rubrica === "TOTAL DO ACTIVO" || l.rubrica === "TOTAL DO CAPITAL PRÓPRIO E PASSIVO";
                      const isEditable = !isTotal && !isMain;

                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            isGrandTotal
                              ? "bg-blue-900 text-white font-black"
                              : isMain
                              ? "bg-slate-100/90 font-bold text-[#0A2140]"
                              : isTotal
                              ? "bg-[#2E5FA3]/10 font-bold text-[#1B3A6B]"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className={`py-2 px-3 ${isTotal ? "font-bold" : ""}`}>{l.rubrica}</td>
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{l.notas || ""}</td>
                          
                          {/* Coluna Exercício Actual */}
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.actual}
                                onChange={(e) => handleCellChange("balanco", i, "actual", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={isTotal ? "font-bold" : ""}>
                                {isMain && l.actual === 0 ? "" : l.actual.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          {/* Coluna Exercício Anterior */}
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.anterior}
                                onChange={(e) => handleCellChange("balanco", i, "anterior", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={isTotal ? "font-bold text-slate-900" : "text-slate-500"}>
                                {isMain && l.anterior === 0 ? "" : l.anterior.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DEMONSTRAÇÃO DE RESULTADOS */}
          {activeTab === "dr" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-[#1B3A6B] text-white flex justify-between items-center text-xs font-bold">
                <span>Demonstração de Resultados por Natureza (Classes 6 e 7)</span>
                <span>Valores em {pacoteCalculado.moeda} {pacoteCalculado.grandezaTexto}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Rubrica Oficial</th>
                      <th className="py-2.5 px-3 text-center w-16">Notas</th>
                      <th className="py-2.5 px-3 text-right w-44">Exercício {ano} (Actual)</th>
                      <th className="py-2.5 px-3 text-right w-44">Exercício {ano - 1} (Anterior)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.linhas.map((l, i) => {
                      const isTotal = l.ehTotal || l.rubrica.startsWith("RESULTADO");
                      const isGrandTotal = l.rubrica === "RESULTADO LÍQUIDO DO EXERCÍCIO";
                      const isEditable = !isTotal;

                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            isGrandTotal
                              ? "bg-emerald-900 text-white font-black"
                              : isTotal
                              ? "bg-emerald-50 font-bold text-emerald-950"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className={`py-2 px-3 ${isTotal ? "font-bold" : ""}`}>{l.rubrica}</td>
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{l.notas || ""}</td>
                          
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.actual}
                                onChange={(e) => handleCellChange("dr", i, "actual", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={isTotal ? "font-bold" : ""}>
                                {l.actual.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.anterior}
                                onChange={(e) => handleCellChange("dr", i, "anterior", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={isTotal ? "font-bold" : "text-slate-500"}>
                                {l.anterior.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FLUXOS DE CAIXA */}
          {activeTab === "fluxos" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-[#1B3A6B] text-white flex justify-between items-center text-xs font-bold">
                <span>Demonstração de Fluxos de Caixa (Método Indirecto)</span>
                <span>Valores em {pacoteCalculado.moeda}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Actividades / Rubricas</th>
                      <th className="py-2.5 px-3 text-center w-16">Notas</th>
                      <th className="py-2.5 px-3 text-right w-44">Exercício {ano}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxos.linhas.map((l, i) => {
                      const isMain = l.ehTotal && !l.rubrica.startsWith("Caixa Líquida") && !l.rubrica.startsWith("AUMENTO");
                      const isTotal = l.ehTotal;
                      const isEditable = !isTotal && !isMain;

                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            isMain
                              ? "bg-slate-100 font-bold text-[#0A2140]"
                              : isTotal
                              ? "bg-blue-50 font-bold text-[#1B3A6B]"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className="py-2 px-3">{l.rubrica}</td>
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{l.notas || ""}</td>
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.actual}
                                onChange={(e) => handleCellChange("fluxos", i, "actual", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className={isTotal ? "font-bold" : ""}>
                                {isMain && l.actual === 0 ? "" : l.actual.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ALTERAÇÕES NOS CAPITAIS PRÓPRIOS */}
          {activeTab === "cp" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-[#1B3A6B] text-white flex justify-between items-center text-xs font-bold">
                <span>Demonstração de Alterações nos Capitais Próprios (Classe 5)</span>
                <span>Valores em {pacoteCalculado.moeda}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Rubrica de Capital Próprio</th>
                      <th className="py-2.5 px-3 text-right w-44">Saldo Final ({ano})</th>
                      <th className="py-2.5 px-3 text-right w-44">Saldo Inicial ({ano - 1})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alteracoesCP.linhas.map((l, i) => {
                      const isEditable = !l.ehTotal;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            l.ehTotal ? "bg-blue-50 font-bold text-[#1B3A6B]" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className="py-2 px-3">{l.rubrica}</td>
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.actual}
                                onChange={(e) => handleCellChange("cp", i, "actual", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span>{l.actual.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</span>
                            )}
                          </td>
                          <td className="py-1 px-3 text-right font-mono">
                            {isEditable ? (
                              <input
                                type="number"
                                step="any"
                                value={l.anterior}
                                onChange={(e) => handleCellChange("cp", i, "anterior", e.target.value)}
                                className="w-full text-right px-2 py-1 bg-[#FFFDE7] hover:bg-amber-100 focus:bg-amber-100 border border-amber-300/80 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            ) : (
                              <span className="text-slate-500">{l.anterior.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: NOTAS ÀS CONTAS */}
          {activeTab === "notas" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  Notas Anexas às Contas (Referência Cruzada com o Balanço e DR)
                </h4>
                <p className="text-xs text-slate-500">
                  Elaboradas em cumprimento do disposto nos capítulos 4.5 e 6 do Decreto n.º 82/2001.
                </p>
              </div>

              <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto pr-2">
                {notas.map((n) => (
                  <div key={n.numero} className="py-2.5 text-xs text-slate-700">
                    <span className="font-bold text-[#1B3A6B] mr-1.5">
                      Nota {n.numero} — {n.titulo}:
                    </span>
                    <span>{n.texto.replace(/^Nota \d+ — [^:]+: /, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Edição interactiva com recálculo em cascata e persistência local</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleAbrirInfografico}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-xs cursor-pointer"
            >
              <PieChart className="w-3.5 h-3.5 text-indigo-600" />
              <span>Infográfico</span>
            </button>

            <button
              onClick={handleDownloadPptx}
              disabled={isGeneratingPptx}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isGeneratingPptx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Presentation className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>PPTX</span>
            </button>

            <button
              onClick={handleDownloadWord}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B3A6B] hover:bg-[#254d8c] rounded-lg disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isGenerating && formatoAtivo === "docx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Word (.docx)</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {isGenerating && formatoAtivo === "xlsx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
