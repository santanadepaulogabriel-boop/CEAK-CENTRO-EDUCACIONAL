import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigurado } from './supabase.js';

import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PdvPage from './pages/PdvPage.jsx';
import CadastroPage from './pages/CadastroPage.jsx';
import ContasPage from './pages/ContasPage.jsx';
import { CantinaProvider } from './context/CantinaContext.jsx';

export default function App() {
  const [sessao, setSessao] = useState(null);
  const [carregandoAutenticacao, setCarregandoAutenticacao] = useState(true);
  const navigate = useNavigate();

  // Monitora a sessão de autenticação ativa e alterações de estado via Supabase Auth
  useEffect(() => {
    // 1. Verifica se há uma sessão persistida no navegador
    const sessaoLocal = localStorage.getItem('ceak_sessao_ativa');
    if (sessaoLocal) {
      try {
        setSessao(JSON.parse(sessaoLocal));
      } catch (err) {
        console.error('Erro ao restaurar sessão local:', err);
      }
    }

    if (!supabaseConfigurado || !supabase) {
      setCarregandoAutenticacao(false);
      return;
    }

    // 2. Consulta o Supabase Auth para obter a sessão oficial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessao(session);
        localStorage.setItem('ceak_sessao_ativa', JSON.stringify(session));
      }
      setCarregandoAutenticacao(false);
    });

    // 3. Listener em tempo real para eventos de autenticação (Login, Logout, Renovação de Token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) {
        localStorage.setItem('ceak_sessao_ativa', JSON.stringify(session));
      } else {
        localStorage.removeItem('ceak_sessao_ativa');
      }
      setCarregandoAutenticacao(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSucesso = (novaSessao) => {
    setSessao(novaSessao);
    localStorage.setItem('ceak_sessao_ativa', JSON.stringify(novaSessao));
  };

  const handleLogout = async () => {
    try {
      if (supabaseConfigurado && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    } finally {
      setSessao(null);
      localStorage.removeItem('ceak_sessao_ativa');
      navigate('/login', { replace: true });
    }
  };

  // Tela de carregamento enquanto valida a segurança institucional
  if (carregandoAutenticacao) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#0c1e3d] via-[#142f61] to-[#1F479A] text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="mt-4 text-sm font-bold tracking-wide text-slate-200 animate-pulse">
          Validando credenciais do CEAK Cantina...
        </p>
      </div>
    );
  }

  // Componente de Guarda de Rota Protegida
  const RotaProtegida = ({ children }) => {
    if (!sessao) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <CantinaProvider>
      <Routes>
        {/* Rota Pública de Autenticação */}
        <Route
          path="/login"
          element={
            sessao ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLoginSucesso={handleLoginSucesso} />
            )
          }
        />

        {/* Rotas Protegidas do Sistema: Ninguém entra sem autenticação */}
        <Route
          path="/"
          element={
            <RotaProtegida>
              <Layout sessao={sessao} onLogout={handleLogout} />
            </RotaProtegida>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pdv" element={<PdvPage />} />
          <Route path="cadastro-aluno" element={<CadastroPage />} />
          <Route path="novo-aluno" element={<Navigate to="/cadastro-aluno" replace />} />
          <Route path="admin/contas" element={<ContasPage />} />
          <Route path="fechamento" element={<Navigate to="/admin/contas" replace />} />
        </Route>

        {/* Rota Fallback */}
        <Route
          path="*"
          element={<Navigate to={sessao ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </CantinaProvider>
  );
}
