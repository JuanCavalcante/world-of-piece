import type { ProfessionData } from "./types";

export const NAVEGADOR: ProfessionData = {
  id: "navegador",
  name: "Navegador",
  description:
    "Os navegadores são indivíduos que se especializam na confecção e leitura de mapas, sendo capazes de utilizar seus conhecimentos amplos a respeito da geografia local e dos mares para criar rotas marítimas seguras. É sabido que uma embarcação sem um navegador é uma embarcação à deriva.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Navegador, e eventualmente podem se especializar e se tornar Astrônomo ou Cartógrafo.\n\nCaso se torne um Astrônomo, evolui para o domínio Viajante Astral ou Oráculo do Clima.\n\nCaso se torne um Cartógrafo, evolui para o domínio Desbravador de Biomas ou Desvendador de Legados.",
  initialAbilities: [
    { tier: "INICIAL", title: "Marujo Indispensável", body: "Os Navegadores são indivíduos capazes de dominar técnicas básicas de navegação, realizando rolagens de Teste de Navegador para criar rotas para o destino almejado pelo seu grupo, para realizar a leitura e confecção de mapas, ou mesmo simplesmente para identificar sua localização atual. Enquanto exerce qualquer ação que desencadeia um Teste de Navegador, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0)." },
    { tier: "TIER_I", title: "Meu Primeiro Log Pose", body: "O navegador torna-se capaz de criar e utilizar com maestria o seu primeiro localizador, um Log Pose. Para criar um Log Pose, é necessário um investimento de $10.000.000 de Berries, além de um dia inteiro de trabalho. Com o objeto pronto, o navegador consegue leitura meticulosa da movimentação da agulha, determinando a direção da ilha mais próxima e uma distância aproximada em horas ou dias — requer Teste de Navegador com dificuldade determinada pelo mestre." },
    { tier: "TIER_II", title: "Leitura de Mapas", body: "O navegador torna-se apto a realizar a leitura de mapas, conseguindo desvendar a linguagem cartográfica. Realiza Testes de Navegador para compreender mapas de Tier I ou superior (mapas de Tier Inicial ainda requerem Teste). A dificuldade é exposta no próprio mapa. O navegador só é capaz de tentar compreender mapas de até um Tier superior ao seu Tier atual." },
    { tier: "TIER_III", title: "Guia Estelar", body: "Sempre que o navegador estiver nos mares e o céu estiver limpo, ele poderá contemplar as estrelas para identificar sua localização e a direção de seu destino a partir de um Teste de Navegador. Ao seguir uma rota com visão ampla dos astros, recebe +3 em qualquer Teste de Navegador. Além disso, é capaz de realizar a criação de Eternal Poses, que permanentemente apontam para a ilha onde foram criados, consumindo $25.000.000 e 3 dias de trabalho." },
  ],
  specializations: [
    {
      id: "astronomo",
      name: "Astrônomo",
      description:
        "Os Astrônomos são navegadores que se dedicam à área da astronomia, estudando os astros e os utilizando como principal guia. Esses indivíduos são capazes de construir e utilizar com aptidão um super telescópio.",
      abilities: [
        { tier: "TIER_IV", title: "Astronomia! Não é Astrologia!", body: "O navegador é capaz de utilizar $50.000.000 para construir um Super Telescópio em 7 dias (reduz 2 dias com auxílio de armador ou cientista). Enquanto utiliza seu Super Telescópio, dobra os bônus de “Guia Estelar”, e qualquer Teste de Navegador realizado com o Super Telescópio concede o dobro de experiência, até duas vezes por sessão." },
        { tier: "TIER_V", title: "Minha Estrela Guia", body: "O Astrônomo consegue estabelecer sua estrela favorita, com extensos conhecimentos a respeito. Em alto mar, o navegador saberá exatamente onde está ao comparar sua localização com o ângulo da posição de sua Estrela Guia com o horizonte. Uma vez a cada três sessões, ao contar aos aliados uma curiosidade sobre sua estrela guia, concede +2 em todos os modificadores dos ouvintes durante toda a sessão." },
        { tier: "TIER_VI", title: "Leitura Cósmica", body: "O navegador torna-se capaz de identificar eventos cósmicos raros. Sempre que presenciar um fenômeno cósmico raro, ele e todos os que vislumbraram recebem +50% de Experiência na sessão. Para encontrar, utiliza o Super Telescópio e rola d100 — resultado garantido caso os astros estejam visíveis e o resultado seja superior a 89. A busca só pode ser utilizada uma vez por sessão." },
        { tier: "TIER_VII", title: "Estrela mais que Cadente", body: "Aprimora “Leitura Cósmica”: fenômenos cósmicos passam a ocorrer em resultados >84, deixando de ocorrer em >94, sendo substituídos pelo avistamento de um corpo cósmico prestes a se chocar contra o mundo. O navegador identifica o local de queda, podendo saquear recursos minerais abundantes, incluindo minérios únicos." },
      ],
      domains: [
        {
          id: "viajante_astral",
          name: "Viajante Astral",
          description:
            "O Viajante Astral é um domínio do astrônomo, onde o navegador atinge seu ápice em leitura cósmica, tornando-se perito em se localizar e criar rotas inteiras com base nas estrelas.",
          abilities: [
            { tier: "TIER_VIII", title: "Super-Zoom!", body: "O navegador realiza um aprimoramento em seu Super Telescópio, adicionando um mecanismo de super-zoom cósmico, gastando $150.000.000 e 15 dias. Além de observar os astros, pode observar uma ilha distante — sucesso instantâneo em qualquer teste de percepção, com visão detalhada dos perímetros observáveis. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Magnata Cósmico", body: "Último aprimoramento no Super Telescópio: $300.000.000 e 30 dias. O navegador pode tirar fotos dos astros e eventos cósmicos, gerando renda. Passa a determinar alinhamentos de estrelas, planetas e rotas de meteoritos, possibilitando que “Leitura Cósmica” seja rolada com vantagem e receba +5 de modificadores." },
            { tier: "TIER_X", title: "Céu-Guia", body: "Caso o céu esteja limpo, o navegador se torna impossibilitado de não saber sua exata localização — não precisa de testes senão as estrelas. Torna-se completamente independente, determinando localização, planejando rotas e calculando tempos de viagem apenas pelas estrelas. Nesse nível, pode realizar a rolagem de busca por fenômenos cósmicos da “Leitura Cósmica” uma vez mais por sessão." },
            { tier: "TIER_XX", title: "Oceano de Estrelas", body: "Realiza uma reunião com qualquer número de indivíduos durante a noite, apresentando as constelações e estrelas. Todos os ouvintes recebem permanentemente +50 de Inteligência. Quando os ouvintes forem outros astrônomos, o Viajante Astral concede-lhes instantaneamente a evolução de um Tier de profissão. As bonificações só funcionam uma vez por indivíduo." },
          ],
        },
        {
          id: "oraculo_clima",
          name: "Oráculo do Clima",
          description:
            "O Oráculo do Clima é um domínio do astrônomo, onde o navegador se aprofunda na previsão de eventos climáticos diversos, tornando-se capaz de utilizá-los ao seu favor.",
          abilities: [
            { tier: "TIER_VIII", title: "Climão", body: "O navegador realiza uma manutenção no Super Telescópio ($150.000.000 e 15 dias), adicionando uma lente climática. Torna-se capaz de realizar Testes de Navegador para identificar a formação de fenômenos climáticos de nível 1 e 2 pelo Super Telescópio. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Leitura de Fenômenos", body: "Aprimoramento final no Super Telescópio ($300.000.000 e 30 dias): consegue realizar leitura climática complexa. Usa “Leitura Cósmica” para receber informações climáticas detalhadas do clima atual e esperado nos próximos dias. Passa a realizar Testes de Navegador para identificar a formação de fenômenos climáticos de nível 3, 4 e 5." },
            { tier: "TIER_X", title: "Domador de Adversidades", body: "O Oráculo do Clima realiza um Teste de Navegador durante qualquer fenômeno climático — a depender da rolagem em comparação à complexidade do fenômeno, é capaz de criar um plano de ação para fazer com que o fenômeno auxilie-o de alguma forma, seja otimizando tempo de viagem ou evitando inimigos que estão perseguindo-o." },
            { tier: "TIER_XX", title: "Criador de Fenômenos", body: "O navegador se torna perito na criação de vórtices e túneis de ar. Para criar, precisa fornecer aconselhamentos ao timoneiro; o trabalho em conjunto cria um vórtice ou túnel de ar com duração de 7 dias, aumentando drasticamente a velocidade de locomoção do transporte. Para criar artificialmente, o timoneiro deve realizar as manobras por uma hora inteira." },
          ],
        },
      ],
    },
    {
      id: "cartografo",
      name: "Cartógrafo",
      description:
        "Os Cartógrafos são navegadores que se dedicam em aprimorar suas habilidades de leitura e criação de mapas, aprofundando-se ao ponto de conseguir encontrar detalhes escondidos em mapas por outros cartógrafos.",
      abilities: [
        { tier: "TIER_IV", title: "Mais que apenas Mapas", body: "O navegador torna-se capaz de realizar a Criação Complexa de Mapas: após um Teste de Navegador para criar e testar uma rota, coloca os detalhes de sua rota, adicionando neles localização de ninhos de criaturas ou pontos de ocorrência de fenômenos climáticos. Ao ter sucesso, recebe 2 de Experiência de profissão, até duas vezes por sessão." },
        { tier: "TIER_V", title: "Segredo do Cartógrafo", body: "Ao realizar um Teste de Navegador para entender um mapa de tesouro, caso o resultado supere a dificuldade em ao menos 5, ele descobre um segredo. O cartógrafo é capaz de encontrar detalhes escondidos pelo cartógrafo que criou o mapa ou desvendar detalhes específicos sobre a localização do tesouro. Passa a criar seus próprios segredos em mapas, que só podem ser descobertos por outros cartógrafos com essa habilidade." },
        { tier: "TIER_VI", title: "Eternal Pose", body: "O navegador é capaz de realizar um aprimoramento em um Log Pose, ao custo de $55.000.000 e uma semana. Com o Log Pose Triplo, aponta para três ilhas distintas — pela movimentação das agulhas, determina qual das ilhas é a mais segura e qual a mais perigosa. Com Teste de Navegador de dificuldade do mestre, determina o nível exato de perigo natural e climático em escala de 0 a 10." },
        { tier: "TIER_VII", title: "A Grande Expedição", body: "O cartógrafo e seu grupo serão convidados a participar de uma Grande Expedição para descoberta de uma ilha não cartografada. Quando completa, os participantes recebem grandes recompensas em dinheiro, itens, fama e experiência, e o cartógrafo mapeará a localização da ilha descoberta, incluindo-a no mapa mundial." },
      ],
      domains: [
        {
          id: "desbravador_biomas",
          name: "Desbravador de Biomas",
          description:
            "O Desbravador de Biomas é um domínio do cartógrafo, onde o navegador se aprofunda nos métodos de obtenção de conhecimento geográfico das ilhas, catalogando biomas inteiros.",
          abilities: [
            { tier: "TIER_VIII", title: "Bem-vindo à Selva!", body: "O navegador libera a capacidade de iniciar Excursões de Desbravamento, no máximo uma vez a cada cinco sessões. Durante a excursão, o grupo desencadeia entre 5 a 20 encontros (d100), presenciando fauna, flora ou civilização local. Com o fim, o navegador mapeia todo o bioma. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Rei da Selva", body: "Além do mapa, o Desbravador de Biomas pode substituir todas as rolagens de Percepção por Testes de Navegador enquanto viajar em bioma mapeado ou com mapa em mãos. Após cada encontro concluído durante uma Excursão, pode realizar Testes de Navegador com Dificuldade 75 para receber 1 a 3 pontos de experiência profissional." },
            { tier: "TIER_X", title: "Desbravador de Masmorras", body: "O navegador torna-se capaz de localizar, explorar e mapear masmorras. Cada Excursão pode levar a no máximo uma masmorra, encontrada em resultado 95-100 no d100 de exploração. Masmorras acrescentam de 5 a 15 encontros adicionais. Ao fim, o navegador mapeia a masmorra e encontra recursos raros, suprimentos, reagentes, dinheiro e outros." },
            { tier: "TIER_XX", title: "Mestre da Causalidade", body: "Sempre que estiver dentro de uma masmorra, o Desbravador de Biomas se torna capaz de encontrar uma área escondida, com recompensas equivalentes à exploração da masmorra. Todas as masmorras possuem uma área secreta que só pode ser descoberta por navegadores com essa habilidade. Recebe +10 em todo d100 que estabeleça encontros de áreas exploradas ou já exploradas." },
          ],
        },
        {
          id: "desvendador_legados",
          name: "Desvendador de Legados",
          description:
            "O Desvendador de Legados é um domínio do Cartógrafo, onde o navegador se torna ainda mais capacitado na criação e leitura de mapas marinhos, criando rotas seguras independente da distância.",
          abilities: [
            { tier: "TIER_VIII", title: "Usurpador de Legados", body: "O navegador torna-se capaz de identificar legados enquanto segue uma rota marítima já criada — Teste de Navegador com Dificuldade 71 no meio de uma rota. Em sucessos, encontra pistas de um legado perdido (embarcações naufragadas, tesouros submersos ou outros). Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Herdeiro Legítimo dos Mares", body: "Realiza Testes de Navegador com Dificuldade 78 para identificar habitats de seres marinhos enquanto seguir uma rota já planejada, adicionando-os aos mapas. Testes de Navegador para encontrar pistas de legado com resultado >=80 melhoram o naufrágio encontrado, dobrando a quantidade ou raridade das recompensas." },
            { tier: "TIER_X", title: "Mestre das Rotas", body: "Enquanto navegar por um vórtice marinho, identifica a presença de vórtices conectados, permitindo auxiliar um timoneiro a alterar a trajetória do navio, saltando entre vórtices. Passa a mapear vórtices marítimos, adicionando suas posições exatas e calculando rotas precisamente." },
            { tier: "TIER_XX", title: "Memória da Maré", body: "O navegador desenvolve um vínculo íntimo com os mares. Enquanto toca sua superfície, recebe informações sobre movimentos ocorridos no local há até setenta e duas horas atrás. Também recebe sinais quando o mar tenta lhe alertar de um possível perigo." },
          ],
        },
      ],
    },
  ],
};
