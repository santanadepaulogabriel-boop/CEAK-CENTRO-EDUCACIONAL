import { useEffect, useMemo, useState } from 'react';
import {
  listarDevedores,
  obterConsumoAluno,
  registrarPagamento,
  gerarLinkWhatsAppExtrato,
  agruparConsumoPorData,
  atualizarAluno,
} from '../admin/api.js';
import { calcularIdade, mascaraDocumento, mascaraTelefone } from '../cadastro/api.js';
import { useCantina } from '../context/CantinaContext.jsx';

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
  const { notificarPagamentoRealizado, recarregarTudo } = useCantina();
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [alunoAtivo, setAlunoAtivo] = useState(null);
  const [consumoItens, setConsumoItens] = useState([]);
  const [carregandoConsumo, setCarregandoConsumo] = useState(false);

  // Estados do Modal de Pagamento
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
      recarregarTudo();
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

  // Executar Pagamento com Sincronização Bidirecional Instantânea
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

      // Sincroniza bidirecionalmente no Context Global (Dashboard e PDV são atualizados na hora)
      notificarPagamentoRealizado(alunoAtivo.id, valorPagoNum, resultado.quitado);

      if (resultado.quitado) {
        mostrarToast(`Conta de ${alunoAtivo.nome_completo} totalmente quitada e zerada! 🎉`);
        setModalConfirmar(false);
        fecharDetalhes();
      } else {
        mostrarToast(`Pagamento de ${brl(valorPagoNum)} registrado! Novo saldo: ${brl(resultado.novoSaldo)} ✓`);
        setModalConfirmar(false);
        setAlunoAtivo((cur) => (cur ? { ...cur, saldo_devedor_atual: resultado.novoSaldo } : null));
        const novosItens = await obterConsumoAluno(alunoAtivo.id);
        setConsumoItens(novosItens);
      }

      await carregarAlunos();
    } catch (err) {
      console.error(err);
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
        (a.turma && a.turma.toLowerCase().includes(t))
    );
  }, [alunos, busca]);

  const totalGeral = useMemo(
    () => alunos.reduce((acc, a) => acc + Number(a.saldo_devedor_atual || 0), 0),
    [alunos]
  );

  const gruposPorData = useMemo(() => agruparConsumoPorData(consumoItens), [consumoItens]);

  // Cálculos dinâmicos do formulário no modal
  const totalDevidoAtual = Number(alunoAtivo?.saldo_devedor_atual || 0);
  const valorPagoNum = parseFloat(String(valorPagoInput).replace(/\./g, '').replace(',', '.')) || 0;
  const ehQuitacaoTotal = Math.abs(valorPagoNum - totalDevidoAtual) < 0.001 || valorPagoNum >= totalDevidoAtual;
  const ehPagamentoParcial = valorPagoNum > 0 && valorPagoNum < totalDevidoAtual;
  const saldoRestante = Math.max(0, totalDevidoAtual - valorPagoNum);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* 1. CABEÇALHO LIMPO E RESPONSIVO */}
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
            Gestão de Contas & Fechamento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Acompanhamento de saldos em aberto, emissão de extratos e quitação com baixa em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={carregarAlunos}
            disabled={carregando}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Atualizar lista"
          >
            <span className={carregando ? 'animate-spin' : ''}>🔄</span>
            <span>{carregando ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE MÉTRICAS (Coluna única no celular -> 3 no desktop) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#1F479A] via-[#2653B0] to-[#3B82F6] p-5 sm:p-6 text-white shadow-lg shadow-blue-900/20">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Total a Receber</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-white tracking-tight">{brl(totalGeral)}</p>
          <p className="mt-1.5 text-xs text-blue-100/90 font-medium">Soma de todas as contas em aberto</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Alunos com Débito</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-[#D9232E] tracking-tight">{alunos.length}</p>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">Aguardando quitação ou fechamento</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Média por Conta</p>
          <p className="mt-1 text-2xl sm:text-3xl font-black text-[#1F479A] tracking-tight">
            {brl(alunos.length ? totalGeral / alunos.length : 0)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">Ticket médio devedor</p>
        </div>
      </section>

      {/* 3. LISTAGEM DE ALUNOS COM OVERFLOW-X-AUTO E VISUAL MOBILE-FIRST */}
      <section className="overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800">Alunos com Saldo Devedor</h2>
            <p className="text-xs text-slate-500 font-medium">Toque para abrir o extrato detalhado ou registrar pagamentos</p>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno, turma ou responsável..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 pl-10 text-xs sm:text-sm font-medium outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
            />
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">🔍</span>
          </div>
        </div>

        {/* Container com Rolagem Horizontal Segura no Telemóvel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[620px]">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-bold">Aluno</th>
                <th className="px-5 py-3.5 font-bold">Responsável / Contato</th>
                <th className="px-5 py-3.5 font-bold text-right">Saldo Devedor</th>
                <th className="px-5 py-3.5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs font-semibold">
                    Carregando contas escolares...
                  </td>
                </tr>
              )}
              {!carregando && alunosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <span className="text-4xl block mb-2">🎉</span>
                    <p className="font-bold text-slate-700 text-sm">Nenhum débito em aberto!</p>
                    <p className="text-xs text-slate-400 mt-0.5">Todas as contas estão quitadas ou nenhum aluno corresponde à busca.</p>
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
                      estaAtivo ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-800 text-sm">{a.nome_completo}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {a.turma && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#1F479A] border border-blue-100">
                            {a.turma}
                          </span>
                        )}
                        {a.idade != null && <span className="text-xs font-medium text-slate-400">{a.idade} anos</span>}
                        {a.observacoes && (
                          <span className="inline-block rounded-md bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 text-[11px] font-bold">
                            ⚠️ {a.observacoes}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600 text-xs">
                      <span className="font-bold block text-slate-800">{a.nome_responsavel}</span>
                      <span className="text-slate-400">{a.telefone_responsavel}</span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex rounded-xl bg-red-50 px-3 py-1 text-sm font-black text-[#D9232E] border border-red-100">
                        {brl(a.saldo_devedor_atual)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalEdicao(a);
                          }}
                          className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-[#1F479A] transition active:scale-95"
                          title="Editar cadastro do aluno"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalhes(a);
                          }}
                          className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
                        >
                          Extrato
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
                            className="rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 transition active:scale-95 shadow-sm shadow-emerald-600/20"
                            title="Cobrar via WhatsApp"
                          >
                            WhatsApp
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

      {/* 4. SLIDE-OVER DRAWER DE EXTRATO DO ALUNO (RESPONSIVO MOBILE-FIRST) */}
      {alunoAtivo && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={fecharDetalhes}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
            <aside className="w-screen max-w-lg bg-white shadow-2xl transition ease-in-out duration-300 flex flex-col">
              
              {/* Topo do Extrato */}
              <div className="bg-gradient-to-r from-[#142f61] via-[#1a365d] to-[#1F479A] p-5 sm:p-6 text-white shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#D9232E] px-2.5 py-0.5 text-[11px] font-black uppercase text-white shadow-sm">
                        Extrato do Aluno
                      </span>
                      {alunoAtivo.turma && (
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          🎒 {alunoAtivo.turma}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-xl sm:text-2xl font-black tracking-tight leading-tight">{alunoAtivo.nome_completo}</h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5">
                      Responsável: {alunoAtivo.nome_responsavel} {alunoAtivo.telefone_responsavel && `• ${alunoAtivo.telefone_responsavel}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={enviarWhatsApp}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Enviar Extrato via WhatsApp"
                    >
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={fecharDetalhes}
                      className="rounded-xl p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                      aria-label="Fechar Extrato"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">Saldo Devedor Atual</span>
                    <p className="text-2xl sm:text-3xl font-black text-white">{brl(alunoAtivo.saldo_devedor_atual)}</p>
                  </div>
                  <span className="h-3 w-3 rounded-full bg-[#D9232E] animate-ping" />
                </div>
              </div>

              {/* Corpo com Histórico Agrupado por Data */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Histórico de Consumos e Abatimentos
                  </h4>
                  <span className="text-xs font-semibold text-slate-400">
                    {consumoItens.length} lançamentos
                  </span>
                </div>

                {carregandoConsumo && (
                  <p className="py-12 text-center text-xs font-semibold text-slate-400">Carregando extrato...</p>
                )}

                {!carregandoConsumo && gruposPorData.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-3xl">📋</p>
                    <p className="mt-2 text-xs font-bold text-slate-600">Nenhum registro de consumo pendente.</p>
                  </div>
                )}

                {!carregandoConsumo &&
                  gruposPorData.map((grupo) => (
                    <div key={grupo.dataISO} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">📅</span>
                          <span className="font-bold text-slate-800 text-xs">
                            {formatarDataCabecalho(grupo.dataObj)}
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#1F479A]">
                          Subtotal: {brl(grupo.totalDia)}
                        </span>
                      </div>

                      <ul className="mt-2.5 divide-y divide-slate-50">
                        {grupo.itens.map((c) => {
                          const ehPagamento = c.valor < 0 || c.produto_nome.toLowerCase().includes('pagamento');
                          return (
                            <li key={c.id} className="flex items-center justify-between py-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-400 text-[11px]">{formatarHora(c.data_hora)}</span>
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

              {/* Botão de Destaque 'Zerar Conta / Registrar Pagamento' */}
              <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5 space-y-2">
                <button
                  type="button"
                  onClick={abrirModalPagamento}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1F479A] py-3.5 px-4 text-sm font-extrabold text-white shadow-lg shadow-[#1F479A]/20 transition-all hover:bg-[#163675] active:scale-95"
                >
                  <span>💰</span>
                  <span>Registrar Pagamento / Zerar Conta</span>
                  <span className="rounded-lg bg-black/20 px-2 py-0.5 text-xs font-black">
                    {brl(alunoAtivo.saldo_devedor_atual)}
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-400 font-medium">
                  Baixa instantânea no saldo do aluno e sincronização no Dashboard
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* 5. MODAL DE PAGAMENTO (QUITAÇÃO TOTAL OU PAGAMENTO PARCIAL) */}
      {modalConfirmar && alunoAtivo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">Registrar Pagamento</h3>
                <p className="text-xs text-slate-500 font-medium">{alunoAtivo.nome_completo}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmar(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Devido Atual</span>
                <p className="text-xs text-slate-500 font-medium">Saldo registrado</p>
              </div>
              <strong className="text-2xl font-black text-[#D9232E]">
                {brl(alunoAtivo.saldo_devedor_atual)}
              </strong>
            </div>

            <form onSubmit={executarPagamento} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Valor Pago (R$)</label>
                  <button
                    type="button"
                    onClick={() => setValorPagoInput(String(alunoAtivo.saldo_devedor_atual))}
                    className="text-xs font-bold text-[#1F479A] hover:underline"
                  >
                    Quitar Total ({brl(alunoAtivo.saldo_devedor_atual)})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={alunoAtivo.saldo_devedor_atual}
                  value={valorPagoInput}
                  onChange={(e) => setValorPagoInput(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl font-black text-slate-800 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
                />
              </div>

              {ehQuitacaoTotal ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 font-medium">
                  🟢 <strong>Quitação Integral:</strong> O saldo devedor do aluno será zerado imediatamente.
                </div>
              ) : ehPagamentoParcial ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900 font-medium">
                  🔵 <strong>Pagamento Parcial:</strong> Restará um saldo de <strong>{brl(saldoRestante)}</strong>.
                </div>
              ) : null}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmar(false)}
                  disabled={salvandoPagamento}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPagamento || valorPagoNum <= 0 || valorPagoNum > Number(alunoAtivo.saldo_devedor_atual)}
                  className="flex-1 rounded-2xl bg-[#1F479A] py-3 text-xs font-black text-white shadow-lg shadow-[#1F479A]/20 transition hover:bg-[#163675] active:scale-95 disabled:opacity-40"
                >
                  {salvandoPagamento ? 'Processando...' : ehQuitacaoTotal ? 'Confirmar e Zerar Conta' : 'Registrar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL DE EDIÇÃO DE ALUNO */}
      {alunoEditando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">Editar Cadastro do Aluno</h3>
                <p className="text-xs text-slate-500 font-medium">Atualize turma, limite diário e contatos dos responsáveis</p>
              </div>
              <button
                type="button"
                onClick={() => setAlunoEditando(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicaoAluno} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={formEdicao.nome_completo}
                    onChange={(e) => setFormEdicao({ ...formEdicao, nome_completo: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                  {errosEdicao.nome_completo && (
                    <p className="mt-1 text-xs text-red-600">{errosEdicao.nome_completo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formEdicao.data_nascimento}
                    onChange={(e) => setFormEdicao({ ...formEdicao, data_nascimento: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Idade Calculada</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-600">
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Limite Diário (R$)</label>
                  <input
                    type="text"
                    value={formEdicao.limite_diario}
                    onChange={(e) => setFormEdicao({ ...formEdicao, limite_diario: e.target.value })}
                    placeholder="Ex.: 25,00 (vazio para sem limite)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Responsável *</label>
                  <input
                    type="text"
                    value={formEdicao.nome_responsavel}
                    onChange={(e) => setFormEdicao({ ...formEdicao, nome_responsavel: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone Secundário</label>
                  <input
                    type="tel"
                    value={formEdicao.telefone_secundario}
                    onChange={(e) => setFormEdicao({ ...formEdicao, telefone_secundario: mascaraTelefone(e.target.value) })}
                    placeholder="(27) 3333-3333"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações e Restrições Alimentares (Aparecem em destaque no PDV)
                </label>
                <textarea
                  rows={2}
                  value={formEdicao.observacoes}
                  onChange={(e) => setFormEdicao({ ...formEdicao, observacoes: e.target.value })}
                  placeholder="Ex.: Alérgico a amendoim. Não liberar refrigerante."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-medium outline-none focus:border-[#1F479A] resize-y"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAlunoEditando(null)}
                  disabled={salvandoEdicao}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="flex-1 rounded-2xl bg-[#1F479A] py-3 text-xs font-black text-white shadow-lg shadow-[#1F479A]/20 transition hover:bg-[#163675] active:scale-95 disabled:opacity-50"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-2xl px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl transition duration-300 ${
            toastMsg.tipo === 'ok' ? 'bg-[#1F479A]' : 'bg-[#D9232E]'
          }`}
        >
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}
