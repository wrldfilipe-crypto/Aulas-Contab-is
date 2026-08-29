import { Baralho, Cartao, SessaoEstudo } from '../services/flashcardService';

const DB_NAME = 'ContaEstudoFlashcardsDB';
const DB_VERSION = 1;
const DECKS_STORE = 'flashcard_decks';
const SESSIONS_STORE = 'flashcard_sessions';

let dbInstance: IDBDatabase | null = null;

export async function openFlashcardsDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB não suportado neste navegador.');
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DECKS_STORE)) {
        const deckStore = db.createObjectStore(DECKS_STORE, { keyPath: 'id' });
        deckStore.createIndex('userId', 'userId', { unique: false });
        deckStore.createIndex('criadoEm', 'criadoEm', { unique: false });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionStore.createIndex('userId', 'userId', { unique: false });
        sessionStore.createIndex('baralhoId', 'baralhoId', { unique: false });
        sessionStore.createIndex('dataConclusao', 'dataConclusao', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error('[flashcardDb] Erro ao abrir IndexedDB:', request.error);
      reject(request.error);
    };
  });
}

// Decks padrão para inicialização
const BARALHOS_DEMO: Baralho[] = [
  {
    id: 'deck-pgc-fundamentos-01',
    userId: 'default',
    titulo: 'Flashcards — PGC Angola (Contas & Classes)',
    documentoNome: 'Decreto_82_01_PGC_Angola.pdf',
    foco: 'Estrutura de Contas e Balanço',
    criadoEm: new Date(Date.now() - 3 * 86400000).toISOString(),
    cartoes: [
      {
        id: 'c-1',
        baralhoId: 'deck-pgc-fundamentos-01',
        frente: 'Em que classe do PGC Angola se enquadram as Imobilizações Corpóreas e Incorpóreas?',
        verso: 'Classe 1 — Meios Fixos e Investimentos. Abrange todos os bens móveis, imóveis e intangíveis destinados a permanecer na empresa por mais de um ano.',
        dificuldade: 'facil',
        tema: 'Estrutura PGC',
        referencia: 'Classe 1 — Meios Fixos',
        caixa: 2,
        proximaRevisao: new Date().toISOString(),
        acertos: 2,
        erros: 0
      },
      {
        id: 'c-2',
        baralhoId: 'deck-pgc-fundamentos-01',
        frente: 'Qual é a conta específica utilizada para registar Adiantamentos a Fornecedores de Imobilizado?',
        verso: 'Conta 14 — Adiantamentos por Conta de Investimentos. Movimenta-se a débito pelos valores entregues a título de sinal ou adiantamento.',
        dificuldade: 'medio',
        tema: 'Imobilizado',
        referencia: 'Conta 14 (Meios Fixos)',
        caixa: 1,
        proximaRevisao: new Date().toISOString(),
        acertos: 1,
        erros: 1
      },
      {
        id: 'c-3',
        baralhoId: 'deck-pgc-fundamentos-01',
        frente: 'Qual é o destino contabilístico do Saldo da Conta 81 (Resultados Transitados)?',
        verso: 'Integra o Capital Próprio (Classe 5). Representa os lucros acumulados retidos ou prejuízos ainda não cobertos de exercícios anteriores.',
        dificuldade: 'facil',
        tema: 'Capital Próprio',
        referencia: 'Conta 81 / Classe 5',
        caixa: 3,
        proximaRevisao: new Date(Date.now() + 5 * 86400000).toISOString(),
        acertos: 4,
        erros: 0
      },
      {
        id: 'c-4',
        baralhoId: 'deck-pgc-fundamentos-01',
        frente: 'Qual a diferença entre a Conta 31 (Clientes) e a Conta 37 (Outros Devedores e Credores)?',
        verso: 'A Conta 31 destina-se exclusivamente às transações operacionais do objeto social da empresa (venda de bens/serviços), enquanto a Conta 37 acolhe devedores por operações não correntes.',
        dificuldade: 'medio',
        tema: 'Terceiros',
        referencia: 'Contas 31 e 37',
        caixa: 2,
        proximaRevisao: new Date().toISOString(),
        acertos: 2,
        erros: 1
      },
      {
        id: 'c-5',
        baralhoId: 'deck-pgc-fundamentos-01',
        frente: 'Como se calcula a quota anual de amortização linear no PGC Angola?',
        verso: 'Quota Anual = (Valor de Aquisição - Valor Residual) ÷ Vida Útil em anos (ou multiplicando pela taxa de amortização regulamentar do DP n.º 180/19).',
        dificuldade: 'medio',
        tema: 'Amortizações',
        referencia: 'Conta 18 / Conta 74',
        caixa: 1,
        proximaRevisao: new Date().toISOString(),
        acertos: 0,
        erros: 0
      }
    ]
  },
  {
    id: 'deck-iva-fiscalidade-02',
    userId: 'default',
    titulo: 'Flashcards — IVA e Retenção na Fonte (Angola)',
    documentoNome: 'Lei_7_19_Codigo_IVA_Angola.pdf',
    foco: 'IVA Conta 34.5 e Retenções AGT',
    criadoEm: new Date(Date.now() - 1 * 86400000).toISOString(),
    cartoes: [
      {
        id: 'c-iva-1',
        baralhoId: 'deck-iva-fiscalidade-02',
        frente: 'Qual é a conta do PGC Angola creditada quando a empresa emite uma fatura com IVA a um cliente?',
        verso: 'Conta 34.5.2 — IVA Liquidável (ou 34.5.3). Regista o imposto cobrado aos clientes que deve ser entregue à AGT.',
        dificuldade: 'facil',
        tema: 'IVA Liquidado',
        referencia: 'Conta 34.5.2 (Estado)',
        caixa: 2,
        proximaRevisao: new Date().toISOString(),
        acertos: 3,
        erros: 0
      },
      {
        id: 'c-iva-2',
        baralhoId: 'deck-iva-fiscalidade-02',
        frente: 'Qual é a taxa geral de IVA aplicável na transmissão de bens e prestações de serviços em Angola?',
        verso: 'A taxa geral é de 14% (com taxa reduzida de 7% ou 5% para determinados produtos da cesta básica e regime de isenção médica/educacional).',
        dificuldade: 'facil',
        tema: 'Taxas de IVA',
        referencia: 'Lei n.º 7/19',
        caixa: 3,
        proximaRevisao: new Date(Date.now() + 4 * 86400000).toISOString(),
        acertos: 5,
        erros: 0
      },
      {
        id: 'c-iva-3',
        baralhoId: 'deck-iva-fiscalidade-02',
        frente: 'Qual a percentagem de retenção na fonte de Imposto Industrial em serviços prestados por entidades nacionais sem contabilidade organizada?',
        verso: 'A taxa de retenção na fonte de Imposto Industrial é de 6,5% sobre o valor ilíquido da prestação de serviços.',
        dificuldade: 'medio',
        tema: 'Imposto Industrial',
        referencia: 'Conta 34.1.2 (Retenções)',
        caixa: 1,
        proximaRevisao: new Date().toISOString(),
        acertos: 1,
        erros: 1
      },
      {
        id: 'c-iva-4',
        baralhoId: 'deck-iva-fiscalidade-02',
        frente: 'Quando ocorre o apuramento mensal do IVA, que conta acolhe o saldo devedor (a favor do sujeito passivo)?',
        verso: 'Conta 34.5.4 — IVA a Recuperar (Crédito de Imposto). Permite dedução nos períodos fiscais subsequentes junto da AGT.',
        dificuldade: 'dificil',
        tema: 'Apuramento de IVA',
        referencia: 'Conta 34.5.4',
        caixa: 1,
        proximaRevisao: new Date().toISOString(),
        acertos: 0,
        erros: 1
      }
    ]
  }
];

