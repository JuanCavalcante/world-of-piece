import type { ProfessionData } from "./types";

export const CIENTISTA: ProfessionData = {
  id: "cientista",
  name: "Cientista",
  description:
    "Os Cientistas são, geralmente, indivíduos com capacidades intelectuais muito acima da média, capazes de realizar invenções de extrema importância para o avanço do mundo e da sociedade humana como um todo. São os responsáveis pelo avanço da tecnologia, melhorando a qualidade de vida dos humanos com suas invenções.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Cientista, e eventualmente podem se especializar e se tornar Químicos ou Físicos.\n\nCaso se torne um Químico, evolui para o domínio Gênesis ou Oppenheimer.\n\nCaso se torne um Físico, evolui para o domínio Supremacista Robótico ou Stark.",
  initialAbilities: [
    { tier: "INICIAL", title: "Tive uma ideia!", body: "Os cientistas são indivíduos que buscam adquirir conhecimentos a respeito da criação de tecnologias e projetos químicos com funções diversas. Enquanto exerce qualquer ação que desencadeia um Teste de Cientista, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0)." },
    { tier: "TIER_I", title: "Idealizando o Futuro", body: "O cientista começa a ser capaz de desenvolver seus primeiros projetos. Nesse nível, o cientista pode ter até três projetos de sua própria autoria, e recebe mais três projetos para cada Tier que sua profissão aumenta. Para criar as invenções projetadas, se faz necessário o consumo dos seus respectivos materiais e uma rolagem de Teste de Cientista. Para se criar a ideia de um projeto é necessário que o cientista fique uma semana planejando-o e apenas 2 criações de invenções projetadas concederão experiência ao cientista por sessão." },
    { tier: "TIER_II", title: "Beta Test", body: "Ao reproduzir uma invenção projetada por si mesmo, o cientista se torna apto a realizar um Beta Test, consumindo apenas 25% dos materiais necessários. Caso tenha sucesso no Beta Test, a criação da próxima invenção desse mesmo projeto receberá uma bonificação de +6 na rolagem. Caso o cientista falhe no teste de criação, seu equívoco irá desencadear algum efeito adverso penoso. Nesse Tier, habilita a criação de qualquer projeto de Tier I." },
    { tier: "TIER_III", title: "“É você que entende disso?”", body: "É somente neste nível que o cientista se torna apto a reparar invenções quebradas. Para reparar uma invenção de Tier semelhante ao da sua profissão, leva-se um período de 5 dias por Tier da invenção. Para cada Tier que sua profissão seja superior à invenção que almeja reparar, o cientista precisa de 1 dia a menos por Tier (Mín. 1). O cientista é impossibilitado de reparar invenções de até dois Tiers superiores ao seu. Nesse Tier, habilita a criação de qualquer projeto de Tier II." },
  ],
  specializations: [
    {
      id: "quimico",
      name: "Químico",
      description:
        "Os Químicos são cientistas que se especializam na criação de compostos químicos com alta periculosidade. Um químico é geralmente um cientista que começa a se distanciar do que é visto como correto, capaz de feitos abomináveis através de experimentos químicos.",
      abilities: [
        { tier: "TIER_IV", title: "Horizonte de Eventos", body: "Ao escolher a especialização Químico, o cientista começa a substituir o teste de criação padrão de seus projetos para um teste de aptidão. Caso obtenha-se uma falha, em vez de simplesmente falhar em reproduzir a criação, o personagem irá desencadear um fenômeno químico (fumaça colorida, cheiro anormal, explosão de espuma etc). Sempre que o químico falhar e desencadear um fenômeno químico, ele receberá o dobro de experiência pela falha, limitado a duas vezes por sessão. Nesse Tier, habilita a criação de projetos químicos de Tier III." },
        { tier: "TIER_V", title: "Máquina Alquímica", body: "O cientista torna possível o consumo de $150.000.000 para criar uma máquina científica capaz de realizar diversos processos. Sempre que utilizar essa máquina para realizar a invenção de algum projeto químico, o cientista irá realizar a rolagem com vantagem, contudo, em falhas, “Horizonte de Eventos” será ainda mais instável, causando danos à máquina. Para repará-la, é necessário o gasto de $20.000.000 e 3 dias de trabalho. O bônus de experiência do “Horizonte de Eventos” passa a 3x quando utilizando a Máquina. Nesse Tier, habilita a criação de projetos químicos de Tier IV." },
        { tier: "TIER_VI", title: "Mimos & Recebidos", body: "O químico torna-se capaz de começar os estudos a respeito de antídotos. O mestre definirá um Tier para a substância a ser estudada, e o químico necessita estudá-la por 7 dias para cada Tier. Com o fim da pesquisa, o cientista será capaz de desenvolver um projeto químico (que não conta para o limite) para criar o antídoto para a substância. Nesse Tier, habilita a criação de projetos químicos de Tier V." },
        { tier: "TIER_VII", title: "Transmutação Alquímica", body: "Após esse Tier, todos os projetos futuros e anteriormente criados de Tier Inicial, I, II e III deixam de contar para as limitações de projetos. Além disso, a Máquina Alquímica começa a ser capaz de realizar transmutações simples, conseguindo transformar Conjuntos de Tábuas em Mini Kits de Metais, em uma escala de 2 tábuas para 1 metal. Nesse Tier, habilita a criação de projetos químicos de Tier VI e VII." },
      ],
      domains: [
        {
          id: "genesis",
          name: "Gênesis",
          description:
            "O Gênesis é um cientista que avançou pelo lado químico e encontrou sua verdadeira vocação na pesquisa sobre criação de formas de vida artificial, capaz de criar seres humanos do zero e, no ápice, realizar clonagem.",
          abilities: [
            { tier: "TIER_VIII", title: "Artesão do Barro", body: "Ao adentrar nesse domínio, o personagem recebe a possibilidade de investir $400.000.000 para reunir conhecimentos a respeito da criação de vida e criar um homúnculo. O homúnculo é uma forma de vida recém-nascida que acompanha o cientista, iniciando como um personagem de nível 01 com desvantagem em todas as rolagens. Até o nível 80, recebe 100% a mais de experiência. Tem aparência de criança, não envelhece, não possui sentimentos e não sente dor. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão. Nesse Tier, habilita a criação de até 10 projetos químicos de Tier VIII." },
            { tier: "TIER_IX", title: "Jardins de Éden", body: "Gastando $200.000.000 para construir um casulo tecnológico, o homúnculo evolui após um mês. Ao atingir a evolução, altera completamente sua forma física, passando a ter corpo de adulto, desenvolvendo emoções básicas e perdendo o demérito, ganhando +3 em todas as rolagens. Caso o homúnculo vislumbre uma falha do criador pelo “Horizonte de Eventos”, ambos recebem +50% de Experiência na sessão (uma vez a cada 3 sessões). Nesse Tier, habilita a criação de até 5 projetos químicos de Tier IX." },
            { tier: "TIER_X", title: "Rebanho do Senhor", body: "O Gênesis passa a ser capaz de criar suas próprias modificações genéticas em embriões, transformando-os em modificados. As regras são semelhantes às regras da raça modificado. O cientista pode alterar tanto os genes de fetos quanto o de seu homúnculo. Nesse Tier, habilita a criação de até 5 projetos químicos de Tier X." },
            { tier: "TIER_XX", title: "Exército da Luz", body: "O cientista recebe os conhecimentos a respeito de clonagem, permitindo extrair a medula óssea de indivíduos para desenvolver clones baseados inteiramente no indivíduo que os deu origem. Os clones são automaticamente criados no nível 80. Nesse Tier, o cientista perde as limitações de quantos projetos pode criar, adquirindo também a capacidade de criar projetos de especialidade ou domínios que não façam parte de sua alçada, limitando esses projetos ao Tier VIII." },
          ],
        },
        {
          id: "oppenheimer",
          name: "Oppenheimer",
          description:
            "O Oppenheimer é um cientista que avançou seus conhecimentos químicos ao ponto de realizar a descoberta do reator nuclear e construir armamentos de guerra incomparáveis.",
          abilities: [
            { tier: "TIER_VIII", title: "Radioatividade Ambulante", body: "O cientista começa a especializar sua pesquisa em métodos de energia nuclear, pólvora e confecção de armamentos bélicos explosivos e radioativos. Recebe a capacidade de desenvolver projetos radioativos e explosivos. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão. Nesse Tier, habilita a criação de até 10 projetos radioativos e explosivos de Tier VIII." },
            { tier: "TIER_IX", title: "Reator Nuclear", body: "O cientista possui conhecimentos suficientes para realizar sua primeira grande criação: um reator nuclear. Faz-se necessário um gasto de $500.000.000 para sua criação, devendo manter um gasto de $55.000.000 por mês. Enquanto operante, o cientista pode abastecê-lo com barras de urânio para gerar energia elétrica suficiente para abastecer uma cidade inteira (100 Barras de Urânio por mês). Nesse Tier, habilita a criação de até 5 projetos radioativos e explosivos de Tier IX." },
            { tier: "TIER_X", title: "Energia da Destruição", body: "O cientista torna-se capaz de realizar a criação de armas radioativas. O primeiro armamento nuclear é o Lightsaber, que necessita de 10 horas de carga em um reator nuclear para armazenar até 3 horas de uso. É um armamento de Tier VIII que ignora completamente todas as resistências externas (não ignora Haki). Nesse Tier, habilita a criação de até 5 projetos radioativos e explosivos de Tier X." },
            { tier: "TIER_XX", title: "Oppenheimer", body: "O Oppenheimer consegue realizar a criação de uma arma de destruição em massa, desembolsando um custo de $5.000.000.000. Essa arma é um projeto completamente customizável — bomba nuclear, laser destruidor de ilhas, nuvem de gás mortífero ou vírus quimicamente modificado. Nesse Tier, o cientista perde as limitações de quantos projetos pode criar, adquirindo capacidade de criar projetos de outras especialidades ou domínios, limitando esses projetos ao Tier VIII." },
          ],
        },
      ],
    },
    {
      id: "fisico",
      name: "Físico",
      description:
        "Os Físicos são cientistas que se especializam no estudo e criação de projetos não químicos, tornando-se capazes de realizar a criação de um ser robótico que o acompanha permanentemente.",
      abilities: [
        { tier: "TIER_IV", title: "Amigo Não-Imaginário", body: "Ao adentrar essa especialização, o cientista pode consumir 50 Mini Kits de Metais e $15.000.000 para construir um ajudante metálico — uma inteligência artificial em nível basal. A forma, o nome e o método de expressão do ajudante é completamente customizável, porém sua composição é inteiramente metálica. Nesse Tier, habilita a criação de projetos não químicos de Tier III." },
        { tier: "TIER_V", title: "Solidão não é Científica", body: "O físico começa a ser capaz de conceder e alterar a personalidade da inteligência artificial. Além disso, sempre que estiver criando uma invenção ao lado de seu ajudante metálico, o cientista recebe um retorno de 25% dos recursos utilizados. Nesse Tier, habilita a criação de projetos não químicos de Tier IV." },
        { tier: "TIER_VI", title: "Módulo de Análise Bélica", body: "O ajudante robótico passa a ser capaz de analisar os movimentos de inimigos e aliados durante uma batalha, e passa a adentrar na ordem de iniciativa. Em seu turno, poderá conceder alguma informação relevante que bonifique um aliado em +5 na rolagem correspondente. Nesse Tier, habilita a criação de projetos não químicos de Tier V." },
        { tier: "TIER_VII", title: "Dobrador Físico", body: "Após esse Tier, todos os projetos de Tier Inicial, I, II e III deixam de contar para as limitações. O ajudante metálico começa a poder ser utilizado para criar invenções já projetadas por seu criador de Tier VI ou inferior — sucesso garantido, sem conceder experiência. Nesse Tier, habilita a criação de projetos não químicos de Tier VI e VII." },
      ],
      domains: [
        {
          id: "supremacista_robotico",
          name: "Supremacista Robótico",
          description:
            "O Supremacista Robótico é um cientista que aprofunda-se nos seus conhecimentos robóticos, aprimorando seu ajudante robótico para um estágio ainda mais potencializado.",
          abilities: [
            { tier: "TIER_VIII", title: "Arauto da Perfeição", body: "O cientista pode consumir 250 Mini Kit de Metais e $100.000.000 para criar diversas modificações em seu ajudante metálico, alterando sua forma para uma forma de batalha, concedendo a ele uma mini ficha de Pet com distribuição de atributos própria, resistência e três habilidades iniciais. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão. Nesse Tier, habilita a criação de até 10 projetos robóticos de Tier VIII." },
            { tier: "TIER_IX", title: "Diminuição de Latência", body: "O cientista torna-se capaz de desenvolver três novas habilidades de batalha para seu ajudante robótico. A inteligência artificial passa a conseguir utilizar seu “Módulo de Análise Bélica” uma vez a cada três turnos sem consumir sua Ação Principal. Nesse Tier, habilita a criação de até 5 projetos robóticos de Tier IX." },
            { tier: "TIER_X", title: "Dois é Bom", body: "O Supremacista Robótico recebe a capacidade de criar um segundo ajudante robótico. Esse segundo ajudante possui uma integração da mesma inteligência artificial, de forma que ambos são controlados simultaneamente. Nesse Tier, habilita a criação de até 5 projetos robóticos de Tier X." },
            { tier: "TIER_XX", title: "Sonho Concretizado", body: "O Supremacista Robótico atinge a perfeição instalando o Módulo de Fusão em suas duas criações principais. Uma vez por combate, ambos ajudantes se fundem em um só por até 10 turnos, somando suas resistências atuais, aumentando em 25% todos os atributos e habilitando o uso de uma técnica especial suprema. Nesse Tier, o cientista perde as limitações de quantos projetos pode criar, podendo criar projetos de outras alçadas até Tier VIII." },
          ],
        },
        {
          id: "stark",
          name: "Stark",
          description:
            "O Stark é um cientista que se aprofunda no desenvolvimento de sua inteligência artificial, ramificando-a e tornando-a muito mais complexa, conseguindo incluir qualquer outro dispositivo em sua rede conectada.",
          abilities: [
            { tier: "TIER_VIII", title: "Jar.vis você em algum lugar?", body: "O cientista pode consumir $200.000.000 para criar modificações em sua inteligência artificial, transformando-a em um supercomputador com uma rede segura que a interliga com diversos aparelhos eletrônicos desenvolvidos por ele no alcance de uma ilha. A partir desse ponto, a IA deixa de residir exclusivamente dentro do Ajudante Metálico e passa a controlar toda a rede conectada. Nesse Tier, habilita a criação de até 5 projetos super tecnológicos de Tier VIII e até 3 novas funções para sua IA." },
            { tier: "TIER_IX", title: "Integração ao Sistema", body: "O cientista passa a ser capaz de realizar uma análise metódica em qualquer dispositivo. Após o período necessário (por “É você que entende disso?”), o cientista adiciona o dispositivo em sua rede conectada, permitindo que sua IA integre o dispositivo. Nesse Tier, habilita a criação de até 5 projetos super tecnológicos de Tier IX e até 3 novas funções para sua IA." },
            { tier: "TIER_X", title: "Aperfeiçoamento Raíz", body: "Os comentários da inteligência artificial pelo “Módulo de Análise Bélica” também concedem ao alvo vantagem na rolagem em questão, além da bonificação em modificadores. Nesse Tier, habilita a criação de até 5 projetos super tecnológicos de Tier X e até 3 novas funções para sua IA." },
            { tier: "TIER_XX", title: "A Verdadeira Perfeição", body: "O cientista consegue fazer com que sua IA tenha alcance global, mantendo controle com qualquer dispositivo operante no globo. Além disso, com $1.000.000.000 constrói um recipiente sintético para sua IA, concedendo-lhe uma consciência de “eu” físico, permitindo-a integrar a rotina da sociedade como um personagem de nível máximo independente. Nesse Tier, o cientista perde as limitações e pode criar projetos de outras alçadas até Tier VIII." },
          ],
        },
      ],
    },
  ],
};
