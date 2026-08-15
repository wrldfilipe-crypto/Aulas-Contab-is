import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Copy, 
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Globe2,
  Trash2
} from 'lucide-react';
import { 
  DB, 
  getCurrentUser, 
  getActiveWorkspace, 
  getUserWorkspaces, 
  Workspace, 
  WorkspaceMember,
  logAuditEvent,
  createNotification,
  ensureUserWorkspaces
} from '../lib/db';

interface WorkspaceManagerProps {
  onWorkspaceChanged: () => void;
  onNavigateTab: (tabId: string) => void;
}

export default function WorkspaceManager({ onWorkspaceChanged, onNavigateTab }: WorkspaceManagerProps) {
  const currentUser = getCurrentUser();
  const activeWorkspace = getActiveWorkspace();
  const workspaces = currentUser ? getUserWorkspaces(currentUser.userId) : [];

  // Create workspace state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCountry, setNewCountry] = useState('AO');
  const [newCurrency, setNewCurrency] = useState('AOA');
  const [newStandard, setNewStandard] = useState('PGC Angola');
  const [newIndustry, setNewIndustry] = useState('Services');

  // Invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'accountant' | 'manager' | 'viewer'>('accountant');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'settings'>('members');

  // Notification / Alert state
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const countries = [
    { code: 'AO', label: 'Angola', currency: 'AOA', standard: 'PGC Angola' },
    { code: 'PT', label: 'Portugal', currency: 'EUR', standard: 'IFRS' },
    { code: 'BR', label: 'Brasil', currency: 'BRL', standard: 'NBC BR' },
    { code: 'US', label: 'Estados Unidos', currency: 'USD', standard: 'US GAAP' },
    { code: 'MZ', label: 'Moçambique', currency: 'MZN', standard: 'PGC Moçambique' },
  ];

  const triggerAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccess(msg);
      setError(null);
    } else {
      setError(msg);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 4000);
  };

  const handleCountryChange = (countryCode: string) => {
    setNewCountry(countryCode);
    const selected = countries.find(c => c.code === countryCode);
    if (selected) {
      setNewCurrency(selected.currency);
      setNewStandard(selected.standard);
    }
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newName.trim()) return;

    const newWorkspaceId = crypto.randomUUID();
    const newWS: Workspace = {
      id: newWorkspaceId,
      name: newName,
      country: newCountry,
      currency: newCurrency,
      standard: newStandard,
      industry: newIndustry,
      ownerId: currentUser.userId,
      members: [
        {
          userId: currentUser.userId,
          email: currentUser.email,
          name: currentUser.name,
          role: 'admin',
          invitedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          status: 'active'
        }
      ],
      plan: 'free',
      createdAt: new Date().toISOString(),
      settings: {}
    };

    localStorage.setItem(`ga:workspace:${newWorkspaceId}:metadata`, JSON.stringify(newWS));
    localStorage.setItem('ga_active_workspace', newWorkspaceId);
    
    // Seed initial entities / transactions for this new workspace
    DB.setWorkspace(newWorkspaceId, 'entities', 'e_seed', { id: 'e_seed', name: newName + ' Headquarters', region: newCountry, status: 'Active', revenue: 0, complianceScore: 95, currency: newCurrency, taxId: 'NIF-Pending' });
    
    logAuditEvent('Criar Workspace', `Novo workspace criado: ${newName}`, 'workspace');
    createNotification('workspace', 'Novo Workspace Ativado', `O workspace "${newName}" foi criado e ativado como principal.`);

    triggerAlert('success', `Workspace "${newName}" criado com sucesso!`);
    setIsCreating(false);
    setNewName('');
    onWorkspaceChanged();
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;

    // Check permissions
    const member = activeWorkspace.members.find(m => m.userId === currentUser?.userId);
    if (!member || member.role !== 'admin') {
      triggerAlert('error', 'Apenas administradores podem convidar novos membros.');
      return;
    }

    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const inviteData = {
      token,
      workspaceId: activeWorkspace.id,
      workspaceName: activeWorkspace.name,
      email: inviteEmail.trim(),
      role: inviteRole,
      expiresAt
    };

    // Save invite
    DB.set('invites', token, inviteData);
    
    const constructedLink = `${window.location.origin}/join?token=${token}`;
    setInviteLink(constructedLink);
    
    logAuditEvent('Convidar Membro', `Convite emitido para ${inviteEmail} como ${inviteRole}`, 'workspace');
    triggerAlert('success', 'Convite gerado com sucesso!');
    setInviteEmail('');
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      triggerAlert('success', 'Link de convite copiado!');
    }
  };

  // Simulate Accepting Invite (High fidelity demonstration)
  const handleSimulateAcceptInvite = (token: string, invite: any) => {
    if (!activeWorkspace) return;

    // Build mock user details for invited guest
    const mockGuestName = invite.email.split('@')[0];
    const capitalizedName = mockGuestName.charAt(0).toUpperCase() + mockGuestName.slice(1) + ' (Convidado)';
    const guestUserId = 'guest_' + Math.random().toString(36).substring(2);

    const newMember: WorkspaceMember = {
      userId: guestUserId,
      email: invite.email,
      name: capitalizedName,
      role: invite.role,
      invitedAt: invite.expiresAt, // date template
      joinedAt: new Date().toISOString(),
      status: 'active'
    };

    // Update Workspace metadata with new member
    const updatedWS = {
      ...activeWorkspace,
      members: [...activeWorkspace.members, newMember]
    };
    localStorage.setItem(`ga:workspace:${activeWorkspace.id}:metadata`, JSON.stringify(updatedWS));
    
    // Clear invite
    DB.delete('invites', token);
    setInviteLink(null);

    // Send notifications to current user
    createNotification('workspace', 'Convite Aceito', `${capitalizedName} aceitou o convite para o workspace.`);
    logAuditEvent('Membro Conectado', `${capitalizedName} juntou-se à equipa`, 'workspace');
    
    triggerAlert('success', `Simulação concluída! ${capitalizedName} juntou-se ao workspace.`);
    onWorkspaceChanged();
  };

  const handleRemoveMember = (userIdToRemove: string, memberName: string) => {
    if (!activeWorkspace) return;

    if (userIdToRemove === activeWorkspace.ownerId) {
      triggerAlert('error', 'Não é possível remover o proprietário do workspace.');
      return;
    }

    const updatedWS = {
      ...activeWorkspace,
      members: activeWorkspace.members.filter(m => m.userId !== userIdToRemove)
    };
    localStorage.setItem(`ga:workspace:${activeWorkspace.id}:metadata`, JSON.stringify(updatedWS));
    
    logAuditEvent('Remover Membro', `Membro ${memberName} removido`, 'workspace');
    triggerAlert('success', `Membro ${memberName} removido.`);
    onWorkspaceChanged();
  };

  const handleCancelInvite = (token: string) => {
    DB.delete('invites', token);
    triggerAlert('success', 'Convite cancelado.');
  };

  const activeInvites = DB.list('invites').filter((i: any) => i.workspaceId === activeWorkspace?.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans p-6" id="workspace-manager-panel">
      
      {/* Top Banner Overview */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black">{activeWorkspace?.name || 'Workspace Exemplo'}</h1>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Espaço de trabalho corporativo ativo. Todos os dados contabilísticos, transações e compliance são isolados neste ambiente.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 justify-center md:justify-start">
            <span className="text-[10px] bg-slate-800 text-slate-300 font-bold uppercase px-2.5 py-0.5 rounded-full">Jurisdição: {activeWorkspace?.country}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-bold uppercase px-2.5 py-0.5 rounded-full">Norma: {activeWorkspace?.standard}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-bold uppercase px-2.5 py-0.5 rounded-full">Moeda: {activeWorkspace?.currency}</span>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="relative z-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Criar Novo Workspace
        </button>
      </div>

      {/* Workspace Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-3 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-3 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* CREATE WORKSPACE SCREEN */}
      {isCreating && (
        <div className="bg-white border rounded-2xl p-6 shadow-md border-slate-200 space-y-4 animate-fade-in" id="create-workspace-form">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              Configurar Novo Workspace Corporativo
            </h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome da Empresa / Organização</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: TechStart Angola Lda."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Setor de Atividade</label>
                <input 
                  type="text" 
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="ex: Construção, Tecnologia, Retalho"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">País / Jurisdição</label>
                <select
                  value={newCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Moeda Padrão</label>
                <input 
                  type="text" 
                  value={newCurrency}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Norma Contabilística Ativa</label>
                <input 
                  type="text" 
                  value={newStandard}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Confirmar Criação de Workspace
            </button>
          </form>
        </div>
      )}

      {/* WORKSPACE DETAIL CHUNKS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="workspace-subpanels">
        
        {/* Sub-tabs header */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex gap-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'members' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Membros da Equipa
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'invites' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Convites Pendentes
            {activeInvites.length > 0 && (
              <span className="ml-1.5 bg-amber-500/20 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {activeInvites.length}
              </span>
            )}
          </button>
        </div>

        {/* SUBTAB: MEMBERS LIST */}
        {activeTab === 'members' && (
          <div className="p-6 space-y-6" id="workspace-members-tab">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Equipa Ativa ({activeWorkspace?.members?.length || 1})</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Utilizadores autorizados com acesso aos relatórios fiscais do workspace.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {activeWorkspace?.members?.map((m) => (
                <div key={m.userId} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center border border-slate-200">
                      {m.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        {m.name}
                        {m.userId === activeWorkspace.ownerId && (
                          <span className="bg-blue-100 text-blue-700 text-[8px] font-extrabold px-1.5 rounded-full">PROPRIETÁRIO</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold uppercase px-2 py-0.5 rounded">
                      {m.role}
                    </span>

                    {/* Member actions */}
                    {m.userId !== currentUser?.userId && m.userId !== activeWorkspace.ownerId && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, m.name)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover Membro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB: INVITATIONS */}
        {activeTab === 'invites' && (
          <div className="p-6 space-y-6" id="workspace-invites-tab">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              
              {/* Generate Invite Form */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Emitir Novo Convite</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Adicione consultores, contabilistas ou gestores fiscais ao seu ambiente.</p>
                </div>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Endereço de Email do Convidado</label>
                    <input 
                      type="email" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="exemplo@colaborador.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Papel / Nível de Permissão</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="accountant">Contabilista (Pode editar lançamentos e gerar relatórios)</option>
                      <option value="manager">Gestor (Pode ler e analisar KPIs e relatórios)</option>
                      <option value="viewer">Visualizador (Apenas leitura dos painéis)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Gerar Link de Convite
                  </button>
                </form>

                {/* Simulated copied link displaying */}
                {inviteLink && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2.5 animate-fade-in">
                    <div className="font-bold text-blue-800">Convite Gerado com Sucesso!</div>
                    <p className="text-[10px] text-blue-600/80 leading-relaxed">
                      Envie o link seguro abaixo para o colaborador. Este link expira automaticamente em 7 dias.
                    </p>
                    <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg p-2">
                      <input 
                        type="text" 
                        value={inviteLink}
                        readOnly
                        className="w-full bg-transparent text-[10px] font-mono text-slate-600 focus:outline-none truncate"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                        title="Copiar Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* SIMULATOR QUICK ACCORDANCE TRIGGER */}
                    <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">🔬 Simular Aceitação:</span>
                      <button
                        onClick={() => {
                          const list = DB.list('invites');
                          if (list.length > 0) {
                            handleSimulateAcceptInvite(list[0].token, list[0]);
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] px-2 py-1 rounded shadow-sm hover:shadow transition-all"
                      >
                        Simular Convidado Aceitar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Outstanding Invites List */}
              <div className="space-y-4 md:pl-6 pt-6 md:pt-0">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Convites Emitidos Pendentes ({activeInvites.length})</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Convites ativos que ainda aguardam aceitação por parte dos destinatários.</p>
                </div>

                {activeInvites.length > 0 ? (
                  <div className="space-y-2">
                    {activeInvites.map((i: any) => (
                      <div key={i.token} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5 relative group">
                        <div className="font-bold text-slate-800 truncate">{i.email}</div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">Papel: <span className="text-slate-700 font-bold uppercase">{i.role}</span></span>
                          <span className="text-amber-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expira em 7 dias
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancelInvite(i.token)}
                          className="absolute top-2.5 right-2.5 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Cancelar Convite"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic py-4">Nenhum convite pendente para este workspace.</p>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
