import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigurado } from '../supabase.js';
import {
  calcularIdade,
  mascaraDocumento,
  mascaraTelefone,
  salvarAluno,
  soDigitos,
  modoDemo,
} from '../cadastro/api.js';

const vazio = {
  nome_completo: '',
  data_nascimento: '',
  turma: '',
  limite_diario: '',
  nome_responsavel: '',
  telefone_responsavel: '',
  telefone_secundario: '',
  documento_responsavel: '',
  observacoes: '',
};

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function validar(f, idade) {
  const e = {};
  if (!f.nome_completo.trim()) {
    e.nome_completo = 'Informe o nome completo do aluno.';
  } else if (f.nome_completo.trim().split(/\s+/).length < 2) {
    e.nome_completo = 'Informe o nome completo (nome e sobrenome).';
  }
  if (!f.data_nascimento) e.data_nascimento = 'Informe a data de nascimento.';
  else if (idade === null) e.data_nascimento = 'Data inválida ou no futuro.';
  if (f.limite_diario) {
    const num = parseFloat(String(f.limite_diario).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num < 0) e.limite_diario = 'Informe um valor válido em reais (ex.: 25,00).';
  }
  if (!f.nome_responsavel.trim()) e.nome_responsavel = 'Informe o nome do responsável.';
  const tel = soDigitos(f.telefone_responsavel);
  if (!tel || tel.length < 10) e.telefone_responsavel = 'Telefone com DDD (10 ou 11 dígitos).';
  const tel2 = soDigitos(f.telefone_secundario);
  if (tel2 && tel2.length < 10) e.telefone_secundario = 'Telefone com DDD (10 ou 11 dígitos).';
  if (f.documento_responsavel && f.documento_responsavel.trim().length < 5) e.documento_responsavel = 'Documento muito curto.';
  return e;
}

function Campo({ id, rotulo, obrigatorio, erro, dica, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {rotulo} {obrigatorio && <span className="text-ceak-red" aria-hidden="true">*</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-xs font-medium text-ceak-red">{erro}</p>
      ) : (
        dica && <p className="mt-1 text-xs text-slate-400">{dica}</p>
      )}
    </div>
  );
}

const estiloInput = (erro) =>
  `w-full rounded-2xl border-2 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-300 focus:ring-4 ${
    erro ? 'border-brand-red focus:ring-brand-red/10' : 'border-slate-200 focus:border-brand-blue focus:ring-brand-blue/10'
  }`;

