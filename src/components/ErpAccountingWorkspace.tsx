import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Check,
  Calendar,
  Eye,
  FileText,
  Clock,
  RotateCcw,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentUser, getActiveWorkspace } from '../lib/db';
import { exportTransactionsReportPDF, exportCurrentAccountPDF, exportSingleTransactionVoucherPDF } from '../services/pdfExportService';
import { exportTransactionsToExcel } from '../services/excelExportService';
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

// Trigger celebratory canvas-confetti burst when reconciling
export const triggerReconciliationConfetti = (e?: React.MouseEvent | { clientX: number; clientY: number }) => {
  try {
    let origin = { x: 0.5, y: 0.6 };
    if (e && 'clientX' in e && e.clientX && e.clientY && window.innerWidth > 0 && window.innerHeight > 0) {
      origin = {
        x: Math.max(0.1, Math.min(0.9, e.clientX / window.innerWidth)),
        y: Math.max(0.1, Math.min(0.9, e.clientY / window.innerHeight))
      };
    }
    
    confetti({
      particleCount: 65,
      spread: 70,
      origin,
      colors: ['#10B981', '#059669', '#6366F1', '#4F46E5', '#F59E0B', '#3B82F6', '#EC4899'],
      ticks: 220,
      gravity: 1.1,
      scalar: 1.1,
      shapes: ['circle', 'square'],
      disableForReducedMotion: true
    });
  } catch (err) {
    console.debug('Confetti effect ignored:', err);
  }
};

