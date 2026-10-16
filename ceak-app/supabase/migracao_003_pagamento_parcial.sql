-- Migração 003: Permite pagamentos parciais (valores negativos) na tabela public.consumo
-- e atualiza a trigger para descontar do saldo devedor do aluno sem permitir saldo negativo.

alter table public.consumo drop constraint if exists consumo_valor_check;
alter table public.consumo add constraint consumo_valor_check check (valor <> 0);

comment on column public.consumo.valor is 'Valor monetário do consumo (positivo) ou pagamento parcial recebido (negativo)';

-- Atualização da trigger para manter saldo devedor correto com lançamentos negativos
create or replace function public.atualizar_saldo_devedor()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
      where id = new.aluno_id;

  elsif tg_op = 'DELETE' then            -- estorno de lançamento
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
      where id = old.aluno_id;

  elsif tg_op = 'UPDATE' then            -- correção de lançamento
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual - old.valor)
      where id = old.aluno_id;
    update public.alunos set saldo_devedor_atual = greatest(0, saldo_devedor_atual + new.valor)
      where id = new.aluno_id;
  end if;
  return null;
end;
$$;
