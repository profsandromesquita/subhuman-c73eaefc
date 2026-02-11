
create or replace function public.get_user_emails_admin()
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select au.id as user_id, au.email::text
  from auth.users au
  where public.is_admin_or_moderator(auth.uid())
$$;
