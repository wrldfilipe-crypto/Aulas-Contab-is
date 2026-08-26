import { construirPlano } from "./chartSeed";
import type { Conta, PlanoContas, ResultadoConta, ResultadoLancamento } from "./types";

function indice(plano?: PlanoContas | null): Map<string, Conta> {
  const m = new Map<string, Conta>();
  const contas = (plano && plano.contas && Array.isArray(plano.contas)) ? plano.contas : construirPlano().contas;
  for (const conta of contas) m.set(conta.codigo, conta);
  return m;
}

/** Normaliza um código digitado (ex.: "45,1" → "45.1"; " 88 " → "88"). */
export function normalizarCodigo(input: string): string {
  return input.trim().replace(/,/g, ".").replace(/\s+/g, "");
}

/**
 * Valida uma conta contra o plano oficial.
 * - Aceita código exato (ex.: "45.1")
 * - Aceita código de classe (ex.: "4")
 * - Rejeita códigos inventados (ex.: "55.1" se não constar no documento)
 */
export function validarConta(plano: PlanoContas | null | undefined, codigoInput: string): ResultadoConta {
  const idx = indice(plano);
  const codigo = normalizarCodigo(codigoInput);

  // Verificação estrita de Classe 9: não existe no Decreto 82/2001 (PGC Angola)
  if (codigo === "9" || codigo.startsWith("9.") || codigo.startsWith("9")) {
    return {
      codigo,
      existe: false,
      sugestao: "O Decreto n.º 82/2001 (PGC Angola) define apenas as Classes 0 a 8. Não existe Classe 9 oficial no plano de contas.",
    };
  }

  const conta = idx.get(codigo);

  if (conta) {
    return {
      codigo,
      existe: true,
      designacaoOficial: conta.designacao,
      classe: conta.classe,
      usoFacultativo: conta.usoFacultativo,
    };
  }

  // Sugestão: o pai mais próximo existente no plano
  const partes = codigo.split(".");
  let sugestao: string | undefined;
  for (let i = partes.length - 1; i > 0; i--) {
    const pai = partes.slice(0, i).join(".");
    const contaPai = idx.get(pai);
    if (contaPai) {
      sugestao = `${pai} — ${contaPai.designacao}`;
      break;
    }
  }

  return { codigo, existe: false, sugestao };
}

/** Extrai o primeiro dígito (classe) de um código válido. */
export function classeDe(codigo: string): string | null {
  const m = codigo.match(/^(\d)/);
  return m ? m[1] : null;
}

/**
 * Valida um lançamento completo (débitos e créditos).
 * Regras: contas existem; débito total = crédito total.
 */
export function validarLancamento(
  plano: PlanoContas | null | undefined,
  lancamento: { debito: { conta: string; valor: number }[]; credito: { conta: string; valor: number }[] }
): ResultadoLancamento {
  const erros: string[] = [];
  const avisos: string[] = [];

  const totalDebito = lancamento.debito.reduce((s, l) => s + l.valor, 0);
  const totalCredito = lancamento.credito.reduce((s, l) => s + l.valor, 0);

  if (Math.abs(totalDebito - totalCredito) > 0.001) {
    erros.push(`Lançamento desequilibrado: débito ${totalDebito} ≠ crédito ${totalCredito}`);
  }

  for (const d of lancamento.debito) {
    const r = validarConta(plano, d.conta);
    if (!r.existe) {
      erros.push(`Conta de débito inexistente no PGC Angola: "${d.conta}"${r.sugestao ? ` → sugestão: ${r.sugestao}` : ""}`);
    }
  }
  for (const c of lancamento.credito) {
    const r = validarConta(plano, c.conta);
    if (!r.existe) {
      erros.push(`Conta de crédito inexistente no PGC Angola: "${c.conta}"${r.sugestao ? ` → sugestão: ${r.sugestao}` : ""}`);
    }
  }

  return { valido: erros.length === 0, erros, avisos };
}

/** Pesquisa textual por designação (para o seletor de contas da UI). */
export function pesquisarConta(plano: PlanoContas | null | undefined, termo: string, limite = 10): Conta[] {
  const t = termo.toLowerCase();
  const contas = (plano && plano.contas && Array.isArray(plano.contas)) ? plano.contas : construirPlano().contas;
  return contas
    .filter((c) => c.designacao.toLowerCase().includes(t) || c.codigo.startsWith(t))
    .slice(0, limite);
}
