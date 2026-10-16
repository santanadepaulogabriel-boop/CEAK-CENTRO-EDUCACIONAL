-- ==============================================================================
-- CEAK CANTINA - SCHEMA COMPLETO E CONSOLIDADO (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Este script foi consolidado para ser executado do ZERO em um banco de dados novo.
-- Já contém:
--   - Todas as tabelas (alunos, consumo) com todas as colunas atualizadas
--   - Chaves primárias, estrangeiras e constraints de integridade
--   - Índices de performance para busca por nome e ordenação cronológica
--   - Coluna computada 'idade' para o Supabase PostgREST
--   - Triggers reativos para cálculo automático e consistente do saldo devedor
--   - Suporte a lançamentos de consumo e pagamentos parciais (abatimentos)
--   - Função atômica 'zerar_conta' para quitação de débitos
--   - Políticas RLS configuradas para acesso web com anon/authenticated
-- ==============================================================================

-- 1. TABELA DE ALUNOS
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null check (data_nascimento <= current_date),
  nome_responsavel text not null,
  turma text,                                   -- Turma/série escolar (ex.: 5º Ano A)
  limite_diario numeric(10,2) check (limite_diario is null or limite_diario >= 0), -- Limite diário em R$
  telefone_responsavel text not null,           -- WhatsApp do responsável principal
  telefone_secundario text,                     -- Telefone secundário / fixo
  documento_responsavel text,                   -- CPF ou RG do responsável
  observacoes text,                             -- Observações críticas, restrições e alergias alimentares
  saldo_devedor_atual numeric(10,2) not null default 0 check (saldo_devedor_atual >= 0),
  criado_em timestamptz not null default now()
);

-- Comentários documentais na tabela de alunos
comment on column public.alunos.turma is 'Turma ou série do aluno (ex.: 5º Ano A, 9º Ano B)';
comment on column public.alunos.limite_diario is 'Limite diário de consumo em reais (opcional, null para sem limite)';
comment on column public.alunos.observacoes is 'Restrições alimentares, alergias e notas de segurança exibidas no PDV';

-- Índice para busca rápida de alunos por nome no PDV e na Gestão de Contas
create index if not exists idx_alunos_nome on public.alunos (nome_completo);


-- 2. FUNÇÃO COMPUTADA: IDADE
-- Permite que o Supabase API (PostgREST) consulte a idade calculada dinamicamente via .select('id, nome_completo, idade')
create or replace function public.idade(a public.alunos)
returns integer
language sql
stable
as $$
  select extract(year from age(current_date, a.data_nascimento))::integer
$$;


-- 3. TABELA DE CONSUMO (EXTRATO DE LANÇAMENTOS E PAGAMENTOS)
create table if not exists public.consumo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  produto_nome text not null,
  valor numeric(10,2) not null check (valor <> 0), -- Positivo (+) para consumo; Negativo (-) para pagamento parcial/abatimento
  data_hora timestamptz not null default now()
);

comment on column public.consumo.valor is 'Valor monetário do consumo (positivo) ou pagamento parcial recebido (negativo)';

-- Índice para consultas rápidas do extrato do aluno ordenadas por data
create index if not exists idx_consumo_aluno_data on public.consumo (aluno_id, data_hora desc);


-- 4. TABELA DE PRODUTOS (CATÁLOGO DINÂMICO DO CARDÁPIO)
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco > 0),
  categoria text not null default 'salgados', -- 'salgados', 'bebidas', 'doces', 'pratos'
  emoji text default '🥪',
  imagem_url text,
  disponivel boolean not null default true,
  tag text,                                   -- 'Chef', 'Mais pedido', 'Sobremesa', etc.
  criado_em timestamptz not null default now()
);

create index if not exists idx_produtos_categoria on public.produtos (categoria);

