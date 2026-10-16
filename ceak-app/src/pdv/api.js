import { supabase, supabaseConfigurado } from '../supabase.js';

export const CATEGORIAS = [
  { id: 'todos', nome: 'Todos', emoji: '✨' },
  { id: 'salgados', nome: 'Salgados', emoji: '🥪' },
  { id: 'bebidas', nome: 'Bebidas', emoji: '🥤' },
  { id: 'doces', nome: 'Doces', emoji: '🍰' },
  { id: 'pratos', nome: 'Pratos & Especiais', emoji: '🍝' },
];

export const PRODUTOS = [
  { nome: 'Misto-Quente', preco: 6.0, emoji: '🥪', categoria: 'salgados' },
  { nome: 'Pizza', preco: 8.0, emoji: '🍕', categoria: 'salgados' },
  { nome: 'Salgado Assado', preco: 7.0, emoji: '🥟', categoria: 'salgados' },
  { nome: 'Burger Artesanal', preco: 19.9, emoji: '🍔', categoria: 'salgados' },
  { nome: 'Refrigerante', preco: 5.0, emoji: '🥤', categoria: 'bebidas' },
  { nome: 'Coca-Cola Juninho', preco: 4.5, emoji: '🍾', categoria: 'bebidas' },
  { nome: 'Suco', preco: 6.5, emoji: '🍊', categoria: 'bebidas' },
  { nome: 'Água Mineral', preco: 3.0, emoji: '💧', categoria: 'bebidas' },
  { nome: 'Bolo de Cenoura', preco: 8.5, emoji: '🍰', categoria: 'doces' },
  { nome: 'Lasanha', preco: 16.9, emoji: '🍝', categoria: 'pratos' },
];

// ---- Modo demonstração (sem Supabase configurado): dados em memória ----
const demoAlunos = [
  { id: 'a1', nome_completo: 'Lucas Sales', idade: 12, turma: '6º Ano A', limite_diario: 25.0, nome_responsavel: 'Vanessa das Sales', telefone_responsavel: '27999759569', observacoes: 'Alérgico a amendoim', saldo_devedor_atual: 42.5 },
  { id: 'a2', nome_completo: 'Maria Eduarda Silva', idade: 10, turma: '4º Ano B', limite_diario: 15.0, nome_responsavel: 'Carlos Silva', telefone_responsavel: '27998881122', observacoes: '', saldo_devedor_atual: 0 },
  { id: 'a3', nome_completo: 'Pedro Henrique Lima', idade: 14, turma: '8º Ano C', limite_diario: null, nome_responsavel: 'Ana Lima', telefone_responsavel: '27997773344', observacoes: 'Intolerante à lactose e corantes', saldo_devedor_atual: 87.0 },
  { id: 'a4', nome_completo: 'Ana Clara Souza', idade: 9, turma: '3º Ano A', limite_diario: 20.0, nome_responsavel: 'Marcos Souza', telefone_responsavel: '27996665544', observacoes: '', saldo_devedor_atual: 15.0 },
  { id: 'a5', nome_completo: 'João Victor Costa', idade: 11, turma: '5º Ano B', limite_diario: 30.0, nome_responsavel: 'Paula Costa', telefone_responsavel: '27995556677', observacoes: 'Não liberar refrigerante em dias de semana', saldo_devedor_atual: 23.5 },
];

export const modoDemo = !supabaseConfigurado;

export async function buscarAlunos(termo) {
  const t = termo.trim();
  if (!t) return [];
  if (modoDemo) {
    const n = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    return demoAlunos.filter((a) => n(a.nome_completo).includes(n(t))).slice(0, 8);
  }
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, idade, turma, limite_diario, nome_responsavel, telefone_responsavel, observacoes, saldo_devedor_atual')
      .ilike('nome_completo', `%${t}%`)
      .order('nome_completo')
      .limit(8);
    if (error) throw error;
    return data;
  } catch (err) {
    // Fallback caso as novas colunas ainda não estejam no Supabase
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, idade, nome_responsavel, observacoes, saldo_devedor_atual')
      .ilike('nome_completo', `%${t}%`)
      .order('nome_completo')
      .limit(8);
    if (error) throw error;
    return data;
  }
}

// Registra os itens em "consumo". O trigger do banco soma ao saldo; depois relemos o saldo.
export async function lancarConsumo(aluno, itens) {
  if (modoDemo) {
    const total = itens.reduce((s, i) => s + i.valor, 0);
    const a = demoAlunos.find((x) => x.id === aluno.id);
    if (a) a.saldo_devedor_atual = Math.round((a.saldo_devedor_atual + total) * 100) / 100;
    return a ? a.saldo_devedor_atual : total;
  }
  const agora = new Date().toISOString();
  const linhas = itens.map((i) => ({
    aluno_id: aluno.id,
    produto_nome: i.produto_nome,
    valor: i.valor,
    data_hora: i.data_hora || agora,
  }));
  const { error } = await supabase.from('consumo').insert(linhas);
  if (error) throw error;
  const { data, error: e2 } = await supabase.from('alunos').select('saldo_devedor_atual').eq('id', aluno.id).single();
  if (e2) throw e2;
  return Number(data.saldo_devedor_atual);
}

// Venda imediata quitada no ato: NÃO vai para a conta devedora do aluno
export async function lancarVendaPaga(itens, aluno = null, metodo = 'PIX') {
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  if (modoDemo) {
    await new Promise((r) => setTimeout(r, 400));
    return { sucesso: true, total, metodo, aluno: aluno?.nome_completo ?? 'Balcão / Avulso' };
  }
  // No Supabase, quitação à vista não gera débito na conta do aluno
  return { sucesso: true, total, metodo, aluno: aluno?.nome_completo ?? 'Balcão / Avulso' };
}

// Atualização em tempo real do saldo (outros caixas / mudanças no banco)
export function assinarSaldo(alunoId, aoMudar) {
  if (modoDemo || !alunoId) return () => {};
  const canal = supabase
    .channel(`saldo-${alunoId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alunos', filter: `id=eq.${alunoId}` },
      (p) => aoMudar(Number(p.new.saldo_devedor_atual)))
    .subscribe();
  return () => supabase.removeChannel(canal);
}
