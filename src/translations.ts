export interface TranslationStructure {
  nav: {
    dashboard: string;
    countries: string;
    reports: string;
    accounting: string;
    invoicing: string;
    payroll: string;
    compliance: string;
    aiAccountant: string;
    chartBuilder: string;
    documents: string;
    settings: string;
    logout: string;
    exchangeRates?: string;
  };
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    generate: string;
    download: string;
    print: string;
    copy: string;
    search: string;
    filter: string;
    refresh: string;
    back: string;
    next: string;
    confirm: string;
    close: string;
    upload: string;
    export: string;
    import: string;
  };
  messages: {
    loading: string;
    saving: string;
    generating: string;
    success: string;
    error: string;
    noData: string;
    confirmDelete: string;
    sessionExpired: string;
  };
  dashboard: {
    title: string;
    activeCountries: string;
    pendingObligations: string;
    invoicesIssued: string;
    aiAccuracy: string;
    recentActivity: string;
    complianceDeadlines: string;
    activityByRegion: string;
    updateData: string;
  };
  ai: {
    aiAccountant: string;
    askQuestion: string;
    generateDocument: string;
    selectDocumentType: string;
    selectCountry: string;
    documentReady: string;
    generating: string;
  };
  formats: {
    dateFormat: string;
    currency: string;
    currencyCode: string;
    numberSeparator: string;
    thousandSeparator: string;
  };
  // Extra keys for perfect integration
  extra: {
    accountTier: string;
    enterpriseUnlimited: string;
    secure: string;
    financialConsole: string;
    entitiesMonitor: string;
    ledgerTitle: string;
    reconciliationsTitle: string;
    taxPlannerTitle: string;
    aiConsultantTitle: string;
    corporateRegistrations: string;
    activeOperational: string;
    unreconciledLines: string;
    actionRequired: string;
    balancedLedger: string;
    estimatedTaxAccrual: string;
    realtimeEstimate: string;
    avgComplianceIndex: string;
    revenueByEntity: string;
    revenueDistribution: string;
    revenueLegend: string;
    urgentTasks: string;
    ledgerOutBalance: string;
    pendingLinesReview: string;
    allLinesReconciled: string;
    ledgerFullyReconciled: string;
    complianceWarning: string;
    flaggedAudit: string;
    aiConsultantReady: string;
    aiConsultantDesc: string;
    autosaveEnabled: string;
    legalEntitiesList: string;
    holdingSummary: string;
    addEntity: string;
    manageAll: string;
    entityName: string;
    taxId: string;
    jurisdiction: string;
    syncStatus: string;
    taxPolicyRate: string;
    annualIncome: string;
    filterRegion: string;
    filterStatus: string;
    resetFilters: string;
    clearFilters: string;
    allRegions: string;
    allStatuses: string;
    active: string;
    review: string;
    idle: string;
    complianceScore: string;
    annualRevenue: string;
    actionsHeader: string;
    noEntitiesFound: string;
    calcTaxProjection: string;
    removeRecord: string;
    logTransaction: string;
    postingsRecord: string;
    entityScope: string;
    allEntityGroup: string;
    postingDate: string;
    journalDesc: string;
    accountCategory: string;
    debitCost: string;
    creditRevenue: string;
    unresolvedJournals: string;
    allBalancedVerified: string;
    postedDate: string;
    awaitingAudit: string;
    reconcileBtn: string;
    auditGuideline: string;
    guidelineText: string;
    requiredVerifications: string;
    verifyTaxId: string;
    verifyConversions: string;
    verifyPricing: string;
    askAiPricing: string;
    sandboxTitle: string;
    selectScope: string;
    customSandbox: string;
    grossRevenue: string;
    deductibleExpenses: string;
    nonDeductible: string;
    runSimulation: string;
    effectiveTaxRate: string;
    taxableIncome: string;
    simulatedLiability: string;
    netMargin: string;
    formulaBreakdown: string;
    applyProjectionDesc: string;
    applyProjectionBtn: string;
    configureParams: string;
    poweredByGemini: string;
    regulatoryScope: string;
    welcomeMsg: string;
    thinkingMsg: string;
    promptSeed1: string;
    promptSeed2: string;
    promptSeed3: string;
    addEntityModalTitle: string;
    registeredName: string;
    postLedgerTitle: string;
    chooseEntity: string;
    postingType: string;
    creditOption: string;
    debitOption: string;
    amountLabel: string;
    auditStatusLabel: string;
    pendingAudit: string;
    approvedReconciled: string;
    registerEntityBtn: string;
    postLedgerBtn: string;
    quickFilter: string;
    leadFinancialOfficer: string;
    appSlogan: string;
    welcomeOnboarding: string;
    welcomeOnboardingDesc: string;
    getStartedBtn: string;
    deleteConfirmQuestion: string;
    appAppliedAccrual: string;
  };
}

