import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Activity, 
  Globe, 
  Lock,
  FileSpreadsheet,
  Play,
  Copy,
  Check
} from 'lucide-react';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase/supabaseClient';
import { listConnectedDevices, terminateRemoteDeviceSession, getOrCreateDeviceId } from '../lib/supabase/supabaseAuth';
import { migrateLegacyDataToSupabase, MigrationResult } from '../lib/supabase/supabaseMigration';
import { syncOfflineQueueToSupabase, getOfflineQueue } from '../lib/supabase/supabaseOfflineSync';
import { DeviceSessionRecord, SupabaseSyncReport } from '../lib/supabase/types';
import { runRealtimeIntegrationTest, IntegrationTestResult } from '../__tests__/realtimeChat.integration.test';
import { runAuthRegistrationTests, AuthTestResult } from '../__tests__/authRegistration.test';

interface SupabaseSyncManagerModalProps {
  userId: string;
  onClose: () => void;
}

export default function SupabaseSyncManagerModal({ userId, onClose }: SupabaseSyncManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'devices' | 'sync' | 'migration' | 'schema' | 'tests'>('devices');
  const [devices, setDevices] = useState<DeviceSessionRecord[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<SupabaseSyncReport | null>(null);
  const [queueCount, setQueueCount] = useState(0);

  // Migration state
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Tests state
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{
    realtime?: { allPassed: boolean; results: IntegrationTestResult[]; logs: string[] };
    auth?: { allPassed: boolean; results: AuthTestResult[] };
  } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const currentDeviceId = getOrCreateDeviceId();

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const list = await listConnectedDevices(userId);
      setDevices(list);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadDevices();
    setQueueCount(getOfflineQueue().length);
  }, [userId]);

  const handleRunAllTests = async () => {
    setRunningTests(true);
    try {
      const [rtRes, authRes] = await Promise.all([
        runRealtimeIntegrationTest(),
        runAuthRegistrationTests()
      ]);
      setTestResults({
        realtime: rtRes,
        auth: authRes
      });
    } finally {
      setRunningTests(false);
    }
  };

  const fullSchemaSql = `-- ==============================================================================
-- SCHEMA DEFINITIVO: SISTEMA DE CONTABILIDADE PGC ANGOLA & MULTI-DISPOSITIVO SUPABASE
-- ==============================================================================

-- 1. TABELA PROFILES (Sem dados fictícios - full_name strictly real ou null)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text default null,
  avatar_url text default null,
  cargo text default null,
  empresa text default null,
  biografia text default null,
  role text default 'accountant' check (role in ('accountant', 'student', 'auditor', 'admin')),
  preferred_accounting_standard text default 'pgc_angola',
  is_searchable boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TRIGGER HANDLE_NEW_USER (Registo limpo e real)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, cargo, empresa, biografia)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', null),
    null,
    null,
    null
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. STORAGE RLS POLICIES (Avatars & Documents)
-- Avatars bucket (Leitura pública, escrita restrita ao dono da pasta)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

create policy "Avatars sao publicos" 
on storage.objects for select 
using (bucket_id = 'avatars');

create policy "Utilizador faz upload do seu proprio avatar" 
on storage.objects for insert with check (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Utilizador atualiza o seu proprio avatar" 
on storage.objects for update using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Documents bucket (Privado, apenas dono pode ler e escrever)
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false) 
on conflict (id) do nothing;

create policy "Utilizador le os seus proprios documentos" 
on storage.objects for select using (
  bucket_id = 'documents' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Utilizador faz upload de documentos privados" 
on storage.objects for insert with check (
  bucket_id = 'documents' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. REALTIME PUBLICATION
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.study_progress;`;

  const handleTerminateSession = async (targetDeviceId: string) => {
    setTerminatingId(targetDeviceId);
    try {
      const ok = await terminateRemoteDeviceSession(userId, targetDeviceId);
      if (ok) {
        setDevices(prev => prev.filter(d => d.device_id !== targetDeviceId));
      }
    } finally {
      setTerminatingId(null);
    }
  };

  const handleSyncOffline = async () => {
    setSyncing(true);
    try {
      const report = await syncOfflineQueueToSupabase(userId);
      setSyncReport(report);
      setQueueCount(getOfflineQueue().length);
    } finally {
      setSyncing(false);
    }
  };

  const handleRunMigration = async () => {
    setMigrating(true);
    try {
      const res = await migrateLegacyDataToSupabase(userId);
      setMigrationResult(res);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        id="modal-supabase-sync-manager"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Supabase Cloud & Dispositivos
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                }`}>
                  {isSupabaseConfigured ? 'Conectado à Nuvem' : 'Modo Offline-First'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronização multi-aparelho, sessões ativas e Row Level Security (RLS)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            id="btn-close-supabase-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900 gap-2">
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-supabase-devices"
          >
            <Smartphone className="w-4 h-4" />
            <span>Dispositivos Conectados</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
              {devices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-supabase-sync"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sincronização Offline</span>
            {queueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {queueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('migration')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'migration'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-supabase-migration"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Migração de Dados</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-supabase-schema"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Segurança & RLS</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            id="tab-supabase-tests"
          >
            <Play className="w-4 h-4" />
            <span>Testes & Realtime</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB: DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sessões Ativas Multi-Dispositivo
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O Supabase mantém sessões independentes para cada telemóvel, tablet e computador.
                  </p>
                </div>
                <button
                  onClick={loadDevices}
                  disabled={loadingDevices}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDevices ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Smartphone className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                  <p className="text-xs text-slate-500">Nenhum outro dispositivo registado.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {devices.map((d) => {
                    const isCurrent = d.is_current || d.device_id === currentDeviceId;
                    return (
                      <div 
                        key={d.device_id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          isCurrent 
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isCurrent 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {d.os?.includes('iOS') || d.os?.includes('Android') ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Laptop className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {d.device_name}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-600 text-white">
                                  Este Aparelho
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {d.browser || 'Navegador'} • Última atividade: {new Date(d.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(d.device_id)}
                            disabled={terminatingId === d.device_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            id={`btn-terminate-device-${d.device_id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{terminatingId === d.device_id ? 'A terminar...' : 'Terminar Sessão'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: OFFLINE SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Fila de Sincronização Local (IndexedDB / Cache)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Itens pendentes para envio automático via upsert com resolução de conflitos por <code className="text-emerald-600 dark:text-emerald-400 font-mono">updated_at</code>.
                    </p>
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {queueCount} {queueCount === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleSyncOffline}
                    disabled={syncing || queueCount === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    id="btn-sync-offline-now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'A sincronizar com Supabase...' : 'Sincronizar Agora'}</span>
                  </button>
                </div>
              </div>

              {syncReport && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Relatório de Sincronização em Tempo Real:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 dark:text-slate-300 pt-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Módulos</p>
                      <p className="text-sm font-black">{syncReport.studyProgressSynced}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Quizzes</p>
                      <p className="text-sm font-black">{syncReport.quizResultsSynced}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Chats de IA</p>
                      <p className="text-sm font-black">{syncReport.aiConversationsSynced}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Entidades</p>
                      <p className="text-sm font-black">{syncReport.entitiesSynced}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MIGRATION */}
          {activeTab === 'migration' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Migração Única para o Schema Supabase
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Transfere perfis, progresso de estudo, histórico do assistente de IA e entidades de balancete da base de dados local para as tabelas relacionais do Supabase Postgres, preservando identificadores e integridade referencial.
                </p>

                <div className="mt-4">
                  <button
                    onClick={handleRunMigration}
                    disabled={migrating}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    id="btn-run-migration-now"
                  >
                    <UploadCloud className={`w-4 h-4 ${migrating ? 'animate-bounce' : ''}`} />
                    <span>{migrating ? 'A migrar dados...' : 'Executar Migração'}</span>
                  </button>
                </div>
              </div>

              {migrationResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  migrationResult.success
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    {migrationResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>
                      {migrationResult.success ? 'Migração concluída com sucesso!' : 'Migração concluída com avisos:'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-slate-700 dark:text-slate-300 pt-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Módulos</p>
                      <p className="text-sm font-black">{migrationResult.counts.study_progress}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Chats IA</p>
                      <p className="text-sm font-black">{migrationResult.counts.ai_conversations}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500">Entidades</p>
                      <p className="text-sm font-black">{migrationResult.counts.entities}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SCHEMA & RLS */}
          {activeTab === 'schema' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>Row Level Security (RLS) & Isolamento Ativado</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullSchemaSql);
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSchema ? 'Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400">
                  <li><strong className="text-slate-700 dark:text-slate-300">profiles:</strong> Sem dados fictícios. <code className="font-mono text-emerald-600">full_name</code> exclusivamente real ou null.</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">Storage avatars:</strong> Bucket público com escrita isolada por <code className="font-mono text-emerald-600">auth.uid()::text = foldername[1]</code>.</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">Storage documents:</strong> Bucket privado para relatórios contabilísticos e balanços.</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">messages & friendships:</strong> Sincronização via Supabase Realtime (<code className="font-mono text-emerald-600">created_at</code> ASC).</li>
                </ul>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-xl overflow-x-auto max-h-60 border border-slate-800">
                  {fullSchemaSql}
                </pre>
              </div>
            </div>
          )}

          {/* TAB: TESTS & INTEGRATION SIMULATION */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Teste de Integração Realtime: Utilizador A e Utilizador B
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simula dois utilizadores distintos: User A envia pedido de amizade, User B aceita, User A envia mensagem, e valida se User B recebe via Realtime sem refresh manual, com ordenação estrita por <code className="font-mono text-emerald-600">created_at</code> e integridade de perfil sem dados fictícios.
                </p>
              </div>

              <button
                onClick={handleRunAllTests}
                disabled={runningTests}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                id="btn-run-integration-tests"
              >
                <Play className={`w-4 h-4 ${runningTests ? 'animate-spin' : ''}`} />
                <span>{runningTests ? 'A executar testes de integração...' : 'Executar Teste de Integração (User A ➔ User B Realtime)'}</span>
              </button>

              {testResults && (
                <div className="space-y-3 pt-2">
                  {/* Realtime Messaging Tests */}
                  {testResults.realtime && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Cenário Realtime & Amizades (A ➔ B)
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          testResults.realtime.allPassed 
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {testResults.realtime.allPassed ? '100% APROVADO' : 'FALHA'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {testResults.realtime.results.map((r, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs flex items-start gap-2.5">
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{r.step}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auth Integrity Tests */}
                  {testResults.auth && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Auditoria de Registo & Perfil Limpo
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          testResults.auth.allPassed 
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {testResults.auth.allPassed ? '100% APROVADO' : 'FALHA'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {testResults.auth.results.map((a, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs flex items-start gap-2.5">
                            {a.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{a.testName}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{a.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sessões seguras com Refresh Token e Realtime PostgreSQL</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
            id="btn-close-modal-footer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
