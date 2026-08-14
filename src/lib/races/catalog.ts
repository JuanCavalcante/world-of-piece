export type RaceCategory = "Livres" | "Conquistáveis" | "Trancadas" | "Limitadas";

export const RACE_CATEGORIES: { category: RaceCategory; races: string[] }[] = [
  {
    category: "Livres",
    races: [
      "Humanos",
      "Kujas",
      "Kumates",
      "Braços Longos",
      "Pernas Longas",
      "Meios-Gigante",
      "Gigantes",
      "Tritões",
      "Sereianos",
      "Skypeanos",
      "Tontattas",
      "Ciborgues",
      "Minks",
      "Wotans",
      "Humanos-Mink",
      "Humanos-Tritões",
      "Dolkins",
      "Saudianos",
      "Avesarianos",
      "Musas",
      "Reptilianos",
      "Zeoshtar",
    ],
  },
  {
    category: "Conquistáveis",
    races: [
      "Licantropos",
      "Drakumiras",
      "Valquírias",
      "Bucaneiros",
      "Tonttordicos",
      "Solarianos",
      "Hinoki'Al",
      "Vikings",
      "Yetis",
      "Anfites",
      "Kamistianos",
      "Açucarados",
      "Fortuniano",
      "Kitsunes",
      "Wyvern Keepers",
      "Bruxas",
      "Cursed Dolls",
      "Omari",
      "Goblins",
      "Elfos",
    ],
  },
  {
    category: "Trancadas",
    races: ["Três olhos", "Lunarianos", "Onis", "Tenryūbitos", "Modificados"],
  },
  {
    category: "Limitadas",
    races: [],
  },
];

export const RACE_LIST = RACE_CATEGORIES.flatMap((c) => c.races);

const B = "http://blob.firecast.com.br/blobs";

export const RACE_IMAGES: Record<string, string> = {
  Humanos: `${B}/TGJWBOCN_3171458/Design_sem_nome__10_.png`,
  Kujas: `${B}/NRKQJMTT_3171469/Design_sem_nome__11_.png`,
  Kumates: `${B}/FUGGCVRJ_3171487/Design_sem_nome__12_.png`,
  "Braços Longos": `${B}/SQAGVVHG_3171501/Design_sem_nome__13_.png`,
  "Pernas Longas": `${B}/RCGVPPCR_3171509/Design_sem_nome__14_.png`,
  "Meios-Gigante": `${B}/EJLBOHKD_3171513/Design_sem_nome__15_.png`,
  Gigantes: `${B}/INTODNCJ_3171542/Design_sem_nome__7_.png`,
  Tritões: `${B}/CCWEFNAS_3171567/Design_sem_nome__8_.png`,
  Sereianos: `${B}/QDDVLBTW_3171582/Design_sem_nome__9_.png`,
  Skypeanos: `${B}/EVVJHGEJ_3171646/Design_sem_nome__12_.png`,
  Tontattas: `${B}/OVEFMCQL_3171641/Design_sem_nome__11_.png`,
  Ciborgues: `${B}/WKMSCBHB_3171650/Design_sem_nome__13_.png`,
  Minks: `${B}/KSTGSBBD_3171678/Design_sem_nome__7_.png`,
  Wotans: `${B}/ADNNTMJS_3171693/Design_sem_nome__8_.png`,
  "Humanos-Mink": `${B}/TDEMEFBO_3171752/Design_sem_nome__7_.png`,
  "Humanos-Tritões": `${B}/WURINRAT_3171715/Design_sem_nome__9_.png`,
  Dolkins: `${B}/NBIGNUIC_3171775/Design_sem_nome__8_.png`,
  Saudianos: `${B}/DHWOFWFN_3171786/Design_sem_nome__9_.png`,
  Avesarianos: `${B}/TPBGQCVK_3171824/Design_sem_nome__10_.png`,
  Musas: `${B}/KHRTGSQG_3171838/Design_sem_nome__11_.png`,
  Reptilianos: `${B}/SVUGEFOE_3171856/Design_sem_nome__12_.png`,
  Zeoshtar: "https://i.postimg.cc/3RF1P3BH/Zeoshtar.png",

  Licantropos: `${B}/PMWPILIG_3171888/Design_sem_nome__14_.png`,
  Drakumiras: `${B}/UNVSMQVV_3171902/Design_sem_nome__15_.png`,
  Valquírias: `${B}/LWSCIMSG_3171924/Design_sem_nome__16_.png`,
  Bucaneiros: `${B}/WIHNEFWS_3171940/Design_sem_nome__17_.png`,
  Tonttordicos: `${B}/UHRWQJMV_3171972/Design_sem_nome__18_.png`,
  Solarianos: `${B}/BJGQBFFV_3171982/Design_sem_nome__19_.png`,
  "Hinoki'Al": `${B}/UTTKRJWE_3171992/Design_sem_nome__7_.png`,
  Vikings: `${B}/BLJGFFLG_3172107/Design_sem_nome__9_.png`,
  Yetis: `${B}/WOLPJCAS_3172126/Design_sem_nome__10_.png`,
  Anfites: `${B}/CJCLITHA_3172184/Design_sem_nome__11_.png`,
  Kamistianos: `${B}/HQOGUURK_3172193/Design_sem_nome__12_.png`,
  Açucarados: `${B}/QHURTCIM_3172195/Design_sem_nome__13_.png`,
  Fortuniano: `${B}/FQQESNSB_3172204/Design_sem_nome__14_.png`,
  Kitsunes: `${B}/JKLBINKT_3172219/Design_sem_nome__15_.png`,
  "Wyvern Keepers": "https://blob.firecast.com.br/blobs/ORWQTGHR_3455598/Wyvern_Keepers.png",
  Bruxas: "https://blob.firecast.com.br/blobs/QTQNUUSQ_3587846/Bruxa.png",
  "Cursed Dolls": "https://blob.firecast.com.br/blobs/CWPKOWCR_3499585/Cursed_Dolls.png",
  Omari: "https://i.postimg.cc/Bb023ff8/Omari-2.png",
  Goblins: "https://i.postimg.cc/TYPrRf8T/Goblins.png",
  Elfos: "https://blob.firecast.com.br/blobs/CDIQMONW_4291294/Ra_a_dos_Elfos.png",

  "Três olhos": `${B}/LONSEOTG_3171385/Design_sem_nome__10_.png`,
  Lunarianos: `${B}/GDFJIQQP_3171409/Design_sem_nome__7_.png`,
  Onis: `${B}/RRBJUPRQ_3171420/Design_sem_nome__7_.png`,
  Tenryūbitos: `${B}/QMUVHPUM_3171448/Design_sem_nome__8_.png`,
  Modificados: `${B}/QHFFFHSI_3171452/Design_sem_nome__9_.png`,
};

export function getRaceImage(race: string | null | undefined): string {
  if (!race) return "";
  return RACE_IMAGES[race] ?? "";
}

export function getRaceCategory(race: string | null | undefined): RaceCategory | null {
  if (!race) return null;
  return RACE_CATEGORIES.find((c) => c.races.includes(race))?.category ?? null;
}
