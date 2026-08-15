import { Balancete } from "./balancete";
import { MODELO_BALANCO, MODELO_RESULTADOS, MODELO_ALTERACOES_CP, MODELO_RESULTADOS_FUNCOES } from "./modelos";
import type { Demonstracao, PacoteDemonstracoes, NotaConta } from "./tipos";

function arredondar(n: number, grandeza = 1): number {
  if (isNaN(n)) return 0;
  return Math.round((n / grandeza) * 100) / 100;
}

function linha(rubrica: string, notas: number | undefined, actual: number, anterior: number, ehTotal = false) {
  return { rubrica, notas, actual, anterior, ehTotal };
}

export function calcularBalanco(atual: Balancete, anterior: Balancete, grandeza = 1): Demonstracao {
  const linhas: Demonstracao["linhas"] = [];

  // 1. Activo Não Corrente
  linhas.push(linha("ACTIVO NÃO CORRENTE", undefined, 0, 0, true));
  let totalANCAtual = 0;
  let totalANCAnterior = 0;

  for (const r of MODELO_BALANCO.activoNaoCorrente) {
    const valAtu = atual.somar(...r.prefixos);
    const valAnt = anterior.somar(...r.prefixos);
    totalANCAtual += valAtu;
    totalANCAnterior += valAnt;
    linhas.push(linha(`  ${r.rubrica}`, r.notas, arredondar(valAtu, grandeza), arredondar(valAnt, grandeza)));
  }
  linhas.push(linha("TOTAL DO ACTIVO NÃO CORRENTE", undefined, arredondar(totalANCAtual, grandeza), arredondar(totalANCAnterior, grandeza), true));

  // 2. Activo Corrente
  linhas.push(linha("ACTIVO CORRENTE", undefined, 0, 0, true));
  let totalACAtual = 0;
  let totalACAnterior = 0;

  for (const r of MODELO_BALANCO.activoCorrente) {
    const valAtu = atual.somar(...r.prefixos);
    const valAnt = anterior.somar(...r.prefixos);
    totalACAtual += valAtu;
    totalACAnterior += valAnt;
    linhas.push(linha(`  ${r.rubrica}`, r.notas, arredondar(valAtu, grandeza), arredondar(valAnt, grandeza)));
  }
  linhas.push(linha("TOTAL DO ACTIVO CORRENTE", undefined, arredondar(totalACAtual, grandeza), arredondar(totalACAnterior, grandeza), true));

  const totalActivoAtual = totalANCAtual + totalACAtual;
  const totalActivoAnterior = totalANCAnterior + totalACAnterior;
  linhas.push(linha("TOTAL DO ACTIVO", undefined, arredondar(totalActivoAtual, grandeza), arredondar(totalActivoAnterior, grandeza), true));

  // 3. Capital Próprio
  linhas.push(linha("CAPITAL PRÓPRIO", undefined, 0, 0, true));
  let totalCPAtual = 0;
  let totalCPAnterior = 0;

  for (const r of MODELO_BALANCO.capitalProprio) {
    let valAtu = -atual.somar(...r.prefixos);
    let valAnt = -anterior.somar(...r.prefixos);

    if (r.prefixos.includes("88") && valAtu === 0) {
      valAtu = calcularResultadoLiquidoApurado(atual);
    }
    if (r.prefixos.includes("88") && valAnt === 0) {
      valAnt = calcularResultadoLiquidoApurado(anterior);
    }

    totalCPAtual += valAtu;
    totalCPAnterior += valAnt;
    linhas.push(linha(`  ${r.rubrica}`, r.notas, arredondar(valAtu, grandeza), arredondar(valAnt, grandeza)));
  }
  linhas.push(linha("TOTAL DO CAPITAL PRÓPRIO", undefined, arredondar(totalCPAtual, grandeza), arredondar(totalCPAnterior, grandeza), true));

  // 4. Passivo Não Corrente
  linhas.push(linha("PASSIVO NÃO CORRENTE", undefined, 0, 0, true));
  let totalPNCAtual = 0;
  let totalPNCAnterior = 0;

  for (const r of MODELO_BALANCO.passivoNaoCorrente) {
    const valAtu = -atual.somar(...r.prefixos);
    const valAnt = -anterior.somar(...r.prefixos);
    totalPNCAtual += Math.max(0, valAtu);
    totalPNCAnterior += Math.max(0, valAnt);
    linhas.push(linha(`  ${r.rubrica}`, r.notas, arredondar(Math.max(0, valAtu), grandeza), arredondar(Math.max(0, valAnt), grandeza)));
  }
  linhas.push(linha("TOTAL DO PASSIVO NÃO CORRENTE", undefined, arredondar(totalPNCAtual, grandeza), arredondar(totalPNCAnterior, grandeza), true));

  // 5. Passivo Corrente
  linhas.push(linha("PASSIVO CORRENTE", undefined, 0, 0, true));
  let totalPCAtual = 0;
  let totalPCAnterior = 0;

  for (const r of MODELO_BALANCO.passivoCorrente) {
    const valAtu = -atual.somar(...r.prefixos);
    const valAnt = -anterior.somar(...r.prefixos);
    totalPCAtual += Math.max(0, valAtu);
    totalPCAnterior += Math.max(0, valAnt);
    linhas.push(linha(`  ${r.rubrica}`, r.notas, arredondar(Math.max(0, valAtu), grandeza), arredondar(Math.max(0, valAnt), grandeza)));
  }
  linhas.push(linha("TOTAL DO PASSIVO CORRENTE", undefined, arredondar(totalPCAtual, grandeza), arredondar(totalPCAnterior, grandeza), true));

  const totalPassivoAtual = totalPNCAtual + totalPCAtual;
  const totalPassivoAnterior = totalPNCAnterior + totalPCAnterior;
  linhas.push(linha("TOTAL DO PASSIVO", undefined, arredondar(totalPassivoAtual, grandeza), arredondar(totalPassivoAnterior, grandeza), true));

  const totalCPPassivoAtual = totalCPAtual + totalPassivoAtual;
  const totalCPPassivoAnterior = totalCPAnterior + totalPassivoAnterior;
  linhas.push(linha("TOTAL DO CAPITAL PRÓPRIO E PASSIVO", undefined, arredondar(totalCPPassivoAtual, grandeza), arredondar(totalCPPassivoAnterior, grandeza), true));

  return {
    titulo: MODELO_BALANCO.titulo,
    linhas,
    totais: {
      activoNaoCorrente: totalANCAtual,
      activoCorrente: totalACAtual,
      activo: totalActivoAtual,
      capitalProprio: totalCPAtual,
      passivoNaoCorrente: totalPNCAtual,
      passivoCorrente: totalPCAtual,
      passivo: totalPassivoAtual,
      capitalProprioEPassivo: totalCPPassivoAtual,
      diferencaFecho: totalActivoAtual - totalCPPassivoAtual,
    },
  };
}

