-- ==============================================================================
-- CEAK CANTINA - SCHEMA PRINCIPAL (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Script consolidado para instalação limpa e direta em novo projeto Supabase.
-- ==============================================================================

-- 1. TABELA DE ALUNOS
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null check (data_nascimento <= current_date),
  nome_responsavel text not null,
  turma text,                                   -- Turma escolar (ex.: 5º Ano A)
  limite_diario numeric(10,2) check (limite_diario is null or limite_diario >= 0), -- Limite diário em R$
  telefone_responsavel text not null,           -- WhatsApp do responsável
  telefone_secundario text,
  documento_responsavel text,                   -- CPF/RG do responsável
  observacoes text,                             -- Restrições alimentares, alergias e avisos do PDV
  saldo_devedor_atual numeric(10,2) not null default 0 check (saldo_devedor_atual >= 0),
  criado_em timestamptz not null default now()
);

create index if not exists idx_alunos_nome on public.alunos (nome_completo);

comment on column public.alunos.turma is 'Turma ou série do aluno (ex.: 5º Ano A, 9º Ano B)';
comment on column public.alunos.limite_diario is 'Limite diário de consumo em reais (opcional, null para sem limite)';


-- 2. FUNÇÃO COMPUTADA: IDADE
create or replace function public.idade(a public.alunos)
returns integer
language sql
stable
as $$
  select extract(year from age(current_date, a.data_nascimento))::integer
$$;


-- 3. TABELA DE CONSUMO
create table if not exists public.consumo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  produto_nome text not null,
  valor numeric(10,2) not null check (valor <> 0), -- Positivo (+) para consumo; Negativo (-) para pagamento parcial
  data_hora timestamptz not null default now()
);

create index if not exists idx_consumo_aluno_data on public.consumo (aluno_id, data_hora desc);

comment on column public.consumo.valor is 'Valor monetário do consumo (positivo) ou pagamento parcial recebido (negativo)';


-- 4. TRIGGER: ATUALIZAÇÃO AUTOMÁTICA DO SALDO DEVEDOR
create or replace function public.atualizar_saldo_devedor()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.alunos 
       set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
     where id = new.aluno_id;

  elsif tg_op = 'DELETE' then            -- Estorno de lançamento errado
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

drop trigger if exists trg_consumo_saldo on public.consumo;
create trigger trg_consumo_saldo
after insert or update of valor, aluno_id or delete on public.consumo
for each row execute function public.atualizar_saldo_devedor();


-- 5. PROCEDIMENTO DE FECHAMENTO DE CONTA: ZERAR CONTA
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


-- 6. POLÍTICAS DE SEGURANÇA (RLS)
alter table public.alunos enable row level security;
alter table public.consumo enable row level security;

drop policy if exists "funcionarios_alunos" on public.alunos;
drop policy if exists "funcionarios_consumo" on public.consumo;
drop policy if exists "permitir_todos_alunos" on public.alunos;
drop policy if exists "permitir_todos_consumo" on public.consumo;

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
