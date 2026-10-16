import { useEffect, useState } from 'react';
import { supabase, supabaseConfigurado } from '../supabase.js';

export default function RotaPrivada({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [autenticando, setAutenticando] = useState(false);
  const [erroLogin, setErroLogin] = useState(null);
  const [modoDemoAtivo, setModoDemoAtivo] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado || !supabase) {
      setCarregando(false);
      return;
    }

    // Verifica sessão ativa existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregando(false);
    });

    // Escuta mudanças de estado de autenticação (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      setCarregando(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      setErroLogin('Por favor, informe seu e-mail e senha institucional.');
      return;
    }

    if (!supabaseConfigurado || !supabase) {
      setErroLogin('Supabase não configurado no arquivo .env.');
      return;
    }

    setAutenticando(true);
    setErroLogin(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) throw error;
      setSessao(data.session);
    } catch (err) {
      console.error('Erro de autenticação:', err);
      setErroLogin(err.message === 'Invalid login credentials' 
        ? 'Credenciais inválidas. Verifique seu e-mail e senha.' 
        : `Erro ao autenticar: ${err.message}`);
    } finally {
      setAutenticando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1F479A]/20 border-t-[#1F479A]"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Verificando permissões administrativas...</p>
      </div>
    );
  }

  // Se autenticado ou se o modo de demonstração foi explicitamente liberado na tela de login
  if (sessao || modoDemoAtivo) {
    return (
      <div className="relative">
        {sessao && (
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/70 backdrop-blur-md px-4 py-2 border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Conectado como <strong>{sessao.user.email}</strong></span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[#D9232E] hover:underline font-semibold"
            >
              Sair da Gestão
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Painel de Login Premium (Glassmorphism) para proteção da rota administrativa
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(31,71,154,0.15)] p-8 sm:p-10 transition duration-300">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1F479A] to-[#2d5ec7] text-3xl shadow-lg shadow-[#1F479A]/30">
            🔒
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Área Restrita</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            A Gestão de Contas e Fechamentos exige autenticação institucional.
          </p>
        </div>

        {erroLogin && (
          <div className="mt-6 rounded-2xl bg-red-50/90 border border-red-200/80 p-3.5 text-xs font-semibold text-red-700 animate-fadeIn">
            ⚠️ {erroLogin}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              E-mail do Administrador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ceak.edu.br"
              autoComplete="email"
              required
              className="w-full rounded-2xl border-2 border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Senha de Acesso
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border-2 border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
            />
          </div>

          <button
            type="submit"
            disabled={autenticando}
            className="w-full rounded-2xl bg-[#1F479A] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1F479A]/30 transition hover:bg-[#163675] hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          >
            {autenticando ? 'Autenticando...' : 'Entrar no Painel Administrativo'}
          </button>
        </form>

        {(!supabaseConfigurado || modoDemoAtivo === false) && (
          <div className="mt-6 border-t border-slate-200/60 pt-4 text-center">
            <button
              type="button"
              onClick={() => setModoDemoAtivo(true)}
              className="text-xs font-bold text-slate-400 hover:text-[#1F479A] transition"
            >
              🔓 Acessar em Modo Demonstração (Sem Supabase Auth)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
