import type { HakiData } from "./types";

const ARMAMENTO: HakiData = {
  id: "armamento",
  name: "Haki do Armamento",
  image: "https://media.tenor.com/0KVmjCAKSKUAAAAC/luffy-wano-episode945-luffy.gif",
  description: `O Haki do Armamento, também conhecido como Busoshoku Haki, é uma técnica avançada que permite ao usuário envolver seu corpo ou objetos em uma poderosa força invisível. Quando ativado, o Haki do Armamento fortalece consideravelmente a estrutura física do usuário, tornando-o muito mais resistente a danos e aumentando a força de seus ataques. Essa técnica é especialmente útil em combate, pois permite que o usuário ataque diretamente inimigos que normalmente seriam intangíveis ou imunes a ataques físicos, como os portadores de akumas no mi do tipo Logia, que podem transformar seus corpos em elementos naturais como fogo, gelo, ou eletricidade. Além de endurecer a superfície da pele, o Haki do Armamento também pode ser concentrado em armas ou partes específicas do corpo, criando uma defesa impenetrável e potencializando a capacidade de romper defesas aparentemente invulneráveis.

Cláusula Haki VS Ausência de Haki: Caso o Busoshoku Haki seja utilizado, ofensivamente ou defensivamente, para alvejar um indivíduo que, em resposta, não utiliza o Busoshoku Haki, todos os valores de adições ou reduções de danos provenientes do uso do Haki são dobrados. Dessa forma, um Busoshoku Haki Tier II atingindo um indivíduo sem redução de Haki aumenta o dano causado em 20%, em vez do acréscimo de 10% padrão.

Cláusula Haki VS Akuma: Caso o Busoshoku Haki seja utilizado defensivamente para anular as potencialidades do efeito adverso de uma Akuma no Mi, se o usuário da Akuma no Mi utilizar Busoshoku Haki em pelo menos um tier superior ao do defensor juntamente à aplicação do efeito da Akuma, o Busoshoku Haki defensivo (em Tier equivalente ou inferior) não será suficiente para anular a aplicação inimiga.

Cláusula Haki + Akuma: Caso o Busoshoku Haki seja utilizado por um usuário de Logia, a parte do corpo aprimorada pelo Haki se solidifica, perdendo completamente os benefícios defensivos concedidos pela Akuma no Mi. Por conta disso, qualquer dano sobressalente à redução do Haki utilizado irá repercutir diretamente no corpo do usuário.`,
  abilities: [
    {
      tier: "TIER_II",
      title: "Endurecimento",
      body: `O personagem é capaz de consumir sua própria energia espiritual para banhar seu corpo ou algum objeto com uma invisível camada de Haki, como uma armadura, que auxilia em reduzir os danos recebidos ou em aumentar os danos causados pelo impacto da área em questão. Para utilizar o Endurecimento, o personagem precisará consumir 05 de Haki, e receberá uma porcentagem de aumento de dano causado ou de diminuição de dano recebido, de acordo com o seu Tier de Busoshoku Haki. Além disso, golpes utilizando o Endurecimento são capazes de ultrapassar a defesa natural de Logias e outras Akuma no Mi similares, permitindo que os personagens consigam danificar o corpo de usuários dessas frutas diretamente.

Ofensivo
Tier II: +10% no dano causado.
Tier III: +20% no dano causado.
Tier IV: +30% no dano causado.
Tier V: +40% no dano causado.
Tier VI: +50% no dano causado.
Tier VII: +60% no dano causado.
Tier VIII: +70% no dano causado.
Tier IX: +80% no dano causado.
Tier X: +90% no dano causado.
Tier XX: +100% no dano causado.

Defensivo
Tier II: -10% no dano recebido.
Tier III: -20% no dano recebido.
Tier IV: -30% no dano recebido.
Tier V: -40% no dano recebido.
Tier VI: -50% no dano recebido.
Tier VII: -60% no dano recebido.
Tier VIII: -70% no dano recebido.
Tier IX: -80% no dano recebido.
Tier X: -90% no dano recebido.
Tier XX: -100% no dano recebido.`,
    },
    {
      tier: "TIER_IV",
      title: "Destruição ao Contato",
      body: `O personagem se torna capaz de atribuir um novo efeito ao Endurecimento, possibilitando que seu uso defensivo seja capaz de interagir diretamente com tudo aquilo que o toca. Após a aquisição dessa habilidade, o Endurecimento proveniente do Haki do personagem é capaz de despertar a Destruição ao Contato. Quando um armamento entra em contato com o corpo revestido em Haki do usuário, caso o armamento não esteja imbuído com um nível de Busoshoku Haki de 2 ou + Tiers inferiores ao Busoshoku Haki defensivo do usuário, o armamento irá estilhaçar devido à maior resistência do corpo do personagem defensor.`,
    },
    {
      tier: "TIER_V",
      title: "Manto Armamentista",
      body: `Ao alcançar esse nível de controle sobre o Haki do Armamento, o usuário torna-se capaz de queimar suas reservas espirituais para manter uma película de Haki ao redor de seu corpo. Apesar dessa película ser tratada como uma camada praticamente invisível de energia espiritual, essa é uma técnica considerada proveniente do Haki do Armamento. Quando faz isso, o corpo do personagem se torna oculto pela película espiritual, interferindo diretamente contra outros métodos de investigação por meios derivados de Haki. Quando um personagem com o Sensoriamento de Presença do Haki da Observação tenta detectar um personagem que está furtivo e fazendo uso do Manto Armamentista, em vez de ter um sucesso automático na detecção, essa interação ocasiona um Teste Oposto de Percepção vs Furtividade. Para ativar o Manto Armamentista, o personagem precisa consumir 20 de Haki, e deve manter o consumo de 10 de Haki por turno para mantê-lo ativo. Consome-se uma Ação de Buff para ativar e desativar o Manto Armamentista, e enquanto ele estiver ativo, o usuário é incapaz de utilizar o Endurecimento.`,
    },
    {
      tier: "TIER_VI",
      title: "Emissão de Haki",
      body: `Conforme evolui o seu Tier de Busoshoku Haki, o personagem recebe novas capacidades e habilidades acerca desse tipo de Haki. Nesse nível, o personagem se torna capaz de realizar uma Emissão de Haki defensivamente. Essa habilidade deve ser utilizada de maneira reativa ao recebimento de um golpe, e para isso, consome-se 100 de Haki. Ao declarar o uso, o personagem poderá realizar uma emissão de Haki pelas palmas de suas mãos, tentando rebater o golpe e lançar o atacante (em caso de golpes corpo-a-corpo) para longe. Fazendo isso, o personagem é capaz de defender-se com uma rolagem de Combate, substituindo a rolagem de defesa/esquiva padrão.`,
    },
    {
      tier: "TIER_VII",
      title: "Anulação de Efeitos",
      body: `O uso do Busoshoku Haki do personagem recebe mais uma característica, sendo ela a capacidade de anular efeitos diversos de Akumas no Mi. Por padrão, o uso do Busoshoku Haki já antagoniza a proteção concedida por Akumas como Logias e similares, contudo, essa habilidade permite que o personagem defenda-se dos efeitos de Akumas por meio do seu Haki, permitindo que anule as interações que os frutos teriam com seu corpo ou golpes. Para anular os efeitos diversos de uma Akuma no Mi, o personagem deverá utilizar Busoshoku Haki em Tier equivalente ou superior ao Busoshoku Haki imbuído no ataque de Akuma causador do efeito.`,
    },
    {
      tier: "TIER_VIII",
      title: "Defesa Espontânea",
      body: `Ao atingir esse Tier de controle sobre o Busoshoku Haki, o personagem começa a ser capaz de realizar o uso do Endurecimento mesmo em situações adversas, onde não consegue notar os golpes inimigos. Nesse nível, o espírito do usuário é forte o suficiente para protegê-lo em todos os momentos, e mesmo diante de golpes furtivos ou golpes recebidos enquanto inconsciente, desde que possua Haki suficiente, o usuário será capaz de realizar o uso do Endurecimento para proteger o bem estar de seu corpo.`,
    },
    {
      tier: "TIER_XX",
      title: "Destruição Interna",
      body: `Para utilizar a Destruição Interna, o personagem deverá consumir Haki equivalente ao uso da Emissão, e além disso, deverá consumir energia em um valor equivalente a 25% de sua Energia Máxima. Fazendo isso, o próximo golpe do personagem será capaz de emitir o espírito do usuário para o interior do alvo do golpe, e caso suceda em seu acerto, será capaz de danificá-lo internamente, causando todo o dano do golpe como dano interno irredutível.`,
    },
  ],
};

