import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIAS,
  buscarProdutos,
  buscarAlunos,
  lancarConsumo,
  lancarVendaPaga,
  assinarSaldo,
} from '../pdv/api.js';
import { useCantina } from '../context/CantinaContext.jsx';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ==========================================================================
   ILUSTRAÇÕES DIDÁTICAS VETORIAIS (FLAT / CARTOON) PARA CANTINA ESCOLAR
   Substituem completamente qualquer foto real de alimento por arte lúdica
   ========================================================================== */

function IlustracaoAlimento({ tipo, emoji }) {
  switch (tipo) {
    case 'burger':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Pão Superior */}
          <path d="M20 50 C20 20, 100 20, 100 50 Z" fill="#F59E0B" />
          <ellipse cx="40" cy="33" rx="2" ry="3" fill="#FEF3C7" transform="rotate(-15 40 33)" />
          <ellipse cx="60" cy="27" rx="2" ry="3" fill="#FEF3C7" />
          <ellipse cx="80" cy="33" rx="2" ry="3" fill="#FEF3C7" transform="rotate(15 80 33)" />
          {/* Alface Ondulada */}
          <path d="M15 52 Q25 46 35 52 Q45 58 55 52 Q65 46 75 52 Q85 58 95 52 Q105 46 105 52 L105 56 L15 56 Z" fill="#10B981" />
          {/* Tomate */}
          <rect x="22" y="55" width="76" height="7" rx="3" fill="#EF4444" />
          {/* Queijo Cheddar Derretendo */}
          <path d="M18 61 L102 61 L85 71 L60 63 L40 73 L25 63 Z" fill="#FBBF24" />
          {/* Carne / Hambúrguer Artesanal */}
          <rect x="18" y="66" width="84" height="12" rx="6" fill="#78350F" />
          {/* Pão Inferior */}
          <rect x="20" y="78" width="80" height="12" rx="6" fill="#D97706" />
        </svg>
      );

    case 'pizza':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Borda da Massa */}
          <path d="M15 25 Q60 10 105 25 L60 92 Z" fill="#D97706" />
          {/* Queijo e Molho */}
          <path d="M22 28 Q60 18 98 28 L60 85 Z" fill="#FBBF24" />
          {/* Rodelas de Pepperoni / Tomate Cartoon */}
          <circle cx="48" cy="38" r="7" fill="#DC2626" />
          <circle cx="72" cy="42" r="7" fill="#DC2626" />
          <circle cx="60" cy="62" r="6" fill="#DC2626" />
          {/* Manjericão Verde Didático */}
          <ellipse cx="38" cy="50" rx="4" ry="2" fill="#10B981" transform="rotate(30 38 50)" />
          <ellipse cx="78" cy="58" rx="4" ry="2" fill="#10B981" transform="rotate(-20 78 58)" />
          <ellipse cx="58" cy="32" rx="3" ry="2" fill="#10B981" />
        </svg>
      );

    case 'lasanha':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Travessa / Prato */}
          <rect x="15" y="72" width="90" height="14" rx="7" fill="#E2E8F0" />
          {/* Camada 1: Molho */}
          <rect x="22" y="60" width="76" height="14" rx="4" fill="#B91C1C" />
          {/* Camada 2: Massa Ondulada */}
          <rect x="20" y="52" width="80" height="9" rx="3" fill="#FDE047" />
          {/* Camada 3: Recheio */}
          <rect x="22" y="42" width="76" height="11" rx="3" fill="#991B1B" />
          {/* Camada Superior: Queijo Gratinado com Ondas */}
          <path d="M18 42 Q30 38 45 42 Q60 46 75 41 Q90 38 102 42 L102 48 L18 48 Z" fill="#F59E0B" />
          {/* Folhinhas de Tempero */}
          <circle cx="50" cy="37" r="2" fill="#15803D" />
          <circle cx="70" cy="38" r="2" fill="#15803D" />
          {/* Vaporzinho Didático */}
          <path d="M45 28 Q40 20 48 14" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M60 26 Q65 18 58 12" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M75 28 Q70 20 78 14" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'bolo':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Prato */}
          <ellipse cx="60" cy="85" rx="45" ry="8" fill="#E2E8F0" />
          {/* Fatia de Massa de Cenoura */}
          <path d="M25 72 L95 72 L70 30 Z" fill="#F97316" />
          {/* Recheio de Chocolate Central */}
          <line x1="40" y1="58" x2="82" y2="58" stroke="#451A03" strokeWidth="4" />
          {/* Cobertura de Chocolate com Gotas */}
          <path d="M25 72 L32 66 L42 70 L52 64 L65 71 L75 65 L95 72 L70 30 Z" fill="#3B1E08" />
          {/* Cereja no Topo */}
          <circle cx="70" cy="27" r="6" fill="#DC2626" />
          <path d="M72 23 Q78 14 85 18" stroke="#15803D" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'coxinha':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Prato */}
          <ellipse cx="60" cy="86" rx="40" ry="7" fill="#E2E8F0" />
          {/* Formato de Gota / Coxinha Assada Douradinha */}
          <path d="M60 16 C48 35, 24 55, 26 74 C28 86, 92 86, 94 74 C96 55, 72 35, 60 16 Z" fill="#D97706" />
          {/* Brilho da Casca Crocante */}
          <path d="M55 25 C47 40, 36 55, 36 68" stroke="#FDE68A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
          {/* Pontinhos Crocantes */}
          <circle cx="68" cy="62" r="1.5" fill="#78350F" />
          <circle cx="58" cy="74" r="1.5" fill="#78350F" />
          <circle cx="48" cy="60" r="1.5" fill="#78350F" />
        </svg>
      );

    case 'misto':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Prato */}
          <ellipse cx="60" cy="85" rx="42" ry="7" fill="#E2E8F0" />
          {/* Pão de baixo tostado */}
          <polygon points="25,72 85,72 55,36" fill="#D97706" />
          {/* Queijo esticado */}
          <polygon points="28,68 88,68 58,32" fill="#FBBF24" />
          {/* Presunto */}
          <polygon points="30,64 90,64 60,28" fill="#F43F5E" />
          {/* Pão superior com marcas de tostex */}
          <polygon points="32,60 92,60 62,24" fill="#F59E0B" />
          <line x1="45" y1="48" x2="65" y2="38" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="55" x2="72" y2="45" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'suco':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Canudo Divertido Listrado */}
          <path d="M68 12 L78 28 L62 82" stroke="#EF4444" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M68 12 L78 28 L62 82" stroke="#FFFFFF" strokeWidth="5" strokeDasharray="4 6" fill="none" strokeLinecap="round" />
          {/* Copo de Suco com Gradiente Laranja */}
          <path d="M35 32 L42 85 Q60 88 78 85 L85 32 Z" fill="#F97316" />
          {/* Nível do Líquido */}
          <ellipse cx="60" cy="32" rx="25" ry="4" fill="#FB923C" />
          {/* Cubos de Gelo Cartoon */}
          <rect x="48" y="42" width="10" height="10" rx="2" fill="#BAE6FD" opacity="0.8" transform="rotate(15 53 47)" />
          <rect x="62" y="52" width="10" height="10" rx="2" fill="#BAE6FD" opacity="0.8" transform="rotate(-10 67 57)" />
          {/* Rodela de Laranja na Borda */}
          <circle cx="85" cy="32" r="12" fill="#EA580C" />
          <circle cx="85" cy="32" r="9" fill="#FDBA74" />
          <circle cx="85" cy="32" r="2" fill="#FFFFFF" />
        </svg>
      );

    case 'refri':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Lata de Refrigerante Colorida */}
          <rect x="42" y="24" width="36" height="58" rx="6" fill="#3B82F6" />
          {/* Topo Metálico */}
          <ellipse cx="60" cy="24" rx="18" ry="4" fill="#94A3B8" />
          <ellipse cx="60" cy="23" rx="14" ry="2.5" fill="#CBD5E1" />
          {/* Base */}
          <ellipse cx="60" cy="82" rx="18" ry="4" fill="#2563EB" />
          {/* Faixa Gráfica da Lata */}
          <path d="M42 42 Q60 52 78 42 L78 56 Q60 66 42 56 Z" fill="#1D4ED8" />
          {/* Gotinhas de Condensação Gelada */}
          <circle cx="50" cy="34" r="1.5" fill="#E0F2FE" />
          <circle cx="70" cy="64" r="1.5" fill="#E0F2FE" />
          <circle cx="48" cy="70" r="1.5" fill="#E0F2FE" />
        </svg>
      );

    case 'coca':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Garrafinha Caçulinha / Juninho */}
          <rect x="52" y="16" width="16" height="8" rx="2" fill="#DC2626" />
          <path d="M54 24 L52 38 C42 48, 42 68, 45 82 C46 86, 74 86, 75 82 C78 68, 78 48, 68 38 L66 24 Z" fill="#991B1B" />
          {/* Rótulo Vermelho com Faixa Branca */}
          <rect x="43" y="52" width="34" height="16" rx="2" fill="#DC2626" />
          <path d="M46 60 Q60 64 74 58" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );

    case 'agua':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Tampa Azul */}
          <rect x="53" y="16" width="14" height="6" rx="1.5" fill="#0284C7" />
          {/* Garrafa Pet Cristalina */}
          <path d="M55 22 L53 34 C44 42, 43 66, 45 82 Q60 86 75 82 C77 66, 76 42, 67 34 L65 22 Z" fill="#E0F2FE" />
          {/* Rótulo Azul Claro */}
          <rect x="44" y="48" width="32" height="18" rx="2" fill="#38BDF8" />
          {/* Gota D'água Expressiva no Rótulo */}
          <path d="M60 52 C56 57, 54 60, 56 63 C58 66, 62 66, 64 63 C66 60, 64 57, 60 52 Z" fill="#FFFFFF" />
        </svg>
      );

    case 'brownie':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Prato */}
          <ellipse cx="60" cy="85" rx="42" ry="7" fill="#E2E8F0" />
          {/* Bloco de Brownie Alto e Macio */}
          <polygon points="30,68 85,68 95,44 40,44" fill="#381D0D" />
          <polygon points="40,44 95,44 82,32 30,32" fill="#542B14" />
          <polygon points="30,68 40,44 30,32 20,54" fill="#291508" />
          {/* Pedacinhos de Nozes Douradas */}
          <circle cx="50" cy="40" r="3" fill="#D97706" />
          <circle cx="72" cy="42" r="3.5" fill="#D97706" />
          <circle cx="62" cy="56" r="2.5" fill="#D97706" />
        </svg>
      );

    case 'paodequeijo':
      return (
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-28 object-contain drop-shadow-md">
          {/* Pratinho */}
          <ellipse cx="60" cy="85" rx="42" ry="7" fill="#E2E8F0" />
          {/* Pão de Queijo Redondinho e Quentinho */}
          <circle cx="60" cy="54" r="28" fill="#F59E0B" />
          {/* Manchinhas Crocantes Típicas */}
          <circle cx="50" cy="42" r="4" fill="#B45309" />
          <circle cx="72" cy="46" r="3.5" fill="#B45309" />
          <circle cx="58" cy="64" r="5" fill="#B45309" />
          <circle cx="44" cy="58" r="3" fill="#B45309" />
          <circle cx="70" cy="62" r="3.5" fill="#B45309" />
          {/* Vaporzinho */}
          <path d="M54 22 Q50 14 56 10" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M66 22 Q70 14 64 10" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );

    default:
      // Ilustração Didática Genérica com Emoji Lúdico
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-md text-4xl transform hover:scale-110 transition-transform">
            {emoji || '🥪'}
          </div>
        </div>
      );
  }
}

