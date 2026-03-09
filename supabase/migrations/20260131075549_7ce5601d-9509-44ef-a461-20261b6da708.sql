-- Add gender enum type
CREATE TYPE public.user_gender AS ENUM ('male', 'female');

-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN gender user_gender NULL;