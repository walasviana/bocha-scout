-- Alterações complementares já aplicadas no projeto atual.
-- Não executar novamente sem verificar as migrações existentes.
alter policy profile_update_admin_only on public.profiles using (public.is_super_admin()) with check (public.is_super_admin());
create or replace function public.account_notification_count() returns bigint language sql stable security invoker set search_path=public as $$
select count(*) from public.admin_notifications n where (n.status='pending' and public.is_admin() and (n.source_type<>'athlete_edit' or public.is_super_admin())) or (n.requester_id=auth.uid() and not exists(select 1 from public.notification_reads r where r.user_id=auth.uid() and r.notification_id=n.id and r.status=n.status));
$$;
revoke all on function public.account_notification_count() from public,anon;
grant execute on function public.account_notification_count() to authenticated;