export default function PdvPage() {
  const { notificarNovaVenda } = useCantina();

  // Catálogo de Produtos
  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');

  // Carrinho de Compras
  const [carrinho, setCarrinho] = useState([]); // [{ id, nome, preco, emoji, ilustracao, corFundo, qtd }]
  const [carrinhoAbertoMobile, setCarrinhoAbertoMobile] = useState(false);

  // Aluno Selecionado e Pesquisa
  const [aluno, setAluno] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [resultadosAlunos, setResultadosAlunos] = useState([]);
  const [buscandoAlunos, setBuscandoAlunos] = useState(false);

  // Modais e Estados de Quitação
  const [modalVincular, setModalVincular] = useState(false);
  const [modalPagar, setModalPagar] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [dinheiroRecebido, setDinheiroRecebido] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [toast, setToast] = useState(null);

  const inputBuscaAlunoRef = useRef(null);

  // Título e carregamento inicial do catálogo
  useEffect(() => {
    document.title = 'Caixa (PDV) | CEAK Cantina';

    async function carregarCatalogo() {
      setCarregandoProdutos(true);
      try {
        const lista = await buscarProdutos();
        setProdutos(lista);
      } catch (err) {
        console.error('Falha ao carregar cardápio didático:', err);
        mostrarToast('Erro ao carregar o cardápio.', 'erro');
      } finally {
        setCarregandoProdutos(false);
      }
    }

    carregarCatalogo();
  }, []);

  // Busca rápida com debounce de alunos
  useEffect(() => {
    if (!buscaAluno.trim() || aluno) {
      setResultadosAlunos([]);
      setBuscandoAlunos(false);
      return;
    }

    setBuscandoAlunos(true);
    const timeout = setTimeout(async () => {
      try {
        const lista = await buscarAlunos(buscaAluno);
        setResultadosAlunos(lista);
      } catch (err) {
        console.error(err);
        mostrarToast('Erro ao pesquisar alunos.', 'erro');
      } finally {
        setBuscandoAlunos(false);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [buscaAluno, aluno]);

  // Atualização em tempo real do saldo do aluno
  useEffect(() => {
    if (!aluno?.id) return;
    return assinarSaldo(aluno.id, (novoSaldo) => {
      setSaldo(novoSaldo);
    });
  }, [aluno?.id]);

  // Totais do carrinho
  const { total, quantidadeTotal } = useMemo(() => {
    return carrinho.reduce(
      (acc, item) => ({
        total: acc.total + item.preco * item.qtd,
        quantidadeTotal: acc.quantidadeTotal + item.qtd,
      }),
      { total: 0, quantidadeTotal: 0 }
    );
  }, [carrinho]);

  // Filtro de produtos por categoria e texto
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchCategoria = categoriaAtiva === 'todos' || p.categoria === categoriaAtiva;
      const matchBusca =
        !termoBuscaProduto.trim() ||
        p.nome.toLowerCase().includes(termoBuscaProduto.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(termoBuscaProduto.toLowerCase()));
      return matchCategoria && matchBusca;
    });
  }, [produtos, categoriaAtiva, termoBuscaProduto]);

  // Validação de limite diário configurado para a comanda
  const limiteDiario = aluno?.limite_diario != null ? Number(aluno.limite_diario) : null;
  const excedeuLimite = limiteDiario !== null && total > limiteDiario;

  // Cálculo de troco para pagamento em dinheiro vivo
  const valorEntregueNum = parseFloat(String(dinheiroRecebido).replace(/\./g, '').replace(',', '.')) || 0;
  const troco = Math.max(0, valorEntregueNum - total);

  const mostrarToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2800);
  };

  /* ==========================================================================
     PERFORMANCE: OPERAÇÕES DE CARRINHO INSTANTÂNEAS (OPTIMISTIC UI)
     Resposta visual em 0ms com micro-animações suaves
     ========================================================================== */

  const adicionarAoCarrinho = (p) => {
    setCarrinho((atual) => {
      const existe = atual.find((item) => item.nome === p.nome);
      if (existe) {
        return atual.map((item) => (item.nome === p.nome ? { ...item, qtd: item.qtd + 1 } : item));
      }
      return [...atual, { ...p, qtd: 1 }];
    });
    mostrarToast(`${p.nome} adicionado ✓`);
  };

  const decrementarItem = (nome) => {
    setCarrinho((atual) =>
      atual.flatMap((item) => {
        if (item.nome !== nome) return [item];
        if (item.qtd > 1) return [{ ...item, qtd: item.qtd - 1 }];
        return [];
      })
    );
  };

  const removerItem = (nome) => {
    setCarrinho((atual) => atual.filter((item) => item.nome !== nome));
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    mostrarToast('Comanda limpa.');
  };

  // Vínculo e seleção de aluno
  const selecionarAluno = (a) => {
    setAluno(a);
    setSaldo(Number(a.saldo_devedor_atual || 0));
    setBuscaAluno('');
    setResultadosAlunos([]);
    setModalVincular(false);
    mostrarToast(`${a.nome_completo} selecionado ✓`);
  };

  const desvincularAluno = () => {
    setAluno(null);
    setSaldo(0);
    setBuscaAluno('');
  };

  /* ==========================================================================
     LANÇAMENTO DE CONSUMO NA CONTA COM OPTIMISTIC UI
     A interface reage instantaneamente (0ms de latência percebida)
     ========================================================================== */
  const handleLancarNaConta = async () => {
    if (quantidadeTotal === 0) {
      mostrarToast('Adicione produtos à comanda.', 'erro');
      return;
    }

    if (!aluno) {
      setModalVincular(true);
      setTimeout(() => inputBuscaAlunoRef.current?.focus(), 120);
      return;
    }

    // 1. Salva snapshot atual para rollback em caso de falha de conexão
    const saldoAnterior = saldo;
    const carrinhoAnterior = [...carrinho];
    const totalPedido = total;
    const nomeAluno = aluno.nome_completo;

    // 2. Optimistic UI: Atualiza estado imediatamente no React
    const saldoPrevisto = saldoAnterior + totalPedido;
    setSaldo(saldoPrevisto);
    setCarrinho([]);
    setCarrinhoAbertoMobile(false);
    mostrarToast(`Lançamento de ${brl(totalPedido)} registrado para ${nomeAluno}! ✓`);

    // Sincroniza imediatamente o Dashboard e a Gestão de Contas no estado global
    notificarNovaVenda(carrinhoAnterior, aluno);

    // 3. Sincroniza em segundo plano com o banco de dados
    setProcessandoAcao(true);
    try {
      const agora = new Date().toISOString();
      const itensDetalhados = [];
      for (const item of carrinhoAnterior) {
        for (let i = 0; i < item.qtd; i++) {
          itensDetalhados.push({
            produto_nome: item.nome,
            valor: item.preco,
            data_hora: agora,
          });
        }
      }

      const saldoConfirmado = await lancarConsumo(aluno, itensDetalhados);
      setSaldo(saldoConfirmado);
    } catch (err) {
      console.error('Falha na sincronização do consumo:', err);
      // Reverte em caso de erro (Rollback)
      setSaldo(saldoAnterior);
      setCarrinho(carrinhoAnterior);
      mostrarToast('Erro ao sincronizar. O lançamento foi revertido.', 'erro');
    } finally {
      setProcessandoAcao(false);
    }
  };

  /* ==========================================================================
     PAGAMENTO IMEDIATO À VISTA (PIX / Dinheiro / Cartão)
     ========================================================================== */
  const handleConfirmarPagamentoAVista = async () => {
    if (quantidadeTotal === 0) return;

    const totalVenda = total;
    const itensSnapshot = [...carrinho];

    setCarrinho([]);
    setModalPagar(false);
    setDinheiroRecebido('');
    setCarrinhoAbertoMobile(false);
    mostrarToast(`Venda de ${brl(totalVenda)} quitada via ${metodoPagamento}! ✓`);

    // Sincroniza faturamento no Dashboard
    notificarNovaVenda(itensSnapshot, aluno);

    setProcessandoAcao(true);
    try {
      await lancarVendaPaga(itensSnapshot, aluno, metodoPagamento);
    } catch (err) {
      console.error(err);
      mostrarToast('Erro ao confirmar venda à vista.', 'erro');
    } finally {
      setProcessandoAcao(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. TOPO: Identificação Limpa do Caixa & Botão Comanda Mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/70 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
            Caixa & Ponto de Venda
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Terminal rápido para cantina escolar • Ilustrações didáticas e comanda instantânea
          </p>
        </div>

        {/* Botão Mobile para visualização da comanda */}
        <button
          type="button"
          onClick={() => setCarrinhoAbertoMobile(true)}
          className="lg:hidden relative flex items-center gap-2 rounded-2xl bg-[#1F479A] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1F479A]/20 active:scale-95 transition-all duration-300"
        >
          <span>🛒</span>
          <span>Comanda ({quantidadeTotal})</span>
          {quantidadeTotal > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D9232E] px-1 text-[11px] font-black text-white shadow">
              {quantidadeTotal}
            </span>
          )}
        </button>
      </div>

      {/* 2. LAYOUT PRINCIPAL: Catálogo Didático à esquerda | Comanda à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA: Cardápio Didático e Categorias */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          
          {/* Barra de Filtros e Busca Rápida com Glassmorphism */}
          <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={termoBuscaProduto}
                onChange={(e) => setTermoBuscaProduto(e.target.value)}
                placeholder="Pesquisar salgado, suco, burger, prato..."
                className="w-full rounded-2xl border border-slate-200 bg-white/95 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10"
              />
              {termoBuscaProduto && (
                <button
                  onClick={() => setTermoBuscaProduto('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros de Categoria */}
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIAS.map((cat) => {
                const ativa = categoriaAtiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-300 ease-in-out active:scale-95 ${
                      ativa
                        ? 'bg-[#1F479A] text-white shadow-md shadow-[#1F479A]/20'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade de Produtos com Ilustrações Didáticas Vetoriais e Efeito Hover */}
          {carregandoProdutos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-3xl bg-slate-100/70 animate-pulse border border-slate-200/50"
                />
              ))}
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 p-12 text-center text-slate-400">
              <span className="text-5xl block mb-2">🍽️</span>
              <p className="font-bold text-base text-slate-700">Nenhum item encontrado no cardápio</p>
              <p className="text-xs text-slate-400 mt-1">Tente pesquisar com outro termo ou selecionar outra categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {produtosFiltrados.map((p) => {
                const itemNoCarrinho = carrinho.find((i) => i.nome === p.nome);
                const qtdNoCarrinho = itemNoCarrinho?.qtd || 0;

                return (
                  <article
                    key={p.id || p.nome}
                    onClick={() => adicionarAoCarrinho(p)}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white/95 backdrop-blur-sm border transition-all duration-300 ease-in-out p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:scale-105 cursor-pointer active:scale-95 ${
                      qtdNoCarrinho > 0
                        ? 'border-[#1F479A] ring-2 ring-[#1F479A]/20'
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Topo do Card: Badge de Tag e Contador */}
                    <div className="flex items-center justify-between gap-1 mb-2.5 z-10">
                      {p.tag ? (
                        <span className="rounded-full bg-[#D9232E] px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
                          {p.tag}
                        </span>
                      ) : (
                        <span className="text-xl">{p.emoji || '🥪'}</span>
                      )}

                      {qtdNoCarrinho > 0 && (
                        <span className="flex h-6 items-center justify-center rounded-full bg-[#1F479A] px-2.5 text-xs font-black text-white shadow-md animate-bounce">
                          {qtdNoCarrinho} na comanda
                        </span>
                      )}
                    </div>

                    {/* Ilustração Vetorial Didática (Flat Design / Cartoon 2D) */}
                    <div
                      className={`relative aspect-[16/11] w-full overflow-hidden rounded-2xl mb-3 flex items-center justify-center p-3 border border-slate-100 ${
                        p.corFundo || 'bg-slate-50'
                      }`}
                    >
                      <IlustracaoAlimento tipo={p.ilustracao} emoji={p.emoji} />
                    </div>

                    {/* Informações Didáticas */}
                    <div className="flex-1">
                      <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-[#1F479A] transition-colors leading-tight">
                        {p.nome}
                      </h3>
                      {p.descricao && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed font-medium">
                          {p.descricao}
                        </p>
                      )}
                    </div>

                    {/* Preço e Botão Adicionar com Micro-Animação */}
                    <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <span className="text-lg font-black text-[#1F479A] tracking-tight">
                        {brl(p.preco)}
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-black transition-all duration-200 group-hover:bg-[#1F479A] group-hover:text-white active:scale-90"
                        aria-label={`Adicionar ${p.nome}`}
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Comanda e Aluno Selecionado */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          
          {/* Card do Aluno Vinculado */}
          <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>👤</span> Aluno da Conta
              </span>
              {aluno ? (
                <button
                  type="button"
                  onClick={desvincularAluno}
                  className="text-xs font-bold text-[#D9232E] hover:underline"
                >
                  Trocar Aluno
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalVincular(true)}
                  className="text-xs font-bold text-[#1F479A] hover:underline"
                >
                  + Selecionar
                </button>
              )}
            </div>

            {aluno ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-800 leading-snug">
                      {aluno.nome_completo}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      {aluno.turma || 'Sem turma definida'} {aluno.idade != null && `· ${aluno.idade} anos`}
                    </p>
                    <p className="text-xs text-slate-400">Responsável: {aluno.nome_responsavel}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Saldo Atual</span>
                    <span
                      className={`text-base font-black ${
                        saldo > 0 ? 'text-[#D9232E]' : 'text-emerald-600'
                      }`}
                    >
                      {brl(saldo)}
                    </span>
                  </div>
                </div>

                {/* Previsão de Saldo Após a Compra */}
                {total > 0 && (
                  <div className="rounded-2xl bg-slate-50 px-3.5 py-2 flex items-center justify-between text-xs border border-slate-100 font-medium">
                    <span className="text-slate-500">Saldo após este pedido:</span>
                    <span className="font-black text-slate-800">{brl(saldo + total)}</span>
                  </div>
                )}

                {/* Alerta Crítico de Restrição Alimentar / Alergia */}
                {aluno.observacoes ? (
                  <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-3.5 text-xs text-red-800 shadow-sm animate-pulse">
                    <div className="flex items-center gap-1.5 font-black uppercase text-[11px] text-[#D9232E]">
                      <span className="text-base">⚠️</span>
                      <span>RESTRIÇÃO ALIMENTAR / ALERGIA</span>
                    </div>
                    <p className="mt-1 font-extrabold text-slate-900 leading-snug">
                      {aluno.observacoes}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-xs font-semibold flex items-center gap-2 border border-emerald-100">
                    <span>✅</span>
                    <span>Sem restrições alimentares registradas</span>
                  </div>
                )}

                {/* Alerta de Limite Diário Excedido */}
                {excedeuLimite && (
                  <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 text-xs text-amber-900 shadow-sm">
                    <span className="font-black text-amber-700 block mb-0.5">⚠️ Limite Diário Excedido</span>
                    O total ({brl(total)}) ultrapassa o limite diário autorizado ({brl(limiteDiario)}).
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => setModalVincular(true)}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center transition hover:border-[#1F479A] hover:bg-slate-50"
              >
                <span className="text-2xl block mb-1">🔍</span>
                <p className="text-xs font-bold text-slate-700">Nenhum aluno selecionado</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Clique para vincular à conta escolar</p>
              </div>
            )}
          </div>

          {/* Painel da Comanda / Carrinho */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <h2 className="text-base font-black text-slate-800">Comanda</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700">
                  {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
                </span>
              </div>
              {carrinho.length > 0 && (
                <button
                  type="button"
                  onClick={limparCarrinho}
                  className="text-xs font-bold text-slate-400 hover:text-[#D9232E] transition"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Lista dos Itens da Comanda com Resposta Instantânea */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
              {carrinho.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="text-3xl block mb-1">🥪</span>
                  <p className="text-xs font-bold text-slate-500">A comanda está vazia</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Clique nos itens do cardápio para adicionar</p>
                </div>
              ) : (
                carrinho.map((item) => (
                  <div
                    key={item.nome}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-2.5 border border-slate-100 transition hover:bg-slate-100/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{item.emoji || '🥪'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.nome}</p>
                        <p className="text-[11px] font-extrabold text-[#1F479A]">{brl(item.preco * item.qtd)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => decrementarItem(item.nome)}
                        className="h-7 w-7 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 shadow-sm transition hover:bg-[#D9232E] hover:text-white hover:border-[#D9232E] active:scale-90"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-800">{item.qtd}</span>
                      <button
                        type="button"
                        onClick={() => adicionarAoCarrinho(item)}
                        className="h-7 w-7 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 shadow-sm transition hover:bg-[#1F479A] hover:text-white hover:border-[#1F479A] active:scale-90"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removerItem(item.nome)}
                        className="ml-1 text-slate-300 hover:text-[#D9232E] text-sm font-bold"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totalizador */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Subtotal ({quantidadeTotal} itens):</span>
                <span>{brl(total)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-slate-800 pt-1">
                <span className="text-sm">Total da Comanda:</span>
                <span className="text-2xl font-black text-[#1F479A] tracking-tight">{brl(total)}</span>
              </div>
            </div>

            {/* Botões de Ação Imediata (Optimistic UI) */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleLancarNaConta}
                disabled={quantidadeTotal === 0 || processandoAcao}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#1F479A] py-3.5 px-4 text-sm font-extrabold text-white shadow-lg shadow-[#1F479A]/25 transition-all duration-300 ease-in-out hover:bg-[#163675] hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <span>💳</span>
                <span>
                  {aluno ? `Lançar na Conta (${brl(total)})` : 'Vincular Aluno e Lançar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalPagar(true)}
                disabled={quantidadeTotal === 0 || processandoAcao}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-200 py-3 px-4 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-40"
              >
                <span>⚡</span>
                <span>Pagar Agora (PIX / Dinheiro / Cartão)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL DE VÍNCULO DE ALUNO */}
      {modalVincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">Vincular Conta do Aluno</h3>
                <p className="text-xs text-slate-500">Selecione o titular para registrar o consumo escolar</p>
              </div>
              <button
                type="button"
                onClick={() => setModalVincular(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                ref={inputBuscaAlunoRef}
                type="text"
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                placeholder="Digite o nome do aluno ou turma..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#1F479A] focus:ring-4 focus:ring-[#1F479A]/10 font-medium"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50">
              {buscandoAlunos ? (
                <div className="p-6 text-center text-xs font-semibold text-slate-400">
                  Pesquisando alunos...
                </div>
              ) : resultadosAlunos.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {buscaAluno.trim()
                    ? 'Nenhum aluno encontrado com este nome.'
                    : 'Digite o nome do aluno para buscar.'}
                </div>
              ) : (
                resultadosAlunos.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selecionarAluno(a)}
                    className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-white active:bg-slate-100"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{a.nome_completo}</p>
                      <p className="text-xs text-slate-500">
                        {a.turma || 'Sem turma'} · Resp.: {a.nome_responsavel}
                      </p>
                      {a.observacoes && (
                        <span className="inline-block mt-1 text-[11px] font-bold text-[#D9232E] bg-red-50 px-2 py-0.5 rounded">
                          ⚠️ {a.observacoes}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Saldo</span>
                      <span
                        className={`text-sm font-black ${
                          Number(a.saldo_devedor_atual) > 0 ? 'text-[#D9232E]' : 'text-emerald-600'
                        }`}
                      >
                        {brl(a.saldo_devedor_atual)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalVincular(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE PAGAMENTO IMEDIATO À VISTA */}
      {modalPagar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">Pagamento Imediato (À Vista)</h3>
                <p className="text-xs text-slate-500">Venda no balcão sem gerar débito na conta</p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagar(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total a Pagar</span>
              <p className="text-3xl font-black text-[#1F479A]">{brl(total)}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['PIX', 'Dinheiro', 'Cartão'].map((met) => (
                <button
                  key={met}
                  type="button"
                  onClick={() => setMetodoPagamento(met)}
                  className={`rounded-2xl py-2.5 text-xs font-bold transition active:scale-95 ${
                    metodoPagamento === met
                      ? 'bg-[#1F479A] text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {met === 'PIX' ? '⚡ PIX' : met === 'Dinheiro' ? '💵 Dinheiro' : '💳 Cartão'}
                </button>
              ))}
            </div>

            {metodoPagamento === 'Dinheiro' && (
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Valor Recebido em Dinheiro (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dinheiroRecebido}
                    onChange={(e) => setDinheiroRecebido(e.target.value)}
                    placeholder="Ex.: 20,00"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#1F479A]"
                  />
                </div>
                {valorEntregueNum > 0 && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-500">Troco a Devolver:</span>
                    <span
                      className={`text-base font-black ${
                        valorEntregueNum < total ? 'text-[#D9232E]' : 'text-emerald-600'
                      }`}
                    >
                      {valorEntregueNum < total
                        ? `Faltam ${brl(total - valorEntregueNum)}`
                        : brl(troco)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalPagar(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarPagamentoAVista}
                disabled={processandoAcao || (metodoPagamento === 'Dinheiro' && valorEntregueNum < total && valorEntregueNum > 0)}
                className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-40"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TOAST NOTIFICATION FLUTUANTE */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-fadeIn ${
            toast.tipo === 'ok' ? 'bg-[#1F479A]/95' : 'bg-[#D9232E]/95'
          }`}
        >
          <span>{toast.tipo === 'ok' ? '✓' : '⚠️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
