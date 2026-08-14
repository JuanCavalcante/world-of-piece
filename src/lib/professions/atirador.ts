import type { ProfessionData } from "./types";

export const ATIRADOR: ProfessionData = {
  id: "atirador",
  name: "Atirador",
  description:
    "Da mesma forma que existem indivíduos que dividem seu tempo livre entre o aprimoramento de suas habilidades combativas e profissionais, também há aqueles que preferem focar-se completamente em suas habilidades acerca de uma área específica do combate. Há uma enorme diferença entre um indivíduo que porta uma arma, ou que empunha uma Katana, de um indivíduo que se especializa em ser um atirador ou um espadachim. Diante dessas divergências de potencialidades, há esse caminho para aqueles que abdicam de prosseguir um caminho profissional e se especializam no caminho do tiro, da espada, ou dos punhos.\n\nDiferente das demais profissões, o nível do caminho progride de acordo com o Tier do nível do personagem, de forma que personagens de nível 10 serão considerados de Tier I, o que fará com que seu caminho, caso tenha optado por ter um, se torne de Tier I.",
  initialAbilities: [
    {
      tier: "INICIAL",
      title: "Mestre das Armas",
      body: "Quando um personagem que segue o Caminho do Atirador empunha uma arma de fogo, o potencial ofensivo do armamento estabelecido pela tabela de danos de armas é aumentado em 1, de forma que armas de Tier 0 sejam consideradas de Tier I quando empunhadas pelo personagem. Essa habilidade é limitada a armas do Tier 0 ao V. Enquanto exerce qualquer ação que desencadeia um Teste de Atirador, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0).",
    },
    {
      tier: "TIER_I",
      title: "Manter o Foco",
      body: "Ao alcançar esse Tier, os indivíduos que se aprofundam no Caminho do Atirador recebem a Ação Especial: “Manter o Foco”. Essa Ação Especial pode ser utilizada livremente, consumindo a Ação Principal do turno do atirador. Fazendo isso, ele abdica de sua ação atual para bonificar seu próximo disparo, fazendo com que a rolagem seja realizada com vantagem (Realiza duas rolagens e mantém a maior).",
    },
    {
      tier: "TIER_II",
      title: "Especialização em Disparos",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão.",
    },
    {
      tier: "TIER_III",
      title: "Especialização em Disparos",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão.",
    },
    {
      tier: "TIER_IV",
      title: "Especialização em Disparos",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão.",
    },
    {
      tier: "TIER_V",
      title: "Minha Preferida",
      body: "Ao alcançar esse nível de especialidade, o indivíduo que escolhe se aprofundar nas armas de fogo começa a ser capaz de escolher um tipo de arma para masterizar. Ao fazer isso, deverá escolher um tipo de armamento, e quando utilizando armas desse tipo, é capaz de aumentar os danos causados por elas em um Tier baseado na tabela de danos de armamentos. Essa habilidade é limitada a armas do tipo escolhido do Tier 0 ao IX. Quando utilizando armas do tipo escolhido, o personagem se torna capaz de realizar a ação de recarregar sua arma sem consumir a Ação Principal de seu turno, consumindo apenas sua Ação de Buff.",
    },
    {
      tier: "TIER_VI",
      title: "Especialização em Disparos II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão. A partir do tier VIII, O personagem deixa de receber 06 de modificador em Testes de Atirador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
    },
    {
      tier: "TIER_VII",
      title: "Especialização em Disparos II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão.",
    },
    {
      tier: "TIER_VIII",
      title: "Especialização em Disparos II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão. A partir do tier VIII, O personagem deixa de receber 06 de modificador em Testes de Atirador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
    },
    {
      tier: "TIER_IX",
      title: "Espectro em Fuga",
      body: "Alcançando este nível profissional, os sujeitos que se aprofundam no Caminho do Atirador começam a desenvolver habilidades de fuga. Com essa habilidade, após ter realizado um disparo furtivo, a próxima rolagem de esquiva do personagem poderá ser realizada com vantagem (realiza duas rolagens e mantém o maior resultado). Além disso, sempre que realizar uma Ação de Fuga, a primeira rolagem da fuga receberá um acréscimo de modificadores igual a 10% de seu modificador de Testes de Atirador.",
    },
    {
      tier: "TIER_X",
      title: "Letalidade Especializada",
      body: "Indivíduos que chegam a este nível de progressão acumulam conhecimentos acerca do uso de seus armamentos especiais, concedendo um aumento no dano final causado por golpes com armamentos do tipo especializado igual a 15%, tornando seus disparos muito mais letais.",
    },
    {
      tier: "TIER_XX",
      title: "O Atirador",
      body: "No auge de seus conhecimentos acerca do armamento em que se especializou, o personagem se torna capaz de consumir um valor de energia equivalente a 10% de sua energia máxima para adentrar em um estado temporário de foco, o que possibilita uma maior concentração no próximo disparo. Fazendo isso, o próximo disparo realizado pelo Atirador é capaz de ignorar 50% de todas as reduções a danos do personagem opositor (Com exceção de reduções provenientes de Haki). Além disso, o personagem alcança o auge de seus conhecimentos na área de especialização, recebendo +100 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Percepção ou Precisão.",
    },
  ],
  specializations: [],
};
