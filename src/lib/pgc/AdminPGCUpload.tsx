import React, { useState } from "react";
import { usePGC } from "./usePGC";

export function AdminPGCUpload() {
  const { ingestar, plano } = usePGC();
  const [aEnviar, setAEnviar] = useState(false);
  const [msg, setMsg] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setMsg("Apenas ficheiros .docx (Plano_Geral_de_Contabilidade.docx).");
      return;
    }
    setAEnviar(true);
    setMsg("");
    try {
      const r = await ingestar(file);
      setMsg(`✅ Base atualizada: ${r.plano.contas.length} contas e ${r.segmentos} segmentos ingeridos do documento oficial.`);
    } catch (erro) {
      console.error("Falha na ingestão:", erro);
      setMsg(`❌ ${(erro as Error).message}`);
    } finally {
      setAEnviar(false);
      e.target.value = "";
    }
  };

  return (
    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-3">
      <h3 className="text-lg font-bold text-emerald-400">Administração — Base PGC Angola</h3>
      <p className="text-sm text-slate-300">
        Norma: <span className="font-semibold text-white">{plano?.diploma ?? "a carregar..."}</span> · <span className="text-emerald-400 font-semibold">{plano?.contas.length ?? 0}</span> contas ativas
      </p>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
          Atualizar com Documento (.docx)
          <input type="file" accept=".docx" onChange={handleFile} disabled={aEnviar} className="hidden" />
        </label>
        {aEnviar && <span className="text-xs text-amber-400 animate-pulse">Ingerindo documento oficial...</span>}
      </div>
      {msg && <p className="text-xs font-mono p-2 rounded bg-slate-800 text-slate-200">{msg}</p>}
    </div>
  );
}
