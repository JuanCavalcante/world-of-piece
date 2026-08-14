import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import heroShip from "@/assets/supernovas-bg.png";

export const Route = createFileRoute("/entrar")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        "Supabase ainda não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente (Vercel).",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-sea-deep text-parchment flex flex-col">
      <div className="relative flex-1 flex flex-col">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={heroShip}
            alt=""
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sea-deep via-sea-deep/40 to-sea-deep/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-sea-deep/80 via-transparent to-sea-deep/30" />
        </div>
        <SiteNav />
        <main className="relative z-10 flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-md bg-sea-surface/80 backdrop-blur border border-gold/20 p-8 rounded-sm shadow-2xl relative">
          <div className="absolute -top-3 -right-3 size-12 border-t-2 border-r-2 border-gold/50" />
          <div className="absolute -bottom-3 -left-3 size-12 border-b-2 border-l-2 border-gold/50" />

          <h1 className="font-display text-2xl mb-8 text-center tracking-wide">
            ACESSO A SUA CONTA
          </h1>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gold/70 mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="luffy@wordofpiece.com"
                className="w-full bg-sea-deep/60 border border-gold/15 p-3 text-sm rounded-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gold/70 mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-sea-deep/60 border border-gold/15 p-3 text-sm rounded-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-sea-deep font-bold tracking-widest text-sm hover:bg-parchment transition-colors rounded-sm disabled:opacity-50"
            >
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>

            <p className="text-center text-xs text-parchment/50">
              Novo por aqui?{" "}
              <Link to="/cadastro" className="text-gold hover:underline">
                Inicie sua Jornada
              </Link>
            </p>
          </form>
        </div>
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}
