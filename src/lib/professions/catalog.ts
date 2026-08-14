import { ARMADOR } from "./armador";
import { ARTISTA } from "./artista";
import { ATIRADOR } from "./atirador";
import { BIOLOGO } from "./biologo";
import { CIENTISTA } from "./cientista";
import { COZINHEIRO } from "./cozinheiro";
import { ESPADACHIM } from "./espadachim";
import { HISTORIADOR } from "./historiador";
import { LUTADOR } from "./lutador";
import { NAVEGADOR } from "./navegador";
import { TIMONEIRO } from "./timoneiro";
import type { ProfessionData, ProfessionMeta } from "./types";


export const PROFESSION_LIST: ProfessionMeta[] = [
  {
    id: "armador",
    name: "Armador",
    hasContent: true,
    image:
      "https://i.pinimg.com/originals/b6/a0/a4/b6a0a41ec6037bf11a744626f346a325.gif",
  },
  {
    id: "artista",
    name: "Artista",
    hasContent: true,
    image: "https://media.tenor.com/ArQwCSBfIKIAAAAC/one-piece-one-piece-ambition.gif",
  },
  {
    id: "atirador",
    name: "Atirador",
    hasContent: true,
    image: "https://op-rpghb.weebly.com/uploads/2/6/1/9/26198247/992821_orig.gif",
  },
  {
    id: "biologo",
    name: "Biólogo",
    hasContent: true,
    image: "https://i.pinimg.com/originals/ae/57/57/ae57576ab1cf3a77b28e95e69a8199f1.gif",
  },
  {
    id: "cientista",
    name: "Cientista",
    hasContent: true,
    image: "https://media.tenor.com/uLEe97tKW2UAAAAM/vegapunk-vegapunk-one-piece.gif",
  },
  {
    id: "cozinheiro",
    name: "Cozinheiro",
    hasContent: true,
    image: "https://media.tenor.com/RyRSYTTNxOgAAAAM/vinsmoke-sanji-cooking.gif",
  },
  {
    id: "espadachim",
    name: "Espadachim",
    hasContent: true,
    image: "https://i.pinimg.com/originals/4d/64/08/4d6408285378256a5080815dad34d608.gif",
  },
  {
    id: "historiador",
    name: "Historiador",
    hasContent: true,
    image: "https://i.pinimg.com/originals/d1/fe/99/d1fe99a27a93fcb3d65629c1cc016c78.gif",
  },
  {
    id: "lutador",
    name: "Lutador",
    hasContent: true,
    image: "https://i.pinimg.com/originals/d3/78/9f/d3789ff69a5bc82b336720427dcccc61.gif",
  },
  {
    id: "navegador",
    name: "Navegador",
    hasContent: true,
    image:
      "https://blob.firecast.com.br/blobs/QMBOIVOB_3372723/66a1b86ebd0af0570262b90b.jpg",
  },
  {
    id: "timoneiro",
    name: "Timoneiro",
    hasContent: true,
    image:
      "https://i.ytimg.com/vi/VDfVYsyCX5E/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDHh5TA5JInDBMFaJYoCvce2gu_TA",
  },
];

const DATA: Record<string, ProfessionData> = {
  armador: ARMADOR,
  artista: ARTISTA,
  atirador: ATIRADOR,
  biologo: BIOLOGO,
  cientista: CIENTISTA,
  cozinheiro: COZINHEIRO,
  espadachim: ESPADACHIM,
  historiador: HISTORIADOR,
  lutador: LUTADOR,
  navegador: NAVEGADOR,
  timoneiro: TIMONEIRO,
};


export function getProfession(id: string | null | undefined): ProfessionData | null {
  if (!id) return null;
  return DATA[id] ?? null;
}

export function getProfessionMeta(id: string | null | undefined): ProfessionMeta | null {
  if (!id) return null;
  return PROFESSION_LIST.find((p) => p.id === id) ?? null;
}
