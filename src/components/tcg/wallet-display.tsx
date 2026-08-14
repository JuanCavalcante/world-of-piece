import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getMyWallet, RARITY_FRAGMENT, type TcgWallet } from "@/lib/tcg/wallet";
import { RARITIES, RARITY_LABEL, type Rarity } from "@/lib/tcg/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Gem, FlaskConical } from "lucide-react";

export const WALLET_QUERY_KEY = "tcg-wallet";

export function WalletDisplay() {
  const { user } = useAuth();
  const { data: wallet } = useQuery({
    queryKey: [WALLET_QUERY_KEY, user?.id],
    queryFn: getMyWallet,
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  const totalFragments = wallet
    ? (wallet.common_fragments +
        wallet.uncommon_fragments +
        wallet.rare_fragments +
        wallet.epic_fragments +
        wallet.legendary_fragments)
    : 0;
  const essence = wallet?.essence ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Fragmentos — azul, popover por raridade */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs transition-colors hover:border-sky-400/50 hover:bg-sky-500/15">
            <Gem className="size-3.5 text-sky-400" />
            <span className="font-display tabular-nums text-sky-300">{totalFragments}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0 bg-sea-surface/95 backdrop-blur-xl border-gold/20 text-parchment shadow-2xl overflow-hidden" align="end">
          <div className="p-3 border-b border-gold/10 bg-sea-deep/40">
            <p className="text-[10px] tracking-[0.25em] uppercase text-sky-400">Fragmentos de Carta</p>
          </div>
          <div className="p-2 space-y-1">
            {RARITIES.map((r: Rarity) => (
              <div
                key={r}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-gold/5 transition-colors"
              >
                <span className="text-xs text-parchment/80">{RARITY_LABEL[r]}</span>
                <span className="text-xs font-display tabular-nums text-sky-300">
                  {wallet ? (wallet[RARITY_FRAGMENT[r]] as number) : 0}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Essência — roxo */}
      <div className="flex items-center gap-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1.5 text-xs">
        <FlaskConical className="size-3.5 text-fuchsia-400" />
        <span className="font-display tabular-nums text-fuchsia-300">{essence}</span>
      </div>
    </div>
  );
}
