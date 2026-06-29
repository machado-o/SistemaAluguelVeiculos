import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const F = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.senha);
      navigate('/reservas', { replace: true });
    } catch (err) {
      setError(err.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: '8px 12px',
    width: '100%',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#111827' }}
    >
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Mova-se"
        style={{ height: 180, width: 'auto', marginBottom: 40 }}
      />

      {/* Formulário fosco */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: 'rgba(0, 10, 30, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: '#FFFFFF' }}>
          Entrar
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Acesse com suas credenciais de funcionário.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={form.email}
              onChange={F('email')}
              placeholder="seu@email.com"
              required
              style={inputStyle}
              onFocus={e => e.target.style.border = '1px solid rgba(255,255,255,0.5)'}
              onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.2)'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={F('senha')}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={e => e.target.style.border = '1px solid rgba(255,255,255,0.5)'}
              onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.2)'}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm"
              style={{ backgroundColor: 'rgba(220,38,38,0.2)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.4)' }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5"
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
