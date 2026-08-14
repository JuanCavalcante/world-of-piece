import type { ProfessionData } from "./types";

export const COZINHEIRO: ProfessionData = {
  id: "cozinheiro",
  name: "Cozinheiro",
  description:
    "Os cozinheiros são indivíduos que se especializam no preparo de alimentos e refeições harmônicas e reconfortantes, que apaziguam a fome e os sentimentos daqueles que as saboreiam.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Cozinheiro, e eventualmente podem se especializar e se tornar Gastrônomo ou Coqueteleiro.\n\nCaso se torne um Gastrônomo, evolui para o domínio Confeiteiro ou Mestre Cuca.\n\nCaso se torne um Coqueteleiro, evolui para o domínio Alquimista dos Drinks ou Mixologista Maestral.",
  initialAbilities: [
    { tier: "INICIAL", title: "Entrada", body: "Os cozinheiros são profissionais que se encarregam de alimentar outros indivíduos com refeições saborosas e reconfortantes. Inicialmente, os cozinheiros são capazes de realizar Testes de Cozinheiro para aprender até 10 receitas, com a dificuldade sendo determinada pela própria receita. Enquanto exerce qualquer ação que desencadeia um Teste de Cozinheiro, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0)." },
    { tier: "TIER_I", title: "Análise Gastronômica", body: "O cozinheiro recebe a capacidade de identificar alimentos com base em seus estudos, além de conseguir determinar o prazo de validade através do tato e cheiro. Sempre que desejar identificar um alimento ou determinar seu prazo de validade, se faz necessário um Teste de Cozinheiro com Dificuldade 17." },
    { tier: "TIER_II", title: "Aprendiz de Chef", body: "Ao atingir esse Tier, se torna apto a realizar um Teste de Cozinheiro no momento em que reproduz uma receita de comida, para determinar a qualidade de sua criação. Em resultados superiores a 30, o cozinheiro conseguiu reproduzir o prato (salgado ou doce) com qualidade, aumentando em 20% todos os bônus concedidos ao ser consumido." },
    { tier: "TIER_III", title: "Aprendiz de Barman", body: "O cozinheiro passa a se tornar mais apto no preparo de bebidas. Ao atingir esse tier, se torna capaz de realizar um Teste de Cozinheiro no momento que reproduz uma receita de bebida. Em resultados superiores a 36, o cozinheiro conseguiu reproduzir a bebida (harmônica ou instável) com qualidade, aumentando em 25% todos os bônus e deméritos concedidos ao ser consumida." },
  ],
  specializations: [
    {
      id: "gastronomo",
      name: "Gastrônomo",
      description:
        "Os Gastrônomos são cozinheiros que se dedicam a aprimorar seus conhecimentos acerca do preparo de pratos doces e salgados, abdicando de suas técnicas de preparo de bebidas. Por padrão, os pratos salgados concedem bonificações físicas, enquanto os pratos doces concedem bonificações mentais.",
      abilities: [
        { tier: "TIER_IV", title: "Prato Principal", body: "Ao escolher a especialização Gastrônomo, o cozinheiro renega o mundo das bebidas e começa a focar completamente no aprendizado de receitas de pratos. Recebe a capacidade de criar suas próprias receitas de pratos simples, além de ampliar sua capacidade de aprendizado — pratos simples ilimitados e até 10 receitas de pratos moderados." },
        { tier: "TIER_V", title: "Não mais um Aprendiz", body: "Ao realizar um Teste de Cozinheiro pela habilidade “Aprendiz de Chef”, caso a rolagem alcance 45 ou superior, o prato possuirá 40% de bonificação em seus bônus, mantendo a bonificação de 20% para resultados inferiores a 45 e superiores a 30." },
        { tier: "TIER_VI", title: "Mão na Massa", body: "Quando o gastrônomo prepara uma receita simples que ele mesmo desenvolveu, além da rolagem do “Aprendiz de Chef”, ele receberá a possibilidade de realizar mais um Teste de Cozinheiro. Em resultados superiores a 50, o gastrônomo consegue otimizar os ingredientes e transforma o que seria apenas um prato em dois, mantendo a bonificação para ambos." },
        { tier: "TIER_VII", title: "Banquete de Guerra", body: "O cozinheiro se torna capaz de organizar um grande banquete, preparando pelo menos 6 pratos (3 diferentes) para número de indivíduos igual à metade do número de pratos. Todos os participantes recebem as bonificações de todos os pratos servidos, uma vez por tipo de prato. Requer um dia de preparação e só pode ser usado a cada cinco sessões." },
      ],
      domains: [
        {
          id: "confeiteiro",
          name: "Confeiteiro",
          description:
            "O Confeiteiro é um domínio do gastrônomo, onde o cozinheiro se aprofunda ainda mais nas técnicas de confeitaria e na confecção de pratos doces, renegando seus conhecimentos sobre pratos salgados.",
          abilities: [
            { tier: "TIER_VIII", title: "Sobremesa", body: "O cozinheiro passa a conseguir aprender ilimitadas receitas de pratos doces de nível Moderado, e recebe a capacidade de aprender até 10 receitas de pratos doces de nível complexo. Nesse nível, o confeiteiro consegue criar seus próprios pratos doces de nível moderado. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Prato Assinatura", body: "O cozinheiro adquire a capacidade de criar perfeitamente uma receita de sua autoria, não mais necessitando de rolagens para “Aprendiz de Chef” e “Mão na Massa”, sempre recebendo a maior bonificação. Quando o cozinheiro realizar o preparo de seu Prato Assinatura, ele receberá automaticamente 5 de Experiência, com um limite de três vezes por sessão." },
            { tier: "TIER_X", title: "Ordens do Confeiteiro", body: "Em combate, o cozinheiro pode conceder ordens a três aliados distintos alvejados por um ataque de área: “Cristalize” concede vantagem na defesa; “Glaceie” permite agarrar outro aliado e usar sua rolagem de esquiva; “Misture” concede vantagem na esquiva. Caso a ordem anterior tenha sucesso, a seguinte recebe +1 vantagem. Uma vez por batalha; consome a próxima ação do cozinheiro." },
            { tier: "TIER_XX", title: "Toque Angelical", body: "O cozinheiro adquire a habilidade de criar suas próprias receitas doces complexas e remove todos os limites. Pode criar um segundo prato assinatura de nível complexo. Adquire conhecimentos suficientes para desenvolver um prato de nível “Divino”, que permite que um indivíduo, ao prová-lo pela primeira vez, receba bonificações permanentes." },
          ],
        },
        {
          id: "mestre_cuca",
          name: "Mestre Cuca",
          description:
            "O Mestre Cuca é um domínio do gastrônomo, onde o cozinheiro se aprofunda ainda mais nas técnicas de cozinha e na confecção de pratos salgados, renegando seus conhecimentos sobre pratos doces.",
          abilities: [
            { tier: "TIER_VIII", title: "Mestre Preparador", body: "O cozinheiro passa a conseguir aprender ilimitadas receitas de pratos salgados Moderados e até 10 receitas de pratos salgados complexos. Consegue criar seus próprios pratos salgados de nível moderado. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Prato Assinatura", body: "O cozinheiro adquire a capacidade de criar perfeitamente uma receita de sua autoria, sempre com a maior bonificação. Ao preparar seu Prato Assinatura, receberá automaticamente 5 de Experiência, com um limite de três vezes por sessão." },
            { tier: "TIER_X", title: "Ordens do Mestre Cuca", body: "Em combate, o Mestre Cuca dá três ordens a aliados distintos: “Amacie” (golpe contundente), “Fatie” (golpe cortante), “Flambe” (disparo à distância). Caso a ordem anterior tenha acertado, a seguinte causa 50% de dano adicional. Uma vez por batalha; consome apenas o turno do cozinheiro." },
            { tier: "TIER_XX", title: "Toque Angelical", body: "O mestre cuca cria receitas salgadas complexas ilimitadas, um segundo prato assinatura de nível complexo, e desenvolve um prato de nível “Divino” que concede bonificações permanentes ao ser provado pela primeira vez." },
          ],
        },
      ],
    },
    {
      id: "coqueteleiro",
      name: "Coqueteleiro",
      description:
        "Os Coqueteleiros são cozinheiros que se dedicam a aprimorar seus conhecimentos acerca do preparo de bebidas instáveis e harmônicas, abdicando de suas técnicas de preparo de comidas.",
      abilities: [
        { tier: "TIER_IV", title: "Enchendo a Taça", body: "Ao escolher a especialização Coqueteleiro, o cozinheiro renega o mundo das comidas. Recebe a capacidade de criar suas próprias receitas de bebidas simples, ampliando seu aprendizado — bebidas simples ilimitadas e até 10 receitas de bebidas moderadas." },
        { tier: "TIER_V", title: "Não mais um Aprendiz", body: "Ao realizar um Teste de Cozinheiro por “Aprendiz de Barman”, caso alcance 45 ou superior, a bebida possuirá 40% de bonificação em seus bônus e deméritos, mantendo 20% para resultados inferiores a 45 e superiores a 30." },
        { tier: "TIER_VI", title: "Mão na Massa", body: "Quando o coqueteleiro prepara uma receita simples que ele mesmo desenvolveu, receberá a possibilidade de realizar mais um Teste. Em resultados superiores a 50, otimiza os ingredientes e transforma uma bebida em duas." },
        { tier: "TIER_VII", title: "Festa da Bebida", body: "O cozinheiro organiza uma grande festa celebrativa preparando pelo menos 6 bebidas distintas, para número de indivíduos igual à metade das bebidas. Todos os participantes recebem +50% de Experiência recebida pelos feitos que ocasionaram na Festa. Requer um dia de preparação e só pode ser usada a cada cinco sessões." },
      ],
      domains: [
        {
          id: "alquimista_drinks",
          name: "Alquimista dos Drinks",
          description:
            "O Alquimista dos Drinks é um domínio do coqueteleiro, onde o cozinheiro se aprofunda ainda mais na criação de bebidas instáveis, renegando seus conhecimentos sobre bebidas harmônicas.",
          abilities: [
            { tier: "TIER_VIII", title: "Goles Turbulentos", body: "O cozinheiro passa a conseguir aprender ilimitadas receitas de bebidas instáveis de nível Moderado, e até 10 de nível complexo. Consegue criar suas próprias bebidas instáveis moderadas. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Trimaluco", body: "O Alquimista dos Drinks consegue misturar até três drinks para fazer uma mistura ainda mais instável (50% dos efeitos de cada). Em batalha consome a ação principal; fora de batalha o drink dura 1 hora. Além disso, as bebidas instáveis do Alquimista deixam de perder 50% de eficácia em aplicações não-orais, passando a perder apenas 25%." },
            { tier: "TIER_X", title: "Confissão Alcoólica", body: "Ao interagir com um indivíduo que esteja bebendo uma de suas bebidas, o cozinheiro passa a ser capaz de substituir qualquer teste de carisma por teste de cozinheiro, tornando-se mais apto a fazer com que o indivíduo compartilhe segredos e fatos obscuros." },
            { tier: "TIER_XX", title: "Toque Demoníaco", body: "O cozinheiro cria bebidas instáveis complexas ilimitadas e passa a ser capaz de criar uma única receita de nível “Demoníaco”, capaz de espalhar caos e destruição no campo de batalha, causando grandes deméritos por longo período. Cuidado: Não beba." },
          ],
        },
        {
          id: "mixologista_maestral",
          name: "Mixologista Maestral",
          description:
            "O Mixologista Maestral é um domínio do coqueteleiro, onde o cozinheiro se aprofunda ainda mais na criação de bebidas harmônicas, renegando seus conhecimentos sobre bebidas instáveis.",
          abilities: [
            { tier: "TIER_VIII", title: "Goles Seguros", body: "O cozinheiro passa a conseguir aprender ilimitadas receitas de bebidas harmônicas de nível Moderado, e até 10 de nível complexo. Consegue criar suas próprias bebidas harmônicas moderadas. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Tribeleza", body: "O Mixologista Maestral mistura até três drinks para fazer uma mistura ainda mais harmônica (50% dos efeitos de cada). Em batalha consome a ação principal; fora de batalha o drink dura 1 hora. Bebidas harmônicas do Mixologista perdem apenas 25% de eficácia em aplicações não-orais." },
            { tier: "TIER_X", title: "Confissão Alcoólica", body: "Ao interagir com um indivíduo que esteja bebendo uma de suas bebidas, o cozinheiro passa a ser capaz de substituir qualquer teste de carisma por teste de cozinheiro, mais apto a fazer com que o indivíduo compartilhe segredos e fatos obscuros." },
            { tier: "TIER_XX", title: "Toque Angelical", body: "O cozinheiro cria bebidas harmônicas complexas ilimitadas e passa a ser capaz de criar uma única receita de nível “Divino”, cujos benefícios superam as complexas e cujos deméritos são reduzidos quase a zero. Há limitação de quantas vezes uma pessoa pode usufruir dela em um mesmo período." },
          ],
        },
      ],
    },
  ],
};
