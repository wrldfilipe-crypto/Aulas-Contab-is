import type { Rubrica } from "./tipos";

// ⚠️ Estrutura fixa (cacheada) em conformidade com o Decreto n.º 82/01, de 16 de Novembro (PGC Angola).
// O administrador pode sobrepor via Firestore (pgc_modelos/{id}) sem alterar código fonte.

export const MODELO_BALANCO = {
  titulo: "Balanço",
  activoNaoCorrente: [
    { rubrica: "Imobilizações corpóreas", notas: 4, prefixos: ["11", "18.1"], sinal: 1 },
    { rubrica: "Imobilizações incorpóreas", notas: 5, prefixos: ["12", "18.2"], sinal: 1 },
    { rubrica: "Investimentos em subsidiárias e associadas", notas: 6, prefixos: ["13.1", "13.2", "19.1", "19.2"], sinal: 1 },
    { rubrica: "Outros activos financeiros", notas: 7, prefixos: ["13.3", "13.4", "13.5", "13.9", "18.3", "19.3", "19.4", "19.9"], sinal: 1 },
    { rubrica: "Imobilizações em curso", notas: 3, prefixos: ["14"], sinal: 1 },
    { rubrica: "Outros activos não correntes", notas: 9, prefixos: ["38.9"], sinal: 1 },
  ] as Rubrica[],
  activoCorrente: [
    { rubrica: "Existências", notas: 8, prefixos: ["21", "22", "23", "24", "25", "26", "27", "28", "29"], sinal: 1 },
    { rubrica: "Contas a receber", notas: 9, prefixos: ["31.1", "31.2", "31.8", "31", "32.9", "34.8", "35.1", "36.3", "37.2", "37.3", "38.1", "38.2", "38"], sinal: 1 },
    { rubrica: "Disponibilidades / Meios Monetários", notas: 10, prefixos: ["41", "42", "43", "44", "45", "48", "49"], sinal: 1 },
    { rubrica: "Outros activos correntes", notas: 11, prefixos: ["37.4"], sinal: 1 },
  ] as Rubrica[],
  capitalProprio: [
    { rubrica: "Capital", notas: 12, prefixos: ["51", "52", "54"], sinal: 1 },
    { rubrica: "Reservas", notas: 13, prefixos: ["53", "55", "56", "57", "58"], sinal: 1 },
    { rubrica: "Resultados Transitados", notas: 14, prefixos: ["81"], sinal: 1 },
    { rubrica: "Resultado Líquido do Exercício", notas: 21, prefixos: ["88"], sinal: 1 },
  ] as Rubrica[],
  passivoNaoCorrente: [
    { rubrica: "Empréstimos de médio e longo prazo", notas: 15, prefixos: ["33.1.2", "33.2", "33.3", "33.9.2"], sinal: -1 },
    { rubrica: "Impostos diferidos", notas: 16, prefixos: ["87.9"], sinal: -1 },
    { rubrica: "Provisões para Pensões", notas: 17, prefixos: ["39.1"], sinal: -1 },
    { rubrica: "Provisões para outros riscos e encargos", notas: 18, prefixos: ["39.2", "39.3", "39.4", "39.9", "39"], sinal: -1 },
    { rubrica: "Outros passivos não correntes", notas: 19, prefixos: ["37.6"], sinal: -1 },
  ] as Rubrica[],
  passivoCorrente: [
    { rubrica: "Contas a pagar / Fornecedores", notas: 20, prefixos: ["32.1", "32.2", "32.8", "32", "31.9", "34.1", "34.2", "34.3", "34.4", "34.5", "34.6", "34.7", "34.9", "35.2", "36.1", "36.2", "36.9", "36", "37.1", "37.9"], sinal: -1 },
    { rubrica: "Empréstimos de curto prazo", notas: 20, prefixos: ["33.1.1", "33.9", "33"], sinal: -1 },
    { rubrica: "Parte corrente dos empréstimos a médio e longo prazo", notas: 15, prefixos: ["33.1.9"], sinal: -1 },
    { rubrica: "Outros passivos correntes", notas: 21, prefixos: ["37.5"], sinal: -1 },
  ] as Rubrica[],
};

