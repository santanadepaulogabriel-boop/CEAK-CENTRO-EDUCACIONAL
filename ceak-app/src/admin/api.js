import { supabase, supabaseConfigurado } from '../supabase.js';

export const modoDemo = !supabaseConfigurado;

const hoje = new Date();
const dataRelativa = (diasAtras, hora, minuto) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};

// Dados de demonstração para exibição rica sem necessidade imediata do Supabase
const demoAlunos = [
  {
    id: 'a1',
    nome_completo: 'Lucas Sales',
    idade: 12,
    data_nascimento: '2012-05-15',
    turma: '6º Ano A',
    limite_diario: 25.0,
    nome_responsavel: 'Vanessa das Sales',
    telefone_responsavel: '(27) 99975-9569',
    telefone_secundario: '(27) 3333-1111',
    documento_responsavel: '123.456.789-00',
    observacoes: 'Alérgico a amendoim',
    saldo_devedor_atual: 45.9,
  },
  {
    id: 'a3',
    nome_completo: 'Pedro Henrique Lima',
    idade: 14,
    data_nascimento: '2010-08-20',
    turma: '8º Ano C',
    limite_diario: null,
    nome_responsavel: 'Ana Lima',
    telefone_responsavel: '(27) 99999-1111',
    telefone_secundario: '',
    documento_responsavel: '',
    observacoes: 'Intolerante à lactose',
    saldo_devedor_atual: 87.0,
  },
  {
    id: 'a4',
    nome_completo: 'Ana Clara Souza',
    idade: 9,
    data_nascimento: '2015-03-10',
    turma: '3º Ano A',
    limite_diario: 20.0,
    nome_responsavel: 'Marcos Souza',
    telefone_responsavel: '(27) 98888-2222',
    telefone_secundario: '',
    documento_responsavel: '',
    observacoes: '',
    saldo_devedor_atual: 15.0,
  },
  {
    id: 'a5',
    nome_completo: 'João Victor Costa',
    idade: 11,
    data_nascimento: '2013-11-25',
    turma: '5º Ano B',
    limite_diario: 30.0,
    nome_responsavel: 'Paula Costa',
    telefone_responsavel: '(27) 99777-3333',
    telefone_secundario: '',
    documento_responsavel: '',
    observacoes: '',
    saldo_devedor_atual: 23.5,
  },
];

let demoConsumos = {
  a1: [
    { id: 'c1', aluno_id: 'a1', produto_nome: 'Salgado Assado', valor: 7.0, data_hora: dataRelativa(0, 10, 15) },
    { id: 'c2', aluno_id: 'a1', produto_nome: 'Suco', valor: 6.5, data_hora: dataRelativa(0, 10, 16) },
    { id: 'c3', aluno_id: 'a1', produto_nome: 'Lasanha à Bolonhesa', valor: 16.9, data_hora: dataRelativa(1, 12, 30) },
    { id: 'c4', aluno_id: 'a1', produto_nome: 'Coca-Cola Juninho', valor: 4.5, data_hora: dataRelativa(1, 12, 31) },
    { id: 'c5', aluno_id: 'a1', produto_nome: 'Misto-Quente', valor: 6.0, data_hora: dataRelativa(3, 9, 45) },
    { id: 'c6', aluno_id: 'a1', produto_nome: 'Refrigerante', valor: 5.0, data_hora: dataRelativa(3, 9, 46) },
  ],
  a3: [
    { id: 'c7', aluno_id: 'a3', produto_nome: 'Burger Artesanal', valor: 19.9, data_hora: dataRelativa(0, 12, 10) },
    { id: 'c8', aluno_id: 'a3', produto_nome: 'Suco', valor: 6.5, data_hora: dataRelativa(0, 12, 11) },
    { id: 'c9', aluno_id: 'a3', produto_nome: 'Pizza', valor: 8.0, data_hora: dataRelativa(2, 10, 20) },
    { id: 'c10', aluno_id: 'a3', produto_nome: 'Bolo de Cenoura', valor: 8.5, data_hora: dataRelativa(2, 10, 21) },
    { id: 'c11', aluno_id: 'a3', produto_nome: 'Burger Artesanal', valor: 19.9, data_hora: dataRelativa(4, 12, 0) },
    { id: 'c12', aluno_id: 'a3', produto_nome: 'Lasanha à Bolonhesa', valor: 16.9, data_hora: dataRelativa(5, 12, 15) },
    { id: 'c13', aluno_id: 'a3', produto_nome: 'Salgado Assado', valor: 7.3, data_hora: dataRelativa(6, 10, 5) },
  ],
  a4: [
    { id: 'c14', aluno_id: 'a4', produto_nome: 'Misto-Quente', valor: 6.0, data_hora: dataRelativa(1, 9, 50) },
    { id: 'c15', aluno_id: 'a4', produto_nome: 'Bolo de Cenoura', valor: 8.5, data_hora: dataRelativa(2, 10, 10) },
    { id: 'c16', aluno_id: 'a4', produto_nome: 'Água', valor: 0.5, data_hora: dataRelativa(2, 10, 11) },
  ],
  a5: [
    { id: 'c17', aluno_id: 'a5', produto_nome: 'Pizza', valor: 8.0, data_hora: dataRelativa(0, 10, 30) },
    { id: 'c18', aluno_id: 'a5', produto_nome: 'Salgado Assado', valor: 7.0, data_hora: dataRelativa(1, 10, 15) },
    { id: 'c19', aluno_id: 'a5', produto_nome: 'Bolo de Cenoura', valor: 8.5, data_hora: dataRelativa(3, 10, 20) },
  ],
};

