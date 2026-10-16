-- Migração 002: Adiciona campos 'turma' e 'limite_diario' na tabela public.alunos
alter table public.alunos
  add column if not exists turma text,
  add column if not exists limite_diario numeric(10,2) default null check (limite_diario is null or limite_diario >= 0);

comment on column public.alunos.turma is 'Turma ou série do aluno (ex.: 5º Ano A, 9º Ano B)';
comment on column public.alunos.limite_diario is 'Limite diário de consumo em reais (opcional, null para sem limite)';