export function calcularResultadoLiquidoApurado(b: Balancete): number {
  const provOper = b.somarCredito("61", "62", "63", "64", "65") - b.somarDebito("61", "62", "63", "64", "65");
  const custOper = b.somarDebito("71", "72", "73", "74", "75") - b.somarCredito("71", "72", "73", "74", "75");
  const resOper = provOper - custOper;

  const provFin = b.somarCredito("66", "67") - b.somarDebito("66", "67");
  const custFin = b.somarDebito("76", "77") - b.somarCredito("76", "77");
  const resFin = provFin - custFin;

  const provNaoOper = b.somarCredito("68") - b.somarDebito("68");
  const custNaoOper = b.somarDebito("78") - b.somarCredito("78");
  const resNaoOper = provNaoOper - custNaoOper;

  const resAntesImp = resOper + resFin + resNaoOper;
  const imposto = b.somarDebito("87") - b.somarCredito("87");
  const resLiqCorrentes = resAntesImp - imposto;

  const provExtra = b.somarCredito("69") - b.somarDebito("69");
  const custExtra = b.somarDebito("79") - b.somarCredito("79");
  const resExtra = provExtra - custExtra;

  return resLiqCorrentes + resExtra;
}

export function calcularResultados(atual: Balancete, anterior: Balancete, grandeza = 1): Demonstracao {
  const calcBloco = (b: Balancete) => {
    const vendas = b.somarCredito("61") - b.somarDebito("61");
    const prestacoes = b.somarCredito("62") - b.somarDebito("62");
    const outrosProveitos = b.somarCredito("63") - b.somarDebito("63");
    const variacaoInventarios = b.somarCredito("64") - b.somarDebito("64");
    const trabalhosPropriaEmpresa = b.somarCredito("65") - b.somarDebito("65");
    const totalProveitosOperacionais = vendas + prestacoes + outrosProveitos + variacaoInventarios + trabalhosPropriaEmpresa;

    const cmvmc = b.somarDebito("71") - b.somarCredito("71");
    const pessoal = b.somarDebito("72") - b.somarCredito("72");
    const amortizacoes = b.somarDebito("73") - b.somarCredito("73");
    const outrosCustos = b.somarDebito("75") - b.somarCredito("75");
    const totalCustosOperacionais = cmvmc + pessoal + amortizacoes + outrosCustos;

    const resOperacionais = totalProveitosOperacionais - totalCustosOperacionais;

    const provFin = b.somarCredito("66") - b.somarDebito("66");
    const custFin = b.somarDebito("76") - b.somarCredito("76");
    const resFinanceiros = provFin - custFin;

    const resFiliais = (b.somarCredito("67") - b.somarDebito("67")) - (b.somarDebito("77") - b.somarCredito("77"));
    const resNaoOperacionais = (b.somarCredito("68") - b.somarDebito("68")) - (b.somarDebito("78") - b.somarCredito("78"));

    const resAntesImpostos = resOperacionais + resFinanceiros + resFiliais + resNaoOperacionais;
    const impostoCorrente = b.somarDebito("87.1", "87") - b.somarCredito("87.1", "87");
    const resLiqCorrentes = resAntesImpostos - impostoCorrente;

    const resExtraordinarios = (b.somarCredito("69") - b.somarDebito("69")) - (b.somarDebito("79") - b.somarCredito("79"));
    const impostoExtra = b.somarDebito("87.2") - b.somarCredito("87.2");

    const rle = resLiqCorrentes + resExtraordinarios - impostoExtra;

    return {
      vendas, prestacoes, outrosProveitos, variacaoInventarios, trabalhosPropriaEmpresa, totalProveitosOperacionais,
      cmvmc, pessoal, amortizacoes, outrosCustos, totalCustosOperacionais,
      resOperacionais, resFinanceiros, resFiliais, resNaoOperacionais,
      resAntesImpostos, impostoCorrente, resLiqCorrentes,
      resExtraordinarios, impostoExtra, rle,
    };
  };

  const a = calcBloco(atual);
  const p = calcBloco(anterior);

  const linhas: Demonstracao["linhas"] = [
    linha("Vendas", 22, arredondar(a.vendas, grandeza), arredondar(p.vendas, grandeza)),
    linha("Prestações de Serviço", 23, arredondar(a.prestacoes, grandeza), arredondar(p.prestacoes, grandeza)),
    linha("Outros proveitos operacionais", 24, arredondar(a.outrosProveitos, grandeza), arredondar(p.outrosProveitos, grandeza)),
    linha("Variações nos produtos acabados e produtos em vias de fabrico", 25, arredondar(a.variacaoInventarios, grandeza), arredondar(p.variacaoInventarios, grandeza)),
    linha("Trabalhos para a própria empresa", 26, arredondar(a.trabalhosPropriaEmpresa, grandeza), arredondar(p.trabalhosPropriaEmpresa, grandeza)),
    linha("Custo das mercadorias vendidas e das matérias consumidas", 27, arredondar(-a.cmvmc, grandeza), arredondar(-p.cmvmc, grandeza)),
    linha("Custos com o Pessoal", 28, arredondar(-a.pessoal, grandeza), arredondar(-p.pessoal, grandeza)),
    linha("Amortizações", 29, arredondar(-a.amortizacoes, grandeza), arredondar(-p.amortizacoes, grandeza)),
    linha("Outros custos e perdas operacionais", 30, arredondar(-a.outrosCustos, grandeza), arredondar(-p.outrosCustos, grandeza)),
    linha("RESULTADOS OPERACIONAIS", undefined, arredondar(a.resOperacionais, grandeza), arredondar(p.resOperacionais, grandeza), true),
    linha("Resultados financeiros", 31, arredondar(a.resFinanceiros, grandeza), arredondar(p.resFinanceiros, grandeza)),
    linha("Resultados de filiais e associadas", 32, arredondar(a.resFiliais, grandeza), arredondar(p.resFiliais, grandeza)),
    linha("Resultados não operacionais", 33, arredondar(a.resNaoOperacionais, grandeza), arredondar(p.resNaoOperacionais, grandeza)),
    linha("RESULTADOS ANTES DE IMPOSTOS", undefined, arredondar(a.resAntesImpostos, grandeza), arredondar(p.resAntesImpostos, grandeza), true),
    linha("Imposto sobre o rendimento (actividades correntes)", 35, arredondar(-a.impostoCorrente, grandeza), arredondar(-p.impostoCorrente, grandeza)),
    linha("RESULTADOS LÍQUIDOS DAS ACTIVIDADES CORRENTES", undefined, arredondar(a.resLiqCorrentes, grandeza), arredondar(p.resLiqCorrentes, grandeza), true),
    linha("Resultados extraordinários", 34, arredondar(a.resExtraordinarios, grandeza), arredondar(p.resExtraordinarios, grandeza)),
    linha("Imposto sobre o rendimento (actividades extraordinárias)", 35, arredondar(-a.impostoExtra, grandeza), arredondar(-p.impostoExtra, grandeza)),
    linha("RESULTADO LÍQUIDO DO EXERCÍCIO", 21, arredondar(a.rle, grandeza), arredondar(p.rle, grandeza), true),
  ];

  return {
    titulo: MODELO_RESULTADOS.titulo,
    linhas,
    totais: {
      proveitosOperacionais: a.totalProveitosOperacionais,
      custosOperacionais: a.totalCustosOperacionais,
      resultadosOperacionais: a.resOperacionais,
      resultadosFinanceiros: a.resFinanceiros,
      resultadosNaoOperacionais: a.resNaoOperacionais,
      resultadosAntesImpostos: a.resAntesImpostos,
      imposto: a.impostoCorrente + a.impostoExtra,
      rle: a.rle,
    },
  };
}

