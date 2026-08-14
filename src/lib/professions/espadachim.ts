import type { ProfessionData } from "./types";

export const ESPADACHIM: ProfessionData = {
  id: "espadachim",
  name: "Espadachim",
  description:
    "Da mesma forma que existem indivíduos que dividem seu tempo livre entre o aprimoramento de suas habilidades combativas e profissionais, também há aqueles que preferem focar-se completamente em suas habilidades acerca de uma área específica do combate. Há uma enorme diferença entre um indivíduo que porta uma arma, ou que empunha uma Katana, de um indivíduo que se especializa em ser um atirador ou um espadachim. Diante dessas divergências de potencialidades, há esse caminho para aqueles que abdicam de prosseguir um caminho profissional e se especializam no caminho do tiro, da espada, ou dos punhos.\n\nDiferente das demais profissões, o nível do caminho progride de acordo com o Tier do nível do personagem, de forma que personagens de nível 10 serão considerados de Tier I, o que fará com que seu caminho, caso tenha optado por ter um, se torne de Tier I.",
  initialAbilities: [
    {
      tier: "INICIAL",
      title: "Mestre das Lâminas",
      body: "Quando um personagem que segue o Caminho do Espadachim empunha uma arma laminada, o potencial ofensivo do armamento estabelecido pela tabela de danos de armas é aumentado em 1, de forma que armas de Tier 0 sejam consideradas de Tier I quando empunhadas pelo personagem. Essa habilidade é limitada a armas do Tier 0 ao V. Enquanto exerce qualquer ação que desencadeia um Teste de Espadachim, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0).",
    },
    {
      tier: "TIER_I",
      title: "Semear a Fúria",
      body: "Uma vez durante a batalha, os indivíduos que avançam o Caminho do Espadachim são capazes de adentrar um modo furioso, onde suas capacidades corporais são refinadas e levemente aprimoradas. Durante o estado de fúria, recebem um acréscimo de +10% em todos os danos causados enquanto utilizam uma arma laminada, além de receberem uma bonificação de 10% em seu acerto (Mínimo de +2). O estado de Fúria possui duração de 3 Turnos, no entanto, caso o Espadachim acerte com sucesso um golpe, essa duração é estendida em 1 Turno, até no máximo 5 Turnos de duração.",
    },
    {
      tier: "TIER_II",
      title: "Especialização em Cortes",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_III",
      title: "Especialização em Cortes",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_IV",
      title: "Especialização em Cortes",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_V",
      title: "Minha Preferida",
      body: "Ao alcançar esse nível de especialidade, o indivíduo que escolhe se aprofundar nas armas de corte começa a ser capaz de escolher um tipo de arma para masterizar. Ao fazer isso, deverá escolher um tipo de armamento, e quando utilizando armas desse tipo, é capaz de aumentar os danos causados por elas em um Tier baseado na tabela de danos de armamentos. Essa habilidade é limitada a armas do tipo escolhido do Tier 0 ao IX. Quando utilizando armas do tipo escolhido, o personagem se torna capaz de projetar cortes a distância com o manuseio padrão de seu armamento, possibilitando golpes a distância que causam 75% dos danos padrões de ataques armados sem habilidades.",
    },
    {
      tier: "TIER_VI",
      title: "Especialização em Cortes II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_VII",
      title: "Especialização em Cortes II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_VIII",
      title: "Especialização em Cortes II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor. A partir do tier VIII, O personagem deixa de receber 06 de modificador em Testes de Espadachim por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
    },
    {
      tier: "TIER_IX",
      title: "Fúria Direcionada",
      body: "De acordo com a evolução dos conhecimentos acerca das técnicas de espadachins e maestria sobre o seu próprio corpo, um indivíduo que avança nas habilidades desse caminho torna-se capaz de utilizar sua fúria de maneira controlada, utilizando o ódio gerado ao receber golpes que ocasionaram ferimentos como combustível para seu triunfo. Com essa habilidade, enquanto o personagem estiver com 25% ou menos de seus pontos de vida, ele causará 15% de dano aumentado enquanto estiver utilizando armamentos do tipo escolhido.",
    },
    {
      tier: "TIER_X",
      title: "Letalidade Especializada",
      body: "Indivíduos que chegam a este nível de progressão acumulam conhecimentos acerca do uso de seus armamentos especiais, concedendo um aumento no dano final causado por golpes com armamentos do tipo especializado igual a 15%, tornando seus cortes muito mais letais.",
    },
    {
      tier: "TIER_XX",
      title: "O Espadachim",
      body: "A Fúria contida em um indivíduo que se aprofunda no Caminho do Espadachim torna-se latente, de forma que sempre está pronta para ser liberada. Ao alcançar o auge desse caminho, o personagem se torna capaz de ativar o seu Estado de Fúria automaticamente ao receber um golpe letal. Ao adentrar no Estado de Fúria por meio dessa habilidade, o personagem irá se recusar a morrer, sobrevivendo com 1 de HP por toda duração do Estado de Fúria. Quando ativado por meio dessa habilidade, o Estado de Fúria terá a duração reduzida para 1 Turno, recebendo +1 Turno de duração toda vez que o personagem acertar um golpe com o tipo de armamento escolhido em sua especialização, totalizando no máximo 3 Turnos. Com o fim da duração, o personagem irá desmaiar, e deverá realizar testes de Vigor estipulados pelo mestre para determinar sua sobrevivência. Além disso, o personagem alcança o auge de seus conhecimentos na área de especialização, recebendo +100 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
  ],
  specializations: [],
};
