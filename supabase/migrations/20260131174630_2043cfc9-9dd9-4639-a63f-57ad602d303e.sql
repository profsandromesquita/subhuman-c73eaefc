-- Adicionar novos campos à tabela profiles para personalização de conteúdo
ALTER TABLE public.profiles
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN occupation_type text,
ADD COLUMN company_name text,
ADD COLUMN job_title text,
ADD COLUMN industry text,
ADD COLUMN education text,
ADD COLUMN skills text[],
ADD COLUMN hobbies text,
ADD COLUMN bio text,
ADD COLUMN ai_experience_level text,
ADD COLUMN goals text;