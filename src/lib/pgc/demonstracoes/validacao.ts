import type { Demonstracao } from "./tipos";

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

const TOLERANCIA = 0.05; // Kz — tolerância para arredondamentos

export function validarFechoBalanco(balanco: Demonstracao): ResultadoValidacao {
  const activo = balanco.totais.activo || 0;
  const cpEPassivo = balanco.totais.capitalProprioEPassivo || 0;
  const diferenca = activo - cpEPassivo;
  const erros: string[] = [];

  if (Math.abs(diferenca) > TOLERANCIA) {
    erros.push(
      `O Balanço NÃO fecha: Activo (${activo.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz) ≠ Capital Próprio + Passivo (${cpEPassivo.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz). Diferença apurada: ${diferenca.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz.`
    );
  }

  return { valido: erros.length === 0, erros, avisos: [] };
}

export function validarResultadoLiquido(dr: Demonstracao, rleClasse8: number): ResultadoValidacao {
  const apurado = dr.totais.rle || 0;
  const erros: string[] = [];

  if (rleClasse8 !== 0 && Math.abs(apurado - rleClasse8) > TOLERANCIA) {
    erros.push(
      `Resultado Líquido inconsistente: Apurado na Demonstração de Resultados = ${apurado.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz, mas o saldo da Conta 88 é ${rleClasse8.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz.`
    );
  }

  return { valido: erros.length === 0, erros, avisos: [] };
}

export function validarFluxosCaixa(fc: Demonstracao, variacaoRealClasse4: number): ResultadoValidacao {
  const apurada = fc.totais.variacaoCaixa || 0;
  const erros: string[] = [];

  if (Math.abs(apurada - variacaoRealClasse4) > TOLERANCIA) {
    erros.push(
      `Fluxos de Caixa inconsistentes: Variação apurada (${apurada.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz) difere da variação real de Meios Monetários (${variacaoRealClasse4.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz).`
    );
  }

  return { valido: erros.length === 0, erros, avisos: [] };
}
