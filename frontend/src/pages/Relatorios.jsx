import { useState } from 'react';
import { Search, BarChart2 } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const REPORTS = [
  { key: 'reservas-por-funcionario',     label: 'Reservas por funcionário',    filterKey: 'funcionarioId' },
  { key: 'reservas-por-categoria',       label: 'Reservas por categoria',      filterKey: 'categoriaVeiculoId' },
  { key: 'checkins-por-agencia',         label: 'Check-ins por agência',       filterKey: 'agenciaId' },
  { key: 'checkins-por-veiculo',         label: 'Check-ins por veículo',       filterKey: 'veiculoId' },
  { key: 'checkouts-avarias-por-veiculo','label': 'Check-outs com avarias',    filterKey: 'veiculoId' },
  { key: 'checkouts-multas-por-cliente', label: 'Check-outs com multas',       filterKey: 'clienteId' },
];

function fmtBRL(v) { return `R$ ${parseFloat(v || 0).toFixed(2)}`; }
function fmtN(v) { return parseInt(v || 0).toLocaleString('pt-BR'); }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { dateStyle: 'short' });
}

function ReportTable({ reportKey, dados, totals }) {
  if (!dados) return null;
  if (dados.length === 0) return <p className="px-4 py-8 text-sm text-center" style={{ color: '#6B7280' }}>Nenhum resultado encontrado para o período selecionado.</p>;

  const cols = {
    'reservas-por-funcionario': [
      { h: 'Funcionário', r: d => <div><div className="font-medium">{d.funcionarioNome}</div><div className="text-xs" style={{ color: '#6B7280' }}>{d.cargo} — {d.agenciaNome}</div></div> },
      { h: 'Qtd. reservas', r: d => fmtN(d.quantidadeReservas), right: true },
      { h: 'Valor total', r: d => fmtBRL(d.valorTotal), right: true, mono: true },
      { h: 'Valor médio', r: d => fmtBRL(d.valorMedio), right: true, mono: true },
      { h: 'Concluídas', r: d => fmtN(d.reservasConcluidas), right: true },
      { h: 'Canceladas', r: d => fmtN(d.reservasCanceladas), right: true },
      { h: 'Pendentes', r: d => fmtN(d.reservasPendentes), right: true },
    ],
    'reservas-por-categoria': [
      { h: 'Categoria', r: d => <div><div className="font-medium">{d.categoriaNome}</div><div className="text-xs" style={{ color: '#6B7280' }}>{d.tipoCarroceria}</div></div> },
      { h: 'Diária', r: d => fmtBRL(d.valorDiariaCadastrado), right: true, mono: true },
      { h: 'Qtd. reservas', r: d => fmtN(d.quantidadeReservas), right: true },
      { h: 'Valor total', r: d => fmtBRL(d.valorTotal), right: true, mono: true },
      { h: 'Clientes únicos', r: d => fmtN(d.clientesUnicos), right: true },
      { h: 'Concluídas', r: d => fmtN(d.reservasConcluidas), right: true },
      { h: 'Canceladas', r: d => fmtN(d.reservasCanceladas), right: true },
    ],
    'checkins-por-agencia': [
      { h: 'Agência', r: d => <div><div className="font-medium">{d.agenciaNome}</div><div className="text-xs truncate max-w-xs" style={{ color: '#6B7280' }}>{d.endereco}</div></div> },
      { h: 'Status', r: d => <StatusBadge status={d.agenciaStatus} /> },
      { h: 'Qtd. check-ins', r: d => fmtN(d.quantidadeCheckins), right: true },
      { h: 'Clientes únicos', r: d => fmtN(d.clientesUnicos), right: true },
      { h: 'Veículos utilizados', r: d => fmtN(d.veiculosUtilizados), right: true },
      { h: 'Top cliente', r: d => d.clienteComMaisCheckins || '—' },
    ],
    'checkins-por-veiculo': [
      { h: 'Veículo', r: d => <div><div className="font-mono font-semibold">{d.placa}</div><div className="text-xs" style={{ color: '#6B7280' }}>{d.marca} {d.modelo} · {d.anoFabricacao}</div></div> },
      { h: 'Categoria', r: d => d.categoriaNome },
      { h: 'Qtd. check-ins', r: d => fmtN(d.quantidadeCheckins), right: true },
      { h: 'Km média', r: d => `${parseFloat(d.quilometragemMediaCheckin || 0).toLocaleString('pt-BR')} km`, right: true, mono: true },
      { h: 'Km máx.', r: d => `${parseFloat(d.maiorQuilometragemCheckin || 0).toLocaleString('pt-BR')} km`, right: true, mono: true },
      { h: 'Clientes únicos', r: d => fmtN(d.clientesUnicos), right: true },
      { h: 'Top funcionário', r: d => d.funcionarioComMaisCheckins || '—' },
    ],
    'checkouts-avarias-por-veiculo': [
      { h: 'Check-in', r: d => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>#{d.checkinId}</span> },
      { h: 'Veículo', r: d => <div><div className="font-mono font-semibold">{d.placa}</div><div className="text-xs" style={{ color: '#6B7280' }}>{d.marca} {d.modelo}</div></div> },
      { h: 'Data check-in', r: d => fmtDate(d.dataCheckin) },
      { h: 'Data check-out', r: d => fmtDate(d.dataCheckout) },
      { h: 'Km devolução', r: d => `${parseFloat(d.quilometragemCheckout || 0).toLocaleString('pt-BR')} km`, right: true, mono: true },
      { h: 'Avarias', r: d => fmtN(d.quantidadeAvarias), right: true },
      { h: 'Descrição avarias', r: d => <span className="text-xs">{d.descricaoAvarias || '—'}</span> },
      { h: 'Valor avarias', r: d => fmtBRL(d.valorTotalAvarias), right: true, mono: true },
      { h: 'Multa gerada', r: d => (
        <div className="text-right">
          <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtBRL(d.valorMulta)}</div>
          {d.seguroContratado
            ? <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>franquia: {fmtBRL(d.franquiaSeguro)}</div>
            : <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>sem seguro</div>}
        </div>
      ), right: true },
    ],
    'checkouts-multas-por-cliente': [
      { h: 'Cliente', r: d => d.clienteNome },
      { h: 'Data emissão', r: d => fmtDate(d.dataEmissao) },
      { h: 'Descrição', r: d => <span className="text-xs">{d.descricao || '—'}</span> },
      { h: 'Veículo', r: d => d.placa ? <div><div className="font-mono font-semibold">{d.placa}</div><div className="text-xs" style={{ color: '#6B7280' }}>{d.marca} {d.modelo}</div></div> : <span style={{ color: '#6B7280' }}>—</span> },
      { h: 'Seguro', r: d => d.seguroContratado ? <div><div className="text-sm">{d.seguroContratado}</div><div className="text-xs" style={{ color: '#6B7280' }}>Franquia: {fmtBRL(d.franquia)}</div></div> : <span style={{ color: '#6B7280' }}>—</span> },
      { h: 'Avarias associadas', r: d => <span className="text-xs">{d.descricaoAvarias || '—'}</span> },
      { h: 'Valor multa', r: d => fmtBRL(d.valorMulta), right: true, mono: true },
      { h: 'Status', r: d => <StatusBadge status={d.statusMulta} entity="multa" /> },
    ],
  };

  // Mapeamento: header da coluna → { field: chave no totals, fmt: função }
  const footerConfig = {
    'reservas-por-funcionario': {
      'Qtd. reservas': { field: 'totalReservasGlobal', fmt: fmtN },
      'Valor total':   { field: 'totalValorGlobal',    fmt: fmtBRL },
    },
    'reservas-por-categoria': {
      'Qtd. reservas': { field: 'totalReservasGlobal', fmt: fmtN },
      'Valor total':   { field: 'totalValorGlobal',    fmt: fmtBRL },
    },
    'checkins-por-agencia': {
      'Qtd. check-ins': { field: 'totalCheckinsGlobal', fmt: fmtN },
    },
    'checkins-por-veiculo': {
      'Qtd. check-ins': { field: 'totalCheckinsGlobal', fmt: fmtN },
    },
    'checkouts-avarias-por-veiculo': {
      'Avarias':      { field: 'totalAvariasGlobal',      fmt: fmtN },
      'Valor avarias': { field: 'totalValorAvariasGlobal', fmt: fmtBRL },
    },
    'checkouts-multas-por-cliente': {
      'Valor multa': { field: 'totalValorMultasGlobal', fmt: fmtBRL },
    },
  };

  const columns = cols[reportKey] || [];
  const colFooter = footerConfig[reportKey] || {};
  const showTotalRow = totals != null && Object.keys(colFooter).length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.right ? 'th-r' : 'th'}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, ri) => (
            <tr key={ri} className="hover:bg-stone-50 transition-colors">
              {columns.map((c, ci) => (
                <td key={ci} className={c.right ? 'td-r' : c.mono ? 'td-mono' : 'td'}>
                  {c.r(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotalRow && (
          <tfoot>
            <tr style={{ borderTop: '2px solid #E7E5E4', background: '#F9FAFB' }}>
              {columns.map((c, i) => {
                const cfg = colFooter[c.h];
                return (
                  <td
                    key={i}
                    className={c.right ? 'td-r' : 'td'}
                    style={{ fontWeight: 600, color: '#1F2937' }}
                  >
                    {i === 0 ? 'Total no período' : cfg ? cfg.fmt(totals[cfg.field]) : ''}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function Relatorios() {
  const { data: funcionarios } = useCrud('/funcionarios');
  const { data: categorias } = useCrud('/categoriasdeveiculos');
  const { data: agencias } = useCrud('/agencias');
  const { data: veiculos } = useCrud('/veiculos');
  const { data: clientes } = useCrud('/clientes');
  const toast = useToast();

  const [active, setActive] = useState(REPORTS[0].key);
  const [filters, setFilters] = useState({ inicio: '', termino: '' });
  const [entityFilter, setEntityFilter] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const currentReport = REPORTS.find(r => r.key === active);

  const filterOptions = {
    funcionarioId: funcionarios.map(f => ({ value: f.id, label: `${f.nome} — ${f.cargo}` })),
    categoriaVeiculoId: categorias.map(c => ({ value: c.id, label: c.nome })),
    agenciaId: agencias.map(a => ({ value: a.id, label: a.nome })),
    veiculoId: veiculos.map(v => ({ value: v.id, label: `${v.placa} — ${v.marca} ${v.modelo}` })),
    clienteId: clientes.map(c => ({ value: c.id, label: `${c.nome} — ${c.cpf}` })),
  };

  const switchReport = (key) => { setActive(key); setResult(null); setEntityFilter(''); setPagina(1); };

  const fetchReport = async (pg = 1) => {
    if (!filters.inicio || !filters.termino) { toast('Informe o período obrigatório (início e término).', 'error'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ inicio: filters.inicio, termino: filters.termino, pagina: pg, itensPorPagina: 20 });
      if (entityFilter) params.set(currentReport.filterKey, entityFilter);
      const res = await api.get(`/relatorios/${active}?${params}`);
      setResult(res);
      setPagina(pg);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const opts = filterOptions[currentReport?.filterKey] || [];

  return (
    <div>
      <h1 className="page-title mb-6">Relatórios</h1>
      <div className="flex gap-6">
        {/* Sub-nav */}
        <aside className="shrink-0 w-52">
          <div className="card overflow-hidden">
            {REPORTS.map(r => (
              <button
                key={r.key}
                onClick={() => switchReport(r.key)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-l-2 ${
                  active === r.key
                    ? 'border-[#1B4FCE] bg-blue-50 text-[#1B4FCE] font-medium'
                    : 'border-transparent hover:bg-stone-50 text-[#374151]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card p-4 mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="field-label">Início <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="field-input" type="date" value={filters.inicio} onChange={e => setFilters(p => ({ ...p, inicio: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Término <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="field-input" type="date" value={filters.termino} onChange={e => setFilters(p => ({ ...p, termino: e.target.value }))} />
              </div>
              {opts.length > 0 && (
                <div>
                  <label className="field-label">Filtro <span style={{ color: '#6B7280' }}>(opcional)</span></label>
                  <select className="field-select" style={{ minWidth: 200 }} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <button className="btn-primary" onClick={() => fetchReport(1)} disabled={loading}>
                <Search className="h-4 w-4" /> {loading ? 'Gerando…' : 'Gerar relatório'}
              </button>
            </div>
          </div>

          <div className="card">
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart2 className="h-10 w-10 mb-3" style={{ color: '#E7E5E4' }} strokeWidth={1.5} />
                <p className="text-sm" style={{ color: '#6B7280' }}>Selecione um período para gerar o relatório.</p>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>Gerando…</div>
            )}
            {result && !loading && (
              <>
                <ReportTable reportKey={active} dados={result.dados} totals={result} />
                <Pagination paginacao={result.paginacao} onChange={fetchReport} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
