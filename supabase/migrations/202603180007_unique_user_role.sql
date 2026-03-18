-- Ensure each user has exactly one role by adding a unique constraint on user_id
-- First, remove any potential duplicate roles (keep the first one found)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id
  AND a.user_id = b.user_id;

-- Now add the unique constraint to support reliable upsert
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