export async function listarDevedores() {
  if (modoDemo) {
    return demoAlunos
      .filter((a) => a.saldo_devedor_atual > 0)
      .sort((a, b) => b.saldo_devedor_atual - a.saldo_devedor_atual)
      .map((a) => ({ ...a }));
  }
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, data_nascimento, idade, turma, limite_diario, nome_responsavel, telefone_responsavel, telefone_secundario, documento_responsavel, observacoes, saldo_devedor_atual')
      .gt('saldo_devedor_atual', 0)
      .order('saldo_devedor_atual', { ascending: false });
    if (error) throw error;
    return data.map((a) => ({ ...a, saldo_devedor_atual: Number(a.saldo_devedor_atual) }));
  } catch (err) {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, data_nascimento, idade, nome_responsavel, telefone_responsavel, observacoes, saldo_devedor_atual')
      .gt('saldo_devedor_atual', 0)
      .order('saldo_devedor_atual', { ascending: false });
    if (error) throw error;
    return data.map((a) => ({ ...a, saldo_devedor_atual: Number(a.saldo_devedor_atual) }));
  }
}

export async function atualizarAluno(id, dados) {
  const limiteBruto = String(dados.limite_diario ?? '').replace(/[^\d.,]/g, '').replace(',', '.');
  const limiteNum = limiteBruto ? parseFloat(limiteBruto) : null;

  const registro = {
    nome_completo: dados.nome_completo.trim(),
    data_nascimento: dados.data_nascimento || null,
    turma: dados.turma?.trim() || null,
    limite_diario: !isNaN(limiteNum) && limiteNum !== null ? Number(limiteNum.toFixed(2)) : null,
    nome_responsavel: dados.nome_responsavel.trim(),
    telefone_responsavel: String(dados.telefone_responsavel || '').replace(/\D/g, ''),
    telefone_secundario: String(dados.telefone_secundario || '').replace(/\D/g, '') || null,
    documento_responsavel: dados.documento_responsavel?.trim() || null,
    observacoes: dados.observacoes?.trim() || null,
  };

  if (modoDemo) {
    await new Promise((r) => setTimeout(r, 400));
    const idx = demoAlunos.findIndex((a) => a.id === id);
    if (idx !== -1) {
      demoAlunos[idx] = {
        ...demoAlunos[idx],
        ...registro,
      };
      return demoAlunos[idx];
    }
    return { id, ...registro };
  }

  try {
    const { data, error } = await supabase
      .from('alunos')
      .update(registro)
      .eq('id', id)
      .select('id, nome_completo, data_nascimento, idade, turma, limite_diario, nome_responsavel, telefone_responsavel, telefone_secundario, documento_responsavel, observacoes, saldo_devedor_atual')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    const { turma, limite_diario, ...legado } = registro;
    const { data, error } = await supabase
      .from('alunos')
      .update(legado)
      .eq('id', id)
      .select('id, nome_completo, data_nascimento, idade, nome_responsavel, telefone_responsavel, observacoes, saldo_devedor_atual')
      .single();
    if (error) throw error;
    return data;
  }
}

export async function obterConsumoAluno(alunoId) {
  if (modoDemo) {
    const lista = demoConsumos[alunoId] || [];
    return [...lista].sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
  }
  const { data, error } = await supabase
    .from('consumo')
    .select('id, aluno_id, produto_nome, valor, data_hora')
    .eq('aluno_id', alunoId)
    .order('data_hora', { ascending: false });
  if (error) throw error;
  return data.map((c) => ({ ...c, valor: Number(c.valor) }));
}

export async function confirmarPagamentoEZerarConta(alunoId) {
  if (modoDemo) {
    const a = demoAlunos.find((x) => x.id === alunoId);
    if (a) a.saldo_devedor_atual = 0;
    demoConsumos[alunoId] = [];
    return { quitado: true, novoSaldo: 0 };
  }
  const { error } = await supabase.rpc('zerar_conta', { p_aluno_id: alunoId });
  if (error) throw error;
  return { quitado: true, novoSaldo: 0 };
}

