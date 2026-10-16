import './style.css';
import { buscarAlunos, lancarConsumo } from './pdv/api.js';

const especiais = [
  { id: 'e1', nome: 'Lasanha à Bolonhesa', descricao: 'Massa fresca, molho da casa e queijo gratinado.', preco: 16.9, img: '/img/especial_lasanha.jpg', tag: 'Chef' },
  { id: 'e2', nome: 'Burger Artesanal', descricao: 'Pão brioche, blend 150g, cheddar e batatas.', preco: 19.9, img: '/img/especial_burger.jpg', tag: 'Mais pedido' },
  { id: 'e3', nome: 'Bolo de Cenoura', descricao: 'Fatia generosa com cobertura de chocolate.', preco: 8.5, img: '/img/especial_bolo.jpg', tag: 'Sobremesa' },
];

const fixos = [
  { id: 'f1', nome: 'Coca-Cola Juninho', descricao: 'Garrafinha 200ml gelada.', preco: 4.5, img: '/img/coca_juninho.jpg' },
  { id: 'f2', nome: 'Salgado Assado', descricao: 'Assado na hora, vários recheios.', preco: 7.0, img: '/img/salgado_assado.jpg' },
  { id: 'f3', nome: 'Suco', descricao: 'Suco natural de laranja 300ml.', preco: 6.5, img: '/img/suco_laranja.jpg' },
];

const todos = Object.fromEntries([...especiais, ...fixos].map((p) => [p.id, p]));
const carrinho = new Map(); // id -> quantidade

const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (id) => document.getElementById(id);

const btnAdd = 'btn-add group/btn inline-flex items-center gap-2 rounded-2xl bg-ceak-red px-4 py-2.5 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-ceak-red-dark hover:shadow-xl active:scale-95';

function cardEspecial(p) {
  return `
  <article class="group relative overflow-hidden rounded-2xl bg-ceak-blue shadow-lg transition duration-500 hover:-translate-y-2 hover:shadow-2xl">
    <div class="aspect-[4/3] overflow-hidden">
      <img src="${p.img}" alt="${p.nome}" loading="lazy" class="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
    </div>
    <div class="absolute inset-0 bg-gradient-to-t from-ceak-blue-dark via-ceak-blue-dark/40 to-transparent"></div>
    <span class="badge absolute left-4 top-4 bg-ceak-red text-white shadow-lg">${p.tag}</span>
    <div class="absolute inset-x-0 bottom-0 p-5 text-white">
      <h3 class="text-xl font-extrabold">${p.nome}</h3>
      <p class="mt-1 text-sm text-white/80">${p.descricao}</p>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-2xl font-extrabold">${brl(p.preco)}</span>
        <button type="button" data-add="${p.id}" class="${btnAdd}"><span class="text-lg leading-none transition-transform duration-300 group-hover/btn:rotate-90">+</span> Adicionar</button>
      </div>
    </div>
  </article>`;
}

function cardFixo(p) {
  return `
  <article class="group flex gap-4 rounded-2xl bg-white p-4 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
    <img src="${p.img}" alt="${p.nome}" loading="lazy" class="h-28 w-28 shrink-0 rounded-2xl object-cover transition duration-500 group-hover:scale-105" />
    <div class="flex flex-1 flex-col justify-between">
      <div>
        <h3 class="font-bold text-slate-800">${p.nome}</h3>
        <p class="text-xs text-slate-500">${p.descricao}</p>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-lg font-extrabold text-ceak-blue">${brl(p.preco)}</span>
        <button type="button" data-add="${p.id}" class="${btnAdd}" aria-label="Adicionar ${p.nome}"><span class="text-lg leading-none transition-transform duration-300 group-hover/btn:rotate-90">+</span></button>
      </div>
    </div>
  </article>`;
}

function obterTotaisCarrinho() {
  let total = 0;
  let qtd = 0;
  for (const [id, n] of carrinho) {
    const p = todos[id];
    if (p) {
      total += p.preco * n;
      qtd += n;
    }
  }
  return { total, qtd };
}