export function calcularFluxosCaixa(atual: Balancete, anterior: Balancete, grandeza = 1): Demonstracao {
  const rle = calcularResultadoLiquidoApurado(atual);
  const amortizacoes = atual.somarDebito("73") - atual.somarCredito("73");
  const deltaExistencias = atual.somar("22", "23", "24", "25", "26", "27", "28") - anterior.somar("22", "23", "24", "25", "26", "27", "28");
  const deltaClientes = atual.somar("31") - anterior.somar("31");
  const deltaFornecedores = -(atual.somar("32") - anterior.somar("32"));
  const deltaEstado = -(atual.somar("34") - anterior.somar("34"));
  const deltaOutrosOperacionais = -(atual.somar("36", "37") - anterior.somar("36", "37"));

  const caixaOperacional = rle + amortizacoes - deltaExistencias - deltaClientes + deltaFornecedores + deltaEstado + deltaOutrosOperacionais;

  const deltaImobilizado = atual.somar("11", "12", "13", "14") - anterior.somar("11", "12", "13", "14");
  const caixaInvestimento = -deltaImobilizado;

  const deltaCapital = -(atual.somar("51", "52", "54") - anterior.somar("51", "52", "54"));
  const deltaEmprestimos = -(atual.somar("33") - anterior.somar("33"));
  const caixaFinanciamento = deltaCapital + deltaEmprestimos;

  const caixaInicio = anterior.somar("41", "42", "43", "44", "45", "48");
  const caixaFim = atual.somar("41", "42", "43", "44", "45", "48");
  const variacaoCaixaReal = caixaFim - caixaInicio;

  const linhas: Demonstracao["linhas"] = [
    linha("FLUXOS DAS ACTIVIDADES OPERACIONAIS", 43, 0, 0, true),
    linha("  Resultado Líquido do Exercício", undefined, arredondar(rle, grandeza), 0),
    linha("  Ajustamentos de Amortizações e Provisões", undefined, arredondar(amortizacoes, grandeza), 0),
    linha("  (Aumento) / Diminuição nas Existências", undefined, arredondar(-deltaExistencias, grandeza), 0),
    linha("  (Aumento) / Diminuição em Contas de Clientes", undefined, arredondar(-deltaClientes, grandeza), 0),
    linha("  Aumento / (Diminuição) em Fornecedores", undefined, arredondar(deltaFornecedores, grandeza), 0),
    linha("  Aumento / (Diminuição) em Estado e Outros", undefined, arredondar(deltaEstado + deltaOutrosOperacionais, grandeza), 0),
    linha("Caixa Líquida das Actividades Operacionais", 43, arredondar(caixaOperacional, grandeza), 0, true),

    linha("FLUXOS DAS ACTIVIDADES DE INVESTIMENTO", 45, 0, 0, true),
    linha("  Aquisições / Alienações de Imobilizações Corpóreas e Financeiras", 46, arredondar(caixaInvestimento, grandeza), 0),
    linha("Caixa Líquida das Actividades de Investimento", 45, arredondar(caixaInvestimento, grandeza), 0, true),

    linha("FLUXOS DAS ACTIVIDADES DE FINANCIAMENTO", 44, 0, 0, true),
    linha("  Realizações de Capital e Empréstimos Obtidos", undefined, arredondar(caixaFinanciamento, grandeza), 0),
    linha("Caixa Líquida das Actividades de Financiamento", 44, arredondar(caixaFinanciamento, grandeza), 0, true),

    linha("AUMENTO / (REDUÇÃO) LÍQUIDO DE CAIXA E EQUIVALENTES", undefined, arredondar(variacaoCaixaReal, grandeza), 0, true),
    linha("Caixa e Seus Equivalentes no Início do Período", 47, arredondar(caixaInicio, grandeza), 0),
    linha("Caixa e Seus Equivalentes no Fim do Período", 47, arredondar(caixaFim, grandeza), 0, true),
  ];

  return {
    titulo: "Demonstração de Fluxos de Caixa (Método Indirecto)",
    linhas,
    totais: {
      caixaOperacional,
      caixaInvestimento,
      caixaFinanciamento,
      variacaoCaixa: variacaoCaixaReal,
      caixaInicio,
      caixaFim,
    },
  };
}

