import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigurado } from '../supabase.js';

const CantinaContext = createContext(null);

export function CantinaProvider({ children }) {
  const [alunos, setAlunos] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [totalSaldoAberto, setTotalSaldoAberto] = useState(0);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(Date.now());

  // Carrega lista de alunos e soma de saldo devedor
  const carregarAlunos = useCallback(async () => {
    if (!supabaseConfigurado || !supabase) {
      // Fallback em memória caso o Supabase não esteja conectado
      const demoAlunosLocal = [
        { id: 'a1', nome_completo: 'Lucas Sales', turma: '6º Ano A', saldo_devedor_atual: 45.9, nome_responsavel: 'Vanessa das Sales', telefone_responsavel: '(27) 99975-9569' },
        { id: 'a3', nome_completo: 'Pedro Henrique Lima', turma: '8º Ano C', saldo_devedor_atual: 87.0, nome_responsavel: 'Ana Lima', telefone_responsavel: '(27) 99999-1111' },
        { id: 'a4', nome_completo: 'Ana Clara Souza', turma: '3º Ano A', saldo_devedor_atual: 15.0, nome_responsavel: 'Marcos Souza', telefone_responsavel: '(27) 98888-2222' },
        { id: 'a5', nome_completo: 'João Victor Costa', turma: '5º Ano B', saldo_devedor_atual: 23.5, nome_responsavel: 'Paula Costa', telefone_responsavel: '(27) 99777-3333' },
      ];
      setAlunos(demoAlunosLocal);
      const soma = demoAlunosLocal.reduce((acc, a) => acc + Number(a.saldo_devedor_atual || 0), 0);
      setTotalSaldoAberto(soma);
      return demoAlunosLocal;
    }

    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .order('nome_completo');

      if (error) throw error;

      setAlunos(data || []);
      const soma = (data || []).reduce((acc, a) => acc + Number(a.saldo_devedor_atual || 0), 0);
      setTotalSaldoAberto(soma);
      return data;
    } catch (err) {
      console.warn('Erro ao carregar alunos do Supabase:', err.message);
      return [];
    }
  }, []);

  // Carrega histórico de consumos e vendas reais
  const carregarConsumos = useCallback(async () => {
    if (!supabaseConfigurado || !supabase) {
      const agora = new Date();
      const demoConsumosLocal = [
        { id: 'c1', aluno_id: 'a1', produto_nome: 'Salgado Assado Dourado', valor: 7.0, data_hora: agora.toISOString(), categoria: 'salgados' },
        { id: 'c2', aluno_id: 'a1', produto_nome: 'Suco Natural de Laranja', valor: 6.5, data_hora: agora.toISOString(), categoria: 'bebidas' },
        { id: 'c3', aluno_id: 'a3', produto_nome: 'Burger Artesanal Especial', valor: 19.9, data_hora: agora.toISOString(), categoria: 'pratos' },
        { id: 'c4', aluno_id: 'a4', produto_nome: 'Misto-Quente no Brioche', valor: 6.0, data_hora: agora.toISOString(), categoria: 'salgados' },
        { id: 'c5', aluno_id: 'a5', produto_nome: 'Fatia de Pizza Margherita', valor: 8.0, data_hora: agora.toISOString(), categoria: 'salgados' },
        { id: 'c6', aluno_id: 'a3', produto_nome: 'Bolo de Cenoura com Chocolate', valor: 8.5, data_hora: agora.toISOString(), categoria: 'doces' },
      ];
      setConsumos(demoConsumosLocal);
      return demoConsumosLocal;
    }

    try {
      const { data, error } = await supabase
        .from('consumo')
        .select('id, aluno_id, produto_nome, valor, data_hora')
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setConsumos(data || []);
      return data;
    } catch (err) {
      console.warn('Erro ao carregar consumos do Supabase:', err.message);
      return [];
    }
  }, []);

  // Recarrega todos os dados
  const recarregarTudo = useCallback(async () => {
    setCarregandoDados(true);
    await Promise.all([carregarAlunos(), carregarConsumos()]);
    setCarregandoDados(false);
    setUltimaAtualizacao(Date.now());
  }, [carregarAlunos, carregarConsumos]);

  // Carregamento inicial e assinatura Realtime do Supabase
  useEffect(() => {
    recarregarTudo();

    if (!supabaseConfigurado || !supabase) return;

    // Escuta em tempo real alterações na tabela 'alunos' (ex: saldo alterado)
    const canalAlunos = supabase
      .channel('realtime-alunos-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, () => {
        carregarAlunos();
        setUltimaAtualizacao(Date.now());
      })
      .subscribe();

    // Escuta em tempo real alterações na tabela 'consumo' (ex: nova venda ou pagamento)
    const canalConsumo = supabase
      .channel('realtime-consumo-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumo' }, () => {
        carregarConsumos();
        carregarAlunos();
        setUltimaAtualizacao(Date.now());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalAlunos);
      supabase.removeChannel(canalConsumo);
    };
  }, [recarregarTudo, carregarAlunos, carregarConsumos]);

  // Sincronização instantânea no estado global quando uma venda é feita no PDV (Optimistic UI)
  const notificarNovaVenda = useCallback((itensVenda, alunoVenda = null) => {
    const agora = new Date().toISOString();
    const novosConsumos = itensVenda.map((item, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      aluno_id: alunoVenda?.id || null,
      produto_nome: item.nome,
      valor: Number(item.preco),
      data_hora: agora,
    }));

    setConsumos((prev) => [...novosConsumos, ...prev]);

    if (alunoVenda?.id) {
      const totalVenda = itensVenda.reduce((acc, i) => acc + (Number(i.preco) * Number(i.qtd || 1)), 0);
      setAlunos((prevAlunos) =>
        prevAlunos.map((a) =>
          a.id === alunoVenda.id
            ? { ...a, saldo_devedor_atual: Number(a.saldo_devedor_atual || 0) + totalVenda }
            : a
        )
      );
      setTotalSaldoAberto((prev) => prev + totalVenda);
    }

    setUltimaAtualizacao(Date.now());
  }, []);

  // Sincronização instantânea no estado global quando um pagamento é registrado em Contas
  const notificarPagamentoRealizado = useCallback((alunoId, valorPago, ehQuitacaoTotal) => {
    const valorPagoNum = Number(valorPago);

    setAlunos((prevAlunos) =>
      prevAlunos.map((a) => {
        if (a.id === alunoId) {
          const novoSaldo = ehQuitacaoTotal
            ? 0
            : Math.max(0, Number(a.saldo_devedor_atual || 0) - valorPagoNum);
          return { ...a, saldo_devedor_atual: novoSaldo };
        }
        return a;
      })
    );

    setTotalSaldoAberto((prev) => Math.max(0, prev - valorPagoNum));

    // Adiciona o pagamento como linha no extrato de consumos
    const agora = new Date().toISOString();
    setConsumos((prev) => [
      {
        id: `pagto-${Date.now()}`,
        aluno_id: alunoId,
        produto_nome: 'Pagamento Recebido',
        valor: -Math.abs(valorPagoNum),
        data_hora: agora,
      },
      ...prev,
    ]);

    setUltimaAtualizacao(Date.now());
  }, []);

  const value = {
    alunos,
    consumos,
    totalSaldoAberto,
    carregandoDados,
    ultimaAtualizacao,
    recarregarTudo,
    carregarAlunos,
    carregarConsumos,
    notificarNovaVenda,
    notificarPagamentoRealizado,
  };

  return (
    <CantinaContext.Provider value={value}>
      {children}
    </CantinaContext.Provider>
  );
}

export function useCantina() {
  const context = useContext(CantinaContext);
  if (!context) {
    throw new Error('useCantina deve ser utilizado dentro de um CantinaProvider');
  }
  return context;
}