export const MODELO_RESULTADOS = {
  titulo: "Demonstração de Resultados por Natureza",
  proveitosOperacionais: {
    vendas: ["61"],
    prestacoesServico: ["62"],
    outrosOperacionais: ["63"],
    variacaoInventarios: ["64"],
    trabalhosPropriaEmpresa: ["65"],
  },
  custosOperacionais: {
    cmvmc: ["71", "72"],
    pessoal: ["72", "72.1", "72.2", "72.3", "72.4", "72.5", "72.6", "72.7", "72.8"],
    amortizacoes: ["73"],
    outrosCustos: ["75"],
  },
  financeiros: {
    proveitosGerais: ["66"],
    proveitosFiliais: ["67"],
    custosGerais: ["76"],
    custosFiliais: ["77"],
  },
  naoOperacionais: {
    proveitos: ["68"],
    custos: ["78"],
  },
  extraordinarios: {
    proveitos: ["69"],
    custos: ["79"],
  },
  imposto: {
    correntes: ["87.1", "87"],
    extraordinarios: ["87.2"],
  },
};

export const MODELO_RESULTADOS_FUNCOES = {
  titulo: "Demonstração de Resultados por Funções",
  linhas: [
    { rubrica: "Vendas", notas: 22, prefixos: ["61"] },
    { rubrica: "Prestações de Serviço", notas: 23, prefixos: ["62"] },
    { rubrica: "Custo das Vendas", prefixos: ["71", "72", "91"] },
    { rubrica: "Margem Bruta", prefixos: [] },
    { rubrica: "Outros Proveitos Operacionais", prefixos: ["63", "64", "65"] },
    { rubrica: "Custos de Distribuição", prefixos: ["92", "75.2.29"] },
    { rubrica: "Custos Administrativos", prefixos: ["93", "75.2.17"] },
    { rubrica: "Outros Custos e Perdas Operacionais", prefixos: ["75.8"] },
    { rubrica: "Resultados Operacionais", prefixos: ["82"] },
    { rubrica: "Resultados Financeiros", notas: 31, prefixos: ["66", "76"] },
    { rubrica: "Resultados de Filiais e Associadas", notas: 32, prefixos: ["67", "77"] },
    { rubrica: "Resultados Não Operacionais", notas: 33, prefixos: ["68", "78"] },
    { rubrica: "Resultados Antes de Impostos", prefixos: [] },
    { rubrica: "Imposto sobre o Rendimento", notas: 35, prefixos: ["87.1"] },
    { rubrica: "Resultados Líquidos das Actividades Correntes", prefixos: [] },
    { rubrica: "Resultados Extraordinários", notas: 34, prefixos: ["69", "79"] },
    { rubrica: "Imposto sobre o Rendimento (Extraordinário)", notas: 35, prefixos: ["87.2"] },
    { rubrica: "Resultado Líquido do Exercício", prefixos: ["88"] },
  ],
};

export const MODELO_ALTERACOES_CP = {
  titulo: "Demonstração de Alterações nos Capitais Próprios",
  linhas: [
    { rubrica: "Capital Nominal Subscrito", prefixos: ["51"] },
    { rubrica: "Acções / Quotas Próprias", prefixos: ["52"], sinal: -1 as const },
    { rubrica: "Prémios de Emissão", prefixos: ["53"] },
    { rubrica: "Prestações Suplementares", prefixos: ["54"] },
    { rubrica: "Reservas Legais", prefixos: ["55"] },
    { rubrica: "Reservas de Reavaliação", prefixos: ["56"] },
    { rubrica: "Reservas com Fins Especiais", prefixos: ["57"] },
    { rubrica: "Reservas Livres", prefixos: ["58"] },
    { rubrica: "Resultados Transitados", prefixos: ["81"] },
    { rubrica: "Resultado Líquido do Exercício", prefixos: ["88"] },
  ],
};
