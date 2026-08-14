import type { ProfessionData } from "./types";

export const TIMONEIRO: ProfessionData = {
  id: "timoneiro",
  name: "Timoneiro",
  description:
    "Os Timoneiros são os indivíduos que dedicam suas vidas à condução precisa de embarcações. Mais do que simples pilotos, esses profissionais são artistas do movimento, capazes de ler os ventos, as ondas e as intenções de seus inimigos.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Timoneiro, e eventualmente podem se especializar e se tornar Manobrista ou Perseguidor.\n\nCaso se torne um Manobrista, evolui para o domínio Especialista dos Ares ou Especialista Náutico.\n\nCaso se torne um Perseguidor, evolui para o domínio Perdição dos Navios ou Afoga-Bestas.",
  initialAbilities: [
    { tier: "INICIAL", title: "Motorista dos Mares", body: "Os Timoneiros são indivíduos que dominam o controle de embarcações, aplicando técnicas de manobras diversas para manter o curso seguro de uma viagem estabelecido por uma rota criada por um navegador. Esses indivíduos são capazes de realizar Testes de Timoneiro para realizar manobras com o navio, para guiar viagens ou até mesmo para interpretar condições marítimas. Enquanto exerce qualquer ação que desencadeia um Teste de Timoneiro, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0)." },
    { tier: "TIER_I", title: "Corpo e Mente", body: "Sempre que o timoneiro realizar uma viagem a partir de uma rota estabelecida por um navegador, receberá +2 em qualquer Teste de Timoneiro realizado durante a rota, e o tempo necessário para a conclusão da viagem é reduzido em 15%." },
    { tier: "TIER_II", title: "Potencial de Manobrista", body: "Durante a viagem, caso viaje por mares que não estejam calmos, o timoneiro é capaz de se aproveitar das ondas para impulsionar o seu navio, diminuindo o tempo de viagem em até 15%. Essa habilidade danifica a embarcação, causando 10 de dano no navio para cada 1% de redução almejada." },
    { tier: "TIER_III", title: "Potencial de Perseguidor", body: "Quando o timoneiro conduz a embarcação no intuito de manter uma perseguição, posiciona as velas de maneira que se aproveite muito mais da posição do vento, aumentando em +20 a velocidade da embarcação." },
  ],
  specializations: [
    {
      id: "manobrista",
      name: "Manobrista",
      description:
        "Os Manobristas são Timoneiros especializados na arte de executar manobras super efetivas e certeiras, defensivas e evasivas, elevando o ato de conduzir uma embarcação a uma coreografia precisa e instintiva.",
      abilities: [
        { tier: "TIER_IV", title: "Parada de Arranco", body: "O manobrista se torna capaz de estacionar propriamente seu navio, com um Teste de Timoneiro de dificuldade do mestre. Ao voltar a conduzir para sair da posição estacionada, o manobrista “arranca” atingindo velocidade máxima imediatamente, com vantagem em qualquer teste de fuga. Em perseguições, os manobristas somam metade dos modificadores de Teste de Timoneiro aos modificadores de velocidade dos transportes." },
        { tier: "TIER_V", title: "Tem Vento até de Costas", body: "O timoneiro é capaz de reorganizar as velas do navio e modificar seu ângulo para fazer com que os ventos permitam uma movimentação inesperada. Guia a movimentação do navio de “ré”, com velocidade normal, sem deméritos." },
        { tier: "TIER_VI", title: "Capacitação Manobrista", body: "Realiza manobras defensivo-reativas ao ver-se diante de obstáculos marítimos. Com Teste de Timoneiro (dificuldade do mestre), em sucesso a esquiva do obstáculo recebe vantagem. Dentro de uma fuga, essa habilidade só pode ser usada uma vez, apenas caso a próxima rolagem de perseguição possa ocasionar falha — ao ter sucesso no Teste, a rolagem de fuga é feita com vantagem." },
        { tier: "TIER_VII", title: "Pilotando Tudo", body: "O timoneiro adquire a capacidade de utilizar todas as habilidades anteriores em veículos aéreos (Gigahouses, dirigíveis e outros), modificando levemente sua utilização a depender dos recursos (ondas viram correntes de vento etc)." },
      ],
      domains: [
        {
          id: "especialista_ares",
          name: "Especialista dos Ares",
          description:
            "Os Especialistas dos Ares são os senhores indiscutíveis dos céus, tratando qualquer veículo aéreo como uma extensão de sua vontade. Cavalgam túneis de vento para cruzar distâncias vastas em tempo recorde.",
          abilities: [
            { tier: "TIER_VIII", title: "Domador dos Céus", body: "Enquanto pilotam veículos aéreos, aumentam em +1 Nível a Velocidade de Locomoção do veículo (limite Nível 35). Os veículos aéreos pilotados terão Velocidade mínima Nível 10. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Domador das Correntes", body: "O Especialista dos Ares melhora a eficiência de túneis aéreos: Túneis de Ar aumentam +5 Níveis de Velocidade para veículos com tempo de viagem inferior a 30. Veículos com tempo superior a 30 recebem +1 Nível adicional (limite Nível 35)." },
            { tier: "TIER_X", title: "Perigo Aéreo", body: "Realiza movimento especial ao pousar/decolar. Modo impacto: onda de impacto — todos que falharem em evadir-se recebem dano equivalente a 10% do HP Máx. do Veículo. Modo varredura: cortina de fumaça/poeira que reduz 50% dos Modificadores baseados em visão dos afetados (raio = 10% do HP Máx. em metros)." },
            { tier: "TIER_XX", title: "Encarnação de Éolo", body: "Realiza viagens em rotas aéreas de alta latitude. Movimentos específicos aproveitam o ar fino para reduzir em até 50% o combustível gasto (ou energia), reduzir em 50% o tempo de viagem e ignorar completamente eventos climáticos, viajando acima deles." },
          ],
        },
        {
          id: "especialista_nautico",
          name: "Especialista Náutico",
          description:
            "Os Especialistas Náuticos são mestres incontestáveis do domínio marítimo, tratando embarcações e criaturas marinhas como extensões de seu próprio corpo, domando correntezas e vórtices.",
          abilities: [
            { tier: "TIER_VIII", title: "Domador dos Mares", body: "Enquanto pilotam veículos marítimos, aumentam em +1 Nível a Velocidade de Locomoção do veículo (limite Nível 35). Os veículos marítimos pilotados terão Velocidade mínima Nível 10. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Domador das Correntezas", body: "Vórtices Marinhos aumentam +5 Níveis de Velocidade para veículos com tempo de viagem inferior a 30. Veículos com tempo superior a 30 recebem +1 Nível adicional (limite Nível 35)." },
            { tier: "TIER_X", title: "Perigo Marinho", body: "Realiza movimento especial ao arrancar/ancorar. Modo impacto: onda — todos próximos que falharem em evadir-se recebem dano equivalente a 10% do HP Máx. do Veículo. Modo varredura: cortina de espuma/gotas que reduz 50% dos Modificadores baseados em visão (raio = 10% do HP Máx. em metros)." },
            { tier: "TIER_XX", title: "Encarnação de Poseidon", body: "Realiza viagens em rotas marinhas de alta intensidade, alcançando profundidades incomparáveis. Movimentos específicos reduzem em até 50% o combustível gasto (ou energia), o tempo de viagem em 50% e ignoram completamente eventos climáticos." },
          ],
        },
      ],
    },
    {
      id: "perseguidor",
      name: "Perseguidor",
      description:
        "Os Perseguidores são Timoneiros especializados em ações ofensivas e estratégias de pressão constante. Transformam qualquer tentativa de fuga em um cerco implacável.",
      abilities: [
        { tier: "TIER_IV", title: "Atração Prática", body: "O perseguidor se torna capaz de estacionar propriamente o seu navio (Teste de Timoneiro de dificuldade do mestre). Ao voltar a conduzir, arranca imediatamente, com vantagem em teste de perseguição. Durante perseguições, os perseguidores somam metade dos modificadores de Teste de Timoneiro aos modificadores de velocidade." },
        { tier: "TIER_V", title: "Coordenação Agressiva", body: "O timoneiro utiliza outros membros do grupo como auxiliares para manobras e movimentos característicos. Durante uma perseguição, dá ordens (alterar velas, aumentar peso de um lado, usar armamentos suplementares), aumentando +50 a velocidade da embarcação para a próxima rolagem. Não pode ser utilizada múltiplas vezes durante a mesma perseguição." },
        { tier: "TIER_VI", title: "Linha de Disparo", body: "Sempre que o timoneiro realizar uma movimentação na Ação de Movimento durante combate entre veículos, todos os tripulantes que agirem na Ação Principal daquele turno receberão +5 de acerto nas rolagens de disparo de armamentos do navio." },
        { tier: "TIER_VII", title: "Caçador dos Céus", body: "O timoneiro adquire a capacidade de utilizar todas as habilidades anteriores em veículos aéreos, modificando levemente sua utilização a depender dos recursos necessários." },
      ],
      domains: [
        {
          id: "perdicao_navios",
          name: "Perdição dos Navios",
          description:
            "Onde o Perseguidor é a caça, a Perdição dos Navios é o abate. O veículo não é apenas um meio de transporte, mas a própria arma, e cada manobra é um golpe calculado para aleijar, rasgar e aniquilar seus alvos.",
          abilities: [
            { tier: "TIER_VIII", title: "Rastro Lacerante", body: "Ao realizar uma manobra de alta velocidade ou curva acentuada (Teste de Timoneiro), o piloto pode deixar um “rastro” de água turbulenta ou ar deslocado no caminho percorrido. O rastro perdura por uma rodada. Qualquer veículo inimigo que cruzar ou iniciar seu turno no rastro sofre dano equivalente a 5% do HP Máximo do veículo da Perdição dos Navios e tem velocidade reduzida em 30% por uma rodada. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Manobra de Desmembramento", body: "Ao realizar uma ação de abalroamento ou choque intencional, a Perdição dos Navios pode mirar em um componente específico do alvo (leme, mastro, banco de canhões, asa, motor, gôndola). Se bem-sucedido, além do dano normal, o componente é danificado ou destruído, aplicando uma penalidade severa (a critério do mestre). Recarga de 3 turnos." },
            { tier: "TIER_X", title: "Abraço do Predador", body: "Gastando ação de movimento e principal, inicia uma manobra de cerco contra um único veículo alvo próximo, forçando um Teste de Timoneiro difícil no piloto inimigo. Se falhar, fica “Encurralado”, velocidade reduzida a zero e não pode se mover no próximo turno. Se bem-sucedido, sua velocidade é reduzida pela metade por um turno. Recarga de 5 turnos." },
            { tier: "TIER_XX", title: "Investida Abrupta", body: "Uma vez por viagem, o veículo acelera a velocidade impossível em linha reta de até o dobro de sua movimentação máxima. Atravessa obstáculos de material não-exótico e outros veículos como uma força da natureza. Ao passar por um veículo inimigo, causa dano massivo e inevitável equivalente a 30% do HP Máximo do próprio veículo (ignorando blindagem). Após a investida, o próprio veículo sofre 10% de HP Máximo de recuo." },
          ],
        },
        {
          id: "afoga_bestas",
          name: "Afoga-Bestas",
          description:
            "O Afoga-Bestas é um predador de ápice que caça monstros. Usa seu veículo como isca, aguilhão e ferramenta para domar o indomável, transformando a fúria da criatura contra ela mesma.",
          abilities: [
            { tier: "TIER_VIII", title: "Isca Viva", body: "Uma vez a cada três turnos, o piloto pode realizar um Teste de Timoneiro para “provocar” uma grande criatura, forçando-a a focar seus próximos ataques no veículo dele. Adicionalmente, contra criaturas de tamanho massivo, o veículo recebe +10 em todos os testes para evadir dos primeiros 3 ataques daquela criatura. Por conta desse domínio, o personagem passa a receber 07 de modificador por Tier de profissão." },
            { tier: "TIER_IX", title: "Golpe Farpado", body: "Usando parte reforçada do veículo (arpéu, esporão, âncora afiada), o piloto executa um “ataque de passagem” contra uma criatura via Teste de Timoneiro. Com sucesso e acerto, causa dano equivalente a 20% do HP da Embarcação e abre uma “Ferida Aberta”: dano contínuo de 10% do Dano do Golpe Farpado por 5 turnos e todos os ataques subsequentes contra ela causam +30% de dano. Não pode ser utilizada com sucesso mais do que uma vez por combate." },
            { tier: "TIER_X", title: "Expor Entranhas", body: "Gastando ação de movimento e principal, o piloto posiciona o veículo próximo a um ponto vulnerável da criatura. Não causa dano, mas expõe uma fraqueza crítica. No próximo turno, todos os ataques da tripulação contra a criatura naquele ponto (com sucesso de acerto) são considerados críticos automáticos no cálculo de Dano Causado. Recarga de 5 turnos." },
            { tier: "TIER_XX", title: "Nó do Kraken", body: "Uma vez por viagem, após a tripulação prender a criatura com arpões, correntes ou redes, o piloto inicia uma manobra de “espiral da morte” — Teste de Timoneiro disputado contra a força da criatura. Se vencer, arrasta a criatura de forma implacável: monstros marinhos são puxados para profundezas esmagadoras (dano massivo de pressão a cada turno); criaturas voadoras são arrancadas dos céus, culminando em dano catastrófico de impacto." },
          ],
        },
      ],
    },
  ],
};
