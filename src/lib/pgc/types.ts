export interface Conta {
  codigo: string;            // "45.1"
  designacao: string;        // "Fundo Fixo"
  nivel: 1 | 2 | 3 | 4;      // conta → subconta → sub-subconta
  classe: string;            // "4"
  natureza: "devedora" | "credora" | "mista";
  usoFacultativo?: boolean;  // classes 0 e 9
  fonte: "decreto-82-01" | "documento-oficial-ingestado";
}

export interface PlanoContas {
  norma: "PGC_ANGOLA_82_2001";
  diploma: string;           // "Decreto n.º 82/01, de 16 de Novembro"
  versao: string;
  atualizadoEm?: number;
  contas: Conta[];           // lista achatada (todos os níveis)
}

export interface ResultadoConta {
  codigo: string;
  existe: boolean;
  designacaoOficial?: string;
  classe?: string;
  usoFacultativo?: boolean;
  sugestao?: string;         // conta oficial mais próxima
}

export interface ResultadoLancamento {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

export type NormaSelecionada = "PGC_ANGOLA_82_2001" | "IFRS" | "POC_PT" | "OUTRA";
