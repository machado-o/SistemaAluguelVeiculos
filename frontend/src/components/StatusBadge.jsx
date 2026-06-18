const DEFAULT_BADGES = {
  Pendente:    { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  Confirmada:  { bg: '#EFF6FF', text: '#1E40AF', dot: '#2563EB' },
  'Concluída': { bg: '#F0FDF4', text: '#166534', dot: '#16A34A' },
  Cancelada:   { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' },
  'Disponível':{ bg: '#F0FDF4', text: '#166534', dot: '#16A34A' },
  Reservado:   { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  'Manutenção':{ bg: '#FEF2F2', text: '#991B1B', dot: '#DC2626' },
  Ativa:       { bg: '#F0FDF4', text: '#166534', dot: '#16A34A' },
  Inativa:     { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' },
  Gerente:     { bg: '#EFF6FF', text: '#1E40AF', dot: '#2563EB' },
  Atendente:   { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' },
  Paga:        { bg: '#F0FDF4', text: '#166534', dot: '#16A34A' },
};

const MULTA_BADGES = {
  Pendente: { bg: '#FEF2F2', text: '#991B1B', dot: '#DC2626' },
  Paga:     { bg: '#F0FDF4', text: '#166534', dot: '#16A34A' },
};

export default function StatusBadge({ status, entity }) {
  const map = entity === 'multa' ? MULTA_BADGES : DEFAULT_BADGES;
  const c = map[status] ?? { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
      {status}
    </span>
  );
}
