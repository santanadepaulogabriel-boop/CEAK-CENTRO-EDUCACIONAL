import { supabase, supabaseConfigurado } from '../supabase.js';

export const CATEGORIAS = [
  { id: 'todos', nome: 'Todos', emoji: '✨' },
  { id: 'salgados', nome: 'Salgados', emoji: '🥪' },
  { id: 'bebidas', nome: 'Bebidas', emoji: '🥤' },
  { id: 'doces', nome: 'Doces', emoji: '🍰' },
  { id: 'pratos', nome: 'Pratos & Especiais', emoji: '🍝' },
];

export const PRODUTOS_PADRAO = [
  {
    id: 'p1',
    nome: 'Lasanha à Bolonhesa',
    descricao: 'Massa fresca artesanal, molho suculento e queijo gratinado.',
    preco: 16.9,
    emoji: '🍝',
    ilustracao: 'lasanha',
    corFundo: 'bg-amber-50',
    categoria: 'pratos',
    tag: 'Especial do Chef',
  },
  {
    id: 'p2',
    nome: 'Burger Artesanal Especial',
    descricao: 'Pão brioche fofinho, hambúrguer caseiro, cheddar cremoso e alface.',
    preco: 19.9,
    emoji: '🍔',
    ilustracao: 'burger',
    corFundo: 'bg-orange-50',
    categoria: 'pratos',
    tag: 'Mais Pedido',
  },
  {
    id: 'p3',
    nome: 'Bolo de Cenoura com Chocolate',
    descricao: 'Fatia generosa com cobertura aveludada de chocolate puro.',
    preco: 8.5,
    emoji: '🍰',
    ilustracao: 'bolo',
    corFundo: 'bg-rose-50',
    categoria: 'doces',
    tag: 'Sobremesa',
  },
  {
    id: 'p4',
    nome: 'Salgado Assado Dourado',
    descricao: 'Assado folhado artesanal quentinho (frango com requeijão ou queijo).',
    preco: 7.0,
    emoji: '🥟',
    ilustracao: 'coxinha',
    corFundo: 'bg-amber-50',
    categoria: 'salgados',
    tag: 'Quentinho',
  },
  {
    id: 'p5',
    nome: 'Misto-Quente no Brioche',
    descricao: 'Pão tostado na chapa com queijo derretido e presunto magro.',
    preco: 6.0,
    emoji: '🥪',
    ilustracao: 'misto',
    corFundo: 'bg-yellow-50',
    categoria: 'salgados',
  },
  {
    id: 'p6',
    nome: 'Fatia de Pizza Margherita',
    descricao: 'Molho de tomate fresco, mozzarella derretida e orégano.',
    preco: 8.0,
    emoji: '🍕',
    ilustracao: 'pizza',
    corFundo: 'bg-red-50',
    categoria: 'salgados',
  },
  {
    id: 'p7',
    nome: 'Suco Natural de Laranja',
    descricao: 'Espremido na hora, 100% fruta natural e bem gelado 350ml.',
    preco: 6.5,
    emoji: '🍊',
    ilustracao: 'suco',
    corFundo: 'bg-orange-50',
    categoria: 'bebidas',
    tag: '100% Natural',
  },
  {
    id: 'p8',
    nome: 'Refrigerante Gelado',
    descricao: 'Lata 350ml servida estupidamente gelada.',
    preco: 5.0,
    emoji: '🥤',
    ilustracao: 'refri',
    corFundo: 'bg-blue-50',
    categoria: 'bebidas',
  },
  {
    id: 'p9',
    nome: 'Coca-Cola Juninho',
    descricao: 'Garrafinha 200ml gelada na medida certa.',
    preco: 4.5,
    emoji: '🍾',
    ilustracao: 'coca',
    corFundo: 'bg-red-50',
    categoria: 'bebidas',
  },
  {
    id: 'p10',
    nome: 'Água Mineral Crystal 500ml',
    descricao: 'Água mineral límpida com ou sem gás.',
    preco: 3.0,
    emoji: '💧',
    ilustracao: 'agua',
    corFundo: 'bg-cyan-50',
    categoria: 'bebidas',
  },
  {
    id: 'p11',
    nome: 'Brownie com Nozes',
    descricao: 'Massa úmida de chocolate nobre com nozes crocantes.',
    preco: 7.5,
    emoji: '🍫',
    ilustracao: 'brownie',
    corFundo: 'bg-amber-100/50',
    categoria: 'doces',
  },
  {
    id: 'p12',
    nome: 'Pão de Queijo Mineiro',
    descricao: 'Tradicional pão de queijo quentinho e crocante por fora.',
    preco: 5.0,
    emoji: '🧀',
    ilustracao: 'paodequeijo',
    corFundo: 'bg-yellow-50',
    categoria: 'salgados',
  },
];

/**
 * Busca produtos dinamicamente da tabela 'produtos' do Supabase.
 * Se a tabela estiver vazia ou não criada, utiliza o catálogo padrão com elegância.
 */
export async function buscarProdutos() {
  if (modoDemo || !supabase) {
    return PRODUTOS_PADRAO;
  }
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome');

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn('Tabela "produtos" ainda não criada ou inacessível no Supabase. Carregando catálogo padrão.', error.message);
      }
      return PRODUTOS_PADRAO;
    }

    return data.map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || '',
      preco: Number(item.preco),
      categoria: item.categoria || 'salgados',
      emoji: item.emoji || '🥪',
      img: item.imagem_url || item.img || null,
      tag: item.tag || null,
    }));
  } catch (err) {
    console.warn('Erro ao conectar na tabela produtos do Supabase:', err);
    return PRODUTOS_PADRAO;
  }
}

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