export function calcularAlteracoesCP(atual: Balancete, anterior: Balancete, grandeza = 1): Demonstracao {
  const linhas: Demonstracao["linhas"] = [];
  let totalIni = 0;
  let totalFim = 0;

  for (const item of MODELO_ALTERACOES_CP.linhas) {
    let ini = -anterior.somar(...item.prefixos);
    let fim = -atual.somar(...item.prefixos);

    if (item.prefixos.includes("88")) {
      if (ini === 0) ini = calcularResultadoLiquidoApurado(anterior);
      if (fim === 0) fim = calcularResultadoLiquidoApurado(atual);
    }

    if (item.sinal === -1) {
      ini = -ini;
      fim = -fim;
    }

    totalIni += ini;
    totalFim += fim;

    linhas.push(linha(item.rubrica, undefined, arredondar(fim, grandeza), arredondar(ini, grandeza)));
  }

  linhas.push(linha("TOTAL DOS CAPITAIS PRÓPRIOS", undefined, arredondar(totalFim, grandeza), arredondar(totalIni, grandeza), true));

  return {
    titulo: MODELO_ALTERACOES_CP.titulo,
    linhas,
    totais: {
      capitalProprioInicial: totalIni,
      capitalProprioFinal: totalFim,
      variacao: totalFim - totalIni,
    },
  };
}

