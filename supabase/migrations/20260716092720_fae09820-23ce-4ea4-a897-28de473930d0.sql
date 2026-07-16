
CREATE TYPE public.dev_todo_effort AS ENUM ('xs','s','m','l','xl');
ALTER TABLE public.dev_todos ADD COLUMN effort public.dev_todo_effort;
