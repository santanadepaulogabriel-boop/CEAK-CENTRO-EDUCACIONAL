import { supabase, supabaseConfigurado } from '../supabase.js';

export const modoDemo = !supabaseConfigurado;

export const soDigitos = (t) => String(t ?? '').replace(/\D/g, '');

/** Idade em anos completos a partir de 'AAAA-MM-DD' (sem fuso horário). Retorna null se inválida/futura. */
export function calcularIdade(dataISO, hoje = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO ?? '');
  if (!m) return null;
  const [, a, mes, d] = m.map(Number);
  const nasc = new Date(a, mes - 1, d);
  if (nasc.getFullYear() !== a || nasc.getMonth() !== mes - 1 || nasc.getDate() !== d) return null; // ex.: 31/02
  if (a < 1900 || nasc > hoje) return null;
  let idade = hoje.getFullYear() - a;
  const fezAniversario =
    hoje.getMonth() > mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() >= d);
  if (!fezAniversario) idade -= 1;
  return idade;
}

export const mascaraTelefone = (v) => {
  const n = soDigitos(v).slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
};

export const mascaraDocumento = (v) => {
  const n = soDigitos(v).slice(0, 11);
  // Até 11 dígitos formata como CPF; textos com letras (RG) ficam livres
  if (/[a-z]/i.test(v)) return v.slice(0, 20);
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

export async function salvarAluno(f) {
  const limiteBruto = String(f.limite_diario ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
  const limiteNum = limiteBruto ? parseFloat(limiteBruto) : null;

  const registro = {
    nome_completo: f.nome_completo.trim(),
    data_nascimento: f.data_nascimento,
    turma: f.turma?.trim() || null,
    limite_diario: !isNaN(limiteNum) && limiteNum !== null ? Number(limiteNum.toFixed(2)) : null,
    nome_responsavel: f.nome_responsavel.trim(),
    telefone_responsavel: soDigitos(f.telefone_responsavel),
    telefone_secundario: soDigitos(f.telefone_secundario) || null,
    documento_responsavel: f.documento_responsavel?.trim() || null,
    observacoes: f.observacoes?.trim() || null,
  };

  if (modoDemo || !supabase) {
    await new Promise((r) => setTimeout(r, 400));
    return { ...registro, id: crypto.randomUUID(), idade: calcularIdade(registro.data_nascimento), saldo_devedor_atual: 0 };
  }

  try {
    let { data, error } = await supabase
      .from('alunos')
      .insert([registro])
      .select('id, nome_completo');

    // Se falhar por causa das colunas turma ou limite_diario (caso ainda não criadas no Supabase)
    if (error && (error.message?.includes('turma') || error.message?.includes('limite_diario'))) {
      console.warn('Supabase sem colunas turma/limite_diario, tentando inserção legado...', error);
      const { turma, limite_diario, ...legado } = registro;
      const res = await supabase.from('alunos').insert([legado]).select('id, nome_completo');
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Erro detalhado do Supabase:', error);
      throw error;
    }

    return data?.[0] || { ...registro, id: crypto.randomUUID() };
  } catch (err) {
    console.error('Erro detalhado do Supabase:', err);
    throw err;
  }
}
