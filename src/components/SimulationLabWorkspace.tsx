import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  Percent, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  RotateCcw, 
  Save, 
  Download, 
  CheckCircle2, 
  Info, 
  Layers, 
  FileText,
  Zap,
  HelpCircle,
  Clock
} from 'lucide-react';
import { getCurrentUser } from '../lib/db';
import { recordStudentActivity } from '../services/studentProgressService';
import jsPDF from 'jspdf';

type SimulatorType = 'juros_simples' | 'juros_compostos' | 'margem' | 'cambio';

export const SimulationLabWorkspace: React.FC = () => {
  const currentUser = getCurrentUser();
  const userId = currentUser?.userId || 'guest';

  const [activeSimulator, setActiveSimulator] = useState<SimulatorType>('juros_simples');
  const [savedSimulations, setSavedSimulations] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`ga_simulacoes_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Juros Simples State
  const [jsCapital, setJsCapital] = useState<string>('500000');
  const [jsTaxa, setJsTaxa] = useState<string>('12'); // % ao ano
  const [jsTempo, setJsTempo] = useState<string>('2'); // anos
  const [jsResult, setJsResult] = useState<{ juros: number; montante: number } | null>(null);

  // 2. Juros Compostos State
  const [jcCapital, setJcCapital] = useState<string>('1000000');
  const [jcTaxa, setJcTaxa] = useState<string>('15'); // % ao ano
  const [jcTempo, setJcTempo] = useState<string>('3'); // anos
  const [jcResult, setJcResult] = useState<{ montante: number; juros: number; tabela: any[] } | null>(null);

  // 3. Margem de Comercialização State
  const [mgCusto, setMgCusto] = useState<string>('50000');
  const [mgPercent, setMgPercent] = useState<string>('25');
  const [mgTipo, setMgTipo] = useState<'custo' | 'venda'>('custo');
  const [mgResult, setMgResult] = useState<{ precoVenda: number; lucroBruto: number; margemEfetiva: number } | null>(null);

  // 4. Câmbio State
  const [cbValor, setCbValor] = useState<string>('100000');
  const [cbMoedaOrigem, setCbMoedaOrigem] = useState<'AOA' | 'USD' | 'EUR'>('AOA');
  const [cbMoedaDestino, setCbMoedaDestino] = useState<'AOA' | 'USD' | 'EUR'>('USD');
  const [cbTaxaUsd, setCbTaxaUsd] = useState<string>('930'); // 1 USD = 930 AOA
  const [cbTaxaEur, setCbTaxaEur] = useState<string>('1010'); // 1 EUR = 1010 AOA
  const [cbImpostoSelo, setCbImpostoSelo] = useState<boolean>(true); // 0.6%
  const [cbResult, setCbResult] = useState<{ valorConvertido: number; imposto: number; totalFinal: number } | null>(null);

  // --- Handlers for Juros Simples ---
  const handleCalcJurosSimples = () => {
    const c = parseFloat(jsCapital) || 0;
    const i = (parseFloat(jsTaxa) || 0) / 100;
    const n = parseFloat(jsTempo) || 0;
    const j = c * i * n;
    const m = c + j;
    setJsResult({ juros: j, montante: m });
    recordStudentActivity('simulacao_juros_simples', `Capital: ${c} AOA, Juros: ${j} AOA`);
  };

  const handleExemploJurosSimples = () => {
    setJsCapital('1200000');
    setJsTaxa('14');
    setJsTempo('1.5');
    showToast('Exemplo de Financiamento Agrícola carregado!');
  };

  const handleResetJurosSimples = () => {
    setJsCapital('');
    setJsTaxa('');
    setJsTempo('');
    setJsResult(null);
  };

  // --- Handlers for Juros Compostos ---
  const handleCalcJurosCompostos = () => {
    const c = parseFloat(jcCapital) || 0;
    const i = (parseFloat(jcTaxa) || 0) / 100;
    const n = Math.floor(parseFloat(jcTempo) || 0);

    let m = c;
    const tabela = [];
    for (let t = 1; t <= Math.max(1, n); t++) {
      const jurosAno = m * i;
      m += jurosAno;
      tabela.push({ ano: t, capitalInicial: m - jurosAno, jurosGerados: jurosAno, montanteFinal: m });
    }
    const totalJuros = m - c;
    setJcResult({ montante: m, juros: totalJuros, tabela });
    recordStudentActivity('simulacao_juros_compostos', `Montante final: ${m.toFixed(2)} AOA`);
  };

  const handleExemploJurosCompostos = () => {
    setJcCapital('2500000');
    setJcTaxa('18');
    setJcTempo('4');
    showToast('Exemplo de Aplicação em Obrigação do Tesouro (OT) carregado!');
  };

  const handleResetJurosCompostos = () => {
    setJcCapital('');
    setJcTaxa('');
    setJcTempo('');
    setJcResult(null);
  };

  // --- Handlers for Margem de Comercialização ---
  const handleCalcMargem = () => {
    const pc = parseFloat(mgCusto) || 0;
    const p = (parseFloat(mgPercent) || 0) / 100;
    let pv = 0;
    let lucro = 0;

    if (mgTipo === 'custo') {
      pv = pc * (1 + p);
      lucro = pv - pc;
    } else {
      pv = p < 1 ? pc / (1 - p) : pc;
      lucro = pv - pc;
    }

    const margemEfetiva = pv > 0 ? (lucro / pv) * 100 : 0;
    setMgResult({ precoVenda: pv, lucroBruto: lucro, margemEfetiva });
    recordStudentActivity('simulacao_margem', `Preço Venda: ${pv.toFixed(2)} AOA`);
  };

  const handleExemploMargem = () => {
    setMgCusto('18500');
    setMgPercent('30');
    setMgTipo('custo');
    showToast('Exemplo de Venda de Mercadorias (Comércio Geral) carregado!');
  };

  const handleResetMargem = () => {
    setMgCusto('');
    setMgPercent('');
    setMgResult(null);
  };

  // --- Handlers for Câmbio ---
  const handleCalcCambio = () => {
    const val = parseFloat(cbValor) || 0;
    const taxaUsd = parseFloat(cbTaxaUsd) || 930;
    const taxaEur = parseFloat(cbTaxaEur) || 1010;

    let emAoa = val;
    if (cbMoedaOrigem === 'USD') emAoa = val * taxaUsd;
    if (cbMoedaOrigem === 'EUR') emAoa = val * taxaEur;

    let res = emAoa;
    if (cbMoedaDestino === 'USD') res = emAoa / taxaUsd;
    if (cbMoedaDestino === 'EUR') res = emAoa / taxaEur;

    const imposto = cbImpostoSelo ? emAoa * 0.006 : 0;
    const totalFinal = res;

    setCbResult({ valorConvertido: res, imposto, totalFinal });
    recordStudentActivity('simulacao_cambio', `${val} ${cbMoedaOrigem} -> ${res.toFixed(2)} ${cbMoedaDestino}`);
  };

  const handleExemploCambio = () => {
    setCbValor('500000');
    setCbMoedaOrigem('AOA');
    setCbMoedaDestino('USD');
    setCbTaxaUsd('930');
    setCbImpostoSelo(true);
    showToast('Exemplo de Liquidação de Fatura de Importação em USD carregado!');
  };

  const handleResetCambio = () => {
    setCbValor('');
    setCbResult(null);
  };

  // --- Save Simulation Handler ---
  const handleSaveSimulation = (simTitle: string, details: any) => {
    const newSim = {
      id: `sim_${Date.now()}`,
      type: activeSimulator,
      title: simTitle,
      details,
      createdAt: new Date().toISOString()
    };
    const updated = [newSim, ...savedSimulations];
    setSavedSimulations(updated);
    localStorage.setItem(`ga_simulacoes_${userId}`, JSON.stringify(updated));
    showToast('Simulação guardada com sucesso no teu histórico!');
  };

  // --- Export PDF Handler ---
  const handleExportPdf = (simTitle: string, resultDetails: string) => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('GLOBAL ACCOUNT - RELATÓRIO DE SIMULAÇÃO', 14, 22);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipo de Simulação: ${simTitle}`, 14, 32);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-AO')} ${new Date().toLocaleTimeString('pt-AO')}`, 14, 40);

      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);

      doc.setFontSize(11);
      const lines = doc.splitTextToSize(resultDetails, 180);
      doc.text(lines, 14, 55);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Documento gerado automaticamente pelo Laboratório de Simulação Financeira da Global Account.', 14, 280);

      doc.save(`simulacao_${activeSimulator}_${Date.now()}.pdf`);
      showToast('PDF do resultado gerado e descarregado!');
    } catch (e) {
      console.error('Error generating PDF:', e);
      showToast('Erro ao exportar PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Laboratório de Simulação Financeira & Contabilística
              </h1>
              <p className="text-xs text-slate-300">
                Calculadoras interativas de Juros, Margens e Câmbio para validação de cenários reais em Angola.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-full flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>100% Funcional & Persistente</span>
          </span>
        </div>

        {/* Simulator Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <button
            onClick={() => setActiveSimulator('juros_simples')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              activeSimulator === 'juros_simples'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Juros Simples</span>
          </button>

          <button
            onClick={() => setActiveSimulator('juros_compostos')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              activeSimulator === 'juros_compostos'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Juros Compostos</span>
          </button>

          <button
            onClick={() => setActiveSimulator('margem')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              activeSimulator === 'margem'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Margem de Comercialização</span>
          </button>

          <button
            onClick={() => setActiveSimulator('cambio')}
            className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              activeSimulator === 'cambio'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Câmbio & Imposto de Selo</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SIMULATOR CONTENT */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">

        {/* 1. JUROS SIMPLES */}
        {activeSimulator === 'juros_simples' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-indigo-600" />
                  <span>Calculadora de Juros Simples</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Fórmula: J = C × i × n &nbsp;|&nbsp; M = C + J
                </p>
              </div>

              <button
                onClick={handleExemploJurosSimples}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-indigo-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Usar caso prático de exemplo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Capital Inicial (C) em AOA:
                </label>
                <input
                  type="number"
                  value={jsCapital}
                  onChange={e => setJsCapital(e.target.value)}
                  placeholder="Ex: 500000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Taxa de Juro Anual (i) em %:
                </label>
                <input
                  type="number"
                  value={jsTaxa}
                  onChange={e => setJsTaxa(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Período / Tempo (n) em Anos:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={jsTempo}
                  onChange={e => setJsTempo(e.target.value)}
                  placeholder="Ex: 2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={handleCalcJurosSimples}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>Calcular Agora</span>
              </button>

              <button
                onClick={handleResetJurosSimples}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar e recomeçar</span>
              </button>
            </div>

            {/* Results Output */}
            {jsResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-emerald-950">
                      Resultado do Cálculo de Juros Simples
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSimulation('Juros Simples', jsResult)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>

                    <button
                      onClick={() => handleExportPdf('Juros Simples', `Capital: ${jsCapital} AOA\nTaxa: ${jsTaxa}%\nTempo: ${jsTempo} anos\nJuros Gerados: ${jsResult.juros.toFixed(2)} AOA\nMontante Total: ${jsResult.montante.toFixed(2)} AOA`)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Juros Totais Gerados (J):</span>
                    <div className="text-xl font-black text-emerald-600 mt-1">
                      {jsResult.juros.toLocaleString('pt-AO')} AOA
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Montante Total Acumulado (M):</span>
                    <div className="text-xl font-black text-indigo-600 mt-1">
                      {jsResult.montante.toLocaleString('pt-AO')} AOA
                    </div>
                  </div>
                </div>

                {/* Didactic Step Breakdown */}
                <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 font-mono text-xs text-slate-800 space-y-1">
                  <div className="font-sans font-bold text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                    Passo a Passo da Fórmula:
                  </div>
                  <div>1. Juros (J) = {jsCapital} × ({jsTaxa} / 100) × {jsTempo} = {jsResult.juros.toLocaleString('pt-AO')} AOA</div>
                  <div>2. Montante (M) = {jsCapital} + {jsResult.juros.toLocaleString('pt-AO')} = {jsResult.montante.toLocaleString('pt-AO')} AOA</div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 2. JUROS COMPOSTOS */}
        {activeSimulator === 'juros_compostos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Calculadora de Juros Compostos (Capitalização)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Fórmula: M = C × (1 + i)^n &nbsp;|&nbsp; Juros sobre Juros
                </p>
              </div>

              <button
                onClick={handleExemploJurosCompostos}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-indigo-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Usar caso prático de exemplo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Capital Inicial (C) em AOA:
                </label>
                <input
                  type="number"
                  value={jcCapital}
                  onChange={e => setJcCapital(e.target.value)}
                  placeholder="Ex: 1000000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Taxa Anual (i) em %:
                </label>
                <input
                  type="number"
                  value={jcTaxa}
                  onChange={e => setJcTaxa(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Período (n) em Anos:
                </label>
                <input
                  type="number"
                  value={jcTempo}
                  onChange={e => setJcTempo(e.target.value)}
                  placeholder="Ex: 3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={handleCalcJurosCompostos}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>Calcular Agora</span>
              </button>

              <button
                onClick={handleResetJurosCompostos}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar e recomeçar</span>
              </button>
            </div>

            {jcResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-indigo-950">
                      Evolução do Montante Composto
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSimulation('Juros Compostos', jcResult)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>

                    <button
                      onClick={() => handleExportPdf('Juros Compostos', `Capital: ${jcCapital} AOA\nTaxa: ${jcTaxa}%\nAnos: ${jcTempo}\nMontante Final: ${jcResult.montante.toFixed(2)} AOA\nJuros Totais: ${jcResult.juros.toFixed(2)} AOA`)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Montante Final (M):</span>
                    <div className="text-xl font-black text-indigo-600 mt-1">
                      {jcResult.montante.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Juros Acumulados (J):</span>
                    <div className="text-xl font-black text-emerald-600 mt-1">
                      {jcResult.juros.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA
                    </div>
                  </div>
                </div>

                {/* Yearly evolution table */}
                <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 font-extrabold">Ano</th>
                        <th className="p-2.5 font-extrabold">Capital Inicial</th>
                        <th className="p-2.5 font-extrabold">Juros Gerados</th>
                        <th className="p-2.5 font-extrabold">Montante Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {jcResult.tabela.map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30">
                          <td className="p-2.5 font-bold">Ano {row.ano}</td>
                          <td className="p-2.5">{row.capitalInicial.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA</td>
                          <td className="p-2.5 font-bold text-emerald-600">+{row.jurosGerados.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA</td>
                          <td className="p-2.5 font-black text-indigo-900">{row.montanteFinal.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 3. MARGEM DE COMERCIALIZAÇÃO */}
        {activeSimulator === 'margem' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>Calculadora de Margem de Lucro & Preço de Venda</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Cálculo de Preço de Venda (PV) baseado em Margem sobre Custo ou Preço de Venda.
                </p>
              </div>

              <button
                onClick={handleExemploMargem}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-indigo-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Usar caso prático de exemplo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Preço de Custo (PC) em AOA:
                </label>
                <input
                  type="number"
                  value={mgCusto}
                  onChange={e => setMgCusto(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Base de Incidência da Margem:
                </label>
                <select
                  value={mgTipo}
                  onChange={e => setMgTipo(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="custo">Margem sobre Preço de Custo (Markup)</option>
                  <option value="venda">Margem sobre Preço de Venda</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Percentagem de Margem (%):
                </label>
                <input
                  type="number"
                  value={mgPercent}
                  onChange={e => setMgPercent(e.target.value)}
                  placeholder="Ex: 25"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={handleCalcMargem}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>Calcular Preço de Venda</span>
              </button>

              <button
                onClick={handleResetMargem}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar e recomeçar</span>
              </button>
            </div>

            {mgResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <h3 className="text-sm font-black text-teal-950">
                      Preço de Venda Recomendado
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSimulation('Margem Comercial', mgResult)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>

                    <button
                      onClick={() => handleExportPdf('Margem Comercial', `Custo: ${mgCusto} AOA\nPreço Venda: ${mgResult.precoVenda.toFixed(2)} AOA\nLucro Bruto: ${mgResult.lucroBruto.toFixed(2)} AOA\nMargem Efetiva: ${mgResult.margemEfetiva.toFixed(2)}%`)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-teal-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Preço de Venda (PV):</span>
                    <div className="text-xl font-black text-indigo-600 mt-1">
                      {mgResult.precoVenda.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-teal-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Lucro Bruto Unitário:</span>
                    <div className="text-xl font-black text-emerald-600 mt-1">
                      {mgResult.lucroBruto.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-teal-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Margem Efetiva sobre Venda:</span>
                    <div className="text-xl font-black text-teal-700 mt-1">
                      {mgResult.margemEfetiva.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* 4. CÂMBIO E IMPOSTO DE SELO */}
        {activeSimulator === 'cambio' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  <span>Simulador de Câmbio & Imposto de Selo (BNA/AGT)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Conversão AOA ↔ USD / EUR com incidência opcional de 0,6% de Imposto de Selo.
                </p>
              </div>

              <button
                onClick={handleExemploCambio}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-indigo-200 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Usar caso prático de exemplo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Valor a Converter:
                </label>
                <input
                  type="number"
                  value={cbValor}
                  onChange={e => setCbValor(e.target.value)}
                  placeholder="Ex: 100000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Moeda Origem:
                </label>
                <select
                  value={cbMoedaOrigem}
                  onChange={e => setCbMoedaOrigem(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="AOA">AOA (Kwanza)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Moeda Destino:
                </label>
                <select
                  value={cbMoedaDestino}
                  onChange={e => setCbMoedaDestino(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="USD">USD (Dólar)</option>
                  <option value="AOA">AOA (Kwanza)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Taxa Câmbio USD/AOA:
                </label>
                <input
                  type="number"
                  value={cbTaxaUsd}
                  onChange={e => setCbTaxaUsd(e.target.value)}
                  placeholder="Ex: 930"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cbImpostoSelo}
                  onChange={e => setCbImpostoSelo(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Incluir Imposto de Selo de 0,6% sobre a operação de compra de divisas</span>
              </label>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={handleCalcCambio}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calculator className="w-4 h-4" />
                <span>Simular Câmbio</span>
              </button>

              <button
                onClick={handleResetCambio}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar e recomeçar</span>
              </button>
            </div>

            {cbResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-black text-amber-950">
                      Resultado da Conversão Cambial
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSimulation('Operação Cambial', cbResult)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>

                    <button
                      onClick={() => handleExportPdf('Operação Cambial', `Valor Origem: ${cbValor} ${cbMoedaOrigem}\nValor Convertido: ${cbResult.valorConvertido.toFixed(2)} ${cbMoedaDestino}\nImposto de Selo: ${cbResult.imposto.toFixed(2)} AOA`)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-amber-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Valor Convertido em {cbMoedaDestino}:</span>
                    <div className="text-2xl font-black text-indigo-600 mt-1">
                      {cbResult.valorConvertido.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} {cbMoedaDestino}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-amber-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Imposto de Selo (0,6%):</span>
                    <div className="text-xl font-black text-amber-700 mt-1">
                      {cbResult.imposto.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} AOA
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

      </div>

      {/* HISTÓRICO DE SIMULAÇÕES GUARDADAS */}
      {savedSimulations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Histórico de Simulações Guardadas ({savedSimulations.length})</span>
            </h3>

            <button
              onClick={() => {
                setSavedSimulations([]);
                localStorage.removeItem(`ga_simulacoes_${userId}`);
                showToast('Histórico de simulações limpo!');
              }}
              className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
            >
              Limpar Histórico
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedSimulations.map((sim, idx) => (
              <div key={sim.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                    {sim.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(sim.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Simulação #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