export function gerarNotas(atual: Balancete, anterior: Balancete, grandeza = 1): NotaConta[] {
  const notasDefs: { numero: number; titulo: string; prefixos: string[]; inversao?: boolean }[] = [
    { numero: 1, titulo: "Identificação da Entidade e Objeto Social", prefixos: [] },
    { numero: 2, titulo: "Bases de Apresentação das Demonstrações Financeiras (Decreto n.º 82/2001)", prefixos: [] },
    { numero: 3, titulo: "Imobilizações em Curso", prefixos: ["14"] },
    { numero: 4, titulo: "Imobilizações Corpóreas (Líquidas)", prefixos: ["11", "18.1"] },
    { numero: 5, titulo: "Imobilizações Incorpóreas (Líquidas)", prefixos: ["12", "18.2"] },
    { numero: 6, titulo: "Investimentos em Subsidiárias e Associadas", prefixos: ["13.1", "13.2", "19.1", "19.2"] },
    { numero: 7, titulo: "Outros Activos Financeiros", prefixos: ["13.3", "13.4", "13.5", "13.9", "18.3"] },
    { numero: 8, titulo: "Existências (Inventários Líquidos)", prefixos: ["22", "23", "24", "25", "26", "27", "28", "29"] },
    { numero: 9, titulo: "Contas a Receber e Outros Devedores", prefixos: ["31", "32.9", "34.8", "35.1", "36.3", "37.2", "37.3", "38"] },
    { numero: 10, titulo: "Disponibilidades e Meios Monetários", prefixos: ["41", "42", "43", "44", "45", "48"] },
    { numero: 11, titulo: "Outros Activos Correntes / Acréscimos", prefixos: ["37.4"] },
    { numero: 12, titulo: "Capital Social Subscrito e Realizado", prefixos: ["51", "52", "54"], inversao: true },
    { numero: 13, titulo: "Reservas Legais, Estatutárias e Livres", prefixos: ["53", "55", "56", "57", "58"], inversao: true },
    { numero: 14, titulo: "Resultados Transitados", prefixos: ["81"], inversao: true },
    { numero: 15, titulo: "Empréstimos de Médio e Longo Prazo", prefixos: ["33.1.2", "33.2", "33.3"], inversao: true },
    { numero: 16, titulo: "Impostos Diferidos", prefixos: ["87.9"], inversao: true },
    { numero: 17, titulo: "Provisões para Pensões e Benefícios", prefixos: ["39.1"], inversao: true },
    { numero: 18, titulo: "Provisões para Outros Riscos e Encargos", prefixos: ["39.2", "39.3", "39.4", "39.9"], inversao: true },
    { numero: 19, titulo: "Outros Passivos Não Correntes", prefixos: ["37.6"], inversao: true },
    { numero: 20, titulo: "Fornecedores e Outras Contas a Pagar", prefixos: ["32.1", "32.2", "32.8", "31.9", "34", "35.2", "36.1", "37.1"], inversao: true },
    { numero: 21, titulo: "Resultado Líquido do Exercício", prefixos: ["88"] },
    { numero: 22, titulo: "Vendas de Mercadorias e Produtos", prefixos: ["61"] },
    { numero: 23, titulo: "Prestações de Serviços Especializados", prefixos: ["62"] },
    { numero: 24, titulo: "Outros Proveitos e Ganhos Operacionais", prefixos: ["63", "64", "65"] },
    { numero: 27, titulo: "Custo das Mercadorias Vendidas e Matérias Consumidas (CMVMC)", prefixos: ["71", "72"] },
    { numero: 28, titulo: "Custos com o Pessoal e Encargos Sociais", prefixos: ["72"] },
    { numero: 29, titulo: "Amortizações do Exercício", prefixos: ["73"] },
    { numero: 30, titulo: "Outros Custos e Perdas Operacionais (FSE e Impostos)", prefixos: ["75"] },
    { numero: 31, titulo: "Resultados Financeiros (Juros, Câmbios e Descontos)", prefixos: ["66", "76"] },
    { numero: 34, titulo: "Resultados Extraordinários e Sinistros", prefixos: ["69", "79"] },
    { numero: 35, titulo: "Imposto sobre os Lucros / Imposto Industrial", prefixos: ["87"] },
    { numero: 43, titulo: "Políticas Adoptadas para Fluxos de Caixa", prefixos: [] },
    { numero: 47, titulo: "Composição de Caixa e Seus Equivalentes", prefixos: ["41", "42", "43", "44", "45"] },
  ];

  return notasDefs.map((def) => {
    let valAtu = 0;
    let valAnt = 0;
    if (def.prefixos.length > 0) {
      if (def.inversao) {
        valAtu = -atual.somar(...def.prefixos);
        valAnt = -anterior.somar(...def.prefixos);
      } else {
        valAtu = atual.somar(...def.prefixos);
        valAnt = anterior.somar(...def.prefixos);
      }
    }

    let texto = `Nota ${def.numero} — ${def.titulo}: `;
    if (def.numero === 1) {
      texto += `Sociedade comercial regida pelo direito angolano, dedicando-se às actividades previstas no seu pacto social.`;
    } else if (def.numero === 2) {
      texto += `As presentes demonstrações financeiras foram elaboradas no pressuposto da continuidade das operações, de acordo com as regras contabilísticas e critérios de mensuração do Plano Geral de Contabilidade de Angola (Decreto n.º 82/2001).`;
    } else if (def.numero === 43) {
      texto += `Os fluxos de caixa foram preparados pelo método indirecto, reconciliando o Resultado Líquido do Exercício com a variação efectiva de disponibilidades monetárias.`;
    } else {
      texto += `Registou no exercício actual o montante de ${arredondar(valAtu, grandeza).toLocaleString("pt-PT")} Kz (exercício comparativo anterior: ${arredondar(valAnt, grandeza).toLocaleString("pt-PT")} Kz).`;
    }

    return {
      numero: def.numero,
      titulo: def.titulo,
      texto,
      valorActual: arredondar(valAtu, grandeza),
      valorAnterior: arredondar(valAnt, grandeza),
    };
  });
}

