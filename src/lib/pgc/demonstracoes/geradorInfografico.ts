import type { PacoteDemonstracoes } from "./tipos";

export function abrirInfograficoHTML(pacote: PacoteDemonstracoes): void {
  const balanco = pacote.balanco;
  const resultados = pacote.resultados;
  const fluxos = pacote.fluxosCaixa;

  const totalActivo = balanco.totais.activo || 1;
  const totalPassivo = balanco.totais.passivo || 1;
  const totalCP = balanco.totais.capitalProprio || 1;
  const rle = resultados.totais.rle || 0;
  const volumeNegocios = resultados.totais.proveitosOperacionais || 1;

  // Rácios Financeiros
  const liquidezGeral = (balanco.totais.activoCorrente || 0) / (balanco.totais.passivoCorrente || 1);
  const autonomiaFinanceira = (totalCP / totalActivo) * 100;
  const solvabilidade = (totalCP / totalPassivo) * 100;
  const margemLiquida = (rle / volumeNegocios) * 100;

  const formatarKz = (n: number) => n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Infográfico Financeiro — ${pacote.entidade} (${pacote.periodo})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0A1628; color: #F8FAFC; padding: 30px; }
    .container { max-width: 1100px; margin: 0 auto; background: #0F1F38; border: 1px solid #1E3A6B; border-radius: 20px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1B3A6B; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { background: #1B3A6B; color: #93C5FD; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    h1 { font-size: 26px; font-weight: 900; color: #FFFFFF; }
    p.subtitle { font-size: 13px; color: #94A3B8; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi-card { background: #152744; border: 1px solid #234275; border-radius: 14px; padding: 18px; position: relative; overflow: hidden; }
    .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #2E5FA3; }
    .kpi-title { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 22px; font-weight: 900; color: #FFFFFF; margin-top: 8px; }
    .kpi-sub { font-size: 11px; color: #38BDF8; margin-top: 4px; font-weight: 600; }
    .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .panel { background: #152744; border: 1px solid #234275; border-radius: 14px; padding: 20px; }
    .panel-title { font-size: 14px; font-weight: 700; color: #60A5FA; border-bottom: 1px solid #1E3A6B; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
    .data-row { display: flex; justify-content: space-between; font-size: 12px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .data-row.total { font-weight: 700; color: #FFFFFF; border-top: 1px solid #2E5FA3; border-bottom: none; margin-top: 4px; padding-top: 10px; }
    .bar-container { background: #0A1628; border-radius: 8px; height: 10px; width: 100%; margin-top: 6px; overflow: hidden; display: flex; }
    .bar-activo { background: #38BDF8; height: 100%; }
    .bar-cp { background: #34D399; height: 100%; }
    .bar-passivo { background: #F87171; height: 100%; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #1B3A6B; font-size: 11px; color: #64748B; }
    .print-btn { background: #2563EB; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 12px; }
    .print-btn:hover { background: #1D4ED8; }
    @media print {
      body { background: white; color: black; padding: 0; }
      .container { border: none; box-shadow: none; background: white; color: black; }
      .print-btn { display: none; }
      .kpi-card, .panel { background: #F8FAFC; border: 1px solid #E2E8F0; color: black; }
      .kpi-value, h1, .panel-title, .data-row.total { color: #0F172A; }
      .kpi-title, p.subtitle, .data-row { color: #475569; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="badge">PGC Angola · Decreto n.º 82/2001</div>
        <h1 style="margin-top: 8px;">${pacote.entidade.toUpperCase()}</h1>
        <p class="subtitle">Síntese Executiva das Demonstrações Financeiras · Exercício ${pacote.ano} ${pacote.grandezaTexto}</p>
      </div>
      <div>
        <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
    </div>

    <!-- 4 KPIs Executivos -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total do Activo</div>
        <div class="kpi-value">${formatarKz(totalActivo)} <span style="font-size:12px;color:#94A3B8">${pacote.moeda}</span></div>
        <div class="kpi-sub">Estrutura Patrimonial</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Resultado Líquido (RLE)</div>
        <div class="kpi-value" style="color: ${rle >= 0 ? '#34D399' : '#F87171'}">${formatarKz(rle)} <span style="font-size:12px;color:#94A3B8">${pacote.moeda}</span></div>
        <div class="kpi-sub">${rle >= 0 ? 'Lucro do Exercício' : 'Prejuízo do Exercício'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Liquidez Geral</div>
        <div class="kpi-value">${liquidezGeral.toFixed(2)}x</div>
        <div class="kpi-sub">${liquidezGeral >= 1 ? 'Cobertura Confortável' : 'Atenção à Liquidez'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Autonomia Financeira</div>
        <div class="kpi-value">${autonomiaFinanceira.toFixed(1)}%</div>
        <div class="kpi-sub">${autonomiaFinanceira >= 33 ? 'Estrutura Sólida' : 'Dependência de Terceiros'}</div>
      </div>
    </div>

    <!-- Painéis Centrais -->
    <div class="section-grid">
      <div class="panel">
        <div class="panel-title">
          <span>Balanço Patrimonial</span>
          <span style="font-size:11px;color:#38BDF8">Equilíbrio: 100%</span>
        </div>
        <div class="data-row">
          <span>Activo Não Corrente (Imobilizações)</span>
          <span style="font-family:monospace">${formatarKz(balanco.totais.activoNaoCorrente || 0)}</span>
        </div>
        <div class="data-row">
          <span>Activo Corrente (Existências, Clientes, Meios Monetários)</span>
          <span style="font-family:monospace">${formatarKz(balanco.totais.activoCorrente || 0)}</span>
        </div>
        <div class="data-row total">
          <span>TOTAL DO ACTIVO</span>
          <span style="font-family:monospace">${formatarKz(totalActivo)}</span>
        </div>
        <div style="margin-top: 14px;" class="data-row">
          <span>Capital Próprio (Capital + Reservas + RLE)</span>
          <span style="font-family:monospace">${formatarKz(totalCP)}</span>
        </div>
        <div class="data-row">
          <span>Passivo Total (Financiamentos + Fornecedores + Estado)</span>
          <span style="font-family:monospace">${formatarKz(totalPassivo)}</span>
        </div>
        <div class="data-row total">
          <span>TOTAL CAPITAL PRÓPRIO E PASSIVO</span>
          <span style="font-family:monospace">${formatarKz(totalCP + totalPassivo)}</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>Demonstração de Resultados</span>
          <span style="font-size:11px;color:#34D399">Margem: ${margemLiquida.toFixed(1)}%</span>
        </div>
        <div class="data-row">
          <span>Proveitos Operacionais (Vendas e Serviços)</span>
          <span style="font-family:monospace">${formatarKz(resultados.totais.proveitosOperacionais || 0)}</span>
        </div>
        <div class="data-row">
          <span>Custos Operacionais (CMVMC, Pessoal, FST, Amort.)</span>
          <span style="font-family:monospace">-${formatarKz(resultados.totais.custosOperacionais || 0)}</span>
        </div>
        <div class="data-row total">
          <span>RESULTADOS OPERACIONAIS</span>
          <span style="font-family:monospace">${formatarKz(resultados.totais.resultadosOperacionais || 0)}</span>
        </div>
        <div class="data-row">
          <span>Resultados Financeiros e Não Operacionais</span>
          <span style="font-family:monospace">${formatarKz((resultados.totais.resultadosFinanceiros || 0) + (resultados.totais.resultadosNaoOperacionais || 0))}</span>
        </div>
        <div class="data-row">
          <span>Imposto sobre o Rendimento</span>
          <span style="font-family:monospace">-${formatarKz(resultados.totais.imposto || 0)}</span>
        </div>
        <div class="data-row total" style="color: ${rle >= 0 ? '#34D399' : '#F87171'}">
          <span>RESULTADO LÍQUIDO DO EXERCÍCIO</span>
          <span style="font-family:monospace">${formatarKz(rle)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      Documento gerado automaticamente pelo Sistema de Contabilidade Unificada · PGC Angola (Decreto n.º 82/2001)
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
