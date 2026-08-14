CREATE TABLE IF NOT EXISTS public.tcg_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Banner',
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tcg_banners TO authenticated;
GRANT ALL ON public.tcg_banners TO service_role;

ALTER TABLE public.tcg_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners read" ON public.tcg_banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "banners admin write" ON public.tcg_banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_tcg_banners_updated_at ON public.tcg_banners;
CREATE TRIGGER update_tcg_banners_updated_at BEFORE UPDATE ON public.tcg_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tcg_players ADD COLUMN IF NOT EXISTS banner_url text;

DROP POLICY IF EXISTS "tcg_players self update" ON public.tcg_players;
CREATE POLICY "tcg_players self update" ON public.tcg_players FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());