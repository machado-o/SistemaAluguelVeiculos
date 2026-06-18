import { Link } from 'react-router-dom';
import { ClipboardList, LogIn, Car, FileWarning, ArrowRight } from 'lucide-react';
import { useCrud } from '../hooks/useCrud.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const RESERVA_ORDER = ['Pendente', 'Confirmada', 'Concluída', 'Cancelada'];
const VEICULO_ORDER = ['Disponível', 'Reservado', 'Manutenção'];

function isToday(dt) {
  if (!dt) return false;
  const d = new Date(dt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function Kpi({ to, Icon, label, value, accent }) {
  return (
    <Link to={to} className="card p-4 block transition-colors hover:bg-stone-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
          <p className="font-display text-3xl font-semibold mt-1" style={{ color: accent || '#111827' }}>{value}</p>
        </div>
        <Icon className="h-5 w-5" style={{ color: accent || '#6B7280' }} />
      </div>
    </Link>
  );
}

function StatusBreakdown({ title, order, counts, entity, total }) {
  return (
    <div className="card p-5">
      <h2 className="font-display text-base font-semibold mb-4" style={{ color: '#111827' }}>{title}</h2>
      <div className="space-y-3">
        {order.map(status => {
          const n = counts[status] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={status} className="flex items-center gap-3">
              <div className="w-28 shrink-0"><StatusBadge status={status} entity={entity} /></div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F0EF' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#1B4FCE' }} />
              </div>
              <span className="text-sm font-medium tabular-nums w-8 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1F2937' }}>{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: reservas, loading: lr } = useCrud('/reservas');
  const { data: veiculos, loading: lv } = useCrud('/veiculos');
  const { data: multas, loading: lm } = useCrud('/multas');
  const { data: checkins, loading: lc } = useCrud('/checkins');

  const loading = lr || lv || lm || lc;

  const reservasPorStatus = countBy(reservas, 'status');
  const veiculosPorStatus = countBy(veiculos, 'status');
  const multasPendentes = multas.filter(m => m.status === 'Pendente');
  const reservasPendentes = reservas.filter(r => r.status === 'Pendente');
  const checkinsHoje = checkins.filter(c => isToday(c.dataCheckin));

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-6">Visão geral</h1>
        <div className="flex items-center justify-center py-24 text-sm" style={{ color: '#6B7280' }}>Carregando…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Visão geral</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          {user ? `Olá, ${user.nome.split(' ')[0]}. ` : ''}Situação operacional de hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi to="/reservas" Icon={ClipboardList} label="Reservas pendentes" value={reservasPendentes.length} accent={reservasPendentes.length > 0 ? '#F97316' : '#111827'} />
        <Kpi to="/checkins" Icon={LogIn} label="Check-ins hoje" value={checkinsHoje.length} />
        <Kpi to="/veiculos" Icon={Car} label="Veículos disponíveis" value={veiculosPorStatus['Disponível'] || 0} accent="#16A34A" />
        <Kpi to="/multas" Icon={FileWarning} label="Multas pendentes" value={multasPendentes.length} accent={multasPendentes.length > 0 ? '#DC2626' : '#111827'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatusBreakdown title="Reservas por status" order={RESERVA_ORDER} counts={reservasPorStatus} total={reservas.length} />
        <StatusBreakdown title="Frota por status" order={VEICULO_ORDER} counts={veiculosPorStatus} entity="veiculo" total={veiculos.length} />
      </div>

      {multasPendentes.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold" style={{ color: '#111827' }}>
              Multas pendentes
            </h2>
            <Link to="/multas" className="text-sm inline-flex items-center gap-1" style={{ color: '#1B4FCE' }}>
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Cliente</th>
                  <th className="th">Descrição</th>
                  <th className="th-r">Valor</th>
                </tr>
              </thead>
              <tbody>
                {multasPendentes.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td className="td font-medium">{m.cliente?.nome || `#${m.clienteId}`}</td>
                    <td className="td" style={{ color: '#6B7280' }}>{m.descricao || '—'}</td>
                    <td className="td-r" style={{ color: '#DC2626' }}>R$ {parseFloat(m.valor).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-hint mt-2">Multas pendentes bloqueiam o check-in do cliente.</p>
        </div>
      )}

      {reservasPendentes.length === 0 && multasPendentes.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: '#6B7280' }}>Nenhuma pendência no momento.</p>
          <Link to="/reservas" className="btn-primary mt-4 inline-flex"><ClipboardList className="h-4 w-4" /> Ir para reservas</Link>
        </div>
      )}
    </div>
  );
}
