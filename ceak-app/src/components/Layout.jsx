import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoCeak from '../assets/logo-ceak-final.jpg';

// Formatação do relógio digital em tempo real: "15 de Outubro de 2026 • 23:35:10"
function formatarDataHoraReal(data) {
  const dia = data.getDate().toString().padStart(2, '0');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mes = meses[data.getMonth()];
  const ano = data.getFullYear();
  const horas = data.getHours().toString().padStart(2, '0');
  const minutos = data.getMinutes().toString().padStart(2, '0');
  const segundos = data.getSeconds().toString().padStart(2, '0');

  return `${dia} de ${mes} de ${ano} • ${horas}:${minutos}:${segundos}`;
}

export default function Layout({ sessao, onLogout }) {
  const [menuAbertoMobile, setMenuAbertoMobile] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const location = useLocation();

  // Fecha o menu mobile automaticamente ao trocar de rota
  useEffect(() => {
    setMenuAbertoMobile(false);
  }, [location.pathname]);

  // Relógio digital em tempo real atualizado a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItens = [
    {
      nome: 'Dashboard',
      to: '/dashboard',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      nome: 'Caixa / PDV',
      to: '/pdv',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      nome: 'Novo Aluno',
      to: '/cadastro-aluno',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    },
    {
      nome: 'Gestão de Contas',
      to: '/admin/contas',
      icone: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
  ];

  const emailUsuario = sessao?.user?.email || 'operador@ceak.edu.br';
  const nomeExibicao = emailUsuario.split('@')[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      
      {/* 1. BARRA SUPERIOR MOBILE (< md) COM HAMBURGER MENU RESPONSIVO */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-r from-[#142f61] via-[#1a365d] to-[#1F479A] px-4 py-3 text-white shadow-md md:hidden">
        <div className="flex items-center gap-3">
          {/* Logo Compacto */}
          <div className="bg-white p-1 rounded-xl shadow-sm flex items-center justify-center">
            <img src={logoCeak} alt="Logo CEAK" className="h-7 w-auto object-contain" />
          </div>
          {/* Horário Compacto em Tempo Real */}
          <span className="text-xs font-mono font-bold text-slate-100/90 tracking-tight">
            {horaAtual.toLocaleTimeString('pt-BR')}
          </span>
        </div>

        {/* Botão Hamburger com Efeito de Toque */}
        <button
          type="button"
          onClick={() => setMenuAbertoMobile(!menuAbertoMobile)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-all duration-200 hover:bg-white/20 active:scale-95"
          aria-label={menuAbertoMobile ? 'Fechar Menu' : 'Abrir Menu'}
        >
          {menuAbertoMobile ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop Mobile Escurecido com Blur */}
      {menuAbertoMobile && (
        <div
          onClick={() => setMenuAbertoMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* 2. SIDEBAR RESPONSIVA (Drawer no Mobile, Fixa no Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col justify-between bg-gradient-to-b from-[#142f61] via-[#1a365d] to-[#1F479A] p-6 text-white shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          menuAbertoMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Cabeçalho do Drawer com Botão Fechar no Mobile */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300/80">Menu de Navegação</span>
            <button
              type="button"
              onClick={() => setMenuAbertoMobile(false)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          {/* Logo Oficial CEAK em Cartão Branco com Faixa Vermelha */}
          <div className="bg-white rounded-2xl shadow-xl mb-6 p-4 w-full flex justify-center items-center border-b-[5px] border-[#D9232E] transform hover:scale-[1.02] transition-transform duration-300">
            <img
              src={logoCeak}
              alt="Centro Educacional Almerinda de Albuquerque"
              className="w-full max-w-[140px] h-auto object-contain"
            />
          </div>

          {/* Navegação Principal */}
          <nav className="space-y-1.5" aria-label="Menu Principal">
            <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-300/70 mb-2">
              Módulos Principais
            </p>
            {navItens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuAbertoMobile(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-200 rounded-2xl ${
                    isActive
                      ? 'text-white bg-white/20 backdrop-blur-md shadow-md border-l-4 border-white'
                      : 'text-slate-200/90 hover:text-white hover:bg-white/10 active:scale-95'
                  }`
                }
              >
                <span className="shrink-0">{item.icone}</span>
                <span>{item.nome}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Perfil do Operador e Ação de Desconexão */}
        <div className="border-t border-white/15 pt-5 space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-xs font-black text-white shrink-0">
                {nomeExibicao.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate capitalize">
                  {nomeExibicao}
                </p>
                <p className="text-[10px] text-slate-300 truncate font-medium">
                  {emailUsuario}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-red-500/80 transition-all duration-200"
              title="Sair do Sistema"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-white/50 font-medium">
              CEAK • Cantina Escolar
            </p>
          </div>
        </div>
      </aside>

      {/* 3. CONTEÚDO PRINCIPAL (DESKTOP & MOBILE) */}
      <div className="md:pl-72 flex min-h-screen flex-col">
        
        {/* Cabeçalho Desktop com Relógio Digital em Tempo Real */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 items-center justify-between bg-white/85 backdrop-blur-xl px-8 border-b border-slate-200/80 shadow-sm transition-all duration-200">
          
          {/* Relógio Digital Formatado em Tempo Real */}
          <div className="flex items-center gap-3 text-sm font-bold text-slate-800 bg-slate-100/90 px-4 py-2 rounded-2xl border border-slate-200/80 shadow-inner">
            <span className="text-[#1F479A] text-base leading-none">🕒</span>
            <span className="tracking-tight font-medium text-slate-700">
              {formatarDataHoraReal(horaAtual)}
            </span>
          </div>

          {/* Indicador de Status Operacional Limpo (Zero jargões técnicos) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200/80 text-xs font-bold shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Operação em Tempo Real</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#D9232E] px-3 py-1.5 rounded-xl hover:bg-slate-100 transition duration-200"
            >
              <span>Sair</span>
              <span>→</span>
            </button>
          </div>
        </header>

        {/* Área Dinâmica da Aplicação */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
