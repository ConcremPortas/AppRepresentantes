// TURNSTILE: configure VITE_TURNSTILE_SITE_KEY no .env e faça deploy da Edge Function verificar-turnstile
import { useState } from 'react';
import Turnstile from 'react-turnstile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTurnstileError(null);

    // Verificar token Turnstile na Edge Function antes do login
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verificar-turnstile', {
        body: { token: turnstileToken },
      });
      if (fnError || !data?.success) {
        setTurnstileError(data?.error ?? 'Verificação de segurança falhou. Tente novamente.');
        (window as any).turnstile?.reset();
        setTurnstileToken(null);
        return;
      }
    } catch {
      setTurnstileError('Erro ao verificar segurança. Tente novamente.');
      (window as any).turnstile?.reset();
      setTurnstileToken(null);
      return;
    }

    await login({ email, password });
    (window as any).turnstile?.reset();
    setTurnstileToken(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[hsl(142,93%,8%)] p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/60">Portal</p>
            <p className="font-bold">Concrem Connect</p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Gerencie seus<br />
            orçamentos e<br />
            pedidos com<br />
            eficiência.
          </h1>
          <p className="text-white/70 text-lg">
            Portal exclusivo para representantes Concrem.
          </p>
        </div>

        <div className="space-y-3">
          {[
            'Acompanhe seus orçamentos em tempo real',
            'Monitore o status de cada pedido',
            'Visualize suas comissões e metas',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <p className="text-sm text-white/80">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 lg:hidden mb-6">
              <Building2 className="w-6 h-6 text-[hsl(142,93%,8%)]" />
              <span className="font-bold text-gray-900">Concrem Connect</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
            <p className="text-gray-500 text-sm mt-1">
              Acesse seu portal de representante
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  maxLength={254}
                  disabled={loading}
                  className={`w-full h-10 pl-10 pr-4 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                    error && /email|usuário/i.test(error)
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-[hsl(142,93%,8%)]'
                  }`}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  maxLength={128}
                  disabled={loading}
                  className={`w-full h-10 pl-10 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                    error && /senha|password/i.test(error)
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-[hsl(142,93%,8%)]'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {turnstileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {turnstileError}
              </div>
            )}

            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full h-10 bg-[hsl(142,93%,8%)] text-white text-sm font-medium rounded-lg hover:bg-[hsl(142,93%,15%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