const OBSERVACAO: HakiData = {
  id: "observacao",
  name: "Haki da Observação",
  image: "https://i.makeagif.com/media/7-02-2023/oOK6wu.gif",
  description: `O Haki da Observação, também chamado de Kenbunshoku Haki, é uma habilidade sensorial extraordinária que concede ao usuário uma percepção aprimorada do ambiente ao seu redor. Essa técnica permite ao usuário prever os movimentos e ataques de seus oponentes com grande precisão, captando as intenções e emoções alheias antes mesmo que eles ajam. Além disso, o Haki da Observação possibilita sentir a presença de seres vivos, como pessoas e animais, independentemente de estarem escondidos, camuflados, ou a grandes distâncias. Em combate, essa habilidade é inestimável, pois permite que o usuário antecipe e evite ataques com agilidade e precisão quase sobrenaturais, ao mesmo tempo em que cria oportunidades estratégicas para contra-atacar com eficácia. O domínio mais avançado desse Haki pode até mesmo permitir que o usuário perceba um breve vislumbre do futuro, antecipando eventos com segundos de antecedência.`,
  abilities: [
    {
      tier: "TIER_II",
      title: "Aptidão ao Sensoriamento",
      body: `O Sensoriamento provido pelo Kenbunshoku Haki é dividido entre quatro categorias: Sensoriamento de Presenças, Intenções, Força e Emoções. Cada uma dessas categorias concede ao personagem um tipo diferente de sensoriamento, alvejando áreas distintas do comportamento dos seres vivos. Quando o personagem começa a ter uma certa aptidão ao sensoriamento, ele torna-se capaz de treinar seus sentidos para desenvolver uma das quatro áreas de sensoriamento do Kenbunshoku Haki. Esse treinamento pode ser realizado individualmente ou com um treinador capacitado.

Tempo = 180 (Horas) - 0,2 × Inteligência Base
Bônus de Instrutor: 20% a 50% de redução no tempo total.

Observação: Enquanto utiliza o Haki da Observação focado em um alvo, o personagem mantém alta concentração nesse alvo e por isso não detecta movimentos de outros indivíduos próximos. Nessa visão em túnel, o usuário fica extremamente suscetível a ações oportunas de terceiros, sendo incapaz de reagir aos movimentos deles.

Sensoriamento de Presença — alcance por Tier:
Tier II: 25 m · Tier III: 60 m · Tier IV: 135 m · Tier V: 200 m · Tier VI: 275 m · Tier VII: 375 m · Tier VIII: 500 m · Tier IX: 1 km · Tier X: 2 km · Tier XX: 2,5 km.
Consumindo 15 de Haki e mantendo-se estático, o alcance é multiplicado por 10.

Sensoriamento de Intenções — bônus nos modificadores:
Tier II: +10% · III: +20% · IV: +30% · V: +40% · VI: +50% · VII: +60% · VIII: +70% · IX: +80% · X: +90% · XX: +100%.
Ativação: 10 de Haki + 10 por turno (Ação de Buff para ligar/desligar).

Sensoriamento de Força: sobreposto ao de Presenças, sem custo de Haki, exige imobilidade. Permite identificar o Nível do alvo, o Tier de um armamento ou o Tier do Haki mais poderoso do alvo.

Sensoriamento de Emoções: sobreposto ao de Presenças. Permite decifrar as emoções mais abundantes de um indivíduo. Alvos podem resistir com Teste Opositor (Inteligência ou Carisma) vs Força de Vontade do usuário do Haki.`,
    },
    {
      tier: "TIER_XX",
      title: "Vislumbre do Futuro",
      body: `Poucos indivíduos são capazes de evoluir seu Kenbunshoku Haki o suficiente para adquirir essa característica. Os que o fazem tornam-se capazes de realizar uma leitura do futuro próximo, evitando completamente golpes ou situações desvantajosas. Requer calma e foco; agitação mental impede a leitura. Concede reação de sucesso garantido contra qualquer acontecimento que o usuário consiga detectar por algum sentido, desde que ainda haja meios físicos de reagir. Anulado por outro usuário com esta habilidade em nível semelhante.

Tier XX: até 2 segundos no futuro.
Tier XX.I: até 4 segundos.
Tier XX.II: até 6 segundos.
Tier XX.III: até 8 segundos.
Tier XX.IV: até 10 segundos.`,
    },
  ],
};