function renderCarrinho() {
  const ul = $('itens-carrinho');
  const { total, qtd } = obterTotaisCarrinho();

  if (carrinho.size === 0) {
    ul.innerHTML = `<li class="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-slate-400"><span class="text-5xl">🛒</span><p class="font-medium">Seu carrinho está vazio</p><p class="text-sm">Adicione itens do cardápio</p></li>`;
  } else {
    ul.innerHTML = [...carrinho].map(([id, n]) => {
      const p = todos[id];
      return `
      <li class="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 animate-[fadeIn_.3s_ease]">
        <img src="${p.img}" alt="" class="h-14 w-14 rounded-xl object-cover" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold">${p.nome}</p>
          <p class="text-sm font-semibold text-ceak-blue">${brl(p.preco * n)}</p>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" data-dec="${id}" class="h-8 w-8 rounded-full bg-white font-bold shadow transition hover:bg-ceak-red hover:text-white active:scale-90" aria-label="Diminuir">−</button>
          <span class="w-6 text-center text-sm font-bold">${n}</span>
          <button type="button" data-inc="${id}" class="h-8 w-8 rounded-full bg-white font-bold shadow transition hover:bg-ceak-blue hover:text-white active:scale-90" aria-label="Aumentar">+</button>
        </div>
      </li>`;
    }).join('');
  }
  $('total-carrinho').textContent = brl(total);
  $('btn-finalizar').disabled = qtd === 0;
  const b = $('badge-carrinho');
  b.textContent = qtd;
  b.classList.toggle('hidden', qtd === 0);
  b.classList.toggle('flex', qtd > 0);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 2500);
}

const abrir = (v) => {
  $('carrinho').classList.toggle('translate-x-full', !v);
  $('overlay').classList.toggle('hidden', !v);
};

function alterar(id, delta) {
  const n = (carrinho.get(id) ?? 0) + delta;
  if (n <= 0) carrinho.delete(id); else carrinho.set(id, n);
  renderCarrinho();
}

$('grid-especial').innerHTML = especiais.map(cardEspecial).join('');
$('grid-fixos').innerHTML = fixos.map(cardFixo).join('');

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (add) { alterar(add.dataset.add, 1); toast(`${todos[add.dataset.add].nome} adicionado ✓`); }
  if (inc) alterar(inc.dataset.inc, 1);
  if (dec) alterar(dec.dataset.dec, -1);
});
$('btn-abrir-carrinho').addEventListener('click', () => abrir(true));
$('btn-fechar-carrinho').addEventListener('click', () => abrir(false));
$('overlay').addEventListener('click', () => abrir(false));
$('btn-limpar').addEventListener('click', () => { carrinho.clear(); renderCarrinho(); });

// -------------------------------------------------------------
// MODAL: Vincular à Conta do Aluno
// -------------------------------------------------------------
const modalVincular = $('modal-vincular');
const buscaInput = $('busca-aluno-modal');
const listaAlunos = $('lista-alunos-modal');
const cardAluno = $('card-aluno-selecionado');
const btnConfirmar = $('btn-confirmar-vinculo');
let alunoSelecionado = null;
let timerBusca = null;

function abrirModalVincular() {
  const { total, qtd } = obterTotaisCarrinho();
  if (qtd === 0) return;

  alunoSelecionado = null;
  buscaInput.value = '';
  listaAlunos.innerHTML = '';
  listaAlunos.classList.add('hidden');
  cardAluno.classList.add('hidden');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Confirmar e Lançar';

  $('modal-total-pedido').textContent = brl(total);
  $('modal-resumo-itens').textContent = `${qtd} ${qtd === 1 ? 'item' : 'itens'} no carrinho`;

  modalVincular.showModal();
  setTimeout(() => buscaInput.focus(), 80);
}

function fecharModalVincular() {
  modalVincular.close();
  alunoSelecionado = null;
}

