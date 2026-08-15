export interface LinhaBalancete {
  debito: number;
  credito: number;
}

export class Balancete {
  private saldos = new Map<string, LinhaBalancete>();

  registrar(codigoRaw: string, debito = 0, credito = 0) {
    if (!codigoRaw) return;
    const codigo = codigoRaw.trim().replace(/,/g, ".").replace(/\s+/g, "");
    const atual = this.saldos.get(codigo) ?? { debito: 0, credito: 0 };
    atual.debito += Number(debito) || 0;
    atual.credito += Number(credito) || 0;
    this.saldos.set(codigo, atual);
  }

  /** Saldo da conta exata (débito − crédito). */
  saldoExato(codigoRaw: string): number {
    const codigo = codigoRaw.trim().replace(/,/g, ".").replace(/\s+/g, "");
    const s = this.saldos.get(codigo);
    return s ? s.debito - s.credito : 0;
  }

  private matchesPrefix(codigo: string, prefixo: string): boolean {
    if (!prefixo || !codigo) return false;
    if (codigo === prefixo) return true;
    if (codigo.startsWith(prefixo + ".")) return true;
    // Se prefixo não tem ponto (ex: "31") e codigo tem (ex: "31.1.1")
    if (!prefixo.includes(".") && codigo.startsWith(prefixo + ".")) return true;
    // Se nenhum tem ponto (ex: "31" e "311")
    if (!prefixo.includes(".") && !codigo.includes(".") && codigo.startsWith(prefixo)) return true;
    // Se prefixo tem ponto (ex: "34.5") e codigo é "34.5.2"
    if (prefixo.includes(".") && codigo.startsWith(prefixo + ".")) return true;
    if (prefixo.includes(".") && codigo.startsWith(prefixo) && (codigo[prefixo.length] === '.' || !codigo[prefixo.length])) return true;
    return false;
  }

  /** Soma dos saldos de todas as contas que coincidem ou começam com o prefixo. */
  valor(prefixoRaw: string): number {
    const prefixo = prefixoRaw.trim().replace(/,/g, ".").replace(/\s+/g, "");
    let total = 0;
    for (const [codigo, s] of this.saldos) {
      if (this.matchesPrefix(codigo, prefixo)) {
        total += s.debito - s.credito;
      }
    }
    return total;
  }

  /** Total débito de todas as contas com o prefixo. */
  debito(prefixoRaw: string): number {
    const prefixo = prefixoRaw.trim().replace(/,/g, ".").replace(/\s+/g, "");
    let total = 0;
    for (const [codigo, s] of this.saldos) {
      if (this.matchesPrefix(codigo, prefixo)) {
        total += s.debito;
      }
    }
    return total;
  }

  /** Total crédito de todas as contas com o prefixo. */
  credito(prefixoRaw: string): number {
    const prefixo = prefixoRaw.trim().replace(/,/g, ".").replace(/\s+/g, "");
    let total = 0;
    for (const [codigo, s] of this.saldos) {
      if (this.matchesPrefix(codigo, prefixo)) {
        total += s.credito;
      }
    }
    return total;
  }

  somar(...prefixos: string[]): number {
    const matched = new Set<string>();
    let total = 0;
    const cleanPrefixes = prefixos.map(p => p.trim().replace(/,/g, ".").replace(/\s+/g, ""));
    for (const [codigo, s] of this.saldos) {
      const match = cleanPrefixes.some(p => this.matchesPrefix(codigo, p));
      if (match && !matched.has(codigo)) {
        matched.add(codigo);
        total += (s.debito - s.credito);
      }
    }
    return total;
  }

  somarDebito(...prefixos: string[]): number {
    const matched = new Set<string>();
    let total = 0;
    const cleanPrefixes = prefixos.map(p => p.trim().replace(/,/g, ".").replace(/\s+/g, ""));
    for (const [codigo, s] of this.saldos) {
      const match = cleanPrefixes.some(p => this.matchesPrefix(codigo, p));
      if (match && !matched.has(codigo)) {
        matched.add(codigo);
        total += s.debito;
      }
    }
    return total;
  }

  somarCredito(...prefixos: string[]): number {
    const matched = new Set<string>();
    let total = 0;
    const cleanPrefixes = prefixos.map(p => p.trim().replace(/,/g, ".").replace(/\s+/g, ""));
    for (const [codigo, s] of this.saldos) {
      const match = cleanPrefixes.some(p => this.matchesPrefix(codigo, p));
      if (match && !matched.has(codigo)) {
        matched.add(codigo);
        total += s.credito;
      }
    }
    return total;
  }

  listarContas(): { codigo: string; debito: number; credito: number; saldo: number }[] {
    const lista: { codigo: string; debito: number; credito: number; saldo: number }[] = [];
    for (const [codigo, s] of this.saldos) {
      lista.push({
        codigo,
        debito: s.debito,
        credito: s.credito,
        saldo: s.debito - s.credito,
      });
    }
    return lista.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }
}

/**
 * Constrói um Balancete a partir de uma lista de lançamentos em memória
 */
export function criarBalanceteDeLancamentos(
  lancamentos: {
    date?: string;
    lines: { accountCode: string; debit?: number; credit?: number }[];
  }[],
  ano?: number
): Balancete {
  const balancete = new Balancete();
  for (const je of lancamentos) {
    if (ano && je.date) {
      const year = new Date(je.date).getFullYear();
      if (year !== ano) continue;
    }
    for (const line of je.lines || []) {
      balancete.registrar(line.accountCode, Number(line.debit) || 0, Number(line.credit) || 0);
    }
  }
  return balancete;
}