export const translations: Record<string, TranslationStructure> = {
  'pt-BR': {
    nav: {
      dashboard: 'Painel',
      countries: 'Países',
      reports: 'Relatórios',
      accounting: 'Contabilidade',
      invoicing: 'Faturamento',
      payroll: 'Folha de Pagamento',
      compliance: 'Compliance',
      aiAccountant: 'Contador IA',
      chartBuilder: 'Construtor de Gráficos',
      documents: 'Documentos',
      settings: 'Configurações',
      logout: 'Sair',
    },
    actions: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      create: 'Criar',
      generate: 'Gerar',
      download: 'Baixar',
      print: 'Imprimir',
      copy: 'Copiar',
      search: 'Buscar',
      filter: 'Filtrar',
      refresh: 'Atualizar',
      back: 'Voltar',
      next: 'Próximo',
      confirm: 'Confirmar',
      close: 'Fechar',
      upload: 'Enviar arquivo',
      export: 'Exportar',
      import: 'Importar',
    },
    messages: {
      loading: 'Carregando...',
      saving: 'Salvando...',
      generating: 'Gerando documento...',
      success: 'Operação realizada com sucesso!',
      error: 'Ocorreu um erro. Tente novamente.',
      noData: 'Nenhum dado encontrado.',
      confirmDelete: 'Tem certeza que deseja excluir?',
      sessionExpired: 'Sessão expirada. Faça login novamente.',
    },
    dashboard: {
      title: 'Painel Global',
      activeCountries: 'Países ativos',
      pendingObligations: 'Obrigações pendentes',
      invoicesIssued: 'Faturas emitidas',
      aiAccuracy: 'Precisão da IA',
      recentActivity: 'Atividade recente',
      complianceDeadlines: 'Vencimentos de Compliance',
      activityByRegion: 'Atividade por região',
      updateData: 'Atualizar dados',
    },
    ai: {
      aiAccountant: 'Contador IA',
      askQuestion: 'Faça uma pergunta contábil...',
      generateDocument: 'Gerar Documento',
      selectDocumentType: 'Selecionar tipo de documento',
      selectCountry: 'Selecionar país',
      documentReady: 'Documento gerado com sucesso!',
      generating: 'A IA está gerando seu documento...',
    },
    formats: {
      dateFormat: 'DD/MM/YYYY',
      currency: 'R$',
      currencyCode: 'BRL',
      numberSeparator: ',',
      thousandSeparator: '.',
    },
    extra: {
      accountTier: 'Nível da Conta',
      enterpriseUnlimited: 'Enterprise Ilimitado',
      secure: 'Seguro',
      financialConsole: 'Console Financeiro',
      entitiesMonitor: 'Monitor de Entidades Corporativas',
      ledgerTitle: 'Razão Geral Unificado',
      reconciliationsTitle: 'Oficina de Reconciliação Interna',
      taxPlannerTitle: 'Simulador de Imposto Corporativo Internacional',
      aiConsultantTitle: 'Consultor de Impostos Globais IA',
      corporateRegistrations: 'Registros Corporativos',
      activeOperational: 'ativos em operação',
      unreconciledLines: 'Linhas não Reconciliadas',
      actionRequired: 'Ação necessária no Razão',
      balancedLedger: 'Razão equilibrado e sincronizado',
      estimatedTaxAccrual: 'Provisão de Imposto Estimada',
      realtimeEstimate: 'Estimativa em tempo real (Q3/Q4)',
      avgComplianceIndex: 'Índice Médio de Conformidade',
      revenueByEntity: 'Receita Corporativa por Entidade',
      revenueDistribution: 'Comparativo entre diferentes jurisdições',
      revenueLegend: 'Receita (Equivalente em USD)',
      urgentTasks: 'Tarefas e Ações Urgentes',
      ledgerOutBalance: 'Razão Geral Desbalanceado',
      pendingLinesReview: 'Existem {count} linhas pendentes de revisão.',
      allLinesReconciled: 'Todas as Linhas Reconciliadas',
      ledgerFullyReconciled: 'Seu razão geral corporativo global está totalmente reconciliado.',
      complianceWarning: 'Aviso de Conformidade',
      flaggedAudit: '{entities} sinalizadas para auditoria de jurisdição.',
      aiConsultantReady: 'Consultor de IA Global Pronto',
      aiConsultantDesc: 'Analise preços de transferência, brechas fiscais e regras de compliance instantaneamente.',
      autosaveEnabled: 'Salvamento automático na nuvem ativado',
      legalEntitiesList: 'Entidades Legais Internacionais',
      holdingSummary: 'Resumo das participações corporativas atuais no painel',
      addEntity: 'Adicionar Entidade',
      manageAll: 'Gerenciar Todas',
      entityName: 'Nome da Entidade',
      taxId: 'ID Fiscal',
      jurisdiction: 'Jurisdição / Região',
      syncStatus: 'Status de Sincronização',
      taxPolicyRate: 'Taxa Fiscal',
      annualIncome: 'Receita Anualizada',
      filterRegion: 'Jurisdição da Região',
      filterStatus: 'Status de Sincronização',
      resetFilters: 'Resetar Filtros',
      clearFilters: 'Limpar filtros',
      allRegions: 'Todas as Regiões',
      allStatuses: 'Todos os Status',
      active: 'Ativo',
      review: 'Em Revisão',
      idle: 'Inativo',
      complianceScore: 'Score de Compliance',
      annualRevenue: 'Receita Anualizada',
      actionsHeader: 'Ações',
      noEntitiesFound: 'Nenhuma entidade corporativa corresponde aos critérios de filtragem.',
      calcTaxProjection: 'Calcular projeção de imposto simulado',
      removeRecord: 'Remover Registro Corporativo',
      logTransaction: 'Registrar Transação',
      postingsRecord: 'Lançamentos no Razão',
      entityScope: 'Escopo da Entidade:',
      allEntityGroup: 'Todo o Grupo',
      postingDate: 'Data do Lançamento',
      journalDesc: 'Descrição do Diário',
      accountCategory: 'Categoria da Conta',
      debitCost: 'Débito (Custo)',
      creditRevenue: 'Crédito (Receita)',
      unresolvedJournals: 'Lançamentos de Diário Não Resolvidos',
      allBalancedVerified: 'Todos os lançamentos estão reconciliados e verificados. Bom trabalho!',
      postedDate: 'Data de Lançamento:',
      awaitingAudit: 'Aguardando Auditoria',
      reconcileBtn: 'Reconciliar',
      auditGuideline: 'Diretrizes de Auditoria Interna',
      guidelineText: 'De acordo com os protocolos de conformidade globais padrão (como o IFRS 9), todas as saídas de subsidiárias regionais que excedam um limite nominal devem ser cruzadas com as declarações bancárias formais.',
      requiredVerifications: 'Verificações Obrigatórias:',
      verifyTaxId: 'Verificar detalhes de registro fiscal da contraparte.',
      verifyConversions: 'Verificar conversões de moeda com taxas de câmbio atuais.',
      verifyPricing: 'Garantir margens adequadas de preços de transferência.',
      askAiPricing: 'Precisa de margens automáticas? Pergunte ao Contador IA para sugestões estruturais.',
      sandboxTitle: 'Sandbox de Cálculo de Impostos',
      selectScope: 'Selecionar Escopo',
      customSandbox: 'Simulação Customizada',
      grossRevenue: 'Receita Bruta (USD equivalente)',
      deductibleExpenses: 'Despesas Operacionais Dedutíveis',
      nonDeductible: 'Ajustes Não Dedutíveis',
      runSimulation: 'Executar Simulação Fiscal',
      effectiveTaxRate: 'Taxa Fiscal Efetiva',
      taxableIncome: 'Lucro Tributável',
      simulatedLiability: 'Imposto Estimado',
      netMargin: 'Margem Líquida Pós-Imposto',
      formulaBreakdown: 'Detalhamento da Fórmula de Auditoria',
      applyProjectionDesc: 'Aplicar esta simulação de imposto corporativo diretamente para atualizar as provisões globais.',
      applyProjectionBtn: 'Aplicar Projeção',
      configureParams: 'Configure os parâmetros à esquerda e execute a projeção de impostos.',
      poweredByGemini: 'Online — Ativado por IA Gemini (Seguro no servidor)',
      regulatoryScope: 'Escopo regulatório: 2026/2027',
      welcomeMsg: 'Bem-vindo ao Consultor de IA do Navigator Pro! Posso ajudar com políticas fiscais globais, opções de estruturação corporativa (ex: GmbH vs LLC), conciliação de lançamentos, preços de transferência e IFRS/US-GAAP. Como posso ajudar hoje?',
      thinkingMsg: 'O consultor está pensando e indexando diretrizes corporativas...',
      promptSeed1: 'Simular preços de transferência entre holding americana e GmbH alemã',
      promptSeed2: 'Qual é a fórmula de isenção parcial de impostos em Cingapura?',
      promptSeed3: 'Explique a mecânica de tributação do CSLL e IRPJ no Brasil.',
      addEntityModalTitle: 'Adicionar Nova Entidade Legal',
      registeredName: 'Nome Registrado da Entidade',
      postLedgerTitle: 'Lançar Linha no Razão Geral',
      chooseEntity: '-- Escolha a Entidade Corporativa --',
      postingType: 'Tipo de Lançamento',
      creditOption: 'Crédito (Entrada de Receita)',
      debitOption: 'Débito (Saída de Custo)',
      amountLabel: 'Valor (Equivalente em USD)',
      auditStatusLabel: 'Status de Auditoria',
      pendingAudit: 'Pendente de Auditoria (Não Reconciliado)',
      approvedReconciled: 'Aprovado & Reconciliado',
      registerEntityBtn: 'Registrar Entidade',
      postLedgerBtn: 'Lançar no Razão',
      quickFilter: 'Filtrar entidades...',
      leadFinancialOfficer: 'Diretor Financeiro Líder',
      appSlogan: 'Razão Global',
      welcomeOnboarding: 'Bem-vindo ao Navigator Pro',
      welcomeOnboardingDesc: 'Por favor, selecione seu idioma preferido para começar a gerenciar seu razão corporativo global.',
      getStartedBtn: 'Começar',
      deleteConfirmQuestion: 'Tem certeza de que deseja excluir esta entidade legal? Todos os dados históricos do razão permanecem salvos.',
      appAppliedAccrual: 'Provisão de imposto aplicada com sucesso no valor de ${amount} para a entidade {name}.'
    }
  },

  'pt-PT': {
    nav: {
      dashboard: 'Painel',
      countries: 'Países',
      reports: 'Relatórios',
      accounting: 'Contabilidade',
      invoicing: 'Faturação',
      payroll: 'Processamento Salarial',
      compliance: 'Conformidade',
      aiAccountant: 'Contabilista IA',
      chartBuilder: 'Construtor de Gráficos',
      documents: 'Documentos',
      settings: 'Definições',
      logout: 'Terminar sessão',
    },
    actions: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Criar',
      generate: 'Gerar',
      download: 'Transferir',
      print: 'Imprimir',
      copy: 'Copiar',
      search: 'Pesquisar',
      filter: 'Filtrar',
      refresh: 'Actualizar',
      back: 'Voltar',
      next: 'Seguinte',
      confirm: 'Confirmar',
      close: 'Fechar',
      upload: 'Carregar ficheiro',
      export: 'Exportar',
      import: 'Importar',
    },
    messages: {
      loading: 'A carregar...',
      saving: 'A guardar...',
      generating: 'A gerar documento...',
      success: 'Operação realizada com sucesso!',
      error: 'Ocorreu um erro. Tente novamente.',
      noData: 'Nenhum dado encontrado.',
      confirmDelete: 'Tem a certeza que pretende eliminar?',
      sessionExpired: 'Sessão expirada. Inicie sessão novamente.',
    },
    dashboard: {
      title: 'Painel Global',
      activeCountries: 'Países ativos',
      pendingObligations: 'Obrigações pendentes',
      invoicesIssued: 'Faturas emitidas',
      aiAccuracy: 'Precisão da IA',
      recentActivity: 'Atividade recente',
      complianceDeadlines: 'Vencimentos de Conformidade',
      activityByRegion: 'Atividade por região',
      updateData: 'Atualizar dados',
    },
    ai: {
      aiAccountant: 'Contabilista IA',
      askQuestion: 'Faça uma pergunta de contabilidade...',
      generateDocument: 'Gerar Documento',
      selectDocumentType: 'Selecionar tipo de documento',
      selectCountry: 'Selecionar país',
      documentReady: 'Documento gerado com sucesso!',
      generating: 'A IA está a gerar o seu documento...',
    },
    formats: {
      dateFormat: 'DD/MM/YYYY',
      currency: '€',
      currencyCode: 'EUR',
      numberSeparator: ',',
      thousandSeparator: '.',
    },
    extra: {
      accountTier: 'Nível da Conta',
      enterpriseUnlimited: 'Enterprise Ilimitado',
      secure: 'Seguro',
      financialConsole: 'Consola Financeira',
      entitiesMonitor: 'Monitor de Entidades Corporativas',
      ledgerTitle: 'Razão Geral Unificado',
      reconciliationsTitle: 'Oficina de Reconciliação Interna',
      taxPlannerTitle: 'Simulador de Imposto Corporativo Internacional',
      aiConsultantTitle: 'Consultor de Impostos Globais IA',
      corporateRegistrations: 'Registos Corporativos',
      activeOperational: 'ativos em operação',
      unreconciledLines: 'Linhas não Reconciliadas',
      actionRequired: 'Ação necessária no Razão',
      balancedLedger: 'Razão equilibrado e sincronizado',
      estimatedTaxAccrual: 'Provisão de Imposto Estimada',
      realtimeEstimate: 'Estimativa em tempo real (Q3/Q4)',
      avgComplianceIndex: 'Índice Médio de Conformidade',
      revenueByEntity: 'Receita Corporativa por Entidade',
      revenueDistribution: 'Comparativo entre diferentes jurisdições',
      revenueLegend: 'Receita (Equivalente em USD)',
      urgentTasks: 'Tarefas e Ações Urgentes',
      ledgerOutBalance: 'Razão Geral Desbalanceado',
      pendingLinesReview: 'Existem {count} linhas pendentes de revisão.',
      allLinesReconciled: 'Todas as Linhas Reconciliadas',
      ledgerFullyReconciled: 'O seu razão geral corporativo global está totalmente reconciliado.',
      complianceWarning: 'Aviso de Conformidade',
      flaggedAudit: '{entities} sinalizadas para auditoria de jurisdição.',
      aiConsultantReady: 'Consultor de IA Global Pronto',
      aiConsultantDesc: 'Analise preços de transferência, brechas fiscais e regras de conformidade instantaneamente.',
      autosaveEnabled: 'Salvamento automático na nuvem ativado',
      legalEntitiesList: 'Entidades Legais Internacionais',
      holdingSummary: 'Resumo das participações corporativas atuais no painel',
      addEntity: 'Adicionar Entidade',
      manageAll: 'Gerir Todas',
      entityName: 'Nome da Entidade',
      taxId: 'ID Fiscal',
      jurisdiction: 'Jurisdição / Região',
      syncStatus: 'Estado de Sincronização',
      taxPolicyRate: 'Taxa Fiscal',
      annualIncome: 'Receita Anualizada',
      filterRegion: 'Jurisdição da Região',
      filterStatus: 'Estado de Sincronização',
      resetFilters: 'Repor Filtros',
      clearFilters: 'Limpar filtros',
      allRegions: 'Todas as Regiões',
      allStatuses: 'Todos os Estados',
      active: 'Ativo',
      review: 'Em Revisão',
      idle: 'Inativo',
      complianceScore: 'Score de Conformidade',
      annualRevenue: 'Receita Anualizada',
      actionsHeader: 'Ações',
      noEntitiesFound: 'Nenhuma entidade corporativa corresponde aos critérios de filtragem.',
      calcTaxProjection: 'Calcular projeção de imposto simulado',
      removeRecord: 'Remover Registo Corporativo',
      logTransaction: 'Registrar Transação',
      postingsRecord: 'Lançamentos no Razão',
      entityScope: 'Escopo da Entidade:',
      allEntityGroup: 'Todo o Grupo',
      postingDate: 'Data do Lançamento',
      journalDesc: 'Descrição do Diário',
      accountCategory: 'Categoria da Conta',
      debitCost: 'Débito (Custo)',
      creditRevenue: 'Crédito (Receita)',
      unresolvedJournals: 'Lançamentos de Diário Não Resolvidos',
      allBalancedVerified: 'Todos os lançamentos estão reconciliados e verificados. Bom trabalho!',
      postedDate: 'Data de Lançamento:',
      awaitingAudit: 'Aguardando Auditoria',
      reconcileBtn: 'Reconciliar',
      auditGuideline: 'Diretrizes de Auditoria Interna',
      guidelineText: 'De acordo com os protocolos de conformidade globais padrão (como o IFRS 9), todas as saídas de subsidiárias regionais que excedam um limite nominal devem ser cruzadas com as declarações bancárias formais.',
      requiredVerifications: 'Verificações Obrigatórias:',
      verifyTaxId: 'Verificar detalhes de registo fiscal da contraparte.',
      verifyConversions: 'Verificar conversões de moeda com taxas de câmbio atuais.',
      verifyPricing: 'Garantir margens adequadas de preços de transferência.',
      askAiPricing: 'Precisa de margens automáticas? Pergunte ao Contador IA para sugestões estruturais.',
      sandboxTitle: 'Sandbox de Cálculo de Impostos',
      selectScope: 'Selecionar Escopo',
      customSandbox: 'Simulação Customizada',
      grossRevenue: 'Receita Bruta (USD equivalente)',
      deductibleExpenses: 'Despesas Operacionais Dedutíveis',
      nonDeductible: 'Ajustes Não Dedutíveis',
      runSimulation: 'Executar Simulação Fiscal',
      effectiveTaxRate: 'Taxa Fiscal Efetiva',
      taxableIncome: 'Lucro Tributável',
      simulatedLiability: 'Imposto Estimado',
      netMargin: 'Margem Líquida Pós-Imposto',
      formulaBreakdown: 'Detalhamento da Fórmula de Auditoria',
      applyProjectionDesc: 'Aplicar esta simulação de imposto corporativo diretamente para atualizar as provisões globais.',
      applyProjectionBtn: 'Aplicar Projeção',
      configureParams: 'Configure os parâmetros à esquerda e execute a projeção de impostos.',
      poweredByGemini: 'Online — Ativado por IA Gemini (Seguro no servidor)',
      regulatoryScope: 'Escopo regulatório: 2026/2027',
      welcomeMsg: 'Bem-vindo ao Consultor de IA do Navigator Pro! Posso ajudar com políticas fiscais globais, opções de estruturação corporativa (ex: GmbH vs LLC), conciliação de lançamentos, preços de transferência e IFRS/US-GAAP. Como posso ajudar hoje?',
      thinkingMsg: 'O consultor está a pensar e a indexar diretrizes corporativas...',
      promptSeed1: 'Simular preços de transferência entre holding americana e GmbH alemã',
      promptSeed2: 'Qual é a fórmula de isenção parcial de impostos em Cingapura?',
      promptSeed3: 'Explique a mecânica de tributação do CSLL e IRPJ no Brasil.',
      addEntityModalTitle: 'Adicionar Nova Entidade Legal',
      registeredName: 'Nome Registado da Entidade',
      postLedgerTitle: 'Lançar Linha no Razão Geral',
      chooseEntity: '-- Escolha a Entidade Corporativa --',
      postingType: 'Tipo de Lançamento',
      creditOption: 'Crédito (Entrada de Receita)',
      debitOption: 'Débito (Saída de Custo)',
      amountLabel: 'Valor (Equivalente em USD)',
      auditStatusLabel: 'Estado de Auditoria',
      pendingAudit: 'Pendente de Auditoria (Não Reconciliado)',
      approvedReconciled: 'Aprovado & Reconciliado',
      registerEntityBtn: 'Registrar Entidade',
      postLedgerBtn: 'Lançar no Razão',
      quickFilter: 'Pesquisar entidades...',
      leadFinancialOfficer: 'Diretor Financeiro Líder',
      appSlogan: 'Razão Global',
      welcomeOnboarding: 'Bem-vindo ao Navigator Pro',
      welcomeOnboardingDesc: 'Por favor, selecione o seu idioma preferido para começar a gerir o seu razão corporativo global.',
      getStartedBtn: 'Começar',
      deleteConfirmQuestion: 'Tem a certeza que pretende eliminar esta entidade legal? Todos os dados históricos do razão permanecem guardados.',
      appAppliedAccrual: 'Provisão de imposto aplicada com sucesso no valor de {amount} para a entidade {name}.'
    }
  },

  'en': {
    nav: {
      dashboard: 'Dashboard',
      countries: 'Countries',
      reports: 'Reports',
      accounting: 'Accounting',
      invoicing: 'Invoicing',
      payroll: 'Payroll',
      compliance: 'Compliance',
      aiAccountant: 'AI Accountant',
      chartBuilder: 'Chart Builder',
      documents: 'Documents',
      settings: 'Settings',
      logout: 'Log out',
    },
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      generate: 'Generate',
      download: 'Download',
      print: 'Print',
      copy: 'Copy',
      search: 'Search',
      filter: 'Filter',
      refresh: 'Refresh',
      back: 'Back',
      next: 'Next',
      confirm: 'Confirm',
      close: 'Close',
      upload: 'Upload file',
      export: 'Export',
      import: 'Import',
    },
    messages: {
      loading: 'Loading...',
      saving: 'Saving...',
      generating: 'Generating document...',
      success: 'Operation completed successfully!',
      error: 'An error occurred. Please try again.',
      noData: 'No data found.',
      confirmDelete: 'Are you sure you want to delete?',
      sessionExpired: 'Session expired. Please log in again.',
    },
    dashboard: {
      title: 'Global Dashboard',
      activeCountries: 'Active countries',
      pendingObligations: 'Pending obligations',
      invoicesIssued: 'Invoices issued',
      aiAccuracy: 'AI Accuracy',
      recentActivity: 'Recent activity',
      complianceDeadlines: 'Compliance Deadlines',
      activityByRegion: 'Activity by region',
      updateData: 'Update data',
    },
    ai: {
      aiAccountant: 'AI Accountant',
      askQuestion: 'Ask an accounting question...',
      generateDocument: 'Generate Document',
      selectDocumentType: 'Select document type',
      selectCountry: 'Select country',
      documentReady: 'Document generated successfully!',
      generating: 'The AI is generating your document...',
    },
    formats: {
      dateFormat: 'MM/DD/YYYY',
      currency: '$',
      currencyCode: 'USD',
      numberSeparator: '.',
      thousandSeparator: ',',
    },
    extra: {
      accountTier: 'Account Tier',
      enterpriseUnlimited: 'Enterprise Unlimited',
      secure: 'Secure',
      financialConsole: 'Financial Console',
      entitiesMonitor: 'Corporate & Legal Entities Monitor',
      ledgerTitle: 'Unified General Ledger',
      reconciliationsTitle: 'Internal Reconciliation Workshop',
      taxPlannerTitle: 'International Corporate Tax Simulator',
      aiConsultantTitle: 'AI Global Tax Consultant',
      corporateRegistrations: 'Corporate Registrations',
      activeOperational: 'active operational',
      unreconciledLines: 'Unreconciled Lines',
      actionRequired: 'Action required in Ledger',
      balancedLedger: 'Balanced ledger sync',
      estimatedTaxAccrual: 'Estimated Tax Accrual',
      realtimeEstimate: 'Real-time estimate (Q3/Q4)',
      avgComplianceIndex: 'Avg Compliance Index',
      revenueByEntity: 'Corporate Revenue by Entity',
      revenueDistribution: 'Comparative representation across active jurisdictions',
      revenueLegend: 'Revenue (USD equivalent)',
      urgentTasks: 'Urgent Tasks & Actions',
      ledgerOutBalance: 'Ledger Out of Balance',
      pendingLinesReview: 'There are {count} pending ledger lines requiring review.',
      allLinesReconciled: 'All Lines Reconciled',
      ledgerFullyReconciled: 'Your global corporate general ledger is fully reconciled.',
      complianceWarning: 'Compliance Warning',
      flaggedAudit: '{entities} flagged for jurisdictional audit.',
      aiConsultantReady: 'AI Global Consultant Ready',
      aiConsultantDesc: 'Analyze transfer pricing models, tax loopholes, and compliance rules instantly.',
      autosaveEnabled: 'Auto-save to cloud enabled',
      legalEntitiesList: 'International Legal Entities',
      holdingSummary: 'Primary dashboard summary list of current corporate holdings',
      addEntity: 'Add Entity',
      manageAll: 'Manage All',
      entityName: 'Entity Name',
      taxId: 'Tax ID',
      jurisdiction: 'Jurisdiction / Region',
      syncStatus: 'Sync Status',
      taxPolicyRate: 'Tax Policy rate',
      annualIncome: 'Annualized Income',
      filterRegion: 'Region Jurisdiction',
      filterStatus: 'Sync Status',
      resetFilters: 'Reset Filters',
      clearFilters: 'Clear filters',
      allRegions: 'All Regions / Jurisdictions',
      allStatuses: 'All Statuses',
      active: 'Active',
      review: 'Review',
      idle: 'Idle',
      complianceScore: 'Compliance Score',
      annualRevenue: 'Annualized Revenue',
      actionsHeader: 'Actions',
      noEntitiesFound: 'No corporate entities match the current filtering criteria.',
      calcTaxProjection: 'Calculate simulated tax projection',
      removeRecord: 'Remove Corporate Record',
      logTransaction: 'Log Transaction',
      postingsRecord: 'Ledger Postings Record',
      entityScope: 'Entity Scope:',
      allEntityGroup: 'All Entity Group',
      postingDate: 'Posting Date',
      journalDesc: 'Journal Description',
      accountCategory: 'Account Category',
      debitCost: 'Debit (Cost)',
      creditRevenue: 'Credit (Revenue)',
      unresolvedJournals: 'Unresolved Journal Entries',
      allBalancedVerified: 'All transactions are balanced and verified. Good job!',
      postedDate: 'Posted Date:',
      awaitingAudit: 'Awaiting Audit',
      reconcileBtn: 'Reconcile',
      auditGuideline: 'Internal Audit Guideline',
      guidelineText: 'According to standard global compliance protocols (such as IFRS Section 9), all regional subsidiary outflows exceeding a nominal limit must be cross-matched with formal bank assertions.',
      requiredVerifications: 'Required Verifications:',
      verifyTaxId: 'Verify counterparty corporate Tax registration details.',
      verifyConversions: 'Double check local currency conversions against spot-rates.',
      verifyPricing: 'Ensure proper transfer pricing mark-ups are documented.',
      askAiPricing: 'Need automatic transfer pricing margins? Ask the AI Consultant tab for smart structural suggestions.',
      sandboxTitle: 'Tax Calculation Sandbox',
      selectScope: 'Select Scope',
      customSandbox: 'Custom Simulation Sandbox',
      grossRevenue: 'Gross Revenue (USD equivalent)',
      deductibleExpenses: 'Deductible Operating Expenses',
      nonDeductible: 'Non-deductible adjustments',
      runSimulation: 'Run Juridical Tax Simulation',
      effectiveTaxRate: 'Effective Tax Rate',
      taxableIncome: 'Taxable Income',
      simulatedLiability: 'Simulated Liability',
      netMargin: 'Net Margin after Tax',
      formulaBreakdown: 'Audit Formula Breakdown',
      applyProjectionDesc: 'Apply this simulated corporate liability directly to update the global accruals monitor.',
      applyProjectionBtn: 'Apply Projection',
      configureParams: 'Configure your parameters on the left and run the corporate tax projection.',
      poweredByGemini: 'Online — Powered by Gemini AI (Server-secure)',
      regulatoryScope: 'Regulatory scope: 2026/2027',
      welcomeMsg: 'Welcome to the Navigator Pro AI Consultant! I can assist you with global tax policies, corporate structure options (e.g. GmbH vs LLC), ledger reconciliation queries, Transfer Pricing principles, and IFRS/US-GAAP guidelines. How can I help you today?',
      thinkingMsg: 'Consultant agent is thinking and indexing corporate guidelines...',
      promptSeed1: 'Simulate transfer pricing model between US holding and German GmbH',
      promptSeed2: 'What is the partial exemption formula for Singapore corporate tax?',
      promptSeed3: 'Explain Brazilian social contributions (CSLL + IRPJ) for technology entities.',
      addEntityModalTitle: 'Add New Legal Entity',
      registeredName: 'Entity Registered Name',
      postLedgerTitle: 'Post General Ledger Line',
      chooseEntity: '-- Choose Corporate Entity --',
      postingType: 'Posting Type',
      creditOption: 'Credit (Revenue Inflow)',
      debitOption: 'Debit (Cost Outflow)',
      amountLabel: 'Amount (USD equivalent)',
      auditStatusLabel: 'Audit Status',
      pendingAudit: 'Pending Audit (Unreconciled)',
      approvedReconciled: 'Approved & Reconciled',
      registerEntityBtn: 'Register Entity',
      postLedgerBtn: 'Post Ledger Line',
      quickFilter: 'Quick filter entities...',
      leadFinancialOfficer: 'Lead Financial Officer',
      appSlogan: 'Global Ledger',
      welcomeOnboarding: 'Welcome to Navigator Pro',
      welcomeOnboardingDesc: 'Please select your preferred language to begin managing your global corporate ledger.',
      getStartedBtn: 'Get Started',
      deleteConfirmQuestion: 'Are you sure you want to delete this legal entity? All associated ledger data remains historical.',
      appAppliedAccrual: 'Successfully applied estimated tax projection of ${amount} to {name}\'s global tax liability.'
    }
  },

  'fr': {
    nav: {
      dashboard: 'Tableau de bord',
      countries: 'Pays',
      reports: 'Rapports',
      accounting: 'Comptabilité',
      invoicing: 'Facturation',
      payroll: 'Paie',
      compliance: 'Conformité',
      aiAccountant: 'Comptable IA',
      chartBuilder: 'Créateur de graphiques',
      documents: 'Documents',
      settings: 'Paramètres',
      logout: 'Déconnexion',
    },
    actions: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      create: 'Créer',
      generate: 'Générer',
      download: 'Télécharger',
      print: 'Imprimer',
      copy: 'Copier',
      search: 'Rechercher',
      filter: 'Filtrer',
      refresh: 'Actualiser',
      back: 'Retour',
      next: 'Suivant',
      confirm: 'Confirmer',
      close: 'Fermer',
      upload: 'Téléverser un fichier',
      export: 'Exporter',
      import: 'Importer',
    },
    messages: {
      loading: 'Chargement...',
      saving: 'Enregistrement...',
      generating: 'Génération du document...',
      success: 'Opération réalisée avec succès !',
      error: 'Une erreur est survenue. Veuillez réessayer.',
      noData: 'Aucune donnée trouvée.',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer ?',
      sessionExpired: 'Session expirée. Veuillez vous reconnecter.',
    },
    dashboard: {
      title: 'Tableau de bord global',
      activeCountries: 'Pays actifs',
      pendingObligations: 'Obligations en attente',
      invoicesIssued: 'Factures émises',
      aiAccuracy: 'Précision de l\'IA',
      recentActivity: 'Activité récente',
      complianceDeadlines: 'Échéances de conformité',
      activityByRegion: 'Activité par région',
      updateData: 'Mettre à jour les données',
    },
    ai: {
      aiAccountant: 'Comptable IA',
      askQuestion: 'Posez une question de comptabilité...',
      generateDocument: 'Générer le document',
      selectDocumentType: 'Sélectionner le type de document',
      selectCountry: 'Sélectionner le pays',
      documentReady: 'Document généré avec succès !',
      generating: 'L\'IA génère votre document...',
    },
    formats: {
      dateFormat: 'DD/MM/YYYY',
      currency: '€',
      currencyCode: 'EUR',
      numberSeparator: ',',
      thousandSeparator: ' ',
    },
    extra: {
      accountTier: 'Niveau du compte',
      enterpriseUnlimited: 'Entreprise Illimitée',
      secure: 'Sécurisé',
      financialConsole: 'Console Financière',
      entitiesMonitor: 'Moniteur des Entités Juridiques',
      ledgerTitle: 'Grand Livre Général Unifié',
      reconciliationsTitle: 'Atelier de Rapprochement Interne',
      taxPlannerTitle: 'Simulateur d\'Impôt sur les Sociétés',
      aiConsultantTitle: 'Consultant Fiscal IA Global',
      corporateRegistrations: 'Enregistrements',
      activeOperational: 'actifs opérationnels',
      unreconciledLines: 'Lignes Non Rapprochées',
      actionRequired: 'Action requise dans le Grand Livre',
      balancedLedger: 'Synchronisation équilibrée',
      estimatedTaxAccrual: 'Impôt Estimé Provisionné',
      realtimeEstimate: 'Estimation en temps réel (T3/T4)',
      avgComplianceIndex: 'Indice Moyen de Conformité',
      revenueByEntity: 'Chiffre d\'Affaires par Entité',
      revenueDistribution: 'Représentation comparative des juridictions',
      revenueLegend: 'Revenu (Equivalent USD)',
      urgentTasks: 'Tâches et Actions Urgentes',
      ledgerOutBalance: 'Grand Livre Non Équilibré',
      pendingLinesReview: 'Il y a {count} lignes en attente de révision.',
      allLinesReconciled: 'Toutes les Lignes Rapprochées',
      ledgerFullyReconciled: 'Votre grand livre général mondial est entièrement rapproché.',
      complianceWarning: 'Avertissement de Conformité',
      flaggedAudit: '{entities} signalées pour un audit juridictionnel.',
      aiConsultantReady: 'Consultant IA Global Prêt',
      aiConsultantDesc: 'Analysez instantanément les prix de transfert, les failles fiscales et la conformité.',
      autosaveEnabled: 'Sauvegarde automatique cloud activée',
      legalEntitiesList: 'Entités Juridiques Internationales',
      holdingSummary: 'Liste récapitulative des participations de l\'entreprise',
      addEntity: 'Ajouter l\'entité',
      manageAll: 'Gérer Tout',
      entityName: 'Nom de l\'entité',
      taxId: 'ID Fiscale',
      jurisdiction: 'Juridiction / Région',
      syncStatus: 'Statut Sync',
      taxPolicyRate: 'Taux d\'imposition',
      annualIncome: 'Revenu Annualisé',
      filterRegion: 'Juridiction Régionale',
      filterStatus: 'Statut de Synchronisation',
      resetFilters: 'Réinitialiser les Filtres',
      clearFilters: 'Effacer les filtres',
      allRegions: 'Toutes les Régions',
      allStatuses: 'Tous les Statuts',
      active: 'Actif',
      review: 'Révision',
      idle: 'Inactif',
      complianceScore: 'Score de Conformité',
      annualRevenue: 'Revenu Annualisé',
      actionsHeader: 'Actions',
      noEntitiesFound: 'Aucune entité ne correspond aux critères de recherche.',
      calcTaxProjection: 'Calculer la projection fiscale simulée',
      removeRecord: 'Supprimer le dossier de l\'entreprise',
      logTransaction: 'Enregistrer une transaction',
      postingsRecord: 'Historique des écritures',
      entityScope: 'Périmètre :',
      allEntityGroup: 'Tout le groupe',
      postingDate: 'Date d\'écriture',
      journalDesc: 'Description du journal',
      accountCategory: 'Catégorie de compte',
      debitCost: 'Débit (Coût)',
      creditRevenue: 'Crédit (Revenu)',
      unresolvedJournals: 'Écritures de journal non résolues',
      allBalancedVerified: 'Toutes les transactions sont équilibrées et vérifiées. Bon travail !',
      postedDate: 'Date de publication :',
      awaitingAudit: 'En attente d\'audit',
      reconcileBtn: 'Rapprocher',
      auditGuideline: 'Directive d\'audit interne',
      guidelineText: 'Conformément aux protocoles mondiaux (tels que l\'IFRS 9), tous les flux sortants dépassant une limite nominale doivent faire l\'objet d\'un rapprochement bancaire formel.',
      requiredVerifications: 'Vérifications Requises :',
      verifyTaxId: 'Vérifier l\'enregistrement fiscal de la contrepartie.',
      verifyConversions: 'Double-vérifier les conversions de devises au taux du jour.',
      verifyPricing: 'Garantir que les marges de prix de transfert sont documentées.',
      askAiPricing: 'Besoin d\'aide sur les marges ? Demandez au comptable IA des suggestions structurelles.',
      sandboxTitle: 'Sandbox de calcul fiscal',
      selectScope: 'Sélectionner l\'entité',
      customSandbox: 'Sandbox de simulation personnalisé',
      grossRevenue: 'Revenu Brut (Equivalent USD)',
      deductibleExpenses: 'Charges d\'exploitation déductibles',
      nonDeductible: 'Réintégrations fiscales',
      runSimulation: 'Lancer la simulation fiscale',
      effectiveTaxRate: 'Taux d\'imposition effectif',
      taxableIncome: 'Résultat Fiscal',
      simulatedLiability: 'Impôt Estimé',
      netMargin: 'Marge nette après impôt',
      formulaBreakdown: 'Détail de la formule d\'audit',
      applyProjectionDesc: 'Appliquer cette simulation d\'impôt directement pour mettre à jour les provisions globales.',
      applyProjectionBtn: 'Appliquer la projection',
      configureParams: 'Configurez vos paramètres à gauche et lancez la projection d\'impôt.',
      poweredByGemini: 'En ligne — Propulsé par Gemini AI (Sécurisé)',
      regulatoryScope: 'Périmètre réglementaire : 2026/2027',
      welcomeMsg: 'Bienvenue sur le Consultant Fiscal IA ! Je peux vous aider sur les règles d\'imposition, les structures juridiques (GmbH vs LLC), le rapprochement de comptes et les normes IFRS / US-GAAP. Comment puis-je vous aider aujourd\'hui ?',
      thinkingMsg: 'Le comptable IA analyse les règles internationales...',
      promptSeed1: 'Simuler le prix de transfert entre une holding US et une GmbH allemande',
      promptSeed2: 'Quelle est la formule d\'exonération partielle à Singapour ?',
      promptSeed3: 'Expliquer le fonctionnement des taxes CSLL et IRPJ pour la tech au Brésil.',
      addEntityModalTitle: 'Ajouter une nouvelle entité juridique',
      registeredName: 'Nom social enregistré',
      postLedgerTitle: 'Enregistrer une écriture au Grand Livre',
      chooseEntity: '-- Choisir l\'entité juridique --',
      postingType: 'Type d\'écriture',
      creditOption: 'Crédit (Entrée de Revenu)',
      debitOption: 'Débit (Sortie de Charge)',
      amountLabel: 'Montant (Equivalent USD)',
      auditStatusLabel: 'Statut de rapprochement',
      pendingAudit: 'En attente d\'audit (Non Rapproché)',
      approvedReconciled: 'Approuvé & Rapproché',
      registerEntityBtn: 'Enregistrer l\'entité',
      postLedgerBtn: 'Poster l\'écriture',
      quickFilter: 'Rechercher une entité...',
      leadFinancialOfficer: 'Directeur Financier Principal',
      appSlogan: 'Grand Livre',
      welcomeOnboarding: 'Bienvenue sur Navigator Pro',
      welcomeOnboardingDesc: 'Veuillez sélectionner votre langue préférée pour commencer à gérer votre grand livre général mondial.',
      getStartedBtn: 'Commencer',
      deleteConfirmQuestion: 'Êtes-vous sûr de vouloir supprimer cette entité ? Toutes les écritures historiques restent archivées.',
      appAppliedAccrual: 'Projection fiscale de {amount} appliquée avec succès à la provision de l\'entité {name}.'
    }
  },

  'de': {
    nav: {
      dashboard: 'Dashboard',
      countries: 'Länder',
      reports: 'Berichte',
      accounting: 'Buchhaltung',
      invoicing: 'Rechnungsstellung',
      payroll: 'Gehaltsabrechnung',
      compliance: 'Compliance',
      aiAccountant: 'KI-Buchhalter',
      chartBuilder: 'Diagramm-Editor',
      documents: 'Dokumente',
      settings: 'Einstellungen',
      logout: 'Abmelden',
    },
    actions: {
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      create: 'Erstellen',
      generate: 'Generieren',
      download: 'Herunterladen',
      print: 'Drucken',
      copy: 'Kopieren',
      search: 'Suchen',
      filter: 'Filtern',
      refresh: 'Aktualisieren',
      back: 'Zurück',
      next: 'Weiter',
      confirm: 'Bestätigen',
      close: 'Schließen',
      upload: 'Datei hochladen',
      export: 'Exportieren',
      import: 'Importieren',
    },
    messages: {
      loading: 'Wird geladen...',
      saving: 'Wird gespeichert...',
      generating: 'Dokument wird erstellt...',
      success: 'Vorgang erfolgreich abgeschlossen!',
      error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      noData: 'Keine Daten gefunden.',
      confirmDelete: 'Sind Sie sicher, dass Sie löschen möchten?',
      sessionExpired: 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.',
    },
    dashboard: {
      title: 'Globales Dashboard',
      activeCountries: 'Aktive Länder',
      pendingObligations: 'Offene Verpflichtungen',
      invoicesIssued: 'Ausgestellte Rechnungen',
      aiAccuracy: 'KI-Genauigkeit',
      recentActivity: 'Kürzliche Aktivitäten',
      complianceDeadlines: 'Compliance-Fristen',
      activityByRegion: 'Aktivität nach Region',
      updateData: 'Daten aktualisieren',
    },
    ai: {
      aiAccountant: 'KI-Buchhalter',
      askQuestion: 'Stellen Sie eine Buchhaltungsfrage...',
      generateDocument: 'Dokument generieren',
      selectDocumentType: 'Dokumenttyp auswählen',
      selectCountry: 'Land auswählen',
      documentReady: 'Dokument erfolgreich generiert!',
      generating: 'Die KI generiert Ihr Dokument...',
    },
    formats: {
      dateFormat: 'DD.MM.YYYY',
      currency: '€',
      currencyCode: 'EUR',
      numberSeparator: ',',
      thousandSeparator: '.',
    },
    extra: {
      accountTier: 'Konto-Stufe',
      enterpriseUnlimited: 'Enterprise Unbegrenzt',
      secure: 'Sicher',
      financialConsole: 'Finanzkonsole',
      entitiesMonitor: 'Überwachung der juristischen Personen',
      ledgerTitle: 'Einheitliches Hauptbuch',
      reconciliationsTitle: 'Interne Abstimmungswerkstatt',
      taxPlannerTitle: 'Internationaler Körperschaftsteuersimulator',
      aiConsultantTitle: 'KI-Steuerberater',
      corporateRegistrations: 'Registrierungen',
      activeOperational: 'aktiv im Betrieb',
      unreconciledLines: 'Nicht abgestimmte Buchungen',
      actionRequired: 'Aktion im Hauptbuch erforderlich',
      balancedLedger: 'Abgeglichene Hauptbuch-Sychronisation',
      estimatedTaxAccrual: 'Geschätzte Steuerabgrenzung',
      realtimeEstimate: 'Echtzeitschätzung (Q3/Q4)',
      avgComplianceIndex: 'Durchschn. Compliance-Index',
      revenueByEntity: 'Unternehmensumsatz nach Einheit',
      revenueDistribution: 'Vergleichsdarstellung über aktive Regionen',
      revenueLegend: 'Umsatz (USD-Äquivalent)',
      urgentTasks: 'Dringende Aufgaben & Aktionen',
      ledgerOutBalance: 'Hauptbuch nicht ausgeglichen',
      pendingLinesReview: 'Es gibt {count} offene Zeilen zur Überprüfung.',
      allLinesReconciled: 'Alle Buchungen abgestimmt',
      ledgerFullyReconciled: 'Ihr globales Hauptbuch ist vollständig abgestimmt.',
      complianceWarning: 'Compliance-Warnung',
      flaggedAudit: '{entities} für länderspezifisches Audit markiert.',
      aiConsultantReady: 'KI-Steuerberater bereit',
      aiConsultantDesc: 'Analysieren Sie Verrechnungspreise, Steuerschlupflöcher und Compliance-Regeln sofort.',
      autosaveEnabled: 'Automatische Cloud-Speicherung aktiv',
      legalEntitiesList: 'Internationale juristische Personen',
      holdingSummary: 'Übersichtsliste der aktuellen Unternehmensbeteiligungen',
      addEntity: 'Einheit hinzufügen',
      manageAll: 'Alle verwalten',
      entityName: 'Name der Einheit',
      taxId: 'Steuernummer',
      jurisdiction: 'Gerichtsstand / Region',
      syncStatus: 'Sync-Status',
      taxPolicyRate: 'Steuersatz',
      annualIncome: 'Annualisierter Umsatz',
      filterRegion: 'Zuständige Region',
      filterStatus: 'Sync-Status',
      resetFilters: 'Filter zurücksetzen',
      clearFilters: 'Filter löschen',
      allRegions: 'Alle Regionen',
      allStatuses: 'Alle Status',
      active: 'Aktiv',
      review: 'Überprüfung',
      idle: 'Inaktiv',
      complianceScore: 'Compliance-Score',
      annualRevenue: 'Annualisierter Umsatz',
      actionsHeader: 'Aktionen',
      noEntitiesFound: 'Keine Unternehmenseinheiten entsprechen den Filterkriterien.',
      calcTaxProjection: 'Berechne geschätzte Steuerprojektion',
      removeRecord: 'Unternehmensdatensatz entfernen',
      logTransaction: 'Buchung erfassen',
      postingsRecord: 'Hauptbucheinträge',
      entityScope: 'Einheiten-Bereich:',
      allEntityGroup: 'Gesamte Unternehmensgruppe',
      postingDate: 'Buchungsdatum',
      journalDesc: 'Journalbeschreibung',
      accountCategory: 'Kontokategorie',
      debitCost: 'Soll (Aufwand)',
      creditRevenue: 'Haben (Ertrag)',
      unresolvedJournals: 'Nicht ausgeglichene Journaleinträge',
      allBalancedVerified: 'Alle Transaktionen sind ausgeglichen und verifiziert. Gute Arbeit!',
      postedDate: 'Veröffentlichungsdatum:',
      awaitingAudit: 'Wartet auf Prüfung',
      reconcileBtn: 'Abstimmen',
      auditGuideline: 'Interne Revisionsrichtlinie',
      guidelineText: 'Nach globalen Compliance-Standards (wie IFRS 9) müssen alle länderspezifischen Abflüsse über einem nominalen Limit mit Bankbelegen abgeglichen werden.',
      requiredVerifications: 'Erforderliche Überprüfungen:',
      verifyTaxId: 'Steuernummer der Gegenpartei prüfen.',
      verifyConversions: 'Währungsumrechnungen mit aktuellem Kurs abgleichen.',
      verifyPricing: 'Verrechnungspreis-Dokumentation sicherstellen.',
      askAiPricing: 'Benötigen Sie automatische Margen? Fragen Sie den KI-Buchhalter nach strukturellen Vorschlägen.',
      sandboxTitle: 'Steuersimulations-Sandbox',
      selectScope: 'Bereich auswählen',
      customSandbox: 'Eigene Simulations-Sandbox',
      grossRevenue: 'Bruttoumsatz (USD-Äquivalent)',
      deductibleExpenses: 'Abzugsfähige Betriebsausgaben',
      nonDeductible: 'Nicht abzugsfähige Hinzurechnungen',
      runSimulation: 'Steuersimulation starten',
      effectiveTaxRate: 'Effektiver Steuersatz',
      taxableIncome: 'Zu versteuerndes Einkommen',
      simulatedLiability: 'Steuerbelastung',
      netMargin: 'Nettomarge nach Steuern',
      formulaBreakdown: 'Prüfungsformel-Details',
      applyProjectionDesc: 'Wenden Sie diese Steuersimulation direkt an, um die globalen Rückstellungen zu aktualisieren.',
      applyProjectionBtn: 'Projektion anwenden',
      configureParams: 'Konfigurieren Sie die Parameter links und starten Sie die Körperschaftsteuerschätzung.',
      poweredByGemini: 'Online — Unterstützt durch Gemini KI (Sicher)',
      regulatoryScope: 'Regulatorischer Bereich: 2026/2027',
      welcomeMsg: 'Willkommen beim Navigator Pro KI-Steuerberater! Ich helfe Ihnen bei globalen Steuerrichtlinien, Unternehmensstrukturen (z.B. GmbH vs. LLC), Buchungsabstimmungen, Verrechnungspreisen und IFRS/US-GAAP. Wie kann ich heute helfen?',
      thinkingMsg: 'Der KI-Berater analysiert internationale Steuerrichtlinien...',
      promptSeed1: 'Verrechnungspreis zwischen US-Holding und deutscher GmbH simulieren',
      promptSeed2: 'Wie funktioniert die Teilsteuerbefreiung in Singapur?',
      promptSeed3: 'Erkläre die CSLL- & IRPJ-Besteuerung für IT-Unternehmen in Brasilien.',
      addEntityModalTitle: 'Neue juristische Person hinzufügen',
      registeredName: 'Eingetragener Firmenname',
      postLedgerTitle: 'Hauptbuchzeile buchen',
      chooseEntity: '-- Unternehmenseinheit wählen --',
      postingType: 'Buchungsart',
      creditOption: 'Haben (Einnahme)',
      debitOption: 'Soll (Ausgabe)',
      amountLabel: 'Betrag (USD-Äquivalent)',
      auditStatusLabel: 'Prüfstatus',
      pendingAudit: 'Prüfung ausstehend (Nicht abgestimmt)',
      approvedReconciled: 'Genehmigt & Abgestimmt',
      registerEntityBtn: 'Einheit registrieren',
      postLedgerBtn: 'Im Hauptbuch buchen',
      quickFilter: 'Einheiten filtern...',
      leadFinancialOfficer: 'Leitender Finanzvorstand',
      appSlogan: 'Hauptbuch',
      welcomeOnboarding: 'Willkommen bei Navigator Pro',
      welcomeOnboardingDesc: 'Bitte wählen Sie Ihre bevorzugte Sprache aus, um Ihr globales Hauptbuch zu verwalten.',
      getStartedBtn: 'Loslegen',
      deleteConfirmQuestion: 'Sind Sie sicher, dass Sie diese Einheit löschen möchten? Alle historischen Hauptbuchdaten bleiben erhalten.',
      appAppliedAccrual: 'Erfolgreich geschätzte Steuerbelastung von ${amount} auf {name}\'s Steuerrückstellung angewendet.'
    }
  },

  'ru': {
    nav: {
      dashboard: 'Панель управления',
      countries: 'Страны',
      reports: 'Отчёты',
      accounting: 'Бухгалтерия',
      invoicing: 'Выставление счетов',
      payroll: 'Расчёт зарплат',
      compliance: 'Соответствие',
      aiAccountant: 'ИИ-бухгалтер',
      chartBuilder: 'Конструктор графиков',
      documents: 'Документы',
      settings: 'Настройки',
      logout: 'Выйти',
    },
    actions: {
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      generate: 'Создать',
      download: 'Скачать',
      print: 'Печать',
      copy: 'Копировать',
      search: 'Поиск',
      filter: 'Фильтр',
      refresh: 'Обновить',
      back: 'Назад',
      next: 'Далее',
      confirm: 'Подтвердить',
      close: 'Закрыть',
      upload: 'Загрузить файл',
      export: 'Экспорт',
      import: 'Импорт',
    },
    messages: {
      loading: 'Загрузка...',
      saving: 'Сохранение...',
      generating: 'Создание документа...',
      success: 'Операция выполнена успешно!',
      error: 'Произошла ошибка. Пожалуйста, попробуйте снова.',
      noData: 'Данные не найдены.',
      confirmDelete: 'Вы уверены, что хотите удалить?',
      sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
    },
    dashboard: {
      title: 'Глобальная панель',
      activeCountries: 'Активные страны',
      pendingObligations: 'Ожидающие обязательства',
      invoicesIssued: 'Выставленные счета',
      aiAccuracy: 'Точность ИИ',
      recentActivity: 'Последние действия',
      complianceDeadlines: 'Сроки соблюдения требований',
      activityByRegion: 'Активность по регионам',
      updateData: 'Обновить данные',
    },
    ai: {
      aiAccountant: 'ИИ-бухгалтер',
      askQuestion: 'Задайте бухгалтерский вопрос...',
      generateDocument: 'Создать документ',
      selectDocumentType: 'Выберите тип документа',
      selectCountry: 'Выберите страну',
      documentReady: 'Документ успешно создан!',
      generating: 'ИИ создает ваш документ...',
    },
    formats: {
      dateFormat: 'DD.MM.YYYY',
      currency: '₽',
      currencyCode: 'RUB',
      numberSeparator: ',',
      thousandSeparator: ' ',
    },
    extra: {
      accountTier: 'Уровень аккаунта',
      enterpriseUnlimited: 'Корпоративный безлимитный',
      secure: 'Защищено',
      financialConsole: 'Финансовая консоль',
      entitiesMonitor: 'Мониторинг юридических лиц',
      ledgerTitle: 'Единая главная книга',
      reconciliationsTitle: 'Внутренний аудит и сверка',
      taxPlannerTitle: 'Симулятор международного корпоративного налога',
      aiConsultantTitle: 'ИИ-консультант по налогам',
      corporateRegistrations: 'Корпоративные регистрации',
      activeOperational: 'активных филиалов',
      unreconciledLines: 'Несогласованные строки',
      actionRequired: 'Требуется действие в Главной книге',
      balancedLedger: 'Сбалансированная синхронизация книги',
      estimatedTaxAccrual: 'Оценочные налоговые начисления',
      realtimeEstimate: 'Оценка в реальном времени (Q3/Q4)',
      avgComplianceIndex: 'Средний индекс соответствия',
      revenueByEntity: 'Корпоративный доход по филиалам',
      revenueDistribution: 'Сравнительное представление по юрисдикциям',
      revenueLegend: 'Выручка (в эквиваленте USD)',
      urgentTasks: 'Срочные задачи и действия',
      ledgerOutBalance: 'Дисбаланс главной книги',
      pendingLinesReview: 'Имеется {count} строк, ожидающих проверки.',
      allLinesReconciled: 'Все строки согласованы',
      ledgerFullyReconciled: 'Ваша глобальная корпоративная книга полностью согласована.',
      complianceWarning: 'Предупреждение о соответствии',
      flaggedAudit: 'Филиалы {entities} отмечены для проверки соответствия.',
      aiConsultantReady: 'ИИ-консультант готов к работе',
      aiConsultantDesc: 'Анализируйте трансфертное ценообразование, налоговые льготы и правила соответствия.',
      autosaveEnabled: 'Автосохранение в облако включено',
      legalEntitiesList: 'Международные юридические лица',
      holdingSummary: 'Сводный список корпоративных активов на панели',
      addEntity: 'Добавить филиал',
      manageAll: 'Управлять всеми',
      entityName: 'Название филиала',
      taxId: 'Налоговый ID',
      jurisdiction: 'Юрисдикция / Регион',
      syncStatus: 'Статус синхронизации',
      taxPolicyRate: 'Ставка налога',
      annualIncome: 'Годовой доход',
      filterRegion: 'Региональная юрисдикция',
      filterStatus: 'Статус синхронизации',
      resetFilters: 'Сбросить фильтры',
      clearFilters: 'Очистить фильтры',
      allRegions: 'Все регионы',
      allStatuses: 'Все статусы',
      active: 'Активен',
      review: 'Проверка',
      idle: 'Неактивен',
      complianceScore: 'Индекс соответствия',
      annualRevenue: 'Годовой доход',
      actionsHeader: 'Действия',
      noEntitiesFound: 'Нет юридических лиц, соответствующих критериям фильтра.',
      calcTaxProjection: 'Рассчитать прогноз налоговых обязательств',
      removeRecord: 'Удалить корпоративную запись',
      logTransaction: 'Записать операцию',
      postingsRecord: 'Проводки в главной книге',
      entityScope: 'Область сверки:',
      allEntityGroup: 'Вся группа компаний',
      postingDate: 'Дата проводки',
      journalDesc: 'Описание проводки',
      accountCategory: 'Категория счета',
      debitCost: 'Дебет (Расход)',
      creditRevenue: 'Кредит (Доход)',
      unresolvedJournals: 'Несогласованные записи в книге',
      allBalancedVerified: 'Все транзакции сбалансированы и проверены. Отличная работа!',
      postedDate: 'Дата проводки:',
      awaitingAudit: 'Ожидает аудита',
      reconcileBtn: 'Согласовать',
      auditGuideline: 'Руководство по внутреннему аудиту',
      guidelineText: 'В соответствии со стандартами глобального аудита (такими как МСФО (IFRS) 9), все региональные оттоки средств, превышающие номинальный лимит, должны быть сопоставлены с банковскими выписками.',
      requiredVerifications: 'Обязательные проверки:',
      verifyTaxId: 'Проверить налоговую регистрацию контрагента.',
      verifyConversions: 'Проверить валютные операции по текущему спот-курсу.',
      verifyPricing: 'Обеспечить документирование трансфертного ценообразования.',
      askAiPricing: 'Нужны автоматические расчеты трансфертного ценообразования? Спросите ИИ-бухгалтера.',
      sandboxTitle: 'Песочница расчета налогов',
      selectScope: 'Выберите область',
      customSandbox: 'Песочница кастомной симуляции',
      grossRevenue: 'Валовая выручка (эквивалент USD)',
      deductibleExpenses: 'Вычитаемые операционные расходы',
      nonDeductible: 'Внереализационные корректировки',
      runSimulation: 'Запустить расчет налога',
      effectiveTaxRate: 'Эффективная ставка налога',
      taxableIncome: 'Облагаемый доход',
      simulatedLiability: 'Прогнозируемый налог',
      netMargin: 'Чистая маржа после налогов',
      formulaBreakdown: 'Формула детального расчета',
      applyProjectionDesc: 'Применить рассчитанный корпоративный налог напрямую для обновления глобальных резервов.',
      applyProjectionBtn: 'Применить прогноз',
      configureParams: 'Настройте параметры слева и запустите расчет корпоративного налога.',
      poweredByGemini: 'В сети — На базе ИИ Gemini (Безопасное соединение)',
      regulatoryScope: 'Нормативная база: 2026/2027 гг.',
      welcomeMsg: 'Добро пожаловать в ИИ-консультант Navigator Pro! Я помогу вам с вопросами трансфертного ценообразования, МСФО/US GAAP, структуры компаний (GmbH vs LLC) и сверки счетов. Как я могу помочь сегодня?',
      thinkingMsg: 'Консультант анализирует международные стандарты...',
      promptSeed1: 'Симулировать трансфертное ценообразование между холдингом США и GmbH Германии',
      promptSeed2: 'Какая формула частичного освобождения от налогов в Сингапуре?',
      promptSeed3: 'Объясните особенности уплаты налогов CSLL и IRPJ для ИТ-компаний в Бразилии.',
      addEntityModalTitle: 'Добавить новое юридическое лицо',
      registeredName: 'Зарегистрированное название компании',
      postLedgerTitle: 'Провести строку в главной книге',
      chooseEntity: '-- Выберите юридическое лицо --',
      postingType: 'Тип проводки',
      creditOption: 'Кредит (Поступление дохода)',
      debitOption: 'Дебет (Расход средств)',
      amountLabel: 'Сумма (эквивалент USD)',
      auditStatusLabel: 'Аудиторский статус',
      pendingAudit: 'Ожидает аудита (Не согласованы)',
      approvedReconciled: 'Одобрено и согласовано',
      registerEntityBtn: 'Зарегистрировать компанию',
      postLedgerBtn: 'Провести в главной книге',
      quickFilter: 'Поиск филиалов...',
      leadFinancialOfficer: 'Ведущий финансовый директор',
      appSlogan: 'Главная Книга',
      welcomeOnboarding: 'Добро пожаловать в Navigator Pro',
      welcomeOnboardingDesc: 'Пожалуйста, выберите предпочитаемый язык, чтобы начать управлять вашей глобальной корпоративной книгой.',
      getStartedBtn: 'Начать работу',
      deleteConfirmQuestion: 'Вы уверены, что хотите удалить это юридическое лицо? Все связанные исторические данные в книге сохранятся.',
      appAppliedAccrual: 'Успешно применен оценочный налог в размере ${amount} к налоговым обязательствам {name}.'
    }
  },

  'es': {
    nav: {
      dashboard: 'Panel',
      countries: 'Países',
      reports: 'Informes',
      accounting: 'Contabilidad',
      invoicing: 'Facturación',
      payroll: 'Nómina',
      compliance: 'Cumplimiento',
      aiAccountant: 'Contador IA',
      chartBuilder: 'Constructor de gráficos',
      documents: 'Documentos',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
    },
    actions: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      generate: 'Generar',
      download: 'Descargar',
      print: 'Imprimir',
      copy: 'Copiar',
      search: 'Buscar',
      filter: 'Filtrar',
      refresh: 'Actualizar',
      back: 'Volver',
      next: 'Siguiente',
      confirm: 'Confirmar',
      close: 'Cerrar',
      upload: 'Subir archivo',
      export: 'Exportar',
      import: 'Importar',
    },
    messages: {
      loading: 'Cargando...',
      saving: 'Guardando...',
      generating: 'Generando documento...',
      success: '¡Operación realizada con éxito!',
      error: 'Se produjo un error. Por favor, inténtelo de nuevo.',
      noData: 'No se encontraron datos.',
      confirmDelete: '¿Estás seguro de que deseas eliminar?',
      sessionExpired: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
    },
    dashboard: {
      title: 'Panel Global',
      activeCountries: 'Países activos',
      pendingObligations: 'Obligaciones pendientes',
      invoicesIssued: 'Facturas emitidas',
      aiAccuracy: 'Precisión de la IA',
      recentActivity: 'Actividad reciente',
      complianceDeadlines: 'Plazos de cumplimiento',
      activityByRegion: 'Actividad por región',
      updateData: 'Actualizar datos',
    },
    ai: {
      aiAccountant: 'Contador IA',
      askQuestion: 'Haga una pregunta contable...',
      generateDocument: 'Generar Documento',
      selectDocumentType: 'Seleccionar tipo de documento',
      selectCountry: 'Seleccionar país',
      documentReady: '¡Documento generado con éxito!',
      generating: 'La IA está generando su documento...',
    },
    formats: {
      dateFormat: 'DD/MM/YYYY',
      currency: '€',
      currencyCode: 'EUR',
      numberSeparator: ',',
      thousandSeparator: '.',
    },
    extra: {
      accountTier: 'Nivel de Cuenta',
      enterpriseUnlimited: 'Enterprise Ilimitado',
      secure: 'Seguro',
      financialConsole: 'Consola Financiera',
      entitiesMonitor: 'Monitor de Entidades Corporativas y Legales',
      ledgerTitle: 'Libro Mayor Unificado',
      reconciliationsTitle: 'Taller de Conciliación Interna',
      taxPlannerTitle: 'Simulador de Impuesto de Sociedades Internacional',
      aiConsultantTitle: 'Consultor de Impuestos Globales IA',
      corporateRegistrations: 'Registros Corporativos',
      activeOperational: 'activos en funcionamiento',
      unreconciledLines: 'Líneas no Conciliadas',
      actionRequired: 'Acción requerida en el Libro Mayor',
      balancedLedger: 'Sincronización de libro conciliada',
      estimatedTaxAccrual: 'Acumulación de Impuesto Estimada',
      realtimeEstimate: 'Estimación en tiempo real (Q3/Q4)',
      avgComplianceIndex: 'Índice de Cumplimiento Promedio',
      revenueByEntity: 'Ingresos Corporativos por Entidad',
      revenueDistribution: 'Representación comparativa entre jurisdicciones',
      revenueLegend: 'Ingresos (Equivalente en USD)',
      urgentTasks: 'Tareas y Acciones Urgentes',
      ledgerOutBalance: 'Libro Mayor Desbalanceado',
      pendingLinesReview: 'Hay {count} líneas pendientes de revisión.',
      allLinesReconciled: 'Todas las Líneas Conciliadas',
      ledgerFullyReconciled: 'Su libro mayor corporativo global está completamente conciliado.',
      complianceWarning: 'Aviso de Cumplimiento',
      flaggedAudit: '{entities} señaladas para auditoría jurisdiccional.',
      aiConsultantReady: 'Consultor de IA Global Listo',
      aiConsultantDesc: 'Analice precios de transferencia, vacíos legales y reglas de cumplimiento al instante.',
      autosaveEnabled: 'Guardado automático en la nube activado',
      legalEntitiesList: 'Entidades Legales Internacionales',
      holdingSummary: 'Resumen en el panel de las participaciones corporativas actuales',
      addEntity: 'Añadir Entidad',
      manageAll: 'Gestionar Todas',
      entityName: 'Nombre de la Entidade',
      taxId: 'ID Fiscal',
      jurisdiction: 'Jurisdicción / Región',
      syncStatus: 'Estado de Sincronización',
      taxPolicyRate: 'Tasa Fiscal',
      annualIncome: 'Ingresos Anualizados',
      filterRegion: 'Jurisdicción de la Región',
      filterStatus: 'Estado de Sincronización',
      resetFilters: 'Restablecer Filtros',
      clearFilters: 'Limpiar filtros',
      allRegions: 'Todas las Regiones',
      allStatuses: 'Todos los Estados',
      active: 'Activo',
      review: 'Revisión',
      idle: 'Inactivo',
      complianceScore: 'Puntaje de Cumplimiento',
      annualRevenue: 'Ingresos Anualizados',
      actionsHeader: 'Acciones',
      noEntitiesFound: 'Ninguna entidad corporativa coincide con los criterios de filtrado.',
      calcTaxProjection: 'Calcular proyección de impuesto simulado',
      removeRecord: 'Eliminar Registro Corporativo',
      logTransaction: 'Registrar Transacción',
      postingsRecord: 'Registros de Lançamentos',
      entityScope: 'Alcance de la Entidad:',
      allEntityGroup: 'Todo el Grupo',
      postingDate: 'Fecha de Publicación',
      journalDesc: 'Descripción del Diario',
      accountCategory: 'Categoría de la Cuenta',
      debitCost: 'Débito (Costo)',
      creditRevenue: 'Crédito (Ingreso)',
      unresolvedJournals: 'Asientos de Diario No Resueltos',
      allBalancedVerified: 'Todas las transacciones están conciliadas y verificadas. ¡Buen trabajo!',
      postedDate: 'Fecha de publicación:',
      awaitingAudit: 'Esperando Auditoría',
      reconcileBtn: 'Conciliar',
      auditGuideline: 'Directriz de Auditoría Interna',
      guidelineText: 'De acuerdo con los protocolos globales estándar de cumplimiento (como IFRS Sección 9), todas las salidas de subsidiarias regionales que excedan un límite nominal deben cruzarse con las declaraciones bancarias formales.',
      requiredVerifications: 'Verificaciones Obligatorias:',
      verifyTaxId: 'Verificar los detalles de registro fiscal de la contraparte.',
      verifyConversions: 'Verificar las conversiones de divisas con las tasas actuales.',
      verifyPricing: 'Garantizar que se documenten las márgenes adecuadas de precios de transferencia.',
      askAiPricing: '¿Necesita márgenes automáticas? Pregunte al Contador IA para obtener sugerencias estructurales.',
      sandboxTitle: 'Sandbox de Cálculo de Impuestos',
      selectScope: 'Seleccionar Alcance',
      customSandbox: 'Simulación Personalizada',
      grossRevenue: 'Ingresos Brutos (USD equivalente)',
      deductibleExpenses: 'Gastos Operativos Deducibles',
      nonDeductible: 'Ajustes No Deducibles',
      runSimulation: 'Ejecutar Simulación Fiscal',
      effectiveTaxRate: 'Tasa Fiscal Efectiva',
      taxableIncome: 'Base Imponible',
      simulatedLiability: 'Impuesto Estimado',
      netMargin: 'Margen Neto después de Impuestos',
      formulaBreakdown: 'Desglose de la Fórmula de Auditoría',
      applyProjectionDesc: 'Aplicar esta simulación de impuesto de sociedades directamente para actualizar las provisiones globales.',
      applyProjectionBtn: 'Aplicar Proyección',
      configureParams: 'Configure sus parámetros a la izquierda y ejecute la proyección fiscal de sociedades.',
      poweredByGemini: 'En línea — Impulsado por Gemini AI (Seguro en el servidor)',
      regulatoryScope: 'Ámbito regulatorio: 2026/2027',
      welcomeMsg: '¡Bienvenido al Consultor de IA de Navigator Pro! Puedo ayudarle con políticas fiscales globales, opciones de estructuración corporativa (ej. GmbH vs LLC), conciliación de libros, precios de transferencia y directrices IFRS/US-GAAP. ¿Cómo puedo ayudarle hoy?',
      thinkingMsg: 'El consultor está pensando e indexando directrices corporativas...',
      promptSeed1: 'Simular precios de transferencia entre holding americana y GmbH alemana',
      promptSeed2: '¿Cuál es la fórmula de exención parcial de impuestos en Singapur?',
      promptSeed3: 'Explique la mecánica tributaria de CSLL e IRPJ en Brasil.',
      addEntityModalTitle: 'Añadir Nueva Entidad Legal',
      registeredName: 'Nombre Registrado de la Entidad',
      postLedgerTitle: 'Publicar Línea en el Libro Mayor',
      chooseEntity: '-- Elegir Entidad Corporativa --',
      postingType: 'Tipo de Asiento',
      creditOption: 'Crédito (Entrada de Ingresos)',
      debitOption: 'Débito (Salida de Gastos)',
      amountLabel: 'Valor (Equivalente en USD)',
      auditStatusLabel: 'Estado de Auditoría',
      pendingAudit: 'Auditoría Pendiente (No Conciliado)',
      approvedReconciled: 'Aprobado y Conciliado',
      registerEntityBtn: 'Registrar Entidad',
      postLedgerBtn: 'Publicar en Libro Mayor',
      quickFilter: 'Filtrar entidades...',
      leadFinancialOfficer: 'Director Financiero Principal',
      appSlogan: 'Libro Mayor',
      welcomeOnboarding: 'Bienvenido a Navigator Pro',
      welcomeOnboardingDesc: 'Por favor, seleccione su idioma preferido para comenzar a gestionar su libro mayor corporativo global.',
      getStartedBtn: 'Comenzar',
      deleteConfirmQuestion: '¿Está seguro de que desea eliminar esta entidad legal? Todos los datos históricos del libro mayor permanecen guardados.',
      appAppliedAccrual: 'Provisión de impuesto aplicada con éxito por un valor de ${amount} para la entidad {name}.'
    }
  }
};