export async function listarBaralhos(userId: string): Promise<Baralho[]> {
  try {
    const db = await openFlashcardsDB();
    const tx = db.transaction(DECKS_STORE, 'readonly');
    const store = tx.objectStore(DECKS_STORE);
    const index = store.index('userId');

    const userDecksPromise = new Promise<Baralho[]>((resolve) => {
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    let decks = await userDecksPromise;

    // Se for o primeiro acesso do utilizador e não houver baralhos, semear com os baralhos de demonstração
    if (decks.length === 0) {
      const defaultDecksPromise = new Promise<Baralho[]>((resolve) => {
        const req = index.getAll('default');
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      const defaultDecks = await defaultDecksPromise;
      if (defaultDecks.length === 0) {
        // Semear
        const txWrite = db.transaction(DECKS_STORE, 'readwrite');
        const writeStore = txWrite.objectStore(DECKS_STORE);
        for (const d of BARALHOS_DEMO) {
          writeStore.put({ ...d, userId });
        }
        await new Promise((res) => {
          txWrite.oncomplete = res;
        });
        decks = BARALHOS_DEMO.map(d => ({ ...d, userId }));
      } else {
        decks = defaultDecks.map(d => ({ ...d, userId }));
      }
    }

    return decks.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  } catch (err) {
    console.error('[flashcardDb.listarBaralhos] Erro ao listar baralhos:', err);
    return BARALHOS_DEMO.map(d => ({ ...d, userId }));
  }
}

export async function obterBaralho(id: string): Promise<Baralho | null> {
  try {
    const db = await openFlashcardsDB();
    const tx = db.transaction(DECKS_STORE, 'readonly');
    const store = tx.objectStore(DECKS_STORE);
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function criarBaralho(baralho: Baralho): Promise<void> {
  const db = await openFlashcardsDB();
  const tx = db.transaction(DECKS_STORE, 'readwrite');
  const store = tx.objectStore(DECKS_STORE);
  store.put(baralho);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function atualizarBaralho(baralho: Baralho): Promise<void> {
  const db = await openFlashcardsDB();
  const tx = db.transaction(DECKS_STORE, 'readwrite');
  const store = tx.objectStore(DECKS_STORE);
  store.put({
    ...baralho,
    atualizadoEm: new Date().toISOString()
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function eliminarBaralho(id: string): Promise<void> {
  const db = await openFlashcardsDB();
  const tx = db.transaction(DECKS_STORE, 'readwrite');
  const store = tx.objectStore(DECKS_STORE);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function atualizarCartao(
  baralhoId: string,
  cartaoId: string,
  updates: Partial<Cartao>
): Promise<void> {
  const baralho = await obterBaralho(baralhoId);
  if (!baralho) return;

  const cartoesAtualizados = baralho.cartoes.map(c => {
    if (c.id === cartaoId) {
      return {
        ...c,
        ...updates,
        ultimaRevisaoEm: new Date().toISOString()
      };
    }
    return c;
  });

  await atualizarBaralho({
    ...baralho,
    cartoes: cartoesAtualizados
  });
}

export async function excluirCartao(baralhoId: string, cartaoId: string): Promise<void> {
  const baralho = await obterBaralho(baralhoId);
  if (!baralho) return;

  const cartoesAtualizados = baralho.cartoes.filter(c => c.id !== cartaoId);
  await atualizarBaralho({
    ...baralho,
    cartoes: cartoesAtualizados
  });
}

export async function obterCartoesRevisarHoje(
  userId: string
): Promise<{ cartao: Cartao; baralhoId: string; baralhoTitulo: string }[]> {
  const baralhos = await listarBaralhos(userId);
  const agora = new Date().toISOString();
  const cartoesParaRevisar: { cartao: Cartao; baralhoId: string; baralhoTitulo: string }[] = [];

  for (const b of baralhos) {
    for (const c of b.cartoes) {
      if (!c.proximaRevisao || c.proximaRevisao <= agora || c.caixa === 1) {
        cartoesParaRevisar.push({
          cartao: c,
          baralhoId: b.id,
          baralhoTitulo: b.titulo
        });
      }
    }
  }

  return cartoesParaRevisar;
}

export async function salvarSessaoEstudo(sessao: SessaoEstudo): Promise<void> {
  try {
    const db = await openFlashcardsDB();
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = tx.objectStore(SESSIONS_STORE);
    store.put(sessao);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[flashcardDb] Falha ao guardar sessão de estudo:', e);
  }
}

export async function obterSessoesUsuario(userId: string): Promise<SessaoEstudo[]> {
  try {
    const db = await openFlashcardsDB();
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const store = tx.objectStore(SESSIONS_STORE);
    const index = store.index('userId');
    return new Promise((resolve) => {
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