const CONQUISTADOR: HakiData = {
  id: "conquistador",
  name: "Haki do Conquistador",
  image: "https://media.tenor.com/fep5_H3WNy8AAAAM/haki-luffy.gif",
  description: `O Haki do Conquistador, também conhecido como Haoshoku Haki, é o tipo mais raro e poderoso de Haki, reservado apenas para aqueles com uma vontade excepcionalmente forte e um espírito indomável. Diferente dos outros tipos de Haki, que podem ser treinados e aprimorados, o Haki do Conquistador é uma habilidade inata, presente apenas em uma pequena parcela da população, o que o torna uma marca de líderes e guerreiros excepcionais. Esta técnica permite ao usuário projetar sua própria força de vontade em ondas avassaladoras que afetam diretamente a psique de outras pessoas ao seu redor. Ao liberar o Haki do Conquistador, o usuário pode dominar a força de vontade de seus oponentes, fazendo-os perder a capacidade de se mover, paralisando-os de medo ou até mesmo nocauteando-os instantaneamente, dependendo da diferença de poder entre o usuário e seus alvos.`,
  abilities: [
    {
      tier: "TIER_II",
      title: "Dominação",
      body: `Indivíduos que despertam o Haoshoku Haki são capazes de realizar a emissão de sua Força de Vontade contra indivíduos próximos. Nesse nível, consome-se 25 de Haki para exercer pressão contra um animal próximo, a partir do contato visual. O usuário força um confronto entre seu modificador de Haki do Rei (Força de Vontade/2 + Espírito/2) contra a Força de Vontade do animal alvo. Caso o animal falhe, ficará à mercê da vontade do usuário, podendo ser forçado à fuga ou à dominação temporária (até 5 turnos em combate ou 1 hora em roleplay).`,
    },
    {
      tier: "TIER_IV",
      title: "Incapacitação",
      body: `Ao utilizar, o usuário consome 50 de Haki e atinge todos em um raio ao seu redor com a Incapacitação. O usuário rola Haki do Conquistador (Força de Vontade/2 + Espírito/2) e todos os atingidos rolam Força de Vontade contra essa dificuldade. Quem falhar fica completamente inconsciente.

Metragem de Incapacitação:
Tier II: 55 m · Tier III: 120 m · Tier IV: 275 m · Tier V: 400 m · Tier VI: 550 m · Tier VII: 750 m · Tier VIII: 1 km · Tier IX: 2 km · Tier X: 4 km · Tier XX: 5 km · Tier XX.I: 10 km · Tier XX.II: 15 km · Tier XX.III: 20 km · Tier XX.IV: 25 km.

Observação: Quando há confronto entre duas emissões de Haki do Rei, a de menor eficácia reduz a Dificuldade para suportar a de maior eficácia em valor equivalente à sua rolagem de potência.`,
    },
    {
      tier: "TIER_VI",
      title: "Incapacitação Seletiva",
      body: `Conforme evolui seu controle sobre o Haki do Conquistador, o usuário torna-se capaz de designar alvos específicos dentro de seu alcance, mantendo aliados livres do efeito adverso de sua abundante Força de Vontade.`,
    },
    {
      tier: "TIER_VIII",
      title: "Incapacitação Espontânea",
      body: `Quando o usuário fica inconsciente, se algum indivíduo hostil se aproximar de seu corpo, ele realiza imediatamente a emissão de seu Haki do Conquistador com a característica Incapacitante contra todos os hostis no alcance máximo. Essa emissão ocorre incessantemente até que as reservas de Haki do corpo do usuário fiquem completamente zeradas.`,
    },
    {
      tier: "TIER_XX",
      title: "Infusão",
      body: `O usuário torna-se capaz de consumir 150 de suas reservas de Haki para infusionar um golpe com sua Força de Vontade, recebendo um aumento no dano causado equivalente à sua Força de Vontade. O golpe infusionado pode também receber Haki do Armamento, culminando em golpes capazes de dizimar ilhas. A infusão também pode ser utilizada defensivamente.

Observação: Quando há confronto entre dois golpes munidos em Haki do Conquistador, uma onda de choque resulta da interação, lançando para longe tudo ao redor, com força equivalente à combinação de Haki dos envolvidos.`,
    },
  ],
};

export const HAKI_LIST: HakiData[] = [ARMAMENTO, OBSERVACAO, CONQUISTADOR];

export function getHaki(id: string): HakiData | null {
  return HAKI_LIST.find((h) => h.id === id) ?? null;
}
