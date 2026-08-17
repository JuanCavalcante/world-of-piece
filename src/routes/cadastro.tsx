import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import heroShip from "@/assets/supernovas-bg.png";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!accepted) {
      setError("Você precisa aceitar os Termos de Serviço para continuar.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!isSupabaseConfigured) {
      setError(
        "Supabase ainda não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente (Vercel).",
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Se a confirmação de e-mail estiver desativada no Supabase, o signUp já
    // devolve uma sessão e o usuário entra direto no site. Caso ainda esteja
    // ativada, avisamos para checar a caixa de entrada.
    if (data.session) {
      setSuccess("Conta criada! Redirecionando...");
      setTimeout(() => navigate({ to: "/dashboard" }), 800);
    } else {
      setSuccess(
        "Cadastro criado! Verifique seu e-mail para confirmar a conta antes de entrar.",
      );
      setTimeout(() => navigate({ to: "/entrar" }), 2500);
    }
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

          <h1 className="font-display text-2xl mb-2 text-center tracking-wide">
            JUNTE-SE AO MAR
          </h1>
          <p className="text-center text-[11px] tracking-widest uppercase text-parchment/40 mb-7">
            Crie sua conta
          </p>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gold/70 mb-2">
                Nome de usuário
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="luffy_wop"
                className="w-full bg-sea-deep/60 border border-gold/15 p-3 text-sm rounded-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-sea-deep/60 border border-gold/15 p-3 text-sm rounded-sm focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-sm">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 p-3 rounded-sm">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold text-sea-deep font-bold tracking-widest text-sm hover:bg-parchment transition-colors rounded-sm disabled:opacity-50"
            >
              {loading ? "CRIANDO..." : "CRIAR CONTA"}
            </button>

            <p className="text-center text-xs text-parchment/50">
              Já possuí uma conta?{" "}
              <Link to="/entrar" className="text-gold hover:underline">
                Entrar
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
