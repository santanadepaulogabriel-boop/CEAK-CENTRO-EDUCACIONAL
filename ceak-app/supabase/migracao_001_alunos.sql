-- Migração para quem já executou a versão anterior do caixa.sql
-- (renomeia colunas e adiciona os novos campos de Alunos). Execute uma única vez.

alter table public.alunos rename column nome_aluno to nome_completo;
alter table public.alunos rename column telefone_whatsapp_responsavel to telefone_responsavel;
alter table public.consumo rename column nome_produto to produto_nome;

alter table public.alunos
  add column data_nascimento date,
  add column telefone_secundario text,
  add column documento_responsavel text,
  add column observacoes text;

-- Alunos já cadastrados ficam sem data de nascimento: preencha-a e depois ative a restrição:
-- update public.alunos set data_nascimento = '...' where id = '...';
-- alter table public.alunos alter column data_nascimento set not null;
alter table public.alunos add constraint chk_nascimento_passado check (data_nascimento <= current_date);

alter index if exists idx_alunos_nome rename to idx_alunos_nome_antigo;
create index if not exists idx_alunos_nome on public.alunos (nome_completo);
drop index if exists idx_alunos_nome_antigo;

create or replace function public.idade(a public.alunos)
returns integer
language sql
stable
as $$
  select extract(year from age(current_date, a.data_nascimento))::integer
$$;
