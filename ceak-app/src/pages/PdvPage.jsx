import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIAS,
  PRODUTOS,
  buscarAlunos,
  lancarConsumo,
  lancarVendaPaga,
  assinarSaldo,
  modoDemo,
} from '../pdv/api.js';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PdvPage() {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [aluno, setAluno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [itens, setItens] = useState([]); // [{nome, preco, emoji, qtd}]
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Estado do Modal de Pagamento Imediato ("Pagar Agora")
  const [modalPagar, setModalPagar] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [dinheiroRecebido, setDinheiroRecebido] = useState('');
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  const inputRef = useRef(null);

  const total = useMemo(() => itens.reduce((s, i) => s + i.preco * i.qtd, 0), [itens]);

  const produtosFiltrados = useMemo(() => {
    if (categoriaAtiva === 'todos') return PRODUTOS;
    return PRODUTOS.filter((p) => p.categoria === categoriaAtiva);
  }, [categoriaAtiva]);

  // Cálculo de troco no modal
  const valorEntregueNum = parseFloat(String(dinheiroRecebido).replace(/\./g, '').replace(',', '.')) || 0;
  const troco = Math.max(0, valorEntregueNum - total);

  // Busca rápida de alunos com debounce
  useEffect(() => {
    if (aluno) return;
    const t = setTimeout(async () => {
      try {
        setResultados(await buscarAlunos(busca));
      } catch (e) {
        setAviso({ tipo: 'erro', msg: 'Erro ao buscar alunos.' });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [busca, aluno]);

  // Saldo em tempo real do aluno selecionado
  useEffect(() => assinarSaldo(aluno?.id, setSaldo), [aluno?.id]);

  useEffect(() => {
    document.title = 'Caixa (PDV) | CEAK Cantina';
  }, []);

  useEffect(() => {
    if (!aluno) inputRef.current?.focus();
  }, [aluno]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  const escolher = (a) => {
    setAluno(a);
    setSaldo(Number(a.saldo_devedor_atual || 0));
    setBusca('');
    setResultados([]);
  };

  const trocarAluno = () => {
    setAluno(null);
    setBusca('');
    setResultados([]);
  };

  const proximo = () => {
    setAluno(null);
    setItens([]);
    setBusca('');
    setResultados([]);
  };

  const add = (p) =>
    setItens((cur) => {
      const ex = cur.find((i) => i.nome === p.nome);
      return ex ? cur.map((i) => (i === ex ? { ...i, qtd: i.qtd + 1 } : i)) : [...cur, { ...p, qtd: 1 }];
    });

  const remover = (nome) =>
    setItens((cur) => cur.flatMap((i) => (i.nome !== nome ? [i] : i.qtd > 1 ? [{ ...i, qtd: i.qtd - 1 }] : [])));

  // Lançar na conta devedora do aluno
  const lancarNaConta = async () => {
    if (!aluno) {
      setAviso({ tipo: 'erro', msg: 'Selecione um aluno para lançar na conta devedora.' });
      inputRef.current?.focus();
      return;
    }
    if (itens.length === 0 || enviando) return;

    setEnviando(true);
    try {
      const linhas = itens.flatMap((i) =>
        Array.from({ length: i.qtd }, () => ({ produto_nome: i.nome, valor: i.preco })),
      );
      const novoSaldo = await lancarConsumo(aluno, linhas);
      setSaldo(novoSaldo);
      setAviso({ tipo: 'ok', msg: `${aluno.nome_completo}: ${brl(total)} lançado na conta! Novo saldo: ${brl(novoSaldo)} ✓` });
      setTimeout(proximo, 1000);
    } catch (e) {
      console.error(e);
      setAviso({ tipo: 'erro', msg: 'Não foi possível lançar na conta. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  };

  // Confirmar venda à vista ("Pagar Agora")
  const confirmarPagamentoAgora = async () => {
    if (itens.length === 0 || processandoPagamento) return;
    setProcessandoPagamento(true);
    try {
      await lancarVendaPaga(itens, aluno, metodoPagamento);
      const destinatario = aluno ? aluno.nome_completo : 'Balcão';
      setAviso({
        tipo: 'ok',
        msg: `Venda de ${brl(total)} quitada via ${metodoPagamento} (${destinatario})! Não foi gerado débito. ✓`,
      });
      setModalPagar(false);
      setItens([]);
      setDinheiroRecebido('');
      setMetodoPagamento('PIX');
    } catch (e) {
      console.error(e);
      setAviso({ tipo: 'erro', msg: 'Erro ao processar pagamento imediato.' });
    } finally {
      setProcessandoPagamento(false);
    }
  };

  // Verificação de estouro do limite diário
  const limiteDiario = aluno?.limite_diario ? Number(aluno.limite_diario) : null;
  const excedeuLimite = limiteDiario !== null && total > limiteDiario;

  return (
    <div className="space-y-6">
      {/* Título da Página e Indicadores */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">Caixa / PDV</h1>
          <p className="text-sm text-slate-500">Selecione o aluno ou lance vendas avulsas com quitação à vista</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${modoDemo ? 'bg-brand-red text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {modoDemo ? 'Modo Demo' : 'Supabase Conectado'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* Seção do Aluno */}
          <section className="relative rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5" aria-label="Aluno">
            {!aluno ? (
              <>
                <label htmlFor="busca-aluno" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pesquisar Aluno
                </label>
                <div className="relative mt-2">
                  <input
                    id="busca-aluno"
                    ref={inputRef}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && resultados[0] && escolher(resultados[0])}
                    placeholder="Digite o nome do aluno..."
                    autoComplete="off"
                    className="w-full rounded-2xl border-2 border-slate-200 px-5 py-3.5 pl-12 text-lg font-medium outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">🔍</span>
                </div>

                {resultados.length > 0 && (
                  <ul className="absolute inset-x-5 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 divide-y divide-slate-100">
                    {resultados.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => escolher(a)}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-blue-50"
                        >
                          <div className="flex-1 pr-3">
                            <span className="block font-bold text-slate-800 text-base">{a.nome_completo}</span>
                            <span className="text-xs text-slate-500">
                              {a.turma && <strong className="text-brand-blue mr-1.5">{a.turma}</strong>}
                              {a.idade != null && `· ${a.idade} anos `}
                              · Resp.: {a.nome_responsavel}
                            </span>
                            {a.observacoes && (
                              <div className="mt-2 flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 border border-red-200 shadow-sm animate-pulse">
                                <span className="text-red-600 text-lg">⚠️</span>
                                <span>{a.observacoes}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${Number(a.saldo_devedor_atual) > 0 ? 'text-brand-red' : 'text-green-600'}`}>
                              {brl(a.saldo_devedor_atual)}
                            </span>
                            {a.limite_diario && (
                              <span className="block text-[11px] font-semibold text-slate-400">
                                Limite: {brl(a.limite_diario)}/dia
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {busca.trim() && resultados.length === 0 && (
                  <p className="mt-3 text-sm text-slate-400">Nenhum aluno encontrado com esse nome.</p>
                )}
              </>
            ) : (
              /* CARD DE CONFIRMAÇÃO DO ALUNO SELECIONADO */
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Aluno Confirmado
                      </span>
                      {aluno.turma && (
                        <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-extrabold text-brand-blue">
                          🎒 {aluno.turma}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-brand-blue">
                      {aluno.nome_completo}
                      {aluno.idade != null && (
                        <span className="ml-2 text-sm font-semibold text-slate-400">({aluno.idade} anos)</span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Responsável: <strong className="text-slate-700">{aluno.nome_responsavel}</strong>
                      {aluno.telefone_responsavel && ` · Tel: ${aluno.telefone_responsavel}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={trocarAluno}
                      className="rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      🔄 Trocar Aluno
                    </button>
                  </div>
                </div>

                {/* Métricas do Aluno: Saldo Devedor e Limite Diário */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Saldo Devedor Atual */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saldo Devedor Atual</span>
                    <p key={saldo} className={`mt-0.5 animate-[pop_.4s_ease] text-2xl font-black ${saldo > 0 ? 'text-brand-red' : 'text-green-600'}`}>
                      {brl(saldo)}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {saldo > 0 ? 'Possui débito pendente' : 'Sem débitos no momento'}
                    </span>
                  </div>

                  {/* Limite Diário */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Limite Diário Permitido</span>
                    <p className="mt-0.5 text-2xl font-black text-slate-800">
                      {limiteDiario !== null ? brl(limiteDiario) : 'Ilimitado'}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {limiteDiario !== null
                        ? total > 0
                          ? `Total na comanda: ${brl(total)}`
                          : 'Máximo por dia na cantina'
                        : 'Sem restrição de valor'}
                    </span>
                  </div>
                </div>

                {/* Alerta de Limite Diário Excedido */}
                {excedeuLimite && (
                  <div className="animate-pulse rounded-2xl border-2 border-brand-red bg-red-50 p-3.5 text-brand-red">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <span className="text-lg">⚠️</span>
                      <span>ATENÇÃO: LIMITE DIÁRIO EXCEDIDO!</span>
                    </div>
                    <p className="mt-1 text-xs text-red-700">
                      O total atual ({brl(total)}) ultrapassa o limite diário configurado para este aluno ({brl(limiteDiario)}).
                    </p>
                  </div>
                )}

                {/* Alerta Crítico de Restrições Alimentares / Observações */}
                {aluno.observacoes ? (
                  <div className="mt-2 flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 border border-red-200 shadow-sm animate-pulse">
                    <span className="text-red-600 text-lg">⚠️</span>
                    <span className="flex-1 font-bold text-sm sm:text-base">RESTRIÇÃO: {aluno.observacoes}</span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl p-3 mt-2 flex items-center gap-2 text-sm font-semibold">
                    <span>✅</span>
                    <span>Sem restrições alimentares cadastradas</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Grade de Produtos com Filtros por Categoria */}
          <section aria-label="Produtos" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cardápio da Cantina</h2>
              <span className="text-xs text-slate-400 font-medium">
                {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'item disponível' : 'itens disponíveis'}
              </span>
            </div>

            {/* Botões de Filtro por Categoria */}
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIAS.map((cat) => {
                const ativa = categoriaAtiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm transition duration-200 active:scale-95 ${
                      ativa
                        ? 'bg-[#1F479A] text-white shadow-md border-transparent font-medium'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 font-medium transition-colors'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.nome}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid dos Produtos */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {produtosFiltrados.map((p) => {
                const q = itens.find((i) => i.nome === p.nome)?.qtd ?? 0;
                return (
                  <button
                    key={p.nome}
                    type="button"
                    onClick={() => add(p)}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-95 ${
                      q ? 'ring-2 ring-brand-red' : ''
                    }`}
                  >
                    {q > 0 && (
                      <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-red px-1 text-xs font-extrabold text-white shadow">
                        {q}
                      </span>
                    )}
                    <span className="text-4xl transition-transform duration-300 group-hover:scale-125">{p.emoji}</span>
                    <span className="mt-1 text-center text-sm font-bold leading-tight text-slate-800">{p.nome}</span>
                    <span className="text-base font-extrabold text-brand-blue">{brl(p.preco)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Comanda / Carrinho Lateral */}
        <aside className="h-fit rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:sticky lg:top-8" aria-label="Comanda">
          <div className="border-b border-slate-100 p-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Comanda Atual</h2>
              <p className="text-xs text-slate-400">
                {aluno ? `Aluno: ${aluno.nome_completo}` : 'Venda avulsa / Selecione o aluno'}
              </p>
            </div>
            {itens.length > 0 && (
              <span className="badge bg-brand-blue text-white">{itens.reduce((s, i) => s + i.qtd, 0)} itens</span>
            )}
          </div>

          <ul className="max-h-[42vh] min-h-36 space-y-2.5 overflow-y-auto p-5">
            {itens.length === 0 && (
              <li className="py-10 text-center text-slate-400">
                <span className="text-3xl">🛒</span>
                <p className="mt-2 text-sm font-medium">Toque nos produtos para adicionar à comanda</p>
              </li>
            )}
            {itens.map((i) => (
              <li key={i.nome} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="text-2xl">{i.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{i.nome}</p>
                  <p className="text-xs text-slate-500">
                    {i.qtd} × {brl(i.preco)}
                  </p>
                </div>
                <span className="font-bold text-brand-blue">{brl(i.preco * i.qtd)}</span>
                <button
                  type="button"
                  onClick={() => remover(i.nome)}
                  aria-label={`Remover ${i.nome}`}
                  className="h-8 w-8 rounded-full bg-white font-bold text-slate-600 shadow transition hover:bg-brand-red hover:text-white active:scale-90"
                >
                  −
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-4 border-t border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total do Pedido</span>
              <strong className="text-3xl font-black text-brand-blue">{brl(total)}</strong>
            </div>

            {/* Ações da Comanda: Pagar Agora e Lançar na Conta */}
            <div className="space-y-2.5">
              {/* Botão PAGAR AGORA (Não vai para a conta devedora) */}
              <button
                type="button"
                onClick={() => setModalPagar(true)}
                disabled={itens.length === 0 || enviando}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-base font-black text-white shadow-lg transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>💳</span>
                <span>Pagar Agora (À Vista)</span>
              </button>

              {/* Botão LANÇAR NA CONTA (Ação primária oficial - bg-brand-red com hover:brightness-110) */}
              <button
                type="button"
                onClick={lancarNaConta}
                disabled={!aluno || itens.length === 0 || enviando}
                className="w-full flex items-center justify-center gap-2 bg-[#1F479A] text-white font-semibold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(31,71,154,0.39)] hover:bg-[#163675] hover:shadow-[0_6px_20px_rgba(31,71,154,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none text-base"
              >
                <span>📝</span>
                <span>{enviando ? 'Lançando...' : 'Lançar na Conta'}</span>
              </button>
            </div>

            {itens.length > 0 && (
              <button
                type="button"
                onClick={() => setItens([])}
                className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-brand-red"
              >
                Limpar comanda
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* MODAL PAGAR AGORA (Venda à vista que NÃO vai para a conta devedora) */}
      {modalPagar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-[pop_.25s_ease]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700 shadow-sm">
                  💳
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-brand-blue">Pagar Agora</h3>
                  <p className="text-xs text-slate-400">Venda quitada no ato · Não gera débito</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPagar(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Aviso de Quitação Imediata */}
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/70 p-3.5 text-xs text-emerald-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <span>✓</span> Quitação Imediata
              </p>
              <p className="text-emerald-800">
                O valor desta venda não será adicionado ao saldo devedor do aluno.
                {aluno && (
                  <span className="block mt-1 font-semibold text-emerald-950">
                    Cliente identificado: {aluno.nome_completo} {aluno.turma && `(${aluno.turma})`}
                  </span>
                )}
              </p>
            </div>

            {/* Total */}
            <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total a Pagar</span>
              <p className="text-4xl font-black text-emerald-600">{brl(total)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {itens.reduce((s, i) => s + i.qtd, 0)} {itens.length === 1 ? 'item' : 'itens'} na compra
              </p>
            </div>

            {/* Métodos de Pagamento */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PIX', nome: 'PIX', emoji: '🟢' },
                  { id: 'Dinheiro', nome: 'Dinheiro', emoji: '💵' },
                  { id: 'Cartão', nome: 'Cartão', emoji: '💳' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPagamento(m.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-sm font-extrabold transition border-2 ${
                      metodoPagamento === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span>{m.nome}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalhes do PIX */}
            {metodoPagamento === 'PIX' && (
              <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-800 block">Chave PIX da Cantina:</span>
                <p className="mt-1 font-mono text-sm font-bold text-brand-blue">
                  (27) 99975-9569
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Favorecido: Vanessa das Sales</p>
              </div>
            )}

            {/* Campo de Dinheiro com Troco */}
            {metodoPagamento === 'Dinheiro' && (
              <div className="space-y-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
                <div>
                  <label htmlFor="valor-recebido" className="block text-xs font-bold text-slate-700">
                    Valor Recebido (R$)
                  </label>
                  <input
                    id="valor-recebido"
                    type="text"
                    inputMode="decimal"
                    value={dinheiroRecebido}
                    onChange={(e) => setDinheiroRecebido(e.target.value)}
                    placeholder="Ex.: 50,00"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-600"
                  />
                </div>
                {valorEntregueNum > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-500">Troco a devolver:</span>
                    <strong className={`text-base font-extrabold ${troco > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {brl(troco)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Ações do Modal */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalPagar(false)}
                disabled={processandoPagamento}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPagamentoAgora}
                disabled={processandoPagamento}
                className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 font-extrabold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {processandoPagamento ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {aviso && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-2xl px-6 py-3 font-semibold text-white shadow-2xl transition duration-300 ${
            aviso.tipo === 'ok' ? 'bg-brand-blue' : 'bg-brand-red'
          }`}
        >
          {aviso.msg}
        </div>
      )}
    </div>
  );
}
