-- Remove the foreign key constraint on profiles.user_id so students can be added without auth accounts
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Make user_id nullable for student profiles (students don't need auth accounts)
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;