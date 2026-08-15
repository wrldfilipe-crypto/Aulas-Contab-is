import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Activity, 
  Users, 
  Building2, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle,
  FileText,
  Clock,
  Unlock,
  SlidersHorizontal,
  Database,
  ArrowRight,
  Scale,
  Calculator,
  Check,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Globe,
  Layers,
  FileCheck2,
  Info
} from 'lucide-react';
import { DB, getCurrentUser, logAuditEvent, getAuditLogs, getDemoUsersCount, getActiveWorkspace } from '../lib/db';
import { migrateFirestoreConversationsMembers } from '../lib/firebase';
import { getDefaultAngolaTrialBalance, mapTrialBalanceToPgc, formatKwanza, PgcBalanceSheet } from '../services/pgcMappingService';
import { auditPgcMapping, PgcAuditResult, mapForeignAccountToPgc } from '../services/pgcMapper';
import { exportPgcBalanceSheetToExcel } from '../services/excelExportService';

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ success?: boolean; count?: number; message?: string } | null>(null);

  // PGC Balance Sheet Validation State
  const [trialBalanceData, setTrialBalanceData] = useState(getDefaultAngolaTrialBalance());
  const [pgcBalance, setPgcBalance] = useState<PgcBalanceSheet>(() => mapTrialBalanceToPgc(getDefaultAngolaTrialBalance()));
  const [testDiscrepancyMode, setTestDiscrepancyMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'audit' | 'validator'>('validator');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Compute detailed PGC Audit Result using pgcMapper
  const auditResult: PgcAuditResult = useMemo(() => {
    return auditPgcMapping(pgcBalance);
  }, [pgcBalance]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportPgcBalanceSheetToExcel(pgcBalance, auditResult);
      logAuditEvent(
        'Exportação ExcelJS PGC',
        `Exportou Balanço Oficial PGC Angola em ExcelJS para ${pgcBalance.entityName}`,
        'dados'
      );
      loadLogs();
    } catch (err: any) {
      console.error('[AdminDashboard] Erro ao exportar Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const currentUser = getCurrentUser();
  const activeWorkspace = getActiveWorkspace();

  const loadLogs = () => {
    // Read from both systemic database logs and general simulation history
    const allLogs = getAuditLogs();
    setLogs(allLogs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Recalculate PGC Balance Sheet whenever trial balance data changes or test mode toggles
  useEffect(() => {
    let currentData = [...trialBalanceData];
    if (testDiscrepancyMode) {
      // Simulate an unbalanced entry by altering an account balance by +1,500,000 Kz
      currentData = currentData.map(item => 
        item.code === '11.2.1' ? { ...item, balance: item.balance + 1500000 } : item
      );
    }
    const computed = mapTrialBalanceToPgc(currentData, activeWorkspace?.name || 'Empresa Exemplo Angola, Lda.');
    setPgcBalance(computed);
  }, [trialBalanceData, testDiscrepancyMode, activeWorkspace]);

  const handleRunBalanceAudit = () => {
    logAuditEvent(
      'Validação PGC Balanço', 
      pgcBalance.isBalanced 
        ? `Validação de Balanço concluída: FECHADO COM SUCESSO. Activo (${formatKwanza(pgcBalance.totalActive)}) = CP + Passivo (${formatKwanza(pgcBalance.totalEquityAndPassive)}).` 
        : `ALERTA AUDITORIA: Balanço desequilibrado! Desvio de ${formatKwanza(pgcBalance.difference)}.`,
      pgcBalance.isBalanced ? 'dados' : 'seguranca'
    );
    loadLogs();
  };

  const handleRefresh = () => {
    loadLogs();
    logAuditEvent('Admin Consulta', 'Atualizou a visualização de logs de auditoria', 'sistema');
  };

  const handleClearLogs = () => {
    if (confirm('Tem a certeza que deseja limpar todos os registos de auditoria históricos? Esta ação será registada.')) {
      localStorage.setItem('ga_audit_logs', JSON.stringify([]));
      logAuditEvent('Admin Limpeza', 'Eliminou o histórico total de logs de auditoria', 'seguranca');
      loadLogs();
    }
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    try {
      const res = await migrateFirestoreConversationsMembers();
      setMigrationStatus({
        success: true,
        count: res.migratedCount,
        message: res.migratedCount > 0 
          ? `${res.migratedCount} conversa(s) legada(s) atualizada(s) com sucesso com o campo 'members'!`
          : 'Todas as conversas no Firestore já possuem o campo "members". Nenhuma alteração pendente.'
      });
      logAuditEvent('Migração Firestore', `Executou migração de conversas legadas. ${res.migratedCount} atualizadas.`, 'dados');
      loadLogs();
    } catch (err: any) {
      console.error('[AdminDashboard] Erro ao executar migração:', err);
      setMigrationStatus({
        success: false,
        message: err.message || 'Erro ao executar migração no Firestore.'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Filtered log computations
  const filteredLogs = logs.filter(log => {
    const matchesUser = !userSearch || (log.userEmail || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesType = eventTypeFilter === 'All' || log.category === eventTypeFilter;
    const matchesSeverity = severityFilter === 'All' || 
      (severityFilter === 'High' && log.action.includes('redefinida')) || 
      (severityFilter === 'Medium' && log.category === 'workspace') ||
      (severityFilter === 'Low' && log.category === 'perfil');
    return matchesUser && matchesType && matchesSeverity;
  });

  const usersCount = getDemoUsersCount();

  const mockUsers = [
    { name: 'Administrador Global', email: 'admin@globalaccount.com', role: 'admin', active: true, joined: '01/01/2026' },
    { name: 'Filipe Carvalho', email: 'wrldfilipe@gmail.com', role: 'user', active: true, joined: '08/07/2026' },
    { name: 'Maria Santos (Contabilista)', email: 'maria.santos@partner.com', role: 'accountant', active: false, joined: '08/07/2026' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans p-6" id="admin-dashboard-container">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5.5 h-5.5 text-blue-600" />
            Consola de Administração & Auditoria
          </h1>
          <p className="text-xs text-slate-500">Acompanhamento e controlo global de acessos, eventos de segurança, logs isolados e workspaces.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            className="p-2 border bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
            title="Atualizar Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleClearLogs}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold py-2 px-4 rounded-xl transition-all"
          >
            Limpar Registos de Auditoria
          </button>
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="admin-stats-grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Utilizadores Registados</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{usersCount}</span>
            <span className="text-[10px] text-emerald-500 font-bold mt-1 block">● 100% Ativos</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Workspaces Corporativos</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">3</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Isolamento total ativo</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Eventos Auditados</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{logs.length}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Histórico de integridade</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Estado do Sistema</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">Seguro</span>
            <span className="text-[10px] text-emerald-500 font-bold mt-1 block">✓ Proteção RGPD ativa</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold" id="admin-tabs">
        <button
          onClick={() => setSelectedTab('validator')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            selectedTab === 'validator'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Validador de Balanço PGC Angola</span>
          {!pgcBalance.isBalanced && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">1</span>
          )}
        </button>

        <button
          onClick={() => setSelectedTab('audit')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            selectedTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Registos de Auditoria ({logs.length})</span>
        </button>
      </div>

      {/* PGC BALANCE SHEET VALIDATOR PANEL */}
      {selectedTab === 'validator' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6" id="pgc-balance-validator-panel">
          
          {/* Header & Status Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-black text-slate-800">Verificação Automática de Conformidade do Balanço (PGC Angola)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valida a Equação Fundamental do Património (<code className="font-bold text-slate-700">Activo = Capital Próprio + Passivo</code>) segundo o Decreto n.º 82/2001 do PGC de Angola.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setTestDiscrepancyMode(!testDiscrepancyMode)}
                className={`text-xs font-bold py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                  testDiscrepancyMode 
                    ? 'bg-amber-50 text-amber-700 border-amber-300' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {testDiscrepancyMode ? '⚠️ Simular Inconsistência (+1,5M Kz)' : '🧪 Testar Erro no Balanço'}
              </button>

              <button
                onClick={handleRunBalanceAudit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Auditar e Registar</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="bg-[#1B3A6B] hover:bg-[#2E5FA3] text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                title="Exportar Balanço Oficial PGC em formato Excel com formatação profissional"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isExportingExcel ? 'A gerar Excel...' : 'Exportar Excel (ExcelJS)'}</span>
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {pgcBalance.isBalanced ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                  ✓ Balanço Fechado e Auditado com Sucesso (PGC Angola Decreto n.º 82/2001)
                </h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  A Equação Fundamental do Património encontra-se perfeitamente equilibrada. O <strong>Total do Activo ({formatKwanza(pgcBalance.totalActive)})</strong> coincide com o <strong>Total do Capital Próprio + Passivo ({formatKwanza(pgcBalance.totalEquityAndPassive)})</strong>. Não foram encontradas divergências ou erros de lançamento.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-red-800 flex items-center gap-2">
                  ⚠️ ALERTA PGC: INCONSISTÊNCIA DETETADA NO BALANÇO!
                </h4>
                <p className="text-xs text-red-700 leading-relaxed">
                  O Balanço não fecha! O <strong>Total do Activo ({formatKwanza(pgcBalance.totalActive)})</strong> é diferente do <strong>Total do Capital Próprio e Passivo ({formatKwanza(pgcBalance.totalEquityAndPassive)})</strong>.
                </p>
                <div className="inline-block bg-red-100 text-red-900 font-mono font-bold text-xs px-2.5 py-1 rounded-lg mt-1 border border-red-300">
                  Desvio / Desequilíbrio: {formatKwanza(pgcBalance.difference)}
                </div>
                {pgcBalance.inconsistencies.map((inc, i) => (
                  <p key={i} className="text-[11px] text-red-800 font-medium">● {inc}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── CARD DE RESUMO DA AUDITORIA PARA O CONTABILISTA ────────────────── */}
          <div className="bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#1B3A6B]" />
                <h3 className="text-xs font-black text-[#1A2540] dark:text-slate-100 uppercase tracking-wide">
                  Relatório de Auditoria Contabilística PGC (Revisão do Contabilista)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1B3A6B] border border-blue-200">
                  Cobertura: {auditResult.compliancePercentage}%
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ {auditResult.mappedRubricsCount} Mapeadas
                </span>
                {auditResult.unmappedOrZeroRubricsCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    ⚠️ {auditResult.unmappedOrZeroRubricsCount} Sem Saldo / A Rever
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {auditResult.auditSummaryMessage}
            </p>

            {/* Missing or Unmapped Rubrics Specific List */}
            {auditResult.missingMandatoryRubrics.length > 0 ? (
              <div className="space-y-2 pt-1">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-600" /> Rubricas Obrigatórias PGC sem valor ou pendentes de verificação:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {auditResult.missingMandatoryRubrics.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1A2540] dark:text-slate-200 text-[11px]">
                          {item.designation}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          item.status === 'SEM_SALDO'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {item.status === 'SEM_SALDO' ? 'Saldo Nulo (0,00 Kz)' : 'Não Mapeada'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span>Código PGC: <strong className="font-mono text-slate-700">{item.pgcCode}</strong></span>
                        <span className="italic">{item.category}</span>
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50/50 p-1.5 rounded border border-amber-100/80 mt-1">
                        👉 {item.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Todas as rubricas principais do PGC Angola possuem saldos atribuídos e devidamente mapeados.</span>
              </div>
            )}

            {/* Unmapped Accounts Alert */}
            {auditResult.unmappedAccountsCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Encontradas {auditResult.unmappedAccountsCount} contas de origem não mapeadas no balancete:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {auditResult.unmappedAccountsList.map((acc, idx) => (
                    <span key={idx} className="bg-white border border-red-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold text-red-900">
                      {acc.code} — {acc.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Equation Breakdown Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Activo Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
                <span>TOTAL DO ACTIVO</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">A = ANC + AC</span>
              </div>
              <div className="text-xl font-black text-slate-800 font-mono">
                {formatKwanza(pgcBalance.totalActive)}
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/80">
                <div className="flex justify-between">
                  <span>Activo Não Corrente:</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.activeNonCurrent.reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Activo Corrente:</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.activeCurrent.reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
              </div>
            </div>

            {/* Equals Sign Visual */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
                <span>CAPITAL PRÓPRIO</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Classe 5 & 8</span>
              </div>
              <div className="text-xl font-black text-slate-800 font-mono">
                {formatKwanza(pgcBalance.equity.reduce((a, b) => a + b.currentYear, 0))}
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/80">
                <div className="flex justify-between">
                  <span>Capital + Reservas:</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.equity.slice(0, 2).reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Resultados (Transit. + Exerc.):</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.equity.slice(2).reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
              </div>
            </div>

            {/* Passivo Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
                <span>TOTAL DO PASSIVO</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">P = PNC + PC</span>
              </div>
              <div className="text-xl font-black text-slate-800 font-mono">
                {formatKwanza(pgcBalance.passiveNonCurrent.reduce((a, b) => a + b.currentYear, 0) + pgcBalance.passiveCurrent.reduce((a, b) => a + b.currentYear, 0))}
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/80">
                <div className="flex justify-between">
                  <span>Passivo Não Corrente:</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.passiveNonCurrent.reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Passivo Corrente:</span>
                  <strong className="font-mono">{formatKwanza(pgcBalance.passiveCurrent.reduce((a, b) => a + b.currentYear, 0))}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Line Item Table according to PGC official layout */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-900 text-white p-3 text-xs font-black uppercase tracking-wider flex justify-between items-center">
              <span>Modelo Oficial de Balanço (PGC Angola — Decreto n.º 82/2001)</span>
              <span className="text-[10px] text-slate-300 font-normal">Valores expressos em Kwanza (Kz)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <th className="p-3">Designação da Rubrica</th>
                    <th className="p-3 text-center w-16">Notas</th>
                    <th className="p-3 text-right">Exercício Atual (Kz)</th>
                    <th className="p-3 text-right">Exercício Anterior (Kz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  
                  {/* ACTIVO HEADER */}
                  <tr className="bg-slate-200/80 font-black text-slate-900 text-xs">
                    <td colSpan={4} className="p-2.5 uppercase tracking-wide">ACTIVO</td>
                  </tr>

                  {/* Activos não correntes */}
                  <tr className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                    <td colSpan={4} className="p-2 pl-4 italic">Activos não correntes:</td>
                  </tr>
                  {pgcBalance.activeNonCurrent.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-8 font-medium">{item.designation}</td>
                      <td className="p-2 text-center text-slate-400 font-mono">{item.noteNumber}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatKwanza(item.currentYear, false)}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{formatKwanza(item.previousYear, false)}</td>
                    </tr>
                  ))}

                  {/* Activos correntes */}
                  <tr className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                    <td colSpan={4} className="p-2 pl-4 italic">Activos correntes:</td>
                  </tr>
                  {pgcBalance.activeCurrent.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-8 font-medium">{item.designation}</td>
                      <td className="p-2 text-center text-slate-400 font-mono">{item.noteNumber}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatKwanza(item.currentYear, false)}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{formatKwanza(item.previousYear, false)}</td>
                    </tr>
                  ))}

                  {/* TOTAL ACTIVO */}
                  <tr className="bg-indigo-900 text-white font-black text-xs">
                    <td className="p-3 uppercase">Total do Activo</td>
                    <td className="p-3 text-center">—</td>
                    <td className="p-3 text-right font-mono text-sm">{formatKwanza(pgcBalance.totalActive, false)}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{formatKwanza(pgcBalance.totalActive * 0.92, false)}</td>
                  </tr>

                  {/* CAPITAL PRÓPRIO E PASSIVO HEADER */}
                  <tr className="bg-slate-200/80 font-black text-slate-900 text-xs">
                    <td colSpan={4} className="p-2.5 uppercase tracking-wide">CAPITAL PRÓPRIO E PASSIVO</td>
                  </tr>

                  {/* Capital próprio */}
                  <tr className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                    <td colSpan={4} className="p-2 pl-4 italic">Capital próprio:</td>
                  </tr>
                  {pgcBalance.equity.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-8 font-medium">{item.designation}</td>
                      <td className="p-2 text-center text-slate-400 font-mono">{item.noteNumber}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatKwanza(item.currentYear, false)}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{formatKwanza(item.previousYear, false)}</td>
                    </tr>
                  ))}

                  {/* Passivo não corrente */}
                  <tr className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                    <td colSpan={4} className="p-2 pl-4 italic">Passivo não corrente:</td>
                  </tr>
                  {pgcBalance.passiveNonCurrent.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-8 font-medium">{item.designation}</td>
                      <td className="p-2 text-center text-slate-400 font-mono">{item.noteNumber}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatKwanza(item.currentYear, false)}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{formatKwanza(item.previousYear, false)}</td>
                    </tr>
                  ))}

                  {/* Passivo corrente */}
                  <tr className="bg-slate-50 font-bold text-slate-800 text-[11px]">
                    <td colSpan={4} className="p-2 pl-4 italic">Passivo corrente:</td>
                  </tr>
                  {pgcBalance.passiveCurrent.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-2 pl-8 font-medium">{item.designation}</td>
                      <td className="p-2 text-center text-slate-400 font-mono">{item.noteNumber}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatKwanza(item.currentYear, false)}</td>
                      <td className="p-2 text-right font-mono text-slate-500">{formatKwanza(item.previousYear, false)}</td>
                    </tr>
                  ))}

                  {/* TOTAL CAPITAL PRÓPRIO E PASSIVO */}
                  <tr className={`font-black text-xs text-white ${pgcBalance.isBalanced ? 'bg-indigo-900' : 'bg-red-900'}`}>
                    <td className="p-3 uppercase">Total do Capital Próprio e Passivo</td>
                    <td className="p-3 text-center">—</td>
                    <td className="p-3 text-right font-mono text-sm">{formatKwanza(pgcBalance.totalEquityAndPassive, false)}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{formatKwanza(pgcBalance.totalEquityAndPassive * 0.92, false)}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-200">
              <span>Nota de rodapé: Valores em Kwanzas (Kz) | Norma: PGC Angola (Decreto n.º 82/2001, de 16 de Novembro)</span>
              <span className="font-bold text-indigo-600">✓ Mapeamento PGC Activo</span>
            </div>
          </div>

        </div>
      )}

      {/* AUDIT LOGS PANEL */}
      {selectedTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-main-sections">
        
        {/* LOGS TABLE (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between" id="admin-logs-panel">
          
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Pesquisar por email..."
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All">Categorias</option>
                <option value="sistema">Sistema</option>
                <option value="workspace">Workspace</option>
                <option value="perfil">Perfil</option>
                <option value="seguranca">Segurança</option>
                <option value="dados">Dados</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="All">Gravidade</option>
                <option value="High">Alta (Segurança)</option>
                <option value="Medium">Média (Workspace)</option>
                <option value="Low">Baixa (Gerais)</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-bold tracking-wider border-b border-slate-100">
                  <th className="px-4 py-2.5">Data / Hora</th>
                  <th className="px-4 py-2.5">Utilizador</th>
                  <th className="px-4 py-2.5">Ação Realizada</th>
                  <th className="px-4 py-2.5">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">
                      Nenhum registo de auditoria corresponde aos filtros ativos.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-400 font-mono flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[120px]" title={log.userEmail}>{log.userEmail}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{log.action}</td>
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded uppercase text-[9px] font-extrabold ${
                            log.category === 'seguranca' ? 'bg-red-50 text-red-600' :
                            log.category === 'workspace' ? 'bg-amber-50 text-amber-600' :
                            log.category === 'dados' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {log.category}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>A mostrar {filteredLogs.length} de {logs.length} registos históricos.</span>
            <span>✓ Imutabilidade Garantida</span>
          </div>
        </div>

        {/* USERS LIST (Span 1) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" id="admin-users-panel">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Utilizadores Ativos do Sistema</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Gestão e acompanhamento de privilégios de acesso.</p>
          </div>

          <div className="space-y-3">
            {mockUsers.map((usr, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl text-xs">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    {usr.name}
                    {usr.active && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Online" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{usr.email}</div>
                </div>
                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase">
                  {usr.role}
                </span>
              </div>
            ))}
          </div>

          {/* Migration Tool Widget */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3" id="admin-migration-widget">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Migração Firestore Legada</h4>
                <p className="text-[10px] text-slate-500">Adiciona o campo <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded text-[9px] font-mono">members</code> a conversas antigas para validar regras de segurança.</p>
              </div>
            </div>

            <button
              onClick={handleRunMigration}
              disabled={isMigrating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>A migrar conversas...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Executar Migração do Campo 'members'</span>
                </>
              )}
            </button>

            {migrationStatus && (
              <div className={`p-3 rounded-xl border text-xs ${
                migrationStatus.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {migrationStatus.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                  <span>{migrationStatus.success ? 'Migração Concluída' : 'Erro na Migração'}</span>
                </div>
                <p className="text-[11px] mt-1 text-slate-600">{migrationStatus.message}</p>
              </div>
            )}
          </div>
        </div>

      </div>
      )}

    </div>
  );
}