export default function CadastroPage() {
  const [f, setF] = useState(vazio);
  const [tocados, setTocados] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    document.title = 'Novo Aluno | CEAK Cantina';
  }, []);

  // Idade calculada automaticamente a partir da data de nascimento
  const idade = useMemo(() => calcularIdade(f.data_nascimento), [f.data_nascimento]);
  const erros = useMemo(() => validar(f, idade), [f, idade]);
  const mostrar = (campo) => (tocados[campo] ? erros[campo] : undefined);

  const set = (campo, valor) => setF((cur) => ({ ...cur, [campo]: valor }));
  const tocar = (campo) => setTocados((cur) => ({ ...cur, [campo]: true }));
  const props = (campo, mascara) => ({
    id: campo,
    value: f[campo],
    onChange: (e) => set(campo, mascara ? mascara(e.target.value) : e.target.value),
    onBlur: () => tocar(campo),
    'aria-invalid': Boolean(mostrar(campo)),
    'aria-describedby': mostrar(campo) ? `${campo}-erro` : undefined,
    className: estiloInput(mostrar(campo)),
  });

  const enviar = async (e) => {
    // 1. Tratamento de Formulário e Estado: previne recarregamento da página
    e.preventDefault();
    setTocados(Object.fromEntries(Object.keys(vazio).map((k) => [k, true])));

    if (Object.keys(erros).length > 0) {
      alert('Por favor, preencha todos os campos obrigatórios destacados no formulário.');
      setAviso({ tipo: 'erro', msg: 'Corrija os campos destacados no formulário.' });
      return;
    }

    setSalvando(true);

    try {
      // 2. Mapeamento Estrito de Colunas (Supabase)
      let limiteNumerico = null;
      if (f.limite_diario !== '' && f.limite_diario !== null && f.limite_diario !== undefined) {
        const limLimpo = String(f.limite_diario).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
        const n = parseFloat(limLimpo);
        if (!isNaN(n) && n >= 0) {
          limiteNumerico = Number(n.toFixed(2));
        }
      }

      const novoAluno = {
        nome_completo: f.nome_completo.trim(),
        data_nascimento: f.data_nascimento,
        turma: f.turma?.trim() || null,
        limite_diario: limiteNumerico,
        nome_responsavel: f.nome_responsavel.trim(),
        telefone_responsavel: soDigitos(f.telefone_responsavel) || f.telefone_responsavel.trim(),
        telefone_secundario: soDigitos(f.telefone_secundario) || null,
        documento_responsavel: f.documento_responsavel?.trim() || null,
        observacoes: f.observacoes?.trim() || null,
      };

      if (!supabaseConfigurado || !supabase) {
        // Modo demonstração quando as variáveis de ambiente não foram inseridas no .env
        await new Promise((r) => setTimeout(r, 400));
        alert('Aluno cadastrado com sucesso! (Aviso: Supabase não configurado no .env, salvo em modo demonstração)');
        setAviso({ tipo: 'ok', msg: `${novoAluno.nome_completo} cadastrado com sucesso! ✓` });
        setF(vazio);
        setTocados({});
        document.getElementById('nome_completo')?.focus();
        return;
      }

      // Inserção no Supabase com mapeamento estrito
      let { data, error } = await supabase
        .from('alunos')
        .insert([novoAluno])
        .select('id, nome_completo');

      // Se falhar devido às colunas turma ou limite_diario (caso o usuário não tenha rodado a migração 002)
      if (error && (error.message?.includes('turma') || error.message?.includes('limite_diario'))) {
        console.warn('Supabase sem colunas turma/limite_diario, tentando inserção legado...', error);
        const { turma, limite_diario, ...legado } = novoAluno;
        const res = await supabase.from('alunos').insert([legado]).select('id, nome_completo');
        data = res.data;
        error = res.error;
      }

      // 3. Tratamento de Erros do Supabase
      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        alert('Erro ao cadastrar: ' + error.message);
        setAviso({ tipo: 'erro', msg: 'Erro: ' + error.message });
        return;
      }

      // 3. Feedback Visível de Sucesso e Limpeza de Estados
      alert('Aluno cadastrado com sucesso!');
      setAviso({ tipo: 'ok', msg: `${novoAluno.nome_completo} cadastrado com sucesso! ✓` });
      setF(vazio);
      setTocados({});
      document.getElementById('nome_completo')?.focus();
    } catch (error) {
      console.error('Erro detalhado do Supabase:', error);
      alert('Erro ao cadastrar: ' + (error?.message || error));
      setAviso({ tipo: 'erro', msg: 'Erro ao cadastrar: ' + (error?.message || error) });
    } finally {
      setSalvando(false);
      setTimeout(() => setAviso(null), 4000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Título da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">Novo Aluno</h1>
          <p className="text-sm text-slate-500">Cadastre os dados pessoais, turma, limite diário e restrições alimentares</p>
        </div>
        <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          Ficha Cadastral
        </span>
      </div>

      <form onSubmit={enviar} noValidate className="space-y-6">
        {/* Dados do Aluno */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6" aria-labelledby="sec-aluno">
          <h2 id="sec-aluno" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <span className="text-xl">🎒</span> Dados do Aluno
          </h2>
          <div className="grid gap-5 md:grid-cols-6">
            <div className="md:col-span-6">
              <Campo id="nome_completo" rotulo="Nome completo" obrigatorio erro={mostrar('nome_completo')}>
                <input {...props('nome_completo')} type="text" autoComplete="off" placeholder="Ex.: Lucas Sales Oliveira" />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo id="data_nascimento" rotulo="Data de nascimento" obrigatorio erro={mostrar('data_nascimento')}>
                <input {...props('data_nascimento')} type="date" max={hojeISO()} min="1900-01-01" />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo id="idade" rotulo="Idade" dica="Calculada automaticamente">
                <div className="relative">
                  <input
                    id="idade"
                    value={idade !== null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : ''}
                    readOnly
                    tabIndex={-1}
                    placeholder="—"
                    aria-live="polite"
                    className="w-full cursor-not-allowed rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-brand-blue outline-none"
                  />
                  {idade !== null && (
                    <span
                      key={idade}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-[pop_.4s_ease] rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue"
                    >
                      auto
                    </span>
                  )}
                </div>
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo id="turma" rotulo="Turma" dica="Ex.: 5º Ano A, 9º Ano B, 1ª Série EM">
                <input {...props('turma')} type="text" autoComplete="off" placeholder="Ex.: 6º Ano A" />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo id="limite_diario" rotulo="Limite Diário (R$)" erro={mostrar('limite_diario')} dica="Opcional (em branco para ilimitado)">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                  <input
                    {...props('limite_diario')}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className={`${estiloInput(mostrar('limite_diario'))} pl-11`}
                  />
                </div>
              </Campo>
            </div>
          </div>
        </section>

        {/* Dados do Responsável */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6" aria-labelledby="sec-resp">
          <h2 id="sec-resp" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <span className="text-xl">👨‍👩‍👧</span> Dados do Responsável
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Campo id="nome_responsavel" rotulo="Nome do responsável" obrigatorio erro={mostrar('nome_responsavel')}>
                <input {...props('nome_responsavel')} type="text" autoComplete="off" placeholder="Ex.: Vanessa das Sales" />
              </Campo>
            </div>
            <Campo
              id="telefone_responsavel"
              rotulo="Telefone / WhatsApp Principal"
              obrigatorio
              erro={mostrar('telefone_responsavel')}
              dica="Utilizado para cobranças no WhatsApp"
            >
              <input {...props('telefone_responsavel', mascaraTelefone)} type="tel" inputMode="tel" placeholder="(27) 99999-9999" />
            </Campo>
            <Campo id="telefone_secundario" rotulo="Telefone Secundário" erro={mostrar('telefone_secundario')} dica="Opcional">
              <input {...props('telefone_secundario', mascaraTelefone)} type="tel" inputMode="tel" placeholder="(27) 3333-3333" />
            </Campo>
            <div className="md:col-span-2">
              <Campo id="documento_responsavel" rotulo="Documento do Responsável (CPF ou RG)" erro={mostrar('documento_responsavel')} dica="Opcional">
                <input {...props('documento_responsavel', mascaraDocumento)} type="text" autoComplete="off" placeholder="000.000.000-00" />
              </Campo>
            </div>
          </div>
        </section>

        {/* Observações */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6" aria-labelledby="sec-obs">
          <h2 id="sec-obs" className="mb-5 flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <span className="text-xl">📝</span> Observações e Restrições Alimentares
          </h2>
          <Campo id="observacoes" rotulo="Observações livres" dica="Avisos sobre alergias, restrições e limites aparecem com destaque no Caixa (PDV)">
            <textarea
              {...props('observacoes')}
              rows={3}
              maxLength={500}
              placeholder="Ex.: Alérgico a amendoim. Não liberar refrigerante."
              className={`${estiloInput(false)} resize-y`}
            />
            <p className="mt-1 text-right text-xs text-slate-400">{f.observacoes.length}/500</p>
          </Campo>
        </section>

        {/* Botões */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setF(vazio);
              setTocados({});
            }}
            disabled={salvando}
            className="rounded-2xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Limpar Campos
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="bg-[#1F479A] text-white font-semibold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(31,71,154,0.39)] hover:bg-[#163675] hover:shadow-[0_6px_20px_rgba(31,71,154,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {salvando ? 'Salvando...' : 'Cadastrar Aluno'}
          </button>
        </div>
      </form>

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
