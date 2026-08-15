export type UserProfileRole = 'student' | 'accountant' | 'manager' | 'company' | 'other';
export type UserExperienceMode = 'student' | 'professional';

export interface UserProfileConfig {
  role: UserProfileRole;
  mode: UserExperienceMode;
  roleTitle: string;
  description: string;
  badgeLabel: string;
  primaryFocus: string;
  allowedTabs: string[];
  aiPersonaMode: 'didactic' | 'professional';
  exclusiveFeatures: string[];
}

export const PROFILE_CONFIGS: Record<UserProfileRole, UserProfileConfig> = {
  student: {
    role: 'student',
    mode: 'student',
    roleTitle: 'Estudante / Académico',
    description: 'Experiência adaptada para aprendizagem contínua, percursos didáticos, simulados, quizzes e explicações passo a passo.',
    badgeLabel: 'Académico / Estudante',
    primaryFocus: 'Módulos Didáticos & Exercícios',
    allowedTabs: [
      'dashboard',        // Special Student Dashboard
      'knowledge_center', // Courses & Learning Tracks
      'messages',         // Study Groups & Channels
      'assistant',        // AI in Didactic mode
      'exchange_rates',   // FX lookup for exercises
      'profile',
      'workspaces'
    ],
    aiPersonaMode: 'didactic',
    exclusiveFeatures: [
      'Trilhas de Aprendizagem Passo a Passo',
      'Simulados & Quizzes com Correção Automática',
      'Modo Didático de IA com Exemplos Práticos',
      'Grupos de Estudo do PGC Angola & Legislação AGT',
      'Emblemas e Certificados de Módulo'
    ]
  },
  accountant: {
    role: 'accountant',
    mode: 'professional',
    roleTitle: 'Contabilista / Auditor Certificado',
    description: 'Acesso total a ferramentas de contabilidade, auditoria fiscal, lançamentos, reconciliação e consolidação.',
    badgeLabel: 'Contabilista Certificado',
    primaryFocus: 'Produtividade, Lançamentos & Auditoria',
    allowedTabs: [
      'dashboard',
      'entities',
      'ledger',
      'reconciliations',
      'tax',
      'assistant',
      'knowledge_center',
      'exchange_rates',
      'messages',
      'workspaces',
      'profile',
      'admin'
    ],
    aiPersonaMode: 'professional',
    exclusiveFeatures: [
      'Painel de Controlo Financeiro Completo',
      'Monitór de Entidades Corporativas',
      'Lançamentos & Reconciliação em Lote',
      'Calculadora de Provisões Fiscais & IRT/IVA',
      'Relatórios de Auditoria Exportáveis (PDF/Excel)',
      'Alertas de Prazos Fiscais Regulatórios'
    ]
  },
  manager: {
    role: 'manager',
    mode: 'professional',
    roleTitle: 'Gestor / Diretor Financeiro (CFO)',
    description: 'Visão executiva de desempenho financeiro, consolidação de unidades e relatórios para tomada de decisão.',
    badgeLabel: 'Direção Financeira',
    primaryFocus: 'Consolidação & Relatórios Executivos',
    allowedTabs: [
      'dashboard',
      'entities',
      'ledger',
      'reconciliations',
      'tax',
      'assistant',
      'knowledge_center',
      'exchange_rates',
      'messages',
      'workspaces',
      'profile',
      'admin'
    ],
    aiPersonaMode: 'professional',
    exclusiveFeatures: [
      'Dashboard Executivo Multi-Moeda',
      'Consolidação de Múltiplas Empresas',
      'Análise de Conformidade e Indicadores (KPIs)',
      'Relatórios Financeiros Avançados'
    ]
  },
  company: {
    role: 'company',
    mode: 'professional',
    roleTitle: 'Empresa / Corporativo',
    description: 'Gestão institucional multi-entidade, compliance regulatório e colaboração de equipa.',
    badgeLabel: 'Entidade Corporativa',
    primaryFocus: 'Governança & Gestão Institucional',
    allowedTabs: [
      'dashboard',
      'entities',
      'ledger',
      'reconciliations',
      'tax',
      'assistant',
      'knowledge_center',
      'exchange_rates',
      'messages',
      'workspaces',
      'profile',
      'admin'
    ],
    aiPersonaMode: 'professional',
    exclusiveFeatures: [
      'Gestão de Múltiplos Registos Fiscais',
      'Colaboração Profissional e Partilha de Relatórios',
      'Verificação Automatizada de Compliance'
    ]
  },
  other: {
    role: 'other',
    mode: 'professional',
    roleTitle: 'Utilizador Geral / Consultor',
    description: 'Acesso equilibrado a todas as ferramentas e conteúdos da plataforma.',
    badgeLabel: 'Consultor Geral',
    primaryFocus: 'Acesso Geral',
    allowedTabs: [
      'dashboard',
      'entities',
      'ledger',
      'reconciliations',
      'tax',
      'assistant',
      'knowledge_center',
      'exchange_rates',
      'messages',
      'workspaces',
      'profile'
    ],
    aiPersonaMode: 'professional',
    exclusiveFeatures: [
      'Acesso Híbrido a Módulos Didáticos e Produtivos'
    ]
  }
};

export function getStoredUserRole(): UserProfileRole {
  try {
    const sessionStr = localStorage.getItem('ga_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed.profile && PROFILE_CONFIGS[parsed.profile as UserProfileRole]) {
        return parsed.profile as UserProfileRole;
      }
    }
  } catch (e) {
    console.warn('Error reading stored user role:', e);
  }
  return 'accountant';
}

export function getActiveExperienceMode(): UserExperienceMode {
  return 'student';
}

export function setActiveExperienceMode(mode: UserExperienceMode): void {
  try {
    localStorage.setItem('ga_user_experience_mode', 'student');
    window.dispatchEvent(new CustomEvent('user_experience_mode_changed', { detail: { mode: 'student' } }));
  } catch (e) {
    console.error('Failed to set experience mode:', e);
  }
}

export function getProfileConfig(role?: string): UserProfileConfig {
  const r = (role as UserProfileRole) || getStoredUserRole();
  return PROFILE_CONFIGS[r] || PROFILE_CONFIGS.accountant;
}

export function isTabVisibleForMode(tabId: string, mode: UserExperienceMode): boolean {
  if (mode === 'student') {
    // Hidden in student mode to keep focus 100% on learning unless explicitly navigated
    const professionalOnlyTabs = ['entities', 'ledger', 'reconciliations', 'tax'];
    return !professionalOnlyTabs.includes(tabId);
  }
  return true;
}
