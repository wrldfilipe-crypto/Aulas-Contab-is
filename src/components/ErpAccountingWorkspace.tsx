import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Scale, 
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { getCurrentUser, getActiveWorkspace } from '../lib/db';
import { exportTransactionsReportPDF, exportCurrentAccountPDF } from '../services/pdfExportService';
import { DemonstracoesModal } from '../lib/pgc/demonstracoes/DemonstracoesModal';

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  documentRef: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'Reconciliado' | 'Pendente';
}

interface ErpAccountingWorkspaceProps {
  onNavigateTab?: (tab: string) => void;
}

export const ErpAccountingWorkspace: React.FC<ErpAccountingWorkspaceProps> = ({ onNavigateTab }) => {
  const activeWorkspace = getActiveWorkspace();
  const currency = activeWorkspace?.currency || 'AOA';

  // State for Journal Entries
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ga_erp_accounting_entries');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Error parsing journal entries:", e);
    }
    return [
      {
        id: 'je_1',
        number: 'LAN 2026/001',
        date: '2026-08-01',
        description: 'Venda de Serviços de Consultoria segundo FT 2026/001',
        documentRef: 'FT 2026/001',
        lines: [
          { id: 'jl_1', accountCode: '31.1.1', accountName: 'Clientes c/ Correntes', debit: 2850000, credit: 0 },
          { id: 'jl_2', accountCode: '61.1.1', accountName: 'Vendas de Serviços', debit: 0, credit: 2500000 },
          { id: 'jl_3', accountCode: '34.5.2', accountName: 'IVA Liquidável', debit: 0, credit: 350000 }
        ],
        totalDebit: 2850000,
        totalCredit: 2850000,
        status: 'Reconciliado'
      },
      {
        id: 'je_2',
        number: 'LAN 2026/002',
        date: '2026-08-02',
        description: 'Pagamento de Renda do Escritório de Luanda',
        documentRef: 'REC 9832',
        lines: [
          { id: 'jl_4', accountCode: '75.2.1', accountName: 'Rendas e Alugueres', debit: 600000, credit: 0 },
          { id: 'jl_5', accountCode: '43.1.1', accountName: 'Depósitos à Ordem BFA', debit: 0, credit: 600000 }
        ],
        totalDebit: 600000,
        totalCredit: 600000,
        status: 'Reconciliado'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ga_erp_accounting_entries', JSON.stringify(entries));
    } catch (e) {
      console.warn("Error saving journal entries:", e);
    }
  }, [entries]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemonstracoesOpen, setIsDemonstracoesOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentRef, setFormDocumentRef] = useState('');
  const [formLines, setFormLines] = useState<JournalLine[]>([
    { id: 'l1', accountCode: '31.1.1', accountName: 'Clientes c/ Correntes', debit: 0, credit: 0 },
    { id: 'l2', accountCode: '61.1.1', accountName: 'Vendas de Serviços', debit: 0, credit: 0 }
  ]);

  const formTotalDebit = useMemo(() => formLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0), [formLines]);
  const formTotalCredit = useMemo(() => formLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0), [formLines]);
  const isBalanced = formTotalDebit > 0 && formTotalDebit === formTotalCredit;

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(je => 
      je.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      je.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      je.documentRef.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, searchTerm]);

  // Handlers
  const handleOpenNew = () => {
    setEditingEntry(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormDocumentRef('');
    setFormLines([
      { id: 'l1', accountCode: '31.1.1', accountName: 'Clientes c/ Correntes', debit: 0, credit: 0 },
      { id: 'l2', accountCode: '61.1.1', accountName: 'Vendas de Serviços', debit: 0, credit: 0 }
    ]);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (je: JournalEntry) => {
    setEditingEntry(je);
    setFormDate(je.date);
    setFormDescription(je.description);
    setFormDocumentRef(je.documentRef);
    setFormLines(je.lines);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    setFormLines(prev => [
      ...prev,
      { id: `l_${Date.now()}`, accountCode: '75.2.2', accountName: 'Outros Custos / Serviços', debit: 0, credit: 0 }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (formLines.length <= 2) return;
    setFormLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof JournalLine, value: any) => {
    setFormLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription) {
      setValidationError('Insira a descrição do lançamento.');
      return;
    }

    if (formTotalDebit <= 0) {
      setValidationError('O valor total dos lançamentos deve ser superior a zero.');
      return;
    }

    if (formTotalDebit !== formTotalCredit) {
      setValidationError(`O lançamento está desequilibrado! Total Débito (${formTotalDebit.toLocaleString()}) ≠ Total Crédito (${formTotalCredit.toLocaleString()}).`);
      return;
    }

    if (editingEntry) {
      // Update
      setEntries(prev => prev.map(je => {
        if (je.id === editingEntry.id) {
          return {
            ...je,
            date: formDate,
            description: formDescription,
            documentRef: formDocumentRef,
            lines: formLines,
            totalDebit: formTotalDebit,
            totalCredit: formTotalCredit
          };
        }
        return je;
      }));
    } else {
      // Create
      const newJE: JournalEntry = {
        id: `je_${Date.now()}`,
        number: `LAN 2026/00${entries.length + 1}`,
        date: formDate,
        description: formDescription,
        documentRef: formDocumentRef || 'Geral',
        lines: formLines,
        totalDebit: formTotalDebit,
        totalCredit: formTotalCredit,
        status: 'Reconciliado'
      };
      setEntries(prev => [newJE, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(je => je.id !== id));
    setDeleteConfirmId(null);
  };

  const handleExportBalancete = () => {
    // Generate Trial Balance (Balancete de Verificação)
    const accountMap: Record<string, { code: string; name: string; debit: number; credit: number }> = {};

    entries.forEach(je => {
      je.lines.forEach(line => {
        if (!accountMap[line.accountCode]) {
          accountMap[line.accountCode] = {
            code: line.accountCode,
            name: line.accountName,
            debit: 0,
            credit: 0
          };
        }
        accountMap[line.accountCode].debit += Number(line.debit) || 0;
        accountMap[line.accountCode].credit += Number(line.credit) || 0;
      });
    });

    const headers = ['Código Conta', 'Nome da Conta PGC', 'Total Débito', 'Total Crédito', 'Saldo Devedor', 'Saldo Credor'];
    const rows = Object.values(accountMap).map(acc => {
      const saldoDevedor = acc.debit > acc.credit ? acc.debit - acc.credit : 0;
      const saldoCredor = acc.credit > acc.debit ? acc.credit - acc.debit : 0;
      return [
        acc.code,
        acc.name,
        `${acc.debit} ${currency}`,
        `${acc.credit} ${currency}`,
        `${saldoDevedor} ${currency}`,
        `${saldoCredor} ${currency}`
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Balancete_de_Verificacao_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" id="erp-accounting-workspace">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Calculator className="w-4 h-4" />
            <span>Módulo de Contabilidade / Diário e Razão</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Diário & Lançamentos Contabilísticos</h1>
          <p className="text-xs text-slate-300 mt-1">Conformidade PGC Angola e IFRS com validação automática de partidas dobradas.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setIsDemonstracoesOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl border border-blue-400/40 shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            title="Gerar Mapas Oficiais das Demonstrações Financeiras PGC Angola (Decreto n.º 82/2001) em Word e Excel"
          >
            <Scale className="w-4 h-4 text-blue-200" />
            <span>Mapas PGC Angola (Word/Excel)</span>
          </button>
          <button
            onClick={() => {
              const formattedTx = entries.flatMap(je => je.lines.map(l => ({
                id: je.id,
                date: je.date,
                documentRef: je.documentRef || je.number,
                description: `${je.description} (${l.accountCode} - ${l.accountName})`,
                debit: l.debit,
                credit: l.credit
              })));
              exportTransactionsReportPDF(formattedTx, 'Relatório Geral de Transações e Lançamentos do Razão');
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            title="Exportar Extrato e Lançamentos em PDF"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Exportar Extrato (PDF)</span>
          </button>
          <button
            onClick={handleExportBalancete}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Balancete (Excel/CSV)</span>
          </button>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Pesquisar por descrição, doc ou nº lançamento..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-xs text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>Total de Lançamentos Registados: {entries.length}</span>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Nenhum lançamento contabilístico registado.
          </div>
        ) : (
          filteredEntries.map(je => (
            <div key={je.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-indigo-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-900 font-black rounded-xl text-xs">
                    {je.number}
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">{je.description}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ref: {je.documentRef}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium mr-2">{je.date}</span>
                  <button
                    onClick={() => handleOpenEdit(je)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                    title="Editar Lançamento"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(je.id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="Eliminar Lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Journal Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-gray-100">
                    <tr>
                      <th className="pb-2">Conta PGC</th>
                      <th className="pb-2">Nome da Conta</th>
                      <th className="pb-2 text-right">Débito ({currency})</th>
                      <th className="pb-2 text-right">Crédito ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {je.lines.map(l => (
                      <tr key={l.id}>
                        <td className="py-2 font-mono font-bold text-indigo-900">{l.accountCode}</td>
                        <td className="py-2 font-medium text-slate-700">{l.accountName}</td>
                        <td className="py-2 text-right font-bold text-slate-900">{l.debit > 0 ? l.debit.toLocaleString() : '-'}</td>
                        <td className="py-2 text-right font-bold text-slate-900">{l.credit > 0 ? l.credit.toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 font-black text-slate-900">
                    <tr>
                      <td colSpan={2} className="pt-2">Total do Lançamento:</td>
                      <td className="pt-2 text-right text-emerald-600">{je.totalDebit.toLocaleString()} {currency}</td>
                      <td className="pt-2 text-right text-emerald-600">{je.totalCredit.toLocaleString()} {currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: NOVO / EDITAR LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>{editingEntry ? 'Editar Lançamento Contabilístico' : 'Novo Lançamento em Diário'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-6 space-y-4 overflow-y-auto flex-1">
              {validationError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Data *</label>
                  <input 
                    type="date" 
                    required 
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Descrição do Lançamento *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Prestação de Serviços de Auditoria" 
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ref. Documento (Fatura / Recibo)</label>
                <input 
                  type="text" 
                  placeholder="Ex: FT 2026/005" 
                  value={formDocumentRef}
                  onChange={e => setFormDocumentRef(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Dynamic Lines Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Linhas de Partidas Dobradas</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Linha</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formLines.map((line, index) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                      <div className="col-span-3">
                        <input 
                          type="text" 
                          placeholder="Código Conta (Ex: 31.1)" 
                          value={line.accountCode}
                          onChange={e => handleUpdateLine(line.id, 'accountCode', e.target.value)}
                          className="w-full bg-white border border-gray-200 text-xs p-2 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-4">
                        <input 
                          type="text" 
                          placeholder="Nome da Conta" 
                          value={line.accountName}
                          onChange={e => handleUpdateLine(line.id, 'accountName', e.target.value)}
                          className="w-full bg-white border border-gray-200 text-xs p-2 rounded-lg font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          placeholder="Débito" 
                          value={line.debit || ''}
                          onChange={e => handleUpdateLine(line.id, 'debit', Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 text-xs p-2 rounded-lg text-right font-bold text-emerald-700"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          placeholder="Crédito" 
                          value={line.credit || ''}
                          onChange={e => handleUpdateLine(line.id, 'credit', Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 text-xs p-2 rounded-lg text-right font-bold text-indigo-700"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Balance Status Indicator */}
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  isBalanced ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {isBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Scale className="w-4 h-4 text-amber-600" />}
                    <span>{isBalanced ? 'Lançamento Equilibrado (Partidas Dobradas Válidas)' : 'Diferença entre Débito e Crédito'}</span>
                  </div>
                  <div>
                    Débito: {formTotalDebit.toLocaleString()} | Crédito: {formTotalCredit.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Guardar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Eliminar este lançamento?</h3>
            <p className="text-xs text-slate-600">Esta ação removerá permanentemente as linhas do Diário Geral.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEMONSTRAÇÕES FINANCEIRAS OFICIAIS PGC ANGOLA */}
      <DemonstracoesModal
        isOpen={isDemonstracoesOpen}
        onClose={() => setIsDemonstracoesOpen(false)}
        entidade={activeWorkspace?.name || "Sociedade Angolana, Lda."}
        ano={2026}
      />

    </div>
  );
};

export default ErpAccountingWorkspace;

