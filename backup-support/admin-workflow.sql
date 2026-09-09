alter table public.admin_notifications add column change_data jsonb;
alter table public.admin_notifications drop constraint admin_notifications_source_type_check;
alter table public.admin_notifications add constraint admin_notifications_source_type_check check (source_type in ('athlete','team_entry','scout','athlete_edit'));
alter policy athletes_update_admin on public.athletes using (public.is_super_admin()) with check (public.is_super_admin());
alter policy admin_notifications_admin_select on public.admin_notifications using (public.is_super_admin() or (public.is_admin() and source_type <> 'athlete_edit') or requester_id=auth.uid());
alter policy admin_notifications_admin_update on public.admin_notifications using (public.is_admin() and (source_type <> 'athlete_edit' or public.is_super_admin())) with check (public.is_admin() and (source_type <> 'athlete_edit' or public.is_super_admin()));

create function public.guard_athlete_correction() returns trigger language plpgsql set search_path=public as $$
begin
 if auth.uid() is not null and not public.is_super_admin() and
 (row(new.name,new.class,new.gender,new.country,new.uf,new.observations) is distinct from row(old.name,old.class,old.gender,old.country,old.uf,old.observations)) then
 raise exception 'Correções de atletas precisam da aprovação do Super Admin'; end if;
 return new;
end $$;
create trigger guard_athlete_correction before update on public.athletes for each row execute function public.guard_athlete_correction();

create or replace function public.admin_update_athlete(target_athlete_id uuid,new_name text,new_class text,new_gender text default null,new_country text default null,new_uf text default null,new_observations text default null)
returns void language plpgsql security definer set search_path=public as $$
declare before_data jsonb; after_data jsonb;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 if coalesce(trim(new_name),'')='' or new_class is null or new_class not in ('BC1','BC2','BC3','BC4') then raise exception 'Informe nome e classe válidos'; end if;
 if nullif(new_gender,'') is not null and new_gender not in ('Masculino','Feminino') then raise exception 'Gênero inválido'; end if;
 select jsonb_build_object('name',name,'class',class,'gender',gender,'country',country,'uf',uf,'observations',observations) into before_data from public.athletes where id=target_athlete_id for update;
 if not found then raise exception 'Atleta não encontrado'; end if;
 after_data:=jsonb_build_object('name',upper(trim(new_name)),'class',new_class,'gender',nullif(trim(new_gender),''),'country',nullif(trim(new_country),''),'uf',nullif(upper(trim(new_uf)),''),'observations',nullif(trim(new_observations),''));
 if before_data=after_data then return; end if;
 if public.is_super_admin() then
 update public.athletes set name=after_data->>'name',class=new_class,gender=after_data->>'gender',country=after_data->>'country',uf=after_data->>'uf',observations=after_data->>'observations',updated_at=now() where id=target_athlete_id;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'update','athlete',target_athlete_id::text,jsonb_build_object('before',before_data,'after',after_data));
 else
 insert into public.admin_notifications(source_type,source_id,requester_id,title,message,change_data)
 values('athlete_edit',gen_random_uuid()::text,auth.uid(),'Correção de atleta',before_data->>'name',jsonb_build_object('athlete_id',target_athlete_id,'before',before_data,'after',after_data));
 end if;
end $$;

create function public.resolve_athlete_correction(notification_id uuid,new_status text) returns void language plpgsql security definer set search_path=public as $$
declare n public.admin_notifications; current_data jsonb; proposed jsonb;
begin
 if not public.is_super_admin() then raise exception 'Apenas o Super Admin pode decidir correções'; end if;
 if new_status is null or new_status not in ('approved','rejected') then raise exception 'Status inválido'; end if;
 select * into n from public.admin_notifications where id=notification_id and source_type='athlete_edit' for update;
 if not found or n.status<>'pending' then raise exception 'Pedido já resolvido ou não encontrado'; end if;
 if new_status='approved' then
 select jsonb_build_object('name',name,'class',class,'gender',gender,'country',country,'uf',uf,'observations',observations) into current_data from public.athletes where id=(n.change_data->>'athlete_id')::uuid for update;
 if not found then raise exception 'Atleta não encontrado'; end if;
 if current_data is distinct from n.change_data->'before' then raise exception 'O atleta foi alterado após este pedido. Rejeite e solicite uma nova correção.'; end if;
 proposed:=n.change_data->'after';
 perform public.admin_update_athlete((n.change_data->>'athlete_id')::uuid,proposed->>'name',proposed->>'class',proposed->>'gender',proposed->>'country',proposed->>'uf',proposed->>'observations');
 end if;
 update public.admin_notifications set status=new_status,resolved_at=now(),resolved_by=auth.uid() where id=notification_id;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details) values(auth.uid(),new_status,'athlete_correction',notification_id::text,n.change_data);
end $$;
revoke all on function public.resolve_athlete_correction(uuid,text) from public,anon;
grant execute on function public.resolve_athlete_correction(uuid,text) to authenticated;
revoke all on function public.admin_update_athlete(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.admin_update_athlete(uuid,text,text,text,text,text,text) to authenticated;

create table public.notification_reads(user_id uuid not null references auth.users(id) on delete cascade,notification_id uuid not null references public.admin_notifications(id) on delete cascade,status text not null check(status in ('pending','approved','rejected')),read_at timestamptz not null default now(),primary key(user_id,notification_id,status));
alter table public.notification_reads enable row level security;
grant select,insert on public.notification_reads to authenticated;
create policy notification_reads_select on public.notification_reads for select to authenticated using(user_id=auth.uid());
create policy notification_reads_insert on public.notification_reads for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.admin_notifications n where n.id=notification_id and n.requester_id=auth.uid() and n.status=notification_reads.status));