export const i18n = {
  currentLang: localStorage.getItem('app_language') || (
    navigator.language === 'pt-PT' ? 'pt-PT' :
    navigator.language.startsWith('pt') ? 'pt-BR' :
    navigator.language.startsWith('fr') ? 'fr' :
    navigator.language.startsWith('de') ? 'de' :
    navigator.language.startsWith('ru') ? 'ru' :
    navigator.language.startsWith('es') ? 'es' : 'en'
  ),

  // Retorna a tradução de uma chave no formato 'grupo.chave' ou similar
  t(key: string, replacements?: Record<string, string | number>): string {
    const lang = translations[this.currentLang] || translations['en'];
    const parts = key.split('.');
    let value: any = lang;
    for (const part of parts) {
      value = value?.[part];
    }
    
    let result = typeof value === 'string' ? value : key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        result = result.replace(`{${k}}`, String(v));
      });
    }
    return result;
  },

  // Troca o idioma e re-renderiza todo o app
  setLanguage(langCode: string) {
    if (!translations[langCode]) return;
    this.currentLang = langCode;
    localStorage.setItem('app_language', langCode);
    document.documentElement.lang = langCode;
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: langCode } }));
  },

  // Detecta automaticamente o idioma do navegador ao iniciar
  init() {
    const saved = localStorage.getItem('app_language');
    if (saved && translations[saved]) {
      this.currentLang = saved;
    } else {
      const browserLang = navigator.language;
      if (browserLang === 'pt-PT') this.currentLang = 'pt-PT';
      else if (browserLang.startsWith('pt')) this.currentLang = 'pt-BR';
      else if (browserLang.startsWith('fr')) this.currentLang = 'fr';
      else if (browserLang.startsWith('de')) this.currentLang = 'de';
      else if (browserLang.startsWith('ru')) this.currentLang = 'ru';
      else if (browserLang.startsWith('es')) this.currentLang = 'es';
      else this.currentLang = 'en';
    }
    document.documentElement.lang = this.currentLang;
  },
};

i18n.init();
