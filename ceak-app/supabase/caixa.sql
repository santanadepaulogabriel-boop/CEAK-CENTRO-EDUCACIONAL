-- Modelagem de controle de caixa da cantina (uso interno dos funcionários)
-- Instalação do zero. Se você já executou a versão anterior, use migracao_001_alunos.sql.

-- ALUNOS
create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null check (data_nascimento <= current_date),
  nome_responsavel text not null,
  turma text,                                   -- turma escolar, ex: 5º Ano A
  limite_diario numeric(10,2) check (limite_diario is null or limite_diario >= 0), -- limite diário em R$
  telefone_responsavel text not null,           -- WhatsApp, ex.: 5527999759569
  telefone_secundario text,
  documento_responsavel text,                   -- CPF/RG do responsável
  observacoes text,                             -- texto livre (alergias, avisos, etc.)
  saldo_devedor_atual numeric(10,2) not null default 0 check (saldo_devedor_atual >= 0),
  criado_em timestamptz not null default now()
);
create index idx_alunos_nome on public.alunos (nome_completo);

-- IDADE (calculada automaticamente)
-- Uma coluna GENERATED não pode depender de current_date, então a idade é uma "coluna
-- computada" via função: o PostgREST/Supabase permite usar  .select('nome_completo, idade').
create or replace function public.idade(a public.alunos)
returns integer
language sql
stable
as $$
  select extract(year from age(current_date, a.data_nascimento))::integer
$$;

-- CONSUMO
create table public.consumo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  produto_nome text not null,
  valor numeric(10,2) not null check (valor <> 0), -- positivo para consumo, negativo para pagamento parcial recebido
  data_hora timestamptz not null default now()
);
create index idx_consumo_aluno_data on public.consumo (aluno_id, data_hora desc);

-- TRIGGER: mantém saldo_devedor_atual sincronizado com a tabela consumo
create or replace function public.atualizar_saldo_devedor()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
      where id = new.aluno_id;

  elsif tg_op = 'DELETE' then            -- estorno de lançamento errado
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
      where id = old.aluno_id;

  elsif tg_op = 'UPDATE' then            -- correção de valor ou troca de aluno
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
      where id = old.aluno_id;
    update public.alunos set saldo_devedor_atual = saldo_devedor_atual + new.valor
      where id = new.aluno_id;
  end if;
  return null;
end;
$$;

create trigger trg_consumo_saldo
after insert or update of valor, aluno_id or delete on public.consumo
for each row execute function public.atualizar_saldo_devedor();

-- FECHAMENTO DE CONTAS: zera o saldo e limpa o histórico do mês corrente (atômico)
create or replace function public.zerar_conta(p_aluno_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.consumo
   where aluno_id = p_aluno_id
     and data_hora >= date_trunc('month', now());
  update public.alunos set saldo_devedor_atual = 0 where id = p_aluno_id;
end;
$$;

-- RLS: somente funcionários autenticados (Supabase Auth) acessam os dados
alter table public.alunos  enable row level security;
alter table public.consumo enable row level security;

create policy "funcionarios_alunos"  on public.alunos  for all to authenticated using (true) with check (true);
create policy "funcionarios_consumo" on public.consumo for all to authenticated using (true) with check (true);

-- Exemplo de uso
-- insert into public.alunos (nome_completo, data_nascimento, nome_responsavel, telefone_responsavel, documento_responsavel, observacoes)
--   values ('Lucas Sales', '2014-05-20', 'Vanessa das Sales', '5527999759569', '000.000.000-00', 'Alérgico a amendoim');
-- select nome_completo, idade, saldo_devedor_atual from public.alunos;
-- insert into public.consumo (aluno_id, produto_nome, valor) values ('<id_do_aluno>', 'Salgado Assado', 7.00);
