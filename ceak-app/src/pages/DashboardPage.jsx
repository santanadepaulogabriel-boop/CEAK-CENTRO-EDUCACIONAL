import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCantina } from '../context/CantinaContext.jsx';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DashboardPage() {
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje'); // 'hoje' | 'semana' | 'mes' | 'ano'
  const { consumos, totalSaldoAberto, alunos, carregandoDados, recarregarTudo } = useCantina();

  useEffect(() => {
    document.title = 'Dashboard Administrativo | CEAK Cantina';
  }, []);

  // Define os limites temporais de início para cada filtro selecionado
  const dataInicioFiltro = useMemo(() => {
    const agora = new Date();
    switch (filtroPeriodo) {
      case 'hoje': {
        const inicio = new Date(agora);
        inicio.setHours(0, 0, 0, 0);
        return inicio;
      }
      case 'semana': {
        const inicio = new Date(agora);
        const diaSemana = inicio.getDay(); // 0 = Domingo, 1 = Segunda
        const diferenca = inicio.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        inicio.setDate(diferenca);
        inicio.setHours(0, 0, 0, 0);
        return inicio;
      }
      case 'mes': {
        const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        return inicio;
      }
      case 'ano': {
        const inicio = new Date(agora.getFullYear(), 0, 1, 0, 0, 0);
        return inicio;
      }
      default:
        return new Date(0);
    }
  }, [filtroPeriodo]);

  // Filtra os consumos reais do Supabase pelo período
  const consumosDoPeriodo = useMemo(() => {
    return consumos.filter((c) => {
      if (!c.data_hora) return false;
      const dataItem = new Date(c.data_hora);
      return dataItem >= dataInicioFiltro;
    });
  }, [consumos, dataInicioFiltro]);

  // Filtra apenas vendas brutas (valor > 0, excluindo lançamentos de pagamento negativo)
  const vendasBrutasPeriodo = useMemo(() => {
    return consumosDoPeriodo.filter((c) => Number(c.valor) > 0);
  }, [consumosDoPeriodo]);

  // Cálculo das métricas consolidadas em tempo real
  const metricas = useMemo(() => {
    // 1. Faturamento Total do Período
    const faturamento = vendasBrutasPeriodo.reduce((acc, c) => acc + Number(c.valor || 0), 0);

    // 2. Alunos Únicos Atendidos no Período
    const alunosIdsUnicos = new Set(
      vendasBrutasPeriodo.filter((c) => c.aluno_id).map((c) => c.aluno_id)
    );
    const alunosAtendidos = alunosIdsUnicos.size;

    // 3. Quantidade Total de Comandas / Vendas
    const totalComandas = vendasBrutasPeriodo.length;

    // 4. Ticket Médio
    const ticketMedio = totalComandas > 0 ? faturamento / totalComandas : 0;

    // 5. Total de alunos com débito em aberto no momento
    const alunosComDebito = alunos.filter((a) => Number(a.saldo_devedor_atual || 0) > 0).length;

    return {
      faturamento,
      alunosAtendidos,
      totalComandas,
      ticketMedio,
      alunosComDebito,
    };
  }, [vendasBrutasPeriodo, alunos]);

  // Agrupamento do Fluxo por Horário Escolar baseado nos dados reais do Supabase
  const fluxoHorarios = useMemo(() => {
    const slots = [
      { id: 'h1', horario: '07h - 09h', label: 'Entrada Manhã', minH: 7, maxH: 9, valor: 0, pedidos: 0 },
      { id: 'h2', horario: '09h - 11h', label: 'Recreio Manhã', minH: 9, maxH: 11, valor: 0, pedidos: 0 },
      { id: 'h3', horario: '11h - 13h', label: 'Almoço / Troca', minH: 11, maxH: 13, valor: 0, pedidos: 0 },
      { id: 'h4', horario: '13h - 16h', label: 'Recreio Tarde', minH: 13, maxH: 16, valor: 0, pedidos: 0 },
      { id: 'h5', horario: '16h - 19h', label: 'Saída / Integral', minH: 16, maxH: 19, valor: 0, pedidos: 0 },
    ];

    for (const c of vendasBrutasPeriodo) {
      const hora = new Date(c.data_hora).getHours();
      const slot = slots.find((s) => hora >= s.minH && hora < s.maxH) || slots[1];
      slot.valor += Number(c.valor || 0);
      slot.pedidos += 1;
    }

    const valorMax = Math.max(...slots.map((s) => s.valor), 1);
    return slots.map((s) => ({
      ...s,
      percent: Math.round((s.valor / valorMax) * 100),
    }));
  }, [vendasBrutasPeriodo]);

  // Ranking real dos produtos mais vendidos
  const produtosRanking = useMemo(() => {
    const mapa = new Map();
    for (const c of vendasBrutasPeriodo) {
      const nome = c.produto_nome || 'Lanche Escolar';
      if (!mapa.has(nome)) {
        mapa.set(nome, { nome, qtd: 0, total: 0 });
      }
      const item = mapa.get(nome);
      item.qtd += 1;
      item.total += Number(c.valor || 0);
    }

    return Array.from(mapa.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [vendasBrutasPeriodo]);

  // Mix de categorias estimadas
  const mixCategorias = useMemo(() => {
    let salgados = 0;
    let bebidas = 0;
    let doces = 0;
    let pratos = 0;

    for (const c of vendasBrutasPeriodo) {
      const nome = (c.produto_nome || '').toLowerCase();
      const v = Number(c.valor || 0);
      if (nome.includes('suco') || nome.includes('refrigerante') || nome.includes('coca') || nome.includes('água') || nome.includes('bebida')) {
        bebidas += v;
      } else if (nome.includes('bolo') || nome.includes('brownie') || nome.includes('doce') || nome.includes('chocolate')) {
        doces += v;
      } else if (nome.includes('lasanha') || nome.includes('burger') || nome.includes('prato') || nome.includes('especial')) {
        pratos += v;
      } else {
        salgados += v;
      }
    }

    const total = salgados + bebidas + doces + pratos || 1;
    return [
      { nome: 'Salgados & Forno', valor: salgados, percent: Math.round((salgados / total) * 100), cor: 'bg-[#1F479A]', emoji: '🥟' },
      { nome: 'Bebidas & Sucos', valor: bebidas, percent: Math.round((bebidas / total) * 100), cor: 'bg-cyan-500', emoji: '🥤' },
      { nome: 'Doces & Sobremesas', valor: doces, percent: Math.round((doces / total) * 100), cor: 'bg-[#D9232E]', emoji: '🍰' },
      { nome: 'Pratos & Especiais', valor: pratos, percent: Math.round((pratos / total) * 100), cor: 'bg-amber-500', emoji: '🍝' },
    ];
  }, [vendasBrutasPeriodo]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* 1. TOPO: Identificação Institucional e Seletor de Período Mobile-First */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#1F479A]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#1F479A]">
              Painel Integrado • Dados Reais
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
            Dashboard Administrativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Métricas de vendas, fluxo escolar e acompanhamento financeiro em tempo real
          </p>
        </div>

        {/* Seletor de Filtro de Período (Mobile-First) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-2xl bg-white p-1 border border-slate-200 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Esta Semana' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'ano', label: 'Este Ano' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFiltroPeriodo(p.id)}
                className={`rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
                  filtroPeriodo === p.id
                    ? 'bg-[#1F479A] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={recarregarTudo}
            disabled={carregandoDados}
            className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
            title="Atualizar dados do Supabase"
          >
            <span className={carregandoDados ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE MÉTRICAS: Coluna Única no Telemóvel -> 2 Colunas no Tablet -> 4 Colunas no Desktop */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Faturamento do Período */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Faturamento ({filtroPeriodo === 'hoje' ? 'Hoje' : filtroPeriodo === 'semana' ? 'Semana' : filtroPeriodo === 'mes' ? 'Mês' : 'Ano'})
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#1F479A] font-bold shadow-inner group-hover:scale-110 transition-transform">
              💰
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight block">
              {brl(metricas.faturamento)}
            </span>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              <strong className="text-slate-700 font-bold">{metricas.totalComandas}</strong> compras registradas
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1F479A] to-blue-400" />
        </div>

        {/* Card 2: Alunos Atendidos */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Alunos Atendidos
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold shadow-inner group-hover:scale-110 transition-transform">
              🎓
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight block">
              {metricas.alunosAtendidos}
            </span>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Estudantes únicos neste intervalo
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ticket Médio
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 font-bold shadow-inner group-hover:scale-110 transition-transform">
              📊
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight block">
              {brl(metricas.ticketMedio)}
            </span>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">
              Média gasta por transação
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
        </div>

        {/* Card 4: Saldo em Aberto (Sincronizado Instantaneamente) */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Saldo em Aberto (Famílias)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#D9232E] font-bold shadow-inner group-hover:scale-110 transition-transform">
              📑
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-black text-[#D9232E] tracking-tight block">
              {brl(totalSaldoAberto)}
            </span>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">{metricas.alunosComDebito} contas pendentes</span>
              <Link to="/admin/contas" className="font-bold text-[#1F479A] hover:underline">
                Contas →
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D9232E] to-rose-400" />
        </div>
      </section>

      {/* 3. SEÇÃO ANALÍTICA: GRÁFICO REAL DE HORÁRIOS DE CONSUMO & MIX DE CATEGORIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Gráfico de Barras CSS Responsivo por Horário de Pico (7 Colunas) */}
        <div className="lg:col-span-7 rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Fluxo de Consumo por Horário Escolar
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Picos de vendas identificados nas compras do período
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 self-start sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </span>
          </div>

          {/* Barras Responsivas Calculadas Dinamicamente */}
          <div className="space-y-4 pt-2">
            {fluxoHorarios.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1F479A] bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
                      {item.horario}
                    </span>
                    <span className="font-bold text-slate-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium">{item.pedidos} pedidos</span>
                    <span className="font-black text-slate-800">{brl(item.valor)}</span>
                  </div>
                </div>

                {/* Barra de Progresso Fluida */}
                <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1F479A] to-[#2d5ec7] transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(item.percent, item.valor > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mix de Categorias com Barra Multicor (5 Colunas) */}
        <div className="lg:col-span-5 rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              Mix de Categorias
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Distribuição percentual do faturamento das vendas
            </p>

            {/* Barra Visual Segmentada */}
            <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full shadow-inner bg-slate-100">
              {mixCategorias.map((c) => (
                <div
                  key={c.nome}
                  className={`h-full ${c.cor} transition-all duration-700 hover:opacity-90`}
                  style={{ width: `${c.percent}%` }}
                  title={`${c.nome}: ${c.percent}% (${brl(c.valor)})`}
                />
              ))}
            </div>

            {/* Lista Detalhada */}
            <div className="mt-6 space-y-2.5">
              {mixCategorias.map((c) => (
                <div key={c.nome} className="flex items-center justify-between text-xs p-2 rounded-2xl hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{c.emoji}</span>
                    <div>
                      <p className="font-bold text-slate-800">{c.nome}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{c.percent}% do faturamento</p>
                    </div>
                  </div>
                  <span className="font-black text-[#1F479A]">{brl(c.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. RANKING DE PRODUTOS MAIS VENDIDOS & ATALHOS RÁPIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Tabela Responsiva de Produtos Campeões (8 Colunas) */}
        <div className="lg:col-span-8 rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Produtos Mais Consumidos
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Itens com maior volume de pedidos no período selecionado
              </p>
            </div>
            <Link to="/pdv" className="text-xs font-bold text-[#1F479A] hover:underline">
              Ir para o PDV →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {produtosRanking.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <span className="text-3xl block mb-2">🍽️</span>
                <p className="text-xs font-bold text-slate-500">Nenhum consumo registrado neste intervalo.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 min-w-[280px]">
                {produtosRanking.map((prod) => (
                  <div
                    key={prod.rank}
                    className="flex items-center justify-between py-3 px-1 transition hover:bg-slate-50/80 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                        #{prod.rank}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{prod.nome}</h3>
                        <p className="text-[11px] font-semibold text-slate-400">{prod.qtd} unidades</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#1F479A]">
                        {brl(prod.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card Operacional Escolar (4 Colunas) */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-[#142f61] to-[#1F479A] p-6 text-white shadow-xl space-y-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              Acesso Expresso
            </span>
            <h2 className="text-lg font-black tracking-tight mt-0.5">
              Gestão Escolar CEAK
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Atalhos rápidos para o operador de caixa
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/pdv"
              className="w-full flex items-center justify-between rounded-2xl bg-white/10 hover:bg-white/20 p-3.5 text-xs font-bold transition-all duration-200 border border-white/10 active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🛒</span>
                <span>Caixa & PDV</span>
              </div>
              <span>→</span>
            </Link>

            <Link
              to="/admin/contas"
              className="w-full flex items-center justify-between rounded-2xl bg-white/10 hover:bg-white/20 p-3.5 text-xs font-bold transition-all duration-200 border border-white/10 active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💳</span>
                <span>Gestão de Contas ({brl(totalSaldoAberto)})</span>
              </div>
              <span>→</span>
            </Link>

            <Link
              to="/cadastro-aluno"
              className="w-full flex items-center justify-between rounded-2xl bg-white/10 hover:bg-white/20 p-3.5 text-xs font-bold transition-all duration-200 border border-white/10 active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">➕</span>
                <span>Cadastrar Novo Aluno</span>
              </div>
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-2xl bg-black/20 p-4 border border-white/10 text-center">
            <span className="text-[11px] font-semibold text-slate-300 block">
              Status da Cantina
            </span>
            <span className="text-xs font-black text-white mt-0.5 block">
              Operação em Tempo Real • Atendimento Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
