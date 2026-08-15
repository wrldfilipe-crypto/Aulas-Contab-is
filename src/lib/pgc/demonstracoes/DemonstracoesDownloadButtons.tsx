import React, { useState } from "react";
import { 
  FileText, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Presentation, 
  PieChart, 
  Eye 
} from "lucide-react";
import { useDemonstracoes } from "./useDemonstracoes";
import { DemonstracoesModal } from "./DemonstracoesModal";
import { gerarPptx } from "./geradorPptx";
import { abrirInfograficoHTML } from "./geradorInfografico";

interface DemonstracoesDownloadButtonsProps {
  entidade?: string;
  ano?: number;
  className?: string;
  variant?: "compact" | "full" | "floating";
  onSucesso?: (nomeFicheiro: string) => void;
}

export const DemonstracoesDownloadButtons: React.FC<DemonstracoesDownloadButtonsProps> = ({
  entidade,
  ano,
  className = "",
  variant = "full",
  onSucesso,
}) => {
  const {
    isGenerating,
    formatoAtivo,
    error,
    statusValidacao,
    gerarWord,
    gerarExcel,
  } = useDemonstracoes({
    entidadePadrao: entidade || "Sociedade Comercial, Lda.",
    anoPadrao: ano || new Date().getFullYear(),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);

  const handleWord = async () => {
    try {
      setSuccessMsg(null);
      const res = await gerarWord(ano, entidade);
      setSuccessMsg(`Documento Word (${res.nomeFicheiro}) gerado com sucesso!`);
      if (onSucesso) onSucesso(res.nomeFicheiro);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleExcel = async () => {
    try {
      setSuccessMsg(null);
      const res = await gerarExcel(ano, entidade);
      setSuccessMsg(`Planilha Excel (${res.nomeFicheiro}) gerada com sucesso!`);
      if (onSucesso) onSucesso(res.nomeFicheiro);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handlePptx = async () => {
    try {
      setIsGeneratingPptx(true);
      setSuccessMsg(null);
      await gerarPptx(statusValidacao.pacote);
      setSuccessMsg("Apresentação PowerPoint (.pptx) descarregada com sucesso!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      console.error("Erro ao gerar PPTX:", e);
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  const handleInfografico = () => {
    abrirInfograficoHTML(statusValidacao.pacote);
  };

  const balancoNaoFecha = !statusValidacao.valido;

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Ver e Editar Mapas</span>
        </button>

        <button
          onClick={handleWord}
          disabled={isGenerating}
          title="Criar Documento Word oficial PGC Angola (.docx)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition shadow-xs cursor-pointer"
        >
          {isGenerating && formatoAtivo === "docx" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>Word</span>
        </button>

        <button
          onClick={handleExcel}
          disabled={isGenerating}
          title="Criar Ficheiro Excel oficial PGC Angola (.xlsx)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition shadow-xs cursor-pointer"
        >
          {isGenerating && formatoAtivo === "xlsx" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>Excel</span>
        </button>

        <button
          onClick={handlePptx}
          disabled={isGeneratingPptx}
          title="Criar Apresentação PowerPoint (.pptx)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition shadow-xs cursor-pointer"
        >
          {isGeneratingPptx ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Presentation className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>PPTX</span>
        </button>

        <button
          onClick={handleInfografico}
          title="Abrir Infográfico Visual"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-xs cursor-pointer"
        >
          <PieChart className="w-3.5 h-3.5 text-indigo-600" />
          <span>Infográfico</span>
        </button>

        {isModalOpen && (
          <DemonstracoesModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            entidade={entidade}
            ano={ano}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border border-slate-200 rounded-xl shadow-xs ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              Decreto n.º 82/2001
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Mapas das Demonstrações Financeiras Oficiais (PGC Angola)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gera Balanço Vertical, DR por Natureza, Fluxos de Caixa, Alterações nos Capitais Próprios e Notas às Contas em Word, Excel, PowerPoint ou Infográfico com edição interactiva.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualizar e Editar</span>
          </button>

          <button
            onClick={handleWord}
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
            onClick={handleExcel}
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
            onClick={handlePptx}
            disabled={isGeneratingPptx}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50 transition shadow-xs cursor-pointer"
          >
            {isGeneratingPptx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Presentation className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>PowerPoint</span>
          </button>

          <button
            onClick={handleInfografico}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-xs cursor-pointer"
          >
            <PieChart className="w-3.5 h-3.5 text-indigo-600" />
            <span>Infográfico</span>
          </button>
        </div>
      </div>

      {/* Alerta se o Balanço não fechar */}
      {balancoNaoFecha && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Aviso de Integridade Contábil PGC:</span>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
              {statusValidacao.erros.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Feedback de Erro */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Não foi possível gerar o ficheiro:</span>
            <p className="mt-0.5 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {/* Feedback de Sucesso */}
      {successMsg && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isModalOpen && (
        <DemonstracoesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          entidade={entidade}
          ano={ano}
        />
      )}
    </div>
  );
};
