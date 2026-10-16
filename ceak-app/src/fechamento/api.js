import { supabase, supabaseConfigurado } from '../supabase.js';

export const modoDemo = !supabaseConfigurado;

const demoAlunos = [
  { id: 'a1', nome_completo: 'Lucas Sales', nome_responsavel: 'Vanessa das Sales', telefone_responsavel: '(27) 99975-9569', saldo_devedor_atual: 42.5 },
  { id: 'a2', nome_completo: 'Maria Eduarda Silva', nome_responsavel: 'Carlos Silva', telefone_responsavel: '27988887777', saldo_devedor_atual: 0 },
  { id: 'a3', nome_completo: 'Pedro Henrique Lima', nome_responsavel: 'Ana Lima', telefone_responsavel: '5527999991111', saldo_devedor_atual: 87 },
  { id: 'a4', nome_completo: 'Ana Clara Souza', nome_responsavel: 'Marcos Souza', telefone_responsavel: '(27) 98888-2222', saldo_devedor_atual: 15 },
  { id: 'a5', nome_completo: 'João Victor Costa', nome_responsavel: 'Paula Costa', telefone_responsavel: '27997773333', saldo_devedor_atual: 23.5 },
];

export async function listarDevedores() {
  if (modoDemo) {
    return demoAlunos
      .filter((a) => a.saldo_devedor_atual > 0)
      .sort((a, b) => b.saldo_devedor_atual - a.saldo_devedor_atual)
      .map((a) => ({ ...a }));
  }
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome_completo, nome_responsavel, telefone_responsavel, saldo_devedor_atual')
    .gt('saldo_devedor_atual', 0)
    .order('saldo_devedor_atual', { ascending: false });
  if (error) throw error;
  return data.map((a) => ({ ...a, saldo_devedor_atual: Number(a.saldo_devedor_atual) }));
}

// Zera o saldo e limpa o histórico do mês (função SQL atômica: public.zerar_conta)
export async function zerarConta(alunoId) {
  if (modoDemo) {
    const a = demoAlunos.find((x) => x.id === alunoId);
    if (a) a.saldo_devedor_atual = 0;
    return;
  }
  const { error } = await supabase.rpc('zerar_conta', { p_aluno_id: alunoId });
  if (error) throw error;
}

export const PIX = { chave: '(27) 99975-9569', favorecida: 'Vanessa das Sales' };

const soDigitos = (t) => String(t ?? '').replace(/\D/g, '');

export function linkWhatsApp(aluno) {
  let fone = soDigitos(aluno.telefone_responsavel);
  if (fone.length === 10 || fone.length === 11) fone = `55${fone}`; // DDD + número → adiciona Brasil
  const valor = Number(aluno.saldo_devedor_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const texto =
    `Olá, o consumo do(a) ${aluno.nome_completo} este mês na cantina CEAK foi de R$ ${valor}. ` +
    `Nossa chave PIX é celular ${PIX.chave} (${PIX.favorecida})`;
  return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
}