export const ErpAccountingWorkspace: React.FC<ErpAccountingWorkspaceProps> = ({ onNavigateTab }) => {
  const activeWorkspace = getActiveWorkspace();
  const currency = activeWorkspace?.currency || 'AOA';

  // Sub-view Tab State: 'journal' (Lançamentos) or 'balancete' (Balancete de Verificação)
  const [activeSubTab, setActiveSubTab] = useState<'journal' | 'balancete'>('journal');

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
        status: 'Pendente'
      },
      {
        id: 'je_3',
        number: 'LAN 2026/003',
        date: '2026-08-10',
        description: 'Aquisição de Material de Escritório e Consumíveis',
        documentRef: 'FT 88392',
        lines: [
          { id: 'jl_6', accountCode: '75.2.3', accountName: 'Material de Consumo', debit: 180000, credit: 0 },
          { id: 'jl_7', accountCode: '43.1.1', accountName: 'Depósitos à Ordem BFA', debit: 0, credit: 180000 }
        ],
        totalDebit: 180000,
        totalCredit: 180000,
        status: 'Pendente'
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

  // Search & Date Range Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'week' | 'month' | 'last30' | 'quarter' | 'year'>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Reconciliado' | 'Pendente'>('ALL');

  // Balancete specific account search filter
  const [balanceteSearch, setBalanceteSearch] = useState('');

  // Selected Transaction for Details Card & Quick PDF
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemonstracoesOpen, setIsDemonstracoesOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [reconciliationToast, setReconciliationToast] = useState<string | null>(null);
  const [lastAddedEntryId, setLastAddedEntryId] = useState<string | null>(null);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Form Fields
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentRef, setFormDocumentRef] = useState('');
  const [formStatus, setFormStatus] = useState<'Reconciliado' | 'Pendente'>('Reconciliado');
  const [formLines, setFormLines] = useState<JournalLine[]>([
    { id: 'l1', accountCode: '31.1.1', accountName: 'Clientes c/ Correntes', debit: 0, credit: 0 },
    { id: 'l2', accountCode: '61.1.1', accountName: 'Vendas de Serviços', debit: 0, credit: 0 }
  ]);

  const formTotalDebit = useMemo(() => formLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0), [formLines]);
  const formTotalCredit = useMemo(() => formLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0), [formLines]);
  const isBalanced = formTotalDebit > 0 && formTotalDebit === formTotalCredit;

  // Filtered entries by search term, date range, and status
  const filteredEntries = useMemo(() => {
    return entries.filter(je => {
      // 1. Text Search
      const matchesSearch = !searchTerm || (
        je.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        je.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        je.documentRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        je.lines.some(l => l.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) || l.accountName.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // 2. Date Range Filter
      let matchesDate = true;
      if (startDate && je.date < startDate) matchesDate = false;
      if (endDate && je.date > endDate) matchesDate = false;

      // 3. Status Filter
      const matchesStatus = statusFilter === 'ALL' || je.status === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [entries, searchTerm, startDate, endDate, statusFilter]);

  // Reconciliation summary
  const pendingCount = useMemo(() => entries.filter(e => e.status === 'Pendente').length, [entries]);
  const reconciledCount = useMemo(() => entries.filter(e => e.status === 'Reconciliado').length, [entries]);

  // Dynamic Debit vs. Credit Summary Widget (Auto-calculated from datepicker interval & filtered entries)
  const periodSummary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let debitLinesCount = 0;
    let creditLinesCount = 0;

    filteredEntries.forEach(je => {
      totalDebit += Number(je.totalDebit) || 0;
      totalCredit += Number(je.totalCredit) || 0;
      je.lines?.forEach(line => {
        if (Number(line.debit) > 0) debitLinesCount++;
        if (Number(line.credit) > 0) creditLinesCount++;
      });
    });

    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;
    const combinedTotal = totalDebit + totalCredit;
    const debitRatio = combinedTotal > 0 ? (totalDebit / combinedTotal) * 100 : 50;
    const creditRatio = combinedTotal > 0 ? (totalCredit / combinedTotal) * 100 : 50;

    let periodLabel = 'Todo o histórico contabilístico';
    if (startDate && endDate) {
      periodLabel = `${startDate} até ${endDate}`;
    } else if (startDate) {
      periodLabel = `A partir de ${startDate}`;
    } else if (endDate) {
      periodLabel = `Até ${endDate}`;
    }

    return {
      totalDebit,
      totalCredit,
      debitLinesCount,
      creditLinesCount,
      diff,
      isBalanced,
      debitRatio,
      creditRatio,
      periodLabel,
      entriesCount: filteredEntries.length
    };
  }, [filteredEntries, startDate, endDate]);

  // Dynamic Trial Balance (Balancete de Verificação) derived strictly from filtered entries
  const trialBalanceData = useMemo(() => {
    const accountMap: Record<string, { code: string; name: string; debit: number; credit: number }> = {};

    filteredEntries.forEach(je => {
      je.lines.forEach(line => {
        const code = line.accountCode.trim();
        if (!code) return;
        if (!accountMap[code]) {
          accountMap[code] = {
            code,
            name: line.accountName || 'Conta PGC',
            debit: 0,
            credit: 0
          };
        }
        accountMap[code].debit += Number(line.debit) || 0;
        accountMap[code].credit += Number(line.credit) || 0;
      });
    });

    const accounts = Object.values(accountMap).map(acc => {
      const saldoDevedor = acc.debit > acc.credit ? acc.debit - acc.credit : 0;
      const saldoCredor = acc.credit > acc.debit ? acc.credit - acc.debit : 0;
      
      // Determine PGC Class
      const firstDigit = acc.code.charAt(0);
      let className = 'Outros';
      if (firstDigit === '1') className = 'Classe 1 - Meios Fixos';
      else if (firstDigit === '2') className = 'Classe 2 - Existências';
      else if (firstDigit === '3') className = 'Classe 3 - Terceiros';
      else if (firstDigit === '4') className = 'Classe 4 - Meios Monetários';
      else if (firstDigit === '5') className = 'Classe 5 - Capital Próprio';
      else if (firstDigit === '6') className = 'Classe 6 - Proveitos / Rendimentos';
      else if (firstDigit === '7') className = 'Classe 7 - Custos / Gastos';
      else if (firstDigit === '8') className = 'Classe 8 - Resultados';

      return {
        ...acc,
        saldoDevedor,
        saldoCredor,
        className
      };
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0);
    const totalSaldoDevedor = accounts.reduce((sum, a) => sum + a.saldoDevedor, 0);
    const totalSaldoCredor = accounts.reduce((sum, a) => sum + a.saldoCredor, 0);
    const isTrialBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && Math.abs(totalSaldoDevedor - totalSaldoCredor) < 0.01;

    return {
      accounts,
      totalDebit,
      totalCredit,
      totalSaldoDevedor,
      totalSaldoCredor,
      isTrialBalanced
    };
  }, [filteredEntries]);

  // Filtered trial balance accounts by search query
  const filteredTrialBalanceAccounts = useMemo(() => {
    if (!balanceteSearch) return trialBalanceData.accounts;
    const q = balanceteSearch.toLowerCase();
    return trialBalanceData.accounts.filter(a => 
      a.code.toLowerCase().includes(q) || 
      a.name.toLowerCase().includes(q) ||
      a.className.toLowerCase().includes(q)
    );
  }, [trialBalanceData.accounts, balanceteSearch]);

  // Handlers
  const handleOpenNew = () => {
    setEditingEntry(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormDocumentRef('');
    setFormStatus('Reconciliado');
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
    setFormStatus(je.status || 'Reconciliado');
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

  // Reconciliation toggle with satisfying canvas-confetti feedback
  const handleToggleReconciled = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    let becameReconciled = false;
    setEntries(prev => prev.map(je => {
      if (je.id === id) {
        const nextStatus = je.status === 'Reconciliado' ? 'Pendente' : 'Reconciliado';
        if (nextStatus === 'Reconciliado') {
          becameReconciled = true;
        }
        const updated = { ...je, status: nextStatus as 'Reconciliado' | 'Pendente' };
        if (selectedEntry && selectedEntry.id === id) {
          setSelectedEntry(updated);
        }
        return updated;
      }
      return je;
    }));

    if (becameReconciled) {
      triggerReconciliationConfetti(e);
      setReconciliationToast(`Lançamento reconciliado com sucesso!`);
      setTimeout(() => setReconciliationToast(null), 3000);
    }
  };

  // Batch reconcile all pending entries with celebration
  const handleReconcileAllPending = (e?: React.MouseEvent) => {
    if (pendingCount === 0) return;
    setEntries(prev => prev.map(je => ({ ...je, status: 'Reconciliado' })));
    if (selectedEntry) {
      setSelectedEntry(prev => prev ? { ...prev, status: 'Reconciliado' } : null);
    }
    triggerReconciliationConfetti(e);
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          spread: 90,
          origin: { x: 0.5, y: 0.4 },
          colors: ['#10B981', '#34D399', '#60A5FA', '#FBBF24']
        });
      } catch {}
    }, 200);

    setReconciliationToast(`Todos os ${pendingCount} lançamentos pendentes foram reconciliados! 🎉`);
    setTimeout(() => setReconciliationToast(null), 3500);
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

    setIsSubmittingEntry(true);

    if (editingEntry) {
      // Update
      const updated: JournalEntry = {
        ...editingEntry,
        date: formDate,
        description: formDescription,
        documentRef: formDocumentRef,
        status: formStatus,
        lines: formLines,
        totalDebit: formTotalDebit,
        totalCredit: formTotalCredit
      };
      setEntries(prev => prev.map(je => (je.id === editingEntry.id ? updated : je)));
      if (selectedEntry?.id === editingEntry.id) {
        setSelectedEntry(updated);
      }
      if (formStatus === 'Reconciliado') {
        triggerReconciliationConfetti();
      }
      setReconciliationToast(`Lançamento "${editingEntry.number}" atualizado com sucesso!`);
      setTimeout(() => setReconciliationToast(null), 3000);
      setIsSubmittingEntry(false);
      setIsModalOpen(false);
    } else {
      // Create
      const newJE: JournalEntry = {
        id: `je_${Date.now()}`,
        number: `LAN 2026/00${entries.length + 1}`,
        date: formDate,
        description: formDescription,
        documentRef: formDocumentRef || 'Geral',
        status: formStatus,
        lines: formLines,
        totalDebit: formTotalDebit,
        totalCredit: formTotalCredit
      };
      
      setLastAddedEntryId(newJE.id);
      setEntries(prev => [newJE, ...prev]);
      if (formStatus === 'Reconciliado') {
        triggerReconciliationConfetti();
      }
      setReconciliationToast(`Novo lançamento "${newJE.number}" adicionado ao Diário com sucesso! ✨`);
      setTimeout(() => setReconciliationToast(null), 3500);
      setTimeout(() => setLastAddedEntryId(null), 4000);
      setIsSubmittingEntry(false);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(je => je.id !== id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
    setDeleteConfirmId(null);
  };

  // Quick PDF Export for Single Transaction
  const handleQuickExportPDF = (entry: JournalEntry, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    exportSingleTransactionVoucherPDF(
      {
        id: entry.id,
        number: entry.number,
        date: entry.date,
        description: entry.description,
        documentRef: entry.documentRef,
        currency,
        status: entry.status,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        lines: entry.lines
      },
      activeWorkspace?.name || 'GlobalAccount AI Studio'
    );
  };

  // Export Filtered Transactions to Excel (ExcelJS)
  const handleExportFilteredExcel = async () => {
    let periodText = 'Todo o histórico';
    if (startDate && endDate) {
      periodText = `De ${startDate} até ${endDate}`;
    } else if (startDate) {
      periodText = `A partir de ${startDate}`;
    } else if (endDate) {
      periodText = `Até ${endDate}`;
    }

    await exportTransactionsToExcel(filteredEntries, {
      entityName: activeWorkspace?.name || 'Sociedade Comercial Angolana, Lda.',
      currency,
      filterPeriod: periodText,
      searchQuery: searchTerm
    });
  };

  // Export Filtered Balancete in CSV
  const handleExportBalanceteCSV = () => {
    let periodText = 'Todo o histórico';
    if (startDate && endDate) periodText = `De ${startDate} a ${endDate}`;
    else if (startDate) periodText = `A partir de ${startDate}`;
    else if (endDate) periodText = `Ate ${endDate}`;

    const headers = ['Código Conta', 'Nome da Conta PGC', 'Classe', `Total Débito (${currency})`, `Total Crédito (${currency})`, `Saldo Devedor (${currency})`, `Saldo Credor (${currency})`];
    const rows = trialBalanceData.accounts.map(acc => [
      acc.code,
      acc.name,
      acc.className,
      acc.debit.toFixed(2),
      acc.credit.toFixed(2),
      acc.saldoDevedor.toFixed(2),
      acc.saldoCredor.toFixed(2)
    ]);

    // Totals row
    rows.push([
      'TOTAL GERAL',
      'Verificação e Fecho de Balancete',
      trialBalanceData.isTrialBalanced ? 'EQUILIBRADO' : 'DESEQUILIBRADO',
      trialBalanceData.totalDebit.toFixed(2),
      trialBalanceData.totalCredit.toFixed(2),
      trialBalanceData.totalSaldoDevedor.toFixed(2),
      trialBalanceData.totalSaldoCredor.toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Balancete_Verificacao_PGC_${startDate || 'inicio'}_a_${endDate || 'fim'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Date Filter Presets
  const handleSetPresetDate = (preset: 'all' | 'today' | 'week' | 'month' | 'last30' | 'quarter' | 'year') => {
    setActivePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(toYMD(monday));
      setEndDate(toYMD(sunday));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'last30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(toYMD(past30));
      setEndDate(toYMD(now));
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startQuarterMonth = currentQuarter * 3;
      const firstDay = new Date(now.getFullYear(), startQuarterMonth, 1);
      const lastDay = new Date(now.getFullYear(), startQuarterMonth + 3, 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
    } else if (preset === 'year') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" id="erp-accounting-workspace">
      
      {/* Toast Notification when Reconciling */}
      {reconciliationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100">{reconciliationToast}</p>
            <p className="text-[10px] text-slate-400">Diário e Balancete sincronizados com sucesso.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Calculator className="w-4 h-4" />
            <span>Módulo de Contabilidade / Diário & Razão</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Diário & Balancete de Verificação</h1>
          <p className="text-xs text-slate-300 mt-1">Conformidade PGC Angola e IFRS com validação automática de partidas dobradas e reconciliação interativa.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => setIsDemonstracoesOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl border border-blue-400/40 shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            title="Gerar Mapas Oficiais das Demonstrações Financeiras PGC Angola em Word e Excel"
          >
            <Scale className="w-4 h-4 text-blue-200" />
            <span>Mapas PGC Angola</span>
          </button>
          
          <button
            onClick={handleExportFilteredExcel}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl border border-emerald-600 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            title="Exportar todas as transações filtradas para um ficheiro Excel (.xlsx)"
            id="btn-export-excel-filtered"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Exportar Diário ({filteredEntries.length})</span>
          </button>

          <button
            onClick={handleExportBalanceteCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            title="Exportar Balancete de Verificação filtrado por data em CSV"
            id="btn-export-balancete-csv"
          >
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Balancete (CSV)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            id="btn-new-accounting-entry"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tab Switcher: Diário Geral vs Balancete de Verificação */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('journal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'journal' 
                ? 'bg-white text-indigo-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-btn-journal"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Lançamentos no Diário</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
              {filteredEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('balancete')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'balancete' 
                ? 'bg-white text-emerald-900 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-btn-balancete"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>Balancete de Verificação (Razão)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
              {trialBalanceData.accounts.length} contas
            </span>
          </button>
        </div>

        {/* Quick Batch Reconcile Button */}
        {pendingCount > 0 && (
          <button
            onClick={handleReconcileAllPending}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            title="Reconciliar todos os lançamentos pendentes de uma só vez"
            id="btn-reconcile-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Reconciliar Todos Pendentes ({pendingCount})</span>
          </button>
        )}
      </div>

      {/* WIDGET: SALDO TOTAL DE DÉBITOS VS. CRÉDITOS (BASEADO NO INTERVALO SELECIONADO NO DATEPICKER) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4" id="accounting-debit-credit-summary-widget">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-slate-900">Balanço Periódico: Débito vs. Crédito</h2>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 font-bold rounded-md text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-600" />
                  <span>{periodSummary.periodLabel}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cálculo em tempo real de partidas dobradas ({periodSummary.entriesCount} lançamentos no intervalo ativo)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {periodSummary.isBalanced ? (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Partidas Dobradas Equilibradas</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Diferença: {periodSummary.diff.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</span>
              </span>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Total Débitos */}
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Débitos</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-md">
                {periodSummary.debitLinesCount} linhas
              </span>
            </div>
            <p className="text-xl lg:text-2xl font-black text-emerald-700 font-mono">
              {periodSummary.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-emerald-600">{currency}</span>
            </p>
            <p className="text-[10px] text-emerald-800/80">Aplicações de fundos / aumentos de ativo e gastos</p>
          </div>

          {/* Total Créditos */}
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                <span>Total Créditos</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100/70 text-indigo-800 rounded-md">
                {periodSummary.creditLinesCount} linhas
              </span>
            </div>
            <p className="text-xl lg:text-2xl font-black text-indigo-700 font-mono">
              {periodSummary.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-indigo-600">{currency}</span>
            </p>
            <p className="text-[10px] text-indigo-800/80">Origens de fundos / aumentos de passivo e rendimentos</p>
          </div>

          {/* Saldo Líquido do Intervalo */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Fecho do Período</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                periodSummary.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {periodSummary.isBalanced ? 'Equilibrado (0.00)' : 'Desvio'}
              </span>
            </div>
            <p className="text-xl lg:text-2xl font-black text-slate-900 font-mono">
              {(periodSummary.totalDebit - periodSummary.totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-sans font-bold text-slate-500">{currency}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              {periodSummary.isBalanced ? 'Princípio das partidas dobradas respeitado integralmente.' : 'Atenção: verifique lançamentos desbalanceados no intervalo.'}
            </p>
          </div>
        </div>

        {/* Visual Débito vs Crédito Ratio Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span className="text-emerald-700 flex items-center gap-1">
              <span>Débito:</span>
              <span className="font-mono">{periodSummary.debitRatio.toFixed(1)}%</span>
            </span>
            <span className="text-indigo-700 flex items-center gap-1">
              <span>Crédito:</span>
              <span className="font-mono">{periodSummary.creditRatio.toFixed(1)}%</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${periodSummary.debitRatio}%` }}
              title={`Débito: ${periodSummary.debitRatio.toFixed(1)}%`}
            />
            <div 
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${periodSummary.creditRatio}%` }}
              title={`Crédito: ${periodSummary.creditRatio.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>

      {/* Reconciled / Pending Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Lançamentos</span>
            <p className="text-xl font-black text-slate-900">{entries.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Reconciliados</span>
            <p className="text-xl font-black text-emerald-600">{reconciledCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className={`bg-white border rounded-2xl p-4 shadow-xs flex items-center justify-between transition-all ${
          pendingCount > 0 ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Reconciliação Pendente</span>
              {pendingCount > 0 && (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <p className="text-xl font-black text-amber-600">{pendingCount}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
            pendingCount > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-400'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ADVANCED DATEPICKER & SEARCH FILTERS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4" id="accounting-filter-toolbar">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder={activeSubTab === 'journal' ? "Pesquisar lançamentos por descrição, documento, nº ou conta..." : "Pesquisar contas no Balancete por código, nome ou classe..."} 
              value={activeSubTab === 'journal' ? searchTerm : balanceteSearch}
              onChange={e => activeSubTab === 'journal' ? setSearchTerm(e.target.value) : setBalanceteSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
              id="input-accounting-search"
            />
            {(activeSubTab === 'journal' ? searchTerm : balanceteSearch) && (
              <button 
                onClick={() => activeSubTab === 'journal' ? setSearchTerm('') : setBalanceteSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DATE RANGE PICKER (Data Início / Data Fim) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <label className="text-[10px] font-bold uppercase text-slate-500">De:</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setActivePreset('all');
                }}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                title="Filtrar a partir desta data"
                id="datepicker-start-date"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <label className="text-[10px] font-bold uppercase text-slate-500">Até:</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => {
                  setEndDate(e.target.value);
                  setActivePreset('all');
                }}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                title="Filtrar até esta data"
                id="datepicker-end-date"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { 
                  setStartDate(''); 
                  setEndDate(''); 
                  setActivePreset('all'); 
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                title="Limpar intervalo de datas"
                id="btn-clear-date-filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Date Presets & Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Intervalo Rápido:</span>
            </span>
            <button
              onClick={() => handleSetPresetDate('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                !startDate && !endDate ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleSetPresetDate('today')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'today' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handleSetPresetDate('week')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => handleSetPresetDate('month')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handleSetPresetDate('last30')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'last30' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              onClick={() => handleSetPresetDate('quarter')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'quarter' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Este Trimestre
            </button>
            <button
              onClick={() => handleSetPresetDate('year')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activePreset === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ano 2026
            </button>
          </div>

          {/* Status Filter (Relevant for Journal) */}
          {activeSubTab === 'journal' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Estado:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({entries.length})
              </button>
              <button
                onClick={() => setStatusFilter('Reconciliado')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'Reconciliado' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Reconciliados ({reconciledCount})
              </button>
              <button
                onClick={() => setStatusFilter('Pendente')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'Pendente' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Pendentes ({pendingCount})
              </button>
            </div>
          )}
        </div>

        {/* Active Filter Period Indicator Banner */}
        {(startDate || endDate) && (
          <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl px-3.5 py-2 text-xs text-indigo-900 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Filtro de Período Ativo: <strong>{startDate ? startDate : 'Início'}</strong> até <strong>{endDate ? endDate : 'Atual'}</strong>
                {' '}({filteredEntries.length} lançamentos encontrados no Diário & Balancete atualizado)
              </span>
            </div>
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setActivePreset('all'); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              Remover filtro
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: LANÇAMENTOS NO DIÁRIO GERAL                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          
          {/* SELECTED TRANSACTION DETAIL CARD (WITH QUICK PDF EXPORT BUTTON) */}
          {selectedEntry && (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 animate-fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-300">{selectedEntry.number}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-300 font-medium">{selectedEntry.date}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-white">{selectedEntry.description}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Badge */}
                  <button
                    onClick={(e) => handleToggleReconciled(selectedEntry.id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                      selectedEntry.status === 'Reconciliado'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30 animate-pulse'
                    }`}
                    title="Clique para alternar o estado de reconciliação (com efeito confetti)"
                  >
                    {selectedEntry.status === 'Reconciliado' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{selectedEntry.status || 'Pendente'}</span>
                  </button>

                  {/* QUICK EXPORT TO PDF BUTTON */}
                  <button
                    onClick={(e) => handleQuickExportPDF(selectedEntry, e)}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-400/40"
                    id="btn-quick-export-pdf-detail"
                    title="Exportar Comprovativo deste Lançamento em PDF Oficial"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Comprovativo (PDF)</span>
                  </button>

                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                    title="Fechar detalhes"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lines breakdown in selected card */}
              <div className="overflow-x-auto bg-slate-900/60 rounded-xl border border-indigo-800/40 p-3">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-bold text-indigo-300 border-b border-indigo-800/40 pb-2">
                    <tr>
                      <th className="pb-2">Conta PGC</th>
                      <th className="pb-2">Designação da Conta</th>
                      <th className="pb-2 text-right">Débito ({currency})</th>
                      <th className="pb-2 text-right">Crédito ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-900/40">
                    {selectedEntry.lines.map(line => (
                      <tr key={line.id}>
                        <td className="py-2 font-mono font-bold text-indigo-300">{line.accountCode}</td>
                        <td className="py-2 text-slate-200 font-medium">{line.accountName}</td>
                        <td className="py-2 text-right font-bold text-emerald-400">
                          {line.debit > 0 ? Number(line.debit).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 text-right font-bold text-indigo-300">
                          {line.credit > 0 ? Number(line.credit).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-indigo-700/60 font-black text-white">
                    <tr>
                      <td colSpan={2} className="pt-2 text-xs">Total do Lançamento:</td>
                      <td className="pt-2 text-right text-emerald-400 font-mono">
                        {selectedEntry.totalDebit.toLocaleString()} {currency}
                      </td>
                      <td className="pt-2 text-right text-indigo-300 font-mono">
                        {selectedEntry.totalCredit.toLocaleString()} {currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 space-y-3">
              <Calculator className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Nenhum lançamento encontrado para os filtros selecionados.</p>
              <p className="text-xs text-slate-400">Tente ajustar o termo de pesquisa ou o intervalo de datas.</p>
              {(searchTerm || startDate || endDate || statusFilter !== 'ALL') && (
                <button
                  onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setStatusFilter('ALL'); setActivePreset('all'); }}
                  className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Limpar Todos os Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filteredEntries.map(je => {
                  const isPending = je.status === 'Pendente';
                  const isSelected = selectedEntry?.id === je.id;
                  const isNewlyAdded = lastAddedEntryId === je.id;

                  return (
                    <motion.div 
                      key={je.id}
                      layout
                      initial={{ opacity: 0, y: -16, scale: 0.97 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { type: "spring", duration: 0.35, bounce: 0.15 }
                      }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      onClick={() => setSelectedEntry(je)}
                      className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition-all cursor-pointer hover:shadow-md ${
                        isNewlyAdded
                          ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20'
                          : isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' 
                            : isPending
                              ? 'border-amber-200 hover:border-amber-300'
                              : 'border-slate-200 hover:border-indigo-200'
                      }`}
                      id={`journal-entry-${je.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-900 font-black rounded-xl text-xs font-mono">
                            {je.number}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">{je.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref: {je.documentRef || '—'}</span>
                          {isNewlyAdded && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse">
                              Novo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium mr-2">{je.date}</span>

                          {/* STATUS BADGE WITH CONFETTI TRIGGER WHEN SWITCHING TO RECONCILED */}
                          <button
                            onClick={(e) => handleToggleReconciled(je.id, e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                              isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs animate-pulse hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Clique para alternar estado de reconciliação (com efeito confetti)"
                            id={`btn-toggle-reconcile-${je.id}`}
                          >
                            {isPending ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Pendente</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Reconciliado</span>
                              </>
                            )}
                          </button>

                          {/* QUICK PDF EXPORT BUTTON PER ROW */}
                          <button
                            onClick={(e) => handleQuickExportPDF(je, e)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Exportar Comprovativo em PDF"
                          >
                            <Download className="w-4 h-4 text-indigo-600" />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(je); }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Editar Lançamento"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(je.id); }}
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
                          <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="pb-2">Conta PGC</th>
                              <th className="pb-2">Nome da Conta</th>
                              <th className="pb-2 text-right">Débito ({currency})</th>
                              <th className="pb-2 text-right">Crédito ({currency})</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {je.lines.map(l => (
                              <tr key={l.id}>
                                <td className="py-2 font-mono font-bold text-indigo-900">{l.accountCode}</td>
                                <td className="py-2 font-medium text-slate-700">{l.accountName}</td>
                                <td className="py-2 text-right font-bold text-slate-900">{l.debit > 0 ? Number(l.debit).toLocaleString() : '-'}</td>
                                <td className="py-2 text-right font-bold text-slate-900">{l.credit > 0 ? Number(l.credit).toLocaleString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-slate-200 font-black text-slate-900">
                            <tr>
                              <td colSpan={2} className="pt-2">Total do Lançamento:</td>
                              <td className="pt-2 text-right text-emerald-600 font-mono">{je.totalDebit.toLocaleString()} {currency}</td>
                              <td className="pt-2 text-right text-emerald-600 font-mono">{je.totalCredit.toLocaleString()} {currency}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: BALANCETE DE VERIFICAÇÃO (RAZÃO DINÂMICO POR INTERVALO)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'balancete' && (
        <div className="space-y-4" id="view-balancete-container">
          
          {/* Balancete Summary Status Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Balancete de Verificação (PGC Angola)</h2>
                {trialBalanceData.isTrialBalanced ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Equilibrado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Desequilibrado</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Calculado em tempo real com base nos {filteredEntries.length} lançamentos do período selecionado.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportBalanceteCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Descarregar Balancete em CSV"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Descarregar CSV</span>
              </button>
              
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Imprimir Balancete"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Balancete Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código Conta</th>
                    <th className="py-3 px-4">Designação da Conta PGC</th>
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4 text-right">Mov. Débito ({currency})</th>
                    <th className="py-3 px-4 text-right">Mov. Crédito ({currency})</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Saldo Devedor ({currency})</th>
                    <th className="py-3 px-4 text-right text-indigo-700">Saldo Credor ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTrialBalanceAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhuma conta movimentada para o período e critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTrialBalanceAccounts.map(acc => (
                      <tr key={acc.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-950">{acc.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{acc.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                            {acc.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {acc.debit > 0 ? acc.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {acc.credit > 0 ? acc.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                          {acc.saldoDevedor > 0 ? acc.saldoDevedor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 bg-indigo-50/30">
                          {acc.saldoCredor > 0 ? acc.saldoCredor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-4 text-xs uppercase tracking-wider">
                      TOTAIS DO BALANCETE ({currency}):
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-900">
                      {trialBalanceData.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-900">
                      {trialBalanceData.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-emerald-700 bg-emerald-100/50">
                      {trialBalanceData.totalSaldoDevedor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-indigo-700 bg-indigo-100/50">
                      {trialBalanceData.totalSaldoCredor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR LANÇAMENTO (COM MOTION.DIV TRANSIÇÃO SUAVE)          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
            id="modal-journal-entry"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col my-auto"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>{editingEntry ? 'Editar Lançamento Contabilístico' : 'Novo Lançamento em Diário'}</span>
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="p-6 space-y-4 overflow-y-auto flex-1">
                {validationError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{validationError}</span>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Data *</label>
                    <input 
                      type="date" 
                      required 
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      id="modal-input-entry-date"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      id="modal-input-entry-desc"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ref. Documento (Fatura / Recibo)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: FT 2026/005" 
                      value={formDocumentRef}
                      onChange={e => setFormDocumentRef(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      id="modal-input-entry-ref"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Estado de Reconciliação</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as 'Reconciliado' | 'Pendente')}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                      id="modal-select-entry-status"
                    >
                      <option value="Reconciliado">Reconciliado</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Lines Table */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Linhas de Partidas Dobradas</span>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      id="btn-modal-add-line"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Linha</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {formLines.map((line) => (
                        <motion.div 
                          key={line.id} 
                          layout
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                        >
                          <div className="col-span-3">
                            <input 
                              type="text" 
                              placeholder="Conta (Ex: 31.1)" 
                              value={line.accountCode}
                              onChange={e => handleUpdateLine(line.id, 'accountCode', e.target.value)}
                              className="w-full bg-white border border-slate-200 text-xs p-2 rounded-lg font-mono font-bold"
                            />
                          </div>
                          <div className="col-span-4">
                            <input 
                              type="text" 
                              placeholder="Nome da Conta" 
                              value={line.accountName}
                              onChange={e => handleUpdateLine(line.id, 'accountName', e.target.value)}
                              className="w-full bg-white border border-slate-200 text-xs p-2 rounded-lg font-medium"
                            />
                          </div>
                          <div className="col-span-2">
                            <input 
                              type="number" 
                              placeholder="Débito" 
                              value={line.debit || ''}
                              onChange={e => handleUpdateLine(line.id, 'debit', Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 text-xs p-2 rounded-lg text-right font-bold text-emerald-700"
                            />
                          </div>
                          <div className="col-span-2">
                            <input 
                              type="number" 
                              placeholder="Crédito" 
                              value={line.credit || ''}
                              onChange={e => handleUpdateLine(line.id, 'credit', Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 text-xs p-2 rounded-lg text-right font-bold text-indigo-700"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-400 hover:text-red-600 cursor-pointer p-1 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEntry}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    id="btn-modal-save-entry"
                  >
                    {isSubmittingEntry ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>A guardar...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar Lançamento</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION MODAL: DELETE */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 p-6 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Eliminar este lançamento?</h3>
            <p className="text-xs text-slate-600">Esta ação removerá permanentemente as linhas do Diário Geral.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
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
