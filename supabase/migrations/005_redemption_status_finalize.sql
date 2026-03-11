-- =========================================================
-- 005_redemption_status_finalize.sql
-- Use new redemption_status enum values after 004 commit
-- =========================================================

alter table public.reward_redemptions
  add column if not exists processed_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Keep old statuses for compatibility, but default to new MVP wording.
alter table public.reward_redemptions
  alter column status set default 'offen';

-- Normalize legacy values to new wording where possible.
update public.reward_redemptions set status = 'offen' where status = 'requested';
update public.reward_redemptions set status = 'bearbeitet' where status = 'approved';
update public.reward_redemptions set status = 'abgeschlossen' where status = 'fulfilled';
update public.reward_redemptions set status = 'abgelehnt' where status = 'rejected';

create or replace function public.set_redemption_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'bearbeitet' and old.status is distinct from 'bearbeitet' and new.processed_at is null then
    new.processed_at = timezone('utc', now());
  end if;

  if new.status = 'abgeschlossen' and old.status is distinct from 'abgeschlossen' and new.completed_at is null then
    new.completed_at = timezone('utc', now());
  end if;

  if new.status = 'abgelehnt' and old.status is distinct from 'abgelehnt' and new.rejected_at is null then
    new.rejected_at = timezone('utc', now());
  end if;

  -- Keep legacy timestamp columns consistent for existing consumers.
  if new.status = 'bearbeitet' and old.status is distinct from 'bearbeitet' and new.approved_at is null then
    new.approved_at = timezone('utc', now());
  end if;

  if new.status = 'abgeschlossen' and old.status is distinct from 'abgeschlossen' and new.fulfilled_at is null then
    new.fulfilled_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.spend_points_on_redemption_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- Spend points once when redemption moves to "bearbeitet".
  if new.status = 'bearbeitet' and old.status is distinct from 'bearbeitet' then
    select coalesce(sum(pt.points), 0)
      into v_balance
    from public.points_transactions pt
    where pt.advisor_id = new.advisor_id
      and pt.referrer_id = new.referrer_id;

    if v_balance < new.requested_points_cost then
      raise exception 'Nicht genug Punkte fuer Einloesung. Verfuegbar: %, benoetigt: %',
        v_balance, new.requested_points_cost;
    end if;

    insert into public.points_transactions (
      advisor_id,
      referrer_id,
      points,
      transaction_type,
      reward_redemption_id,
      created_by_user_id,
      description
    )
    values (
      new.advisor_id,
      new.referrer_id,
      -new.requested_points_cost,
      'spend_reward_redemption',
      new.id,
      auth.uid(),
      'Punkteabbuchung fuer Praemien-Einloesung'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

