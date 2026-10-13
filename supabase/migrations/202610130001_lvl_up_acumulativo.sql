-- Lvl Up Acumulativo 2.0 — estado coletivo e idempotência LivePix
-- Valores monetários são armazenados em centavos para evitar erros de arredondamento.

create table if not exists public.soundboard_lvlup_donations (
  livepix_payment_id text primary key,
  reference text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = 'BRL'),
  received_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.soundboard_lvlup_state (
  singleton boolean primary key default true check (singleton),
  round_started_at timestamptz,
  round_ends_at timestamptz,
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),
  active_level smallint not null default 0 check (active_level between 0 and 4),
  timer_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.soundboard_lvlup_state (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.soundboard_lvlup_donations enable row level security;
alter table public.soundboard_lvlup_state enable row level security;

-- Só a função pública de leitura pode ser chamada pelo painel/OBS.
-- A tabela não recebe políticas de leitura/escrita direta.

create or replace function public._advance_soundboard_lvlup_state(p_now timestamptz default now())
returns public.soundboard_lvlup_state
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.soundboard_lvlup_state;
begin
  select * into s
  from public.soundboard_lvlup_state
  where singleton = true
  for update;

  if not found then
    insert into public.soundboard_lvlup_state (singleton)
    values (true)
    on conflict (singleton) do nothing;

    select * into s
    from public.soundboard_lvlup_state
    where singleton = true
    for update;
  end if;

  -- O fim da janela encerra a rodada coletiva e volta ao SUAVE.
  if s.round_ends_at is not null and p_now >= s.round_ends_at then
    update public.soundboard_lvlup_state
    set round_started_at = null,
        round_ends_at = null,
        total_amount_cents = 0,
        active_level = 0,
        timer_ends_at = null,
        updated_at = p_now
    where singleton = true
    returning * into s;

    return s;
  end if;

  -- Ao acabar o timer, cai apenas um nível. Cada nível restante ganha
  -- uma nova etapa de 300 segundos; no SUAVE o timer fica zerado.
  if s.active_level > 0
     and s.timer_ends_at is not null
     and p_now >= s.timer_ends_at then
    update public.soundboard_lvlup_state
    set active_level = greatest(0, active_level - 1),
        timer_ends_at = case
          when active_level > 1 then p_now + interval '5 minutes'
          else null
        end,
        updated_at = p_now
    where singleton = true
    returning * into s;
  end if;

  return s;
end;
$$;

create or replace function public.get_soundboard_lvlup_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.soundboard_lvlup_state;
  v_now timestamptz := now();
begin
  s := public._advance_soundboard_lvlup_state(v_now);

  return jsonb_build_object(
    'nivelAtivo', s.active_level,
    'tempoRestante', case
      when s.timer_ends_at is null then 0
      else greatest(0, ceil(extract(epoch from (s.timer_ends_at - v_now)))::integer)
    end,
    'totalCentavos', s.total_amount_cents,
    'roundStartedAt', case when s.round_started_at is null then null else floor(extract(epoch from s.round_started_at) * 1000)::bigint end,
    'roundEndsAt', case when s.round_ends_at is null then null else floor(extract(epoch from s.round_ends_at) * 1000)::bigint end,
    'janelaRestante', case
      when s.round_ends_at is null then 0
      else greatest(0, ceil(extract(epoch from (s.round_ends_at - v_now)))::integer)
    end,
    'timestamp', floor(extract(epoch from v_now) * 1000)::bigint
  );
end;
$$;

create or replace function public.process_livepix_donation(
  p_payment_id text,
  p_reference text,
  p_amount_cents integer,
  p_currency text,
  p_received_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  s public.soundboard_lvlup_state;
  v_inserted_id text;
  v_total integer;
  v_threshold_level smallint;
  v_new_level smallint;
  v_levels_unlocked integer;
  v_base_timer timestamptz;
begin
  if p_payment_id is null or length(trim(p_payment_id)) = 0 then
    raise exception 'payment id obrigatório';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'valor inválido';
  end if;
  if upper(coalesce(p_currency, '')) <> 'BRL' then
    raise exception 'moeda não suportada';
  end if;

  insert into public.soundboard_lvlup_donations
    (livepix_payment_id, reference, amount_cents, currency, received_at)
  values
    (p_payment_id, p_reference, p_amount_cents, 'BRL', coalesce(p_received_at, v_now))
  on conflict (livepix_payment_id) do nothing
  returning livepix_payment_id into v_inserted_id;

  -- O LivePix pode reenviar webhooks. Um ID já processado nunca soma de novo.
  if v_inserted_id is null then
    return public.get_soundboard_lvlup_state();
  end if;

  s := public._advance_soundboard_lvlup_state(v_now);

  -- A primeira doação confirmada abre uma janela fixa de 15 minutos.
  if s.round_started_at is null or s.round_ends_at is null then
    update public.soundboard_lvlup_state
    set round_started_at = v_now,
        round_ends_at = v_now + interval '15 minutes',
        total_amount_cents = 0,
        active_level = 0,
        timer_ends_at = null,
        updated_at = v_now
    where singleton = true
    returning * into s;
  end if;

  v_total := s.total_amount_cents + p_amount_cents;

  -- Níveis por total coletivo da rodada: R$1 / R$5 / R$20 / R$50.
  v_threshold_level := case
    when v_total >= 5000 then 4
    when v_total >= 2000 then 3
    when v_total >= 500 then 2
    when v_total >= 100 then 1
    else 0
  end;

  -- Se o timer já fez o nível cair, cruzar novamente a faixa pode reabri-lo.
  v_new_level := greatest(s.active_level, v_threshold_level);
  v_levels_unlocked := greatest(0, v_new_level - s.active_level);

  v_base_timer := case
    when s.timer_ends_at is not null and s.timer_ends_at > v_now then s.timer_ends_at
    else v_now
  end;

  update public.soundboard_lvlup_state
  set total_amount_cents = v_total,
      active_level = v_new_level,
      timer_ends_at = case
        when v_levels_unlocked > 0 then v_base_timer + (v_levels_unlocked * interval '5 minutes')
        when s.timer_ends_at is not null and s.timer_ends_at > v_now then s.timer_ends_at
        else null
      end,
      updated_at = v_now
  where singleton = true;

  return public.get_soundboard_lvlup_state();
end;
$$;

revoke all on function public._advance_soundboard_lvlup_state(timestamptz) from public, anon, authenticated;
revoke all on function public.process_livepix_donation(text, text, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.get_soundboard_lvlup_state() to anon, authenticated;
grant execute on function public.process_livepix_donation(text, text, integer, text, timestamptz) to service_role;
