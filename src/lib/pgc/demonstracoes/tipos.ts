export interface Rubrica {
  rubrica: string;          // designação oficial no mapa
  notas?: number;           // número da Nota às Contas
  prefixos: string[];       // contas que compõem a rubrica (ex.: ["11","12","15"])
  sinal?: 1 | -1;           // 1 = soma; -1 = subtrai (contas credoras ou redutoras)
}

export interface LinhaDemonstracao {
  rubrica: string;
  notas?: number;
  actual: number;
  anterior: number;
  ehTotal?: boolean;
}

export interface Demonstracao {
  titulo: string;
  linhas: LinhaDemonstracao[];
  totais: Record<string, number>;
}

export interface NotaConta {
  numero: number;
  titulo: string;
  texto: string;
  valorActual: number;
  valorAnterior: number;
}

export interface PacoteDemonstracoes {
  entidade: string;
  periodo: string;
  ano: number;
  moeda: string;            // "Kz (AOA)"
  grandeza: number;         // 1 | 1000 | 1000000
  grandezaTexto: string;    // "(em Kz)", "(em milhares de Kz)", "(em milhões de Kz)"
  balanco: Demonstracao;
  resultados: Demonstracao;
  fluxosCaixa: Demonstracao;
  alteracoesCP: Demonstracao;
  notas: NotaConta[];
  demonstracaoFuncoes?: Demonstracao;
}

export interface PedidoGeracao {
  entidadeId: string;
  entidade: string;
  ano: number;
  formato: "docx" | "xlsx";
  moeda?: string;
  grandeza?: number;
  incluirFuncoes?: boolean;
  ignorarAvisos?: boolean;
  lancamentosLocais?: {
    id?: string;
    date: string;
    lines: { accountCode: string; debit: number; credit: number }[];
  }[];
}

export interface RespostaGeracao {
  ok: boolean;
  url?: string;
  nome: string;
  base64?: string;
  validacoes: {
    fecho: "ok" | "erro";
    resultadoLiquido: "ok" | "erro";
    fluxos: "ok" | "erro";
  };
  detalhes?: string[];
  erro?: string;
}
