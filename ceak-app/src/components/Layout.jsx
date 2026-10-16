import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabaseConfigurado } from '../supabase.js';
import logoCeak from '../assets/logo-ceak-final.jpg';

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);

  const navItens = [
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Barra Mobile para telas pequenas (< md) */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-r from-[#1a365d] to-[#1F479A] px-4 py-3 text-white shadow-lg md:hidden">
        <div className="flex items-center">
          <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
            <img src={logoCeak} alt="Logo CEAK" className="h-8 w-auto object-contain" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMenuAberto(!menuAberto)}
          className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Abrir menu de navegação"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuAberto ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop Mobile (< md) */}
      {menuAberto && (
        <div
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Fixa à Esquerda - Única forma de navegação do site */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 lg:w-72 flex-col justify-between bg-gradient-to-b from-[#1a365d] to-[#1F479A] p-6 text-white shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Topo da Sidebar com Logo Oficial CEAK em Cartão Branco Premium */}
          <div className="bg-white rounded-2xl shadow-xl mb-10 p-6 w-full flex justify-center items-center border-b-[6px] border-[#D9232E]">
            <img
              src={logoCeak}
              alt="Logo CEAK"
              className="w-full max-w-[160px] h-auto object-contain transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Links de Navegação da Sidebar */}
          <nav className="space-y-1.5" aria-label="Navegação Principal">
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-300/80 mb-2">Menu Principal</p>
            {navItens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white bg-white/10 backdrop-blur-sm border-l-4 border-white rounded-r-none rounded-l-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 rounded-lg'
                  }`
                }
              >
                <span className="shrink-0">{item.icone}</span>
                <span>{item.nome}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-white/10 pt-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Status do Banco</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                supabaseConfigurado ? 'bg-green-500/20 text-green-300' : 'bg-ceak-red/30 text-ceak-red-soft'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${supabaseConfigurado ? 'bg-green-400' : 'bg-ceak-red'}`} />
              {supabaseConfigurado ? 'Supabase' : 'Modo Demo'}
            </span>
          </div>
          <p className="text-center text-[11px] text-white/40">© CEAK Cantina · ERP v2.0</p>
        </div>
      </aside>

      {/* Conteúdo Principal Dinâmico à Direita */}
      <div className="md:pl-64 lg:pl-72 flex min-h-screen flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
