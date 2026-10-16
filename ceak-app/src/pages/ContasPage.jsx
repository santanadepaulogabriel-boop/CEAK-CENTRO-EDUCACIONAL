import { useEffect, useMemo, useState } from 'react';
import {
  listarDevedores,
  obterConsumoAluno,
  registrarPagamento,
  gerarLinkWhatsAppExtrato,
  agruparConsumoPorData,
  atualizarAluno,
  modoDemo,
} from '../admin/api.js';
import { calcularIdade, mascaraDocumento, mascaraTelefone } from '../cadastro/api.js';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarDataCabecalho(d) {
  const opcoes = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const str = d.toLocaleDateString('pt-BR', opcoes);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatarHora(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function ContasPage() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [alunoAtivo, setAlunoAtivo] = useState(null); // Aluno selecionado para detalhamento
  const [consumoItens, setConsumoItens] = useState([]);
  const [carregandoConsumo, setCarregandoConsumo] = useState(false);

  // Estados do Modal de Pagamento (Quitação ou Parcial)
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  // Estados do Modal de Edição de Aluno
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    nome_completo: '',
    data_nascimento: '',
    turma: '',
    limite_diario: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    telefone_secundario: '',
    documento_responsavel: '',
    observacoes: '',
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [errosEdicao, setErrosEdicao] = useState({});

  const [toastMsg, setToastMsg] = useState(null);

  const abrirModalEdicao = (aluno) => {
    setAlunoEditando(aluno);
    setErrosEdicao({});
    setFormEdicao({
      nome_completo: aluno.nome_completo || '',
      data_nascimento: aluno.data_nascimento || '',
      turma: aluno.turma || '',
      limite_diario: aluno.limite_diario != null ? String(aluno.limite_diario).replace('.', ',') : '',
      nome_responsavel: aluno.nome_responsavel || '',
      telefone_responsavel: mascaraTelefone(aluno.telefone_responsavel || ''),
      telefone_secundario: mascaraTelefone(aluno.telefone_secundario || ''),
      documento_responsavel: mascaraDocumento(aluno.documento_responsavel || ''),
      observacoes: aluno.observacoes || '',
    });
  };

  const salvarEdicaoAluno = async (e) => {
    e.preventDefault();
    if (!alunoEditando || salvandoEdicao) return;

    const erros = {};
    if (!formEdicao.nome_completo.trim()) erros.nome_completo = 'Nome completo é obrigatório.';
    if (!formEdicao.nome_responsavel.trim()) erros.nome_responsavel = 'Nome do responsável é obrigatório.';
    if (!formEdicao.telefone_responsavel.trim()) erros.telefone_responsavel = 'Telefone do responsável é obrigatório.';

    if (Object.keys(erros).length > 0) {
      setErrosEdicao(erros);
      return;
    }

    setSalvandoEdicao(true);
    try {
      await atualizarAluno(alunoEditando.id, formEdicao);
      mostrarToast(`Dados de ${formEdicao.nome_completo} atualizados com sucesso! ✓`);
      setAlunoEditando(null);
      await carregarAlunos();
      if (alunoAtivo && alunoAtivo.id === alunoEditando.id) {
        setAlunoAtivo((prev) => ({ ...prev, ...formEdicao }));
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Erro ao atualizar dados do aluno.', 'erro');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const carregarAlunos = async () => {
    try {
      setCarregando(true);
      const lista = await listarDevedores();
      setAlunos(lista);
    } catch (e) {
      console.error(e);
      mostrarToast('Erro ao carregar lista de devedores.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    document.title = 'Gestão de Contas | CEAK Cantina';
    carregarAlunos();
  }, []);

  const mostrarToast = (msg, tipo = 'ok') => {
    setToastMsg({ msg, tipo });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const abrirDetalhes = async (aluno) => {
    setAlunoAtivo(aluno);
    setCarregandoConsumo(true);
    try {
      const itens = await obterConsumoAluno(aluno.id);
      setConsumoItens(itens);
    } catch (e) {
      console.error(e);
      mostrarToast('Erro ao buscar histórico de consumo.', 'erro');
    } finally {
      setCarregandoConsumo(false);
    }
  };

  const fecharDetalhes = () => {
    setAlunoAtivo(null);
    setConsumoItens([]);
    setModalConfirmar(false);
  };

  const abrirModalPagamento = () => {
    if (!alunoAtivo) return;
    setValorPagoInput(String(alunoAtivo.saldo_devedor_atual || 0));
    setModalConfirmar(true);
  };

  // Envio de Extrato via WhatsApp
  const enviarWhatsApp = () => {
    if (!alunoAtivo) return;
    const link = gerarLinkWhatsAppExtrato(alunoAtivo, consumoItens);
    if (!link) {
      mostrarToast('Telefone do responsável não informado ou inválido.', 'erro');
      return;
    }
    window.open(link, '_blank');
  };

  // Executar Pagamento (Quitação ou Parcial)
  const executarPagamento = async (e) => {
    e?.preventDefault();
    if (!alunoAtivo || salvandoPagamento) return;

    const totalDevido = Number(alunoAtivo.saldo_devedor_atual);
    const valorPagoNum = parseFloat(String(valorPagoInput).replace(/\./g, '').replace(',', '.')) || 0;

    if (valorPagoNum <= 0) {
      mostrarToast('Informe um valor de pagamento válido.', 'erro');
      return;
    }

    if (valorPagoNum > totalDevido) {
      mostrarToast(`O valor pago não pode ser maior que o saldo devido (${brl(totalDevido)}).`, 'erro');
      return;
    }

    setSalvandoPagamento(true);
    try {
      const resultado = await registrarPagamento(alunoAtivo.id, valorPagoNum, totalDevido);

      if (resultado.quitado) {
        mostrarToast(`Conta de ${alunoAtivo.nome_completo} totalmente quitada e zerada! 🎉`);
        setModalConfirmar(false);
        fecharDetalhes();
      } else {
        mostrarToast(`Pagamento parcial de ${brl(valorPagoNum)} registrado! Novo saldo: ${brl(resultado.novoSaldo)} ✓`);
        setModalConfirmar(false);
        // Atualiza os dados do aluno ativo e recarrega os itens de consumo
        setAlunoAtivo((cur) => (cur ? { ...cur, saldo_devedor_atual: resultado.novoSaldo } : null));
        const novosItens = await obterConsumoAluno(alunoAtivo.id);
        setConsumoItens(novosItens);
      }

      await carregarAlunos();
    } catch (e) {
      console.error(e);
      mostrarToast('Erro ao processar pagamento. Tente novamente.', 'erro');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  const alunosFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter(
      (a) =>
        a.nome_completo.toLowerCase().includes(t) ||
        (a.nome_responsavel && a.nome_responsavel.toLowerCase().includes(t)) ||
        (a.turma && a.turma.toLowerCase().includes(t)),
    );
  }, [alunos, busca]);

  const totalGeral = useMemo(
    () => alunos.reduce((acc, a) => acc + Number(a.saldo_devedor_atual || 0), 0),
    [alunos],
  );

  const gruposPorData = useMemo(() => agruparConsumoPorData(consumoItens), [consumoItens]);

  // Cálculos dinâmicos do formulário no modal
  const totalDevidoAtual = Number(alunoAtivo?.saldo_devedor_atual || 0);
  const valorPagoNum = parseFloat(String(valorPagoInput).replace(/\./g, '').replace(',', '.')) || 0;
  const ehQuitacaoTotal = Math.abs(valorPagoNum - totalDevidoAtual) < 0.001 || valorPagoNum >= totalDevidoAtual;
  const ehPagamentoParcial = valorPagoNum > 0 && valorPagoNum < totalDevidoAtual;
  const saldoRestante = Math.max(0, totalDevidoAtual - valorPagoNum);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
            Gestão de Contas & Fechamento
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe o saldo devedor dos alunos, envie extratos por WhatsApp e registre pagamentos integrais ou parciais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${modoDemo ? 'bg-brand-red text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {modoDemo ? 'Modo Demo' : 'Supabase Conectado'}
          </span>
          <button
            type="button"
            onClick={carregarAlunos}
            disabled={carregando}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Atualizar lista"
          >
            🔄 {carregando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#1F479A] via-[#2653B0] to-[#3B82F6] shadow-blue-900/20 shadow-lg border-none p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Total a Receber</p>
          <p className="mt-1 text-3xl font-black sm:text-4xl text-white">{brl(totalGeral)}</p>
          <p className="mt-2 text-xs text-blue-100">Soma de todas as contas em aberto</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Alunos com Débito</p>
          <p className="mt-1 text-3xl font-black text-brand-red sm:text-4xl">{alunos.length}</p>
          <p className="mt-2 text-xs text-slate-500">Aguardando quitação ou fechamento</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Média por Conta</p>
          <p className="mt-1 text-3xl font-black text-[#1F479A] sm:text-4xl">
            {brl(alunos.length ? totalGeral / alunos.length : 0)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Ticket médio pendente</p>
        </div>
      </section>

      {/* Tabela de Alunos Devedores */}
      <section className="overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Alunos com Saldo Devedor</h2>
            <p className="text-xs text-slate-500">Toque em qualquer aluno para abrir o extrato detalhado e registrar pagamentos</p>
          </div>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno, turma ou responsável..."
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 pl-10 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
            />
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Responsável / Contato</th>
                <th className="px-6 py-4 text-right">Saldo Devedor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                    Carregando contas...
                  </td>
                </tr>
              )}
              {!carregando && alunosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <span className="text-4xl">🎉</span>
                    <p className="mt-3 font-bold text-slate-700">Nenhum débito encontrado!</p>
                    <p className="text-xs text-slate-400">Todas as contas estão zeradas ou a busca não encontrou registros.</p>
                  </td>
                </tr>
              )}
              {alunosFiltrados.map((a) => {
                const estaAtivo = alunoAtivo?.id === a.id;
                return (
                  <tr
                    key={a.id}
                    onClick={() => abrirDetalhes(a)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                      estaAtivo ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-800">{a.nome_completo}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {a.turma && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-[#1F479A]">
                            {a.turma}
                          </span>
                        )}
                        {a.idade != null && <span className="text-xs font-semibold text-slate-400">{a.idade} anos</span>}
                        {a.observacoes && (
                          <span className="inline-block rounded-lg bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-xs font-bold">
                            ⚠ {a.observacoes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="font-medium">{a.nome_responsavel}</span>
                      <span className="block text-xs text-slate-400">{a.telefone_responsavel}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex rounded-xl bg-red-50 px-3 py-1 text-base font-black text-brand-red shadow-sm">
                        {brl(a.saldo_devedor_atual)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalEdicao(a);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#1F479A] transition-colors shadow-sm"
                          title="Editar dados do aluno"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalhes(a);
                          }}
                          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#1F479A] shadow-sm transition-all font-medium rounded-lg px-4 py-2"
                        >
                          Ver Extrato
                        </button>
                        {a.telefone_responsavel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = gerarLinkWhatsAppExtrato(a, []);
                              if (link) window.open(link, '_blank');
                              else abrirDetalhes(a);
                            }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30 shadow-md transition-all rounded-lg px-4 py-2 flex items-center gap-2 font-medium"
                            title="Cobrar via WhatsApp"
                          >
                            <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slide-Over Drawer de Detalhamento de Consumo (Extrato do Aluno) */}
      {alunoAtivo && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div
            className="fixed inset-0 bg-ceak-blue-dark/60 backdrop-blur-sm transition-opacity"
            onClick={fecharDetalhes}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <aside className="w-screen max-w-lg bg-white shadow-2xl transition ease-in-out duration-300 flex flex-col">
              {/* Topo do Slide-Over com Botão WhatsApp 'Enviar Extrato' */}
              <div className="bg-gradient-to-r from-[#1a365d] to-[#1F479A] p-6 text-white shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-brand-red text-white">Extrato do Aluno</span>
                      {alunoAtivo.turma && (
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                          🎒 {alunoAtivo.turma}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-2xl font-black tracking-tight">{alunoAtivo.nome_completo}</h3>
                    <p className="text-xs text-white/70">
                      Responsável: {alunoAtivo.nome_responsavel} {alunoAtivo.telefone_responsavel && `· ${alunoAtivo.telefone_responsavel}`}
                    </p>
                  </div>

                  {/* Ações no Topo: WhatsApp e Fechar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={enviarWhatsApp}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30 shadow-md px-3.5 py-2 text-xs font-bold transition-all"
                      title="Enviar Extrato via WhatsApp"
                    >
                      <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Enviar Extrato</span>
                    </button>
                    <button
                      type="button"
                      onClick={fecharDetalhes}
                      className="rounded-full p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                      aria-label="Fechar"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                  <div>
                    <span className="text-xs font-medium text-white/70">Saldo Devedor Atual</span>
                    <p className="text-3xl font-black text-white">{brl(alunoAtivo.saldo_devedor_atual)}</p>
                  </div>
                  <span className="h-3 w-3 animate-ping rounded-full bg-brand-red" />
                </div>
              </div>

              {/* Corpo com Histórico Agrupado por Data */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Consumo Agrupado por Dia
                  </h4>
                  <span className="text-xs font-semibold text-slate-400">
                    {consumoItens.length} {consumoItens.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>

                {carregandoConsumo && (
                  <p className="py-12 text-center text-sm text-slate-400">Carregando histórico de consumo...</p>
                )}

                {!carregandoConsumo && gruposPorData.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-3xl">📋</p>
                    <p className="mt-2 text-sm font-medium">Nenhum registro de consumo em aberto.</p>
                  </div>
                )}

                {!carregandoConsumo &&
                  gruposPorData.map((grupo) => (
                    <div key={grupo.dataISO} className="rounded-2xl border-2 border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-xs">
                            📅
                          </span>
                          <span className="font-bold text-slate-700 text-sm">
                            {formatarDataCabecalho(grupo.dataObj)}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-brand-blue">
                          Subtotal: {brl(grupo.totalDia)}
                        </span>
                      </div>

                      <ul className="mt-3 divide-y divide-slate-50">
                        {grupo.itens.map((c) => {
                          const ehPagamento = c.valor < 0 || c.produto_nome.toLowerCase().includes('pagamento');
                          return (
                            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-mono text-slate-400">{formatarHora(c.data_hora)}</span>
                                <span className={`font-semibold ${ehPagamento ? 'text-emerald-700 font-bold' : 'text-slate-800'}`}>
                                  {ehPagamento && '✓ '}
                                  {c.produto_nome}
                                </span>
                              </div>
                              <span className={`font-bold ${ehPagamento ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {c.valor < 0 ? `-${brl(Math.abs(c.valor))}` : brl(c.valor)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>

              {/* Botão de Destaque 'Zerar Conta / Registrar Pagamento' - Ação primária oficial bg-brand-red com hover:brightness-110 */}
              <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-3">
                <button
                  type="button"
                  onClick={abrirModalPagamento}
                  className="w-full flex items-center justify-center gap-2 bg-[#1F479A] text-white font-semibold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(31,71,154,0.39)] hover:bg-[#163675] hover:shadow-[0_6px_20px_rgba(31,71,154,0.23)] hover:-translate-y-0.5 transition-all duration-200 text-base"
                >
                  <span>💰</span>
                  <span>Registrar Pagamento / Zerar Conta</span>
                  <span className="text-xs bg-black/20 px-2 py-0.5 rounded-lg font-bold">
                    {brl(alunoAtivo.saldo_devedor_atual)}
                  </span>
                </button>
                <p className="text-center text-xs text-slate-400">
                  Permite quitação total ou pagamento parcial com abatimento de saldo.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* MODAL DE PAGAMENTO (QUITAÇÃO TOTAL OU PAGAMENTO PARCIAL) */}
      {/* Z-Index altíssimo (z-[100]) para ficar totalmente em primeiro plano e sem bloqueios */}
      {modalConfirmar && alunoAtivo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-[pop_.25s_ease]">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-2xl text-brand-red shadow-sm">
                  💰
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Registrar Pagamento</h3>
                  <p className="text-xs text-slate-500">{alunoAtivo.nome_completo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmar(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Exibição do Valor Total Devido */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor Total Devido</span>
                <p className="text-xs text-slate-500 mt-0.5">Saldo em aberto do aluno</p>
              </div>
              <strong className="text-2xl sm:text-3xl font-black text-brand-red">
                {brl(alunoAtivo.saldo_devedor_atual)}
              </strong>
            </div>

            {/* Formulário: Campo Valor Pago */}
            <form onSubmit={executarPagamento} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="valor-pago-input" className="text-sm font-extrabold text-slate-700">
                    Valor Pago (R$)
                  </label>
                  <button
                    type="button"
                    onClick={() => setValorPagoInput(String(alunoAtivo.saldo_devedor_atual))}
                    className="text-xs font-bold text-brand-blue hover:underline"
                  >
                    Preencher Total ({brl(alunoAtivo.saldo_devedor_atual)})
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    id="valor-pago-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={alunoAtivo.saldo_devedor_atual}
                    value={valorPagoInput}
                    onChange={(e) => setValorPagoInput(e.target.value)}
                    placeholder="0,00"
                    required
                    autoFocus
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 pl-12 text-xl font-black text-slate-800 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  />
                </div>
              </div>

              {/* Feedback visual dinâmico (Quitação Total vs Pagamento Parcial) */}
              {ehQuitacaoTotal ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-emerald-800">
                    <span className="text-base">🟢</span>
                    <span>QUITAÇÃO INTEGRAL DA CONTA</span>
                  </div>
                  <p>
                    O valor digitado quita a dívida por completo. O saldo devedor será zerado e o histórico deste mês será arquivado/limpo para o próximo ciclo.
                  </p>
                </div>
              ) : ehPagamentoParcial ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 space-y-1.5">
                  <div className="flex items-center justify-between font-black text-blue-800">
                    <span className="flex items-center gap-2">
                      <span className="text-base">🔵</span>
                      <span>PAGAMENTO PARCIAL</span>
                    </span>
                    <span className="text-sm font-extrabold text-brand-blue">
                      Restará: {brl(saldoRestante)}
                    </span>
                  </div>
                  <p>
                    O histórico NÃO será apagado. O sistema subtrairá <strong>{brl(valorPagoNum)}</strong> do saldo e inserirá uma linha <strong>'Pagamento Recebido'</strong> com valor negativo para manter o extrato balanceado.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                  ⚠ O valor pago deve ser maior que zero e menor ou igual a {brl(alunoAtivo.saldo_devedor_atual)}.
                </div>
              )}

              {/* Botões do Modal */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmar(false)}
                  disabled={salvandoPagamento}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPagamento || valorPagoNum <= 0 || valorPagoNum > Number(alunoAtivo.saldo_devedor_atual)}
                  className="flex-1 bg-[#1F479A] text-white font-semibold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(31,71,154,0.39)] hover:bg-[#163675] hover:shadow-[0_6px_20px_rgba(31,71,154,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm"
                >
                  {salvandoPagamento
                    ? 'Processando...'
                    : ehQuitacaoTotal
                    ? 'Confirmar e Zerar Conta'
                    : 'Registrar Pagamento Parcial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE ALUNO */}
      {alunoEditando && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-[pop_.25s_ease] max-h-[90vh] flex flex-col">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-[#1F479A] shadow-sm">
                  ✏️
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Editar Dados do Aluno</h3>
                  <p className="text-xs text-slate-500">Atualize dados cadastrais, turma, limites e restrições</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlunoEditando(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Formulário de Edição */}
            <form onSubmit={salvarEdicaoAluno} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Seção 1: Aluno */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Dados do Aluno</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={formEdicao.nome_completo}
                      onChange={(e) => setFormEdicao({ ...formEdicao, nome_completo: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                    {errosEdicao.nome_completo && (
                      <p className="mt-1 text-xs text-brand-red">{errosEdicao.nome_completo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formEdicao.data_nascimento}
                      onChange={(e) => setFormEdicao({ ...formEdicao, data_nascimento: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Idade Calculada</label>
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-600">
                      {calcularIdade(formEdicao.data_nascimento) != null
                        ? `${calcularIdade(formEdicao.data_nascimento)} anos`
                        : '—'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Turma / Série</label>
                    <input
                      type="text"
                      value={formEdicao.turma}
                      onChange={(e) => setFormEdicao({ ...formEdicao, turma: e.target.value })}
                      placeholder="Ex.: 6º Ano A"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Limite Diário (R$)</label>
                    <input
                      type="text"
                      value={formEdicao.limite_diario}
                      onChange={(e) => setFormEdicao({ ...formEdicao, limite_diario: e.target.value })}
                      placeholder="Ex.: 25,00 (vazio para ilimitado)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Responsável */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Responsável</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Responsável *</label>
                    <input
                      type="text"
                      value={formEdicao.nome_responsavel}
                      onChange={(e) => setFormEdicao({ ...formEdicao, nome_responsavel: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="tel"
                      value={formEdicao.telefone_responsavel}
                      onChange={(e) => setFormEdicao({ ...formEdicao, telefone_responsavel: mascaraTelefone(e.target.value) })}
                      required
                      placeholder="(27) 99999-9999"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Telefone Secundário</label>
                    <input
                      type="tel"
                      value={formEdicao.telefone_secundario}
                      onChange={(e) => setFormEdicao({ ...formEdicao, telefone_secundario: mascaraTelefone(e.target.value) })}
                      placeholder="(27) 3333-3333"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Documento do Responsável (CPF/RG)</label>
                    <input
                      type="text"
                      value={formEdicao.documento_responsavel}
                      onChange={(e) => setFormEdicao({ ...formEdicao, documento_responsavel: mascaraDocumento(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Observações / Alergias */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Observações e Restrições Alimentares (Aparecem em destaque no PDV)
                </label>
                <textarea
                  rows={2}
                  value={formEdicao.observacoes}
                  onChange={(e) => setFormEdicao({ ...formEdicao, observacoes: e.target.value })}
                  placeholder="Ex.: Alérgico a amendoim. Não liberar refrigerante."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-2 focus:ring-[#1F479A]/10 resize-y"
                />
              </div>

              {/* Rodapé do Modal */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAlunoEditando(null)}
                  disabled={salvandoEdicao}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="flex-1 bg-[#1F479A] text-white font-semibold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(31,71,154,0.39)] hover:bg-[#163675] hover:shadow-[0_6px_20px_rgba(31,71,154,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-sm"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-2xl px-6 py-3 font-semibold text-white shadow-2xl transition duration-300 ${
            toastMsg.tipo === 'ok' ? 'bg-brand-blue' : 'bg-brand-red'
          }`}
        >
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}