function selecionarAluno(aluno) {
  alunoSelecionado = aluno;
  const { total } = obterTotaisCarrinho();
  const saldoAtual = Number(aluno.saldo_devedor_atual || 0);
  const novoSaldo = saldoAtual + total;

  buscaInput.value = aluno.nome_completo;
  listaAlunos.classList.add('hidden');

  $('nome-aluno-selecionado').innerHTML = `${aluno.nome_completo} ${aluno.idade != null ? `<span class="ml-1.5 text-xs font-semibold text-slate-400">(${aluno.idade} anos)</span>` : ''}`;
  $('resp-aluno-selecionado').textContent = `Responsável: ${aluno.nome_responsavel}`;
  $('saldo-aluno-selecionado').textContent = brl(saldoAtual);
  $('novo-saldo-previsto').textContent = brl(novoSaldo);

  const obsBox = $('obs-aluno-selecionado');
  if (aluno.observacoes) {
    obsBox.className = 'mt-2 inline-block rounded-xl bg-ceak-red-soft px-3 py-1 text-xs font-bold text-ceak-red';
    obsBox.textContent = `⚠ ${aluno.observacoes}`;
    obsBox.classList.remove('hidden');
  } else {
    obsBox.classList.add('hidden');
  }

  cardAluno.classList.remove('hidden');
  btnConfirmar.disabled = false;
  btnConfirmar.textContent = `Confirmar e Lançar (${brl(total)})`;
}

// Busca rápida com autocomplete
buscaInput.addEventListener('input', () => {
  const termo = buscaInput.value.trim();
  alunoSelecionado = null;
  cardAluno.classList.add('hidden');
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Confirmar e Lançar';

  clearTimeout(timerBusca);
  if (!termo) {
    listaAlunos.classList.add('hidden');
    listaAlunos.innerHTML = '';
    return;
  }

  timerBusca = setTimeout(async () => {
    try {
      const resultados = await buscarAlunos(termo);
      if (resultados.length === 0) {
        listaAlunos.innerHTML = '<li class="p-4 text-center text-sm text-slate-400">Nenhum aluno encontrado</li>';
        listaAlunos.classList.remove('hidden');
        return;
      }
      listaAlunos.innerHTML = resultados.map((a) => `
        <li>
          <button type="button" data-aluno-id="${a.id}" class="item-aluno-busca flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-ceak-blue-soft">
            <div>
              <p class="font-bold text-slate-800">${a.nome_completo}</p>
              <p class="text-xs text-slate-500">Resp.: ${a.nome_responsavel}${a.idade != null ? ` · ${a.idade} anos` : ''}</p>
            </div>
            <span class="text-sm font-bold ${Number(a.saldo_devedor_atual) > 0 ? 'text-ceak-red' : 'text-green-600'}">
              ${brl(a.saldo_devedor_atual)}
            </span>
          </button>
        </li>
      `).join('');
      listaAlunos.classList.remove('hidden');

      listaAlunos.querySelectorAll('.item-aluno-busca').forEach((btn, idx) => {
        btn.addEventListener('click', () => selecionarAluno(resultados[idx]));
      });
    } catch (err) {
      console.error(err);
      listaAlunos.innerHTML = '<li class="p-4 text-center text-sm text-ceak-red">Erro ao buscar alunos</li>';
      listaAlunos.classList.remove('hidden');
    }
  }, 160);
});

// Ação de confirmar e lançar no banco
btnConfirmar.addEventListener('click', async () => {
  if (!alunoSelecionado || carrinho.size === 0 || btnConfirmar.disabled) return;

  const { total } = obterTotaisCarrinho();
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = 'Registrando consumo...';

  try {
    // Monta itens com quantidade expandida e timestamp exato
    const agora = new Date().toISOString();
    const itensParaLancar = [];
    for (const [id, qtd] of carrinho) {
      const p = todos[id];
      if (p) {
        for (let i = 0; i < qtd; i++) {
          itensParaLancar.push({
            produto_nome: p.nome,
            valor: p.preco,
            data_hora: agora,
          });
        }
      }
    }

    const novoSaldo = await lancarConsumo(alunoSelecionado, itensParaLancar);

    fecharModalVincular();
    carrinho.clear();
    renderCarrinho();
    abrir(false);

    toast(`Pedido de ${brl(total)} lançado para ${alunoSelecionado.nome_completo}! Novo saldo: ${brl(novoSaldo)} ✓`);
  } catch (err) {
    console.error(err);
    toast('Erro ao registrar consumo. Tente novamente.');
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar e Lançar';
  }
});

$('btn-finalizar').addEventListener('click', abrirModalVincular);
$('btn-fechar-modal-vincular').addEventListener('click', fecharModalVincular);
$('btn-cancelar-modal').addEventListener('click', fecharModalVincular);
modalVincular.addEventListener('click', (e) => {
  if (e.target === modalVincular) fecharModalVincular();
});

renderCarrinho();
