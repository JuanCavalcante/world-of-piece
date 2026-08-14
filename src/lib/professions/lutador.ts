import type { ProfessionData } from "./types";

export const LUTADOR: ProfessionData = {
  id: "lutador",
  name: "Lutador",
  description:
    "Da mesma forma que existem indivíduos que dividem seu tempo livre entre o aprimoramento de suas habilidades combativas e profissionais, também há aqueles que preferem focar-se completamente em suas habilidades acerca de uma área específica do combate. Há uma enorme diferença entre um indivíduo que porta uma arma, ou que empunha uma Katana, de um indivíduo que se especializa em ser um atirador ou um espadachim. Diante dessas divergências de potencialidades, há esse caminho para aqueles que abdicam de prosseguir um caminho profissional e se especializam no caminho do tiro, da espada, ou dos punhos.\n\nDiferente das demais profissões, o nível do caminho progride de acordo com o Tier do nível do personagem, de forma que personagens de nível 10 serão considerados de Tier I, o que fará com que seu caminho, caso tenha optado por ter um, se torne de Tier I.",
  initialAbilities: [
    {
      tier: "INICIAL",
      title: "Mestre dos Punhos",
      body: "Quando um personagem que segue o Caminho do Lutador realiza um golpe de “multi-hit”, ele receberá um aumento no dano causado igual a 10% caso o acerto anterior seja um sucesso, acumulando-se até um máximo de 50% de dano adicional. Além disso, o personagem é capaz de transformar o acerto de um golpe realizado em um Multi-hit de 2 rolagens, dividindo seu dano igualmente entre as duas. Enquanto exerce qualquer ação que desencadeia um Teste de Lutador, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0).",
    },
    {
      tier: "TIER_I",
      title: "Recuperar o Fôlego",
      body: "Duas vezes durante uma batalha, os indivíduos que escolhem trilhar o Caminho do Lutador são capazes de controlar o seu fôlego e realizam um método de respiração específico que possibilita a recuperação de suas reservas de energia. Ao realizar esse movimento, o Lutador irá consumir sua Ação de Buff e receberá uma regeneração de energia equivalente ao seu Vigor. Depois de realizar a ação de recuperar o fôlego, o personagem deverá esperar um turno até conseguir realizá-la novamente.",
    },
    {
      tier: "TIER_II",
      title: "Especialização em Luta",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_III",
      title: "Especialização em Luta",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_IV",
      title: "Especialização em Luta",
      body: "Quando o personagem atinge qualquer um desses Tiers (II, III e IV), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +20 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_V",
      title: "Aprimoramento Sequencial",
      body: "Conforme avança no caminho do lutador, o personagem se torna ainda mais capacitado na realização de golpes multifacetados, capazes de surpreender seus oponentes com diversas instâncias certeiras. Sempre que o personagem realizar um golpe de multi-hit, ele irá receber uma bonificação de acerto referente a quantidade de acertos sucedidos do golpe em questão (Caso um golpe tenha multi-hit 5, depois de acertar 3 instâncias do golpe, a próxima instância recebe +3 de acerto). Além disso, o personagem é capaz de transformar o acerto de um golpe realizado em um Multi-hit de 3 rolagens, dividindo seu dano igualmente entre as três.",
    },
    {
      tier: "TIER_VI",
      title: "Especialização em Luta II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_VII",
      title: "Especialização em Luta II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
    {
      tier: "TIER_VIII",
      title: "Especialização em Luta II",
      body: "Quando o personagem atinge qualquer um desses Tiers (VI, VII e VIII), a sua especialização nesse caminho combativo concede a ele um acréscimo de Slots de Pontos de Treino. O personagem irá imediatamente receber +40 Slots de Ponto de Treino, recebendo imediatamente diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor. A partir do tier VIII, O personagem deixa de receber 06 de modificador em Testes de Lutador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
    },
    {
      tier: "TIER_IX",
      title: "Resiliência Indomável",
      body: "Conforme evoluem, os indivíduos que se aprofundam no Caminho do Lutador se tornam ainda mais peritos em se manter de pé em batalhas fervorosas. Alcançando esse Tier, o personagem passa a ser capaz de utilizar a ação de \"Recuperar o Fôlego\" duas vezes a mais durante a luta, e sempre que utiliza a ação de Recuperar o Fôlego seu vigor energiza seu corpo, fazendo com que o próximo golpe recebido pelo personagem tenha uma redução de 15% do dano causado.",
    },
    {
      tier: "TIER_X",
      title: "Letalidade Especializada",
      body: "Indivíduos que chegam a este nível de progressão acumulam conhecimentos acerca do uso de golpes multifacetados, concedendo um aumento no dano final causado por golpes com múltiplas instâncias de acerto igual a 15%, tornando esses golpes muito mais letais.",
    },
    {
      tier: "TIER_XX",
      title: "O Lutador",
      body: "Alcançando o auge de seus conhecimentos acerca de métodos combativos, o personagem especializado no Caminho do Lutador consegue utilizar o seu próprio corpo com uma perícia inigualável, se transformando em um verdadeiro tanque de guerra no campo de batalha. A partir desse nível, o personagem é capaz de transformar o acerto de um golpe realizado em um Multi-hit de 5 rolagens, dividindo seu dano igualmente entre as cinco. Além disso, depois que o personagem utilizar todas suas ações de Recuperar o Fôlego disponíveis, ele é capaz de continuar utilizando a ação de Recuperar o Fôlego, contudo, ela começa a consumir a Ação Principal de seu turno. Além disso, o personagem alcança o auge de seus conhecimentos na área de especialização, recebendo +100 Slots de Ponto de Treino, recebendo imediatamente metade disso diretamente como Pontos de Treino, sendo limitado a alocar os pontos desses Slots de Treino entre Agilidade, Combate, Força ou Vigor.",
    },
  ],
  specializations: [],
};
