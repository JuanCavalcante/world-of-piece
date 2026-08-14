import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { DEV_ADMIN_PASSWORD, setDevAdmin, useDevAdmin } from "@/lib/admin/dev";
import { AdminLayout, requireAdmin } from "./admin";

export const Route = createFileRoute("/admindev")({
  ssr: false,
  beforeLoad: requireAdmin,
  component: AdminDevPanel,
});

function AdminDevPanel() {
  const unlocked = useDevAdmin();
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd !== DEV_ADMIN_PASSWORD) {
      setError("Senha incorreta.");
      return;
    }
    setError(null);
    setDevAdmin(true);
  }

  if (unlocked) return <AdminLayout base="/admindev" />;

  return (
    <div className="min-h-screen bg-sea-deep text-parchment flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-wop-red/40 bg-sea-surface/50 rounded-sm p-6 space-y-5"
      >
        <div className="flex items-center gap-2 text-wop-red">
          <ShieldAlert className="size-4" />
          <span className="text-[11px] tracking-[0.3em] uppercase">Painel de desenvolvedor</span>
        </div>
        <div className="flex items-center gap-2 text-parchment/50 text-xs">
          <Lock className="size-3.5" /> Acesso restrito · /admindev
        </div>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Senha"
          className="w-full bg-sea-deep/60 border border-gold/15 px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:border-wop-red"
        />
        {error && <p className="text-xs text-wop-red">{error}</p>}
        <button
          type="submit"
          className="w-full border border-wop-red/50 py-2.5 rounded-sm text-[11px] tracking-widest text-wop-red hover:bg-wop-red/10"
        >
          ENTRAR
        </button>
      </form>
    </div>
  );
}
