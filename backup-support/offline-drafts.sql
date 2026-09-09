create table public.scout_drafts (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null default 1 check(revision>0),
 state text not null check(state in ('active','closed')),
 payload jsonb,
 updated_at timestamptz not null default now()
);
create index scout_drafts_owner_idx on public.scout_drafts(owner_id);
alter table public.scout_drafts enable row level security;
grant select,insert,update on public.scout_drafts to authenticated;
create policy drafts_read on public.scout_drafts for select to authenticated using(owner_id=(select auth.uid()));
create policy drafts_insert on public.scout_drafts for insert to authenticated with check(owner_id=(select auth.uid()) and exists(select 1 from public.profiles where id=auth.uid() and not is_blocked));
create policy drafts_update on public.scout_drafts for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.profiles where id=auth.uid() and not is_blocked));
create function public.write_scout_draft(draft_id uuid,draft_revision bigint,draft_state text,draft_payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
 insert into public.scout_drafts(id,owner_id,revision,state,payload) values(draft_id,auth.uid(),draft_revision,draft_state,case when draft_state='closed' then null else draft_payload end)
 on conflict(id) do update set revision=excluded.revision,state=excluded.state,payload=excluded.payload,updated_at=now()
 where scout_drafts.owner_id=auth.uid() and scout_drafts.state<>'closed' and excluded.revision>scout_drafts.revision;
end $$;
revoke all on function public.write_scout_draft(uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.write_scout_draft(uuid,bigint,text,jsonb) to authenticated;
