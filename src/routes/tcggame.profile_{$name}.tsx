import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserRound, Save, Star, Check, Image as ImageIcon } from "lucide-react";
import { TcgPageHeader } from "@/components/tcg/tcg-shell";
import { useAuth } from "@/hooks/use-auth";
import { ensureTcgPlayer, listBanners, setMyBanner, updateMyTcgProfile, xpToNextLevel } from "@/lib/tcg/api";

export const Route = createFileRoute("/tcggame/profile_{$name}")({
  head: () => ({
    meta: [
      { title: "Perfil do Jogador — WOP TCG" },
      { name: "description", content: "Edite seu nome de exibição e sua foto de perfil no TCG World of Piece." },
      { property: "og:title", content: "Perfil do Jogador — WOP TCG" },
      { property: "og:description", content: "Edite seu nome de exibição e sua foto de perfil no TCG World of Piece." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: player } = useQuery({
    queryKey: ["tcg-player", user?.id],
    queryFn: ensureTcgPlayer,
    enabled: !!user?.id,
  });

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!player) return;
    setUsername(player.username ?? (user?.email ?? "").split("@")[0] ?? "");
    setAvatarUrl(player.avatar_url ?? "");
  }, [player?.user_id, player?.username, player?.avatar_url]);

  const save = useMutation({
    mutationFn: () => updateMyTcgProfile({ username, avatar_url: avatarUrl }),
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: banners } = useQuery({ queryKey: ["tcg-banners"], queryFn: listBanners });

  const chooseBanner = useMutation({
    mutationFn: (url: string | null) => setMyBanner(url),
    onSuccess: () => {
      toast.success("Banner aplicado ao campo de batalha!");
      qc.invalidateQueries({ queryKey: ["tcg-player", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentBanner = player?.banner_url ?? null;

  const level = player?.level ?? 1;
  const xp = player?.xp ?? 0;

  return (
    <div>
      <TcgPageHeader eyebrow="Conta" title="Perfil do Jogador" description="Defina seu nome de exibição e a URL da sua foto de perfil." />

      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-gold/20 bg-sea-surface/40 p-6 text-center">
          <div className="mx-auto size-28 rounded-full overflow-hidden border-2 border-gold/50 bg-sea-deep/60 grid place-items-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="size-full object-cover" />
            ) : (
              <UserRound className="size-10 text-gold/50" />
            )}
          </div>
          <p className="mt-4 text-sm text-parchment truncate">{username || "Jogador"}</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mt-1">
            Nível {level} · {xp}/{xpToNextLevel(level)} XP
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-parchment/40">
            <Star className="size-3 text-gold/60" /> {player?.wins ?? 0} vitórias
          </p>
        </div>

        <div className="rounded-3xl border border-gold/20 bg-sea-surface/40 p-6 space-y-5">
          <div>
            <label className="block text-[10px] tracking-[0.25em] uppercase text-gold/70 mb-2">Nome de usuário</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              className="w-full rounded-xl bg-sea-deep/60 border border-gold/20 px-4 py-2.5 text-sm text-parchment outline-none focus:border-gold/60"
              placeholder="Seu nome no TCG"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.25em] uppercase text-gold/70 mb-2">URL da foto de perfil</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-xl bg-sea-deep/60 border border-gold/20 px-4 py-2.5 text-sm text-parchment outline-none focus:border-gold/60"
              placeholder="https://..."
            />
          </div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-[11px] tracking-widest uppercase disabled:opacity-50"
          >
            <Save className="size-4" /> {save.isPending ? "Salvando..." : "Salvar perfil"}
          </button>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl tracking-wide">Banners do campo de batalha</h2>
            <p className="text-xs text-parchment/50 mt-1">
              O banner escolhido aparece como fundo apenas no seu lado do campo durante os duelos.
            </p>
          </div>
          {currentBanner && (
            <button
              onClick={() => chooseBanner.mutate(null)}
              disabled={chooseBanner.isPending}
              className="px-4 py-2 rounded-xl border border-gold/40 text-gold text-[10px] tracking-widest uppercase hover:bg-gold/10 disabled:opacity-50"
            >
              Remover banner
            </button>
          )}
        </div>

        {!banners?.length ? (
          <div className="rounded-2xl border border-dashed border-gold/25 p-10 text-center text-sm text-parchment/50">
            <ImageIcon className="size-6 mx-auto mb-3 text-gold/40" />
            Nenhum banner disponível ainda.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {banners.map((b) => {
              const active = currentBanner === b.image_url;
              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border overflow-hidden bg-sea-surface/40 ${active ? "border-gold/70" : "border-gold/20"}`}
                >
                  <div className="h-32 bg-sea-deep/70">
                    <img src={b.image_url} alt={b.name} className="size-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="text-sm text-parchment truncate">{b.name}</p>
                    <button
                      onClick={() => chooseBanner.mutate(b.image_url)}
                      disabled={chooseBanner.isPending || active}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] tracking-widest uppercase shrink-0 disabled:opacity-70 ${
                        active ? "border border-gold/50 text-gold" : "bg-gradient-primary"
                      }`}
                    >
                      {active ? (<><Check className="size-3" /> Em uso</>) : "Usar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
