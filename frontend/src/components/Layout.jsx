import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, LogIn, LogOut, BarChart2, Building2,
  Users, UserCheck, Car, Tag, Shield, ShieldCheck,
  AlertTriangle, FileWarning, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const OPS = [
  { to: '/reservas',  label: 'Reservas',  Icon: ClipboardList },
  { to: '/checkins',  label: 'Check-in',  Icon: LogIn },
  { to: '/checkouts', label: 'Check-out', Icon: LogOut },
];

// `gerenteOnly` esconde o item para Atendentes (gating só de UI; não há enforcement no back ainda).
const CADASTROS = [
  { to: '/agencias',     label: 'Agências',     Icon: Building2,      gerenteOnly: true },
  { to: '/funcionarios', label: 'Funcionários', Icon: UserCheck,      gerenteOnly: true },
  { to: '/clientes',     label: 'Clientes',     Icon: Users },
  { to: '/veiculos',     label: 'Veículos',     Icon: Car },
  { to: '/categorias',   label: 'Categorias',   Icon: Tag },
  { to: '/seguros',      label: 'Seguros',      Icon: Shield },
  { to: '/coberturas',   label: 'Coberturas',   Icon: ShieldCheck },
  { to: '/avarias',      label: 'Avarias',      Icon: AlertTriangle },
  { to: '/multas',       label: 'Multas',       Icon: FileWarning },
];

function NavItem({ to, label, Icon, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'text-[#F97316] font-medium border-l-2 border-[#F97316] pl-[10px] bg-white/5'
            : 'text-[#9CA3AF] hover:text-white hover:bg-white/5 border-l-2 border-transparent pl-[10px]'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isGerente = user?.cargo === 'Gerente';
  const cadastros = CADASTROS.filter(item => !item.gerenteOnly || isGerente);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FAFAF9' }}>
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col w-56 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#111827' }}
      >
        {/* Cabeçalho do sidebar — mesma altura h-14 de antes */}
        <div
          className="flex items-center justify-between h-20 px-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Mova-se" style={{ height: 100, width: 'auto', display: 'block' }} />
          </div>
          <button
            className="lg:hidden transition-colors"
            style={{ color: '#6B7280' }}
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          <div>
            <div className="space-y-0.5">
              <NavItem to="/" label="Visão geral" Icon={LayoutDashboard} end onClick={() => setOpen(false)} />
            </div>
          </div>

          <div>
            <p className="section-label">Operações</p>
            <div className="space-y-0.5">
              {OPS.map(({ to, label, Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} onClick={() => setOpen(false)} />
              ))}
            </div>
          </div>

          {isGerente && (
            <div>
              <p className="section-label">Relatórios</p>
              <div className="space-y-0.5">
                <NavItem
                  to="/relatorios"
                  label="Relatórios"
                  Icon={BarChart2}
                  onClick={() => setOpen(false)}
                />
              </div>
            </div>
          )}

          <div>
            <p className="section-label">Cadastros</p>
            <div className="space-y-0.5">
              {cadastros.map(({ to, label, Icon }) => (
                <NavItem key={to} to={to} label={label} Icon={Icon} onClick={() => setOpen(false)} />
              ))}
            </div>
          </div>
        </nav>

        {/* User footer */}
        {user && (
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="mb-2">
              <p className="text-sm font-medium text-white truncate">{user.nome}</p>
              <p className="text-xs truncate" style={{ color: '#6B7280' }}>{user.cargo}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs transition-colors w-full"
              style={{ color: '#6B7280' }}
              onMouseOver={e => e.currentTarget.style.color = '#F97316'}
              onMouseOut={e => e.currentTarget.style.color = '#6B7280'}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="lg:hidden flex items-center h-14 px-4 bg-white border-b"
          style={{ borderColor: '#E7E5E4' }}
        >
          <button
            className="mr-3 transition-colors"
            style={{ color: '#6B7280' }}
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-semibold" style={{ color: '#111827' }}>Mova-se</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
