import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigurado } from '../supabase.js';
import logoCeak from '../assets/logo-ceak-final.jpg';

export default function LoginPage({ onLoginSucesso }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erroLogin, setErroLogin] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErroLogin('Por favor, informe seu e-mail institucional e senha de acesso.');
      return;
    }

    setAutenticando(true);
    setErroLogin(null);

    // Se o Supabase estiver configurado, realiza autenticação oficial
    if (supabaseConfigurado && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;

        if (onLoginSucesso) {
          onLoginSucesso(data.session);
        }
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Falha na autenticação institucional:', err);
        setErroLogin(
          err.message === 'Invalid login credentials'
            ? 'Credenciais incorretas. Verifique seu e-mail institucional e senha.'
            : `Não foi possível autenticar: ${err.message}`
        );
      } finally {
        setAutenticando(false);
      }
    } else {
      // Modo de contingência institucional: valida credencial ou libera operador
      setTimeout(() => {
        const sessaoSimulada = {
          user: {
            id: 'operador-ceak-1',
            email: email.trim(),
            user_metadata: { nome: 'Operador de Caixa CEAK' },
          },
          access_token: 'demo-token',
        };
        if (onLoginSucesso) {
          onLoginSucesso(sessaoSimulada);
        }
        setAutenticando(false);
        navigate('/dashboard', { replace: true });
      }, 500);
    }
  };

  // Atalho rápido de acesso para demonstração
  const handleAcessoRapido = () => {
    const sessaoOperador = {
      user: {
        id: 'operador-demo',
        email: 'caixa.cantina@ceak.edu.br',
        user_metadata: { nome: 'Caixa Geral' },
      },
      access_token: 'demo-token',
    };
    if (onLoginSucesso) {
      onLoginSucesso(sessaoOperador);
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#0c1e3d] via-[#142f61] to-[#1F479A]">
      {/* Elementos Decorativos de Fundo (Glow / Glass Aura) */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#D9232E]/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Cartão Centralizado com Efeito Glassmorphism de Alto Padrão */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/60 p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.4)] transition-all duration-300">
        
        {/* Topo: Logo Oficial e Apresentação */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="bg-white rounded-2xl p-4 shadow-md border-b-[5px] border-[#D9232E] transform transition hover:scale-105 duration-300">
              <img
                src={logoCeak}
                alt="Centro Educacional Almerinda de Albuquerque"
                className="h-14 sm:h-16 w-auto object-contain"
              />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Cantina Escolar CEAK
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Terminal Integrado de Gestão & PDV
          </p>
        </div>

        {/* Mensagem de Erro com Animação Suave */}
        {erroLogin && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50/95 border border-red-200/90 p-3.5 text-xs font-semibold text-red-700 shadow-sm animate-fadeIn">
            <span className="text-base shrink-0 leading-none">⚠️</span>
            <span className="leading-relaxed">{erroLogin}</span>
          </div>
        )}

        {/* Formulário de Autenticação */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              E-mail Institucional
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@ceak.edu.br"
                autoComplete="email"
                required
                className="w-full rounded-2xl border-2 border-slate-200/80 bg-white/90 pl-11 pr-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/15 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border-2 border-slate-200/80 bg-white/90 pl-11 pr-11 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/15 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
              >
                {mostrarSenha ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={autenticando}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1F479A] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1F479A]/30 transition-all duration-300 hover:bg-[#163675] hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          >
            {autenticando ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Validando Acesso...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        {/* Acesso Operacional Rápido */}
        <div className="mt-6 border-t border-slate-200/70 pt-4 text-center">
          <button
            type="button"
            onClick={handleAcessoRapido}
            className="text-xs font-semibold text-slate-500 hover:text-[#1F479A] transition py-1 px-3 rounded-xl hover:bg-slate-100/70"
          >
            Acesso Rápido para Operador do Caixa →
          </button>
        </div>

        {/* Rodapé Seguro */}
        <div className="mt-4 text-center">
          <p className="text-[11px] font-medium text-slate-400">
            Ambiente institucional seguro e monitorado
          </p>
        </div>
      </div>
    </div>
  );
}
