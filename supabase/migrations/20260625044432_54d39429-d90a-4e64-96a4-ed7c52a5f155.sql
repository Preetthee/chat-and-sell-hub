-- 1) Grant admin role to preetthees@gmail.com if user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'preetthees@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.dev_todo_status AS ENUM ('pending', 'in_progress', 'done', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dev_todo_source AS ENUM ('user', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Table
CREATE TABLE public.dev_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  details text,
  status public.dev_todo_status NOT NULL DEFAULT 'pending',
  source public.dev_todo_source NOT NULL DEFAULT 'user',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dev_todos TO authenticated;
GRANT ALL ON public.dev_todos TO service_role;

ALTER TABLE public.dev_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dev todos" ON public.dev_todos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert dev todos" ON public.dev_todos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update dev todos" ON public.dev_todos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete dev todos" ON public.dev_todos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_dev_todos_updated_at
  BEFORE UPDATE ON public.dev_todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX dev_todos_status_idx ON public.dev_todos (status, sort_order, created_at DESC);