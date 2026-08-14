import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEV_ADMIN_PASSWORD } from "@/lib/admin/dev";
import { adminResetAllTcgAccounts } from "@/lib/tcg/api";

/** Botão exclusivo do painel /admindev: reseta a conta TCG de todos os jogadores. */
export function ResetAllTcgButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pwd, setPwd] = useState("");

  const reset = useMutation({
    mutationFn: adminResetAllTcgAccounts,
    onSuccess: (n) => {
      qc.invalidateQueries();
      toast.success(`${n} conta(s) do TCG resetada(s).`);
      close();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao resetar as contas."),
  });

  function close() {
    setOpen(false);
    setText("");
    setPwd("");
  }

  const canReset = text === "RESETAR" && pwd === DEV_ADMIN_PASSWORD && !reset.isPending;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-wop-red/50 px-3 py-1 text-[10px] tracking-[0.2em] uppercase text-wop-red hover:bg-wop-red/10 transition-colors"
      >
        <RotateCcw className="size-3" /> Resetar todos
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="bg-sea-deep border-wop-red/40 text-parchment">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Resetar TODOS os jogadores</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-parchment/70">
            Isso apaga nível, XP, cartas, baralhos, carteira, conquistas e progresso de{" "}
            <span className="text-wop-red">todos os jogadores</span> do WOP TCG. Digite{" "}
            <span className="text-wop-red font-semibold">RESETAR</span> e informe a senha do painel de
            desenvolvedor para confirmar.
          </p>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="RESETAR"
            className="w-full bg-sea-surface/60 border border-wop-red/30 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-wop-red"
          />
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha do /admindev"
            className="w-full bg-sea-surface/60 border border-wop-red/30 px-3 py-2.5 text-sm rounded-xl focus:outline-none focus:border-wop-red"
          />
          <button
            disabled={!canReset}
            onClick={() => reset.mutate()}
            className="w-full px-3 py-2.5 rounded-xl border border-wop-red/50 text-wop-red text-[11px] tracking-widest uppercase hover:bg-wop-red/10 disabled:opacity-40"
          >
            {reset.isPending ? "Resetando..." : "Resetar todos"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