/**
 * Registra pagamento do aluno:
 * - Se valorPago >= totalDevido: quitação total (zera conta e limpa histórico).
 * - Se valorPago < totalDevido: pagamento parcial (subtrai do saldo e insere 'Pagamento Recebido' com valor negativo).
 */
export async function registrarPagamento(alunoId, valorPago, totalDevido) {
  const pago = Number(valorPago);
  const total = Number(totalDevido);
  if (isNaN(pago) || pago <= 0) throw new Error('Valor pago inválido.');

  // Caso 1: Quitação total
  if (pago >= total) {
    return await confirmarPagamentoEZerarConta(alunoId);
  }

  // Caso 2: Pagamento parcial
  if (modoDemo) {
    await new Promise((r) => setTimeout(r, 400));
    const a = demoAlunos.find((x) => x.id === alunoId);
    if (a) {
      a.saldo_devedor_atual = Math.max(0, Math.round((a.saldo_devedor_atual - pago) * 100) / 100);
    }
    if (!demoConsumos[alunoId]) demoConsumos[alunoId] = [];
    demoConsumos[alunoId].unshift({
      id: `pg-${Date.now()}`,
      aluno_id: alunoId,
      produto_nome: 'Pagamento Recebido',
      valor: -Math.abs(pago),
      data_hora: new Date().toISOString(),
    });
    return { quitado: false, novoSaldo: a ? a.saldo_devedor_atual : Math.max(0, total - pago) };
  }

  // Supabase: inserir linha negativa em consumo (o trigger subtrai automaticamente do saldo devedor)
  const agora = new Date().toISOString();
  try {
    const { error: errConsumo } = await supabase.from('consumo').insert({
      aluno_id: alunoId,
      produto_nome: 'Pagamento Recebido',
      valor: -Math.abs(pago),
      data_hora: agora,
    });
    if (errConsumo) throw errConsumo;
  } catch (err) {
    // Fallback: se a constraint check(valor > 0) ainda estiver no banco remoto, atualiza o saldo do aluno diretamente
    console.warn('Fallback: subtraindo saldo direto na tabela alunos:', err);
    const { data: alunoAtual } = await supabase
      .from('alunos')
      .select('saldo_devedor_atual')
      .eq('id', alunoId)
      .single();
    if (alunoAtual) {
      const novo = Math.max(0, Math.round((Number(alunoAtual.saldo_devedor_atual) - pago) * 100) / 100);
      await supabase.from('alunos').update({ saldo_devedor_atual: novo }).eq('id', alunoId);
    }
  }

  const { data: finalAluno, error: errFinal } = await supabase
    .from('alunos')
    .select('saldo_devedor_atual')
    .eq('id', alunoId)
    .single();
  if (errFinal) throw errFinal;

  return { quitado: false, novoSaldo: Number(finalAluno.saldo_devedor_atual) };
}

/** Formata mensagem e link do WhatsApp para envio do extrato detalhado */
export function gerarLinkWhatsAppExtrato(aluno, itens) {
  if (!aluno) return null;
  const digits = String(aluno.telefone_responsavel ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const tel = digits.startsWith('55') ? digits : `55${digits}`;

  // Ordena cronologicamente para exibição no extrato
  const ordenados = [...itens].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const linhasExtrato = ordenados.map((i) => {
    const d = new Date(i.data_hora);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const valorFmt = Number(Math.abs(i.valor)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (i.valor < 0 || i.produto_nome.toLowerCase().includes('pagamento')) {
      return `${dia}/${mes}: ${i.produto_nome} (-${valorFmt})`;
    }
    return `${dia}/${mes}: ${i.produto_nome} (${valorFmt})`;
  });

  const totalDevidoFmt = Number(aluno.saldo_devedor_atual).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const texto = [
    'Olá! Aqui é da cantina CEAK.',
    `O extrato de consumo de ${aluno.nome_completo} deste mês é:`,
    ...linhasExtrato,
    '',
    `*Total a pagar: ${totalDevidoFmt}*`,
    'Chave PIX: Celular (27) 99975-9569 (Vanessa das Sales)',
  ].join('\n');

  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}

/**
 * Agrupa itens de consumo por data (AAAA-MM-DD).
 * Retorna array ordenado de dias com lista de itens e total gasto no dia.
 */
export function agruparConsumoPorData(itens) {
  const mapa = new Map();

  for (const item of itens) {
    const d = new Date(item.data_hora);
    const chaveData = d.toISOString().split('T')[0]; // AAAA-MM-DD
    if (!mapa.has(chaveData)) {
      mapa.set(chaveData, {
        dataISO: chaveData,
        dataObj: d,
        itens: [],
        totalDia: 0,
      });
    }
    const grupo = mapa.get(chaveData);
    grupo.itens.push(item);
    grupo.totalDia += Number(item.valor || 0);
  }

  return Array.from(mapa.values()).sort((a, b) => b.dataObj - a.dataObj);
}