export function construirPacote(
  entidade: string,
  ano: number,
  moeda = "Kz (AOA)",
  grandeza = 1,
  atual: Balancete,
  anterior: Balancete,
  incluirFuncoes = false
): PacoteDemonstracoes {
  const grandezaTexto = grandeza === 1000000 ? "(em milhões de Kz)" : grandeza === 1000 ? "(em milhares de Kz)" : "(em Kz)";
  const periodo = `Exercício de ${ano} (comparativo ${ano - 1})`;

  const balanco = calcularBalanco(atual, anterior, grandeza);
  const resultados = calcularResultados(atual, anterior, grandeza);
  const fluxosCaixa = calcularFluxosCaixa(atual, anterior, grandeza);
  const alteracoesCP = calcularAlteracoesCP(atual, anterior, grandeza);
  const notas = gerarNotas(atual, anterior, grandeza);

  let demonstracaoFuncoes: Demonstracao | undefined;
  if (incluirFuncoes) {
    demonstracaoFuncoes = {
      titulo: MODELO_RESULTADOS_FUNCOES.titulo,
      linhas: MODELO_RESULTADOS_FUNCOES.linhas.map((l) => ({
        rubrica: l.rubrica,
        notas: l.notas,
        actual: arredondar(atual.somar(...l.prefixos), grandeza),
        anterior: arredondar(anterior.somar(...l.prefixos), grandeza),
        ehTotal: l.rubrica.startsWith("TOTAL") || l.rubrica.startsWith("Margem") || l.rubrica.startsWith("Resultados"),
      })),
      totais: {},
    };
  }

  return {
    entidade,
    periodo,
    ano,
    moeda,
    grandeza,
    grandezaTexto,
    balanco,
    resultados,
    fluxosCaixa,
    alteracoesCP,
    notas,
    demonstracaoFuncoes,
  };
}