-- Carga inicial de produtos caso a tabela esteja vazia
insert into public.produtos (nome, descricao, preco, categoria, emoji, imagem_url, tag)
select * from (values
  ('Lasanha à Bolonhesa', 'Massa fresca, molho da casa e queijo gratinado.', 16.90, 'pratos', '🍝', '/img/especial_lasanha.jpg', 'Chef'),
  ('Burger Artesanal', 'Pão brioche, blend 150g, cheddar cremoso e batatas.', 19.90, 'pratos', '🍔', '/img/especial_burger.jpg', 'Mais pedido'),
  ('Bolo de Cenoura', 'Fatia generosa com calda aveludada de chocolate.', 8.50, 'doces', '🍰', '/img/especial_bolo.jpg', 'Sobremesa'),
  ('Coca-Cola Juninho', 'Garrafinha 200ml bem gelada.', 4.50, 'bebidas', '🍾', '/img/coca_juninho.jpg', null),
  ('Salgado Assado', 'Assado artesanal dourado na hora (frango, queijo ou carne).', 7.00, 'salgados', '🥟', '/img/salgado_assado.jpg', 'Quentinho'),
  ('Suco Natural', 'Suco natural de laranja fresco 300ml.', 6.50, 'bebidas', '🍊', '/img/suco_laranja.jpg', null),
  ('Misto-Quente Especial', 'Pão tostado na chapa com presunto magro e queijo prato.', 6.00, 'salgados', '🥪', null, null),
  ('Fatia de Pizza', 'Massa artesanal, queijo derretido e orégano fresco.', 8.00, 'salgados', '🍕', null, null),
  ('Refrigerante Lata', 'Lata 350ml variados sabores.', 5.00, 'bebidas', '🥤', null, null),
  ('Água Mineral 500ml', 'Com ou sem gás gelada.', 3.00, 'bebidas', '💧', null, null)
) as t(nome, descricao, preco, categoria, emoji, imagem_url, tag)
where not exists (select 1 from public.produtos);


-- 4. TRIGGER: ATUALIZAÇÃO AUTOMÁTICA E ATÔMICA DO SALDO DEVEDOR
create or replace function public.atualizar_saldo_devedor()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Ao inserir consumo (+) o saldo sobe; ao inserir pagamento (-) o saldo diminui
    update public.alunos 
       set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
     where id = new.aluno_id;

  elsif tg_op = 'DELETE' then            -- Estorno de lançamento incorreto
    update public.alunos 
       set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
     where id = old.aluno_id;

  elsif tg_op = 'UPDATE' then            -- Correção de valor ou troca de aluno
    update public.alunos 
       set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
     where id = old.aluno_id;
    update public.alunos 
       set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
     where id = new.aluno_id;
  end if;
  return null;
end;
$$;

-- Registra a trigger na tabela consumo
drop trigger if exists trg_consumo_saldo on public.consumo;
create trigger trg_consumo_saldo
after insert or update of valor, aluno_id or delete on public.consumo
for each row execute function public.atualizar_saldo_devedor();


-- 5. PROCEDIMENTO DE QUITAÇÃO TOTAL: ZERAR CONTA
create or replace function public.zerar_conta(p_aluno_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.consumo
   where aluno_id = p_aluno_id
     and data_hora >= date_trunc('month', now());
  update public.alunos 
     set saldo_devedor_atual = 0 
   where id = p_aluno_id;
end;
$$;


-- 6. SEGURANÇA (ROW LEVEL SECURITY - RLS)
alter table public.alunos enable row level security;
alter table public.consumo enable row level security;
alter table public.produtos enable row level security;

-- Remove políticas antigas caso já existam para evitar conflitos
drop policy if exists "funcionarios_alunos" on public.alunos;
drop policy if exists "funcionarios_consumo" on public.consumo;
drop policy if exists "permitir_todos_alunos" on public.alunos;
drop policy if exists "permitir_todos_consumo" on public.consumo;
drop policy if exists "permitir_todos_produtos" on public.produtos;

-- Cria políticas universais permitindo operações via cliente do sistema (anon e authenticated)
create policy "permitir_todos_alunos" 
  on public.alunos 
  for all 
  using (true) 
  with check (true);

create policy "permitir_todos_consumo" 
  on public.consumo 
  for all 
  using (true) 
  with check (true);

create policy "permitir_todos_produtos" 
  on public.produtos 
  for all 
  using (true) 
  with check (true);
