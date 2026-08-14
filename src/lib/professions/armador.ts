import type { ProfessionData } from "./types";

export const ARMADOR: ProfessionData = {
  id: "armador",
  name: "Armador",
  description:
    "Os armadores são indivíduos que vivem de sua criatividade, colocando em prática seus conhecimentos de carpintaria para fazer grandes criações com seu trabalho em madeira. Esses indivíduos são capazes de alcançar rios de dinheiro com a venda de suas criações, vendendo embarcações resistentes ou até mesmo canhões que podem ser usados como as armas principais do navio.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Armador, e eventualmente podem se especializar e se tornar Construtor ou Aprimorador.\n\nCaso se torne um Construtor, evolui para o domínio Monarca do Carvalho ou Operador de Ébano.\n\nCaso se torne um Aprimorador, evolui para o domínio Mestre de Artilharia ou Inspetor Bugiganga.",
  initialAbilities: [
    {
      tier: "INICIAL",
      title: "Primeira Remada",
      body: "Os armadores são indivíduos que buscam adquirir conhecimentos a respeito da criação e manutenção de navios. Inicialmente, os armadores recebem a capacidade de criar um Bote Solitário, utilizando 25 Conjuntos de Tábuas, 05 Mini Kit de Metais e $1.500.000 Berries para gastos gerais. Enquanto exerce qualquer ação que desencadeia um Teste de Armador, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0).",
    },
    {
      tier: "TIER_I",
      title: "Perito em Carpintaria",
      body: "Ao alcançar o primeiro nível de sua perícia como armador, o profissional torna-se capaz de derrubar árvores, coletar e refinar a madeira para utilizar como matéria prima para suas futuras criações e manutenções. No momento em que derruba uma árvore, o armador deverá realizar um Teste de Armador. Caso alcance uma rolagem 15 ou superior, recebe 2 Conjunto de Tábuas, em rolagens superiores a 20 recebe 4 Conjunto de Tábuas e em uma rolagem perfeita (26) receberá 8 Conjunto de Tábuas. Para obter as tábuas é necessário que o armador invista 4 horas do seu dia, contudo, múltiplos usos no mesmo local podem ocasionar problemas na flora, fauna ou sociedade local. Cada Conjunto de Tábuas pode ser utilizado para regenerar 1% de HP do navio, necessitando de um tempo de reparo a depender dos danos. Os testes de armador proporcionados por essa habilidade só concedem experiência, no máximo, 5 vezes por sessão.",
    },
    {
      tier: "TIER_II",
      title: "Meu Primeiro Chalupinha",
      body: "Ao alcançar esse nível da profissão, o armador consegue adquirir experiência o suficiente para criar um Chalupa. Para isso, é necessário consumir 75 Conjuntos de Tábuas, 15 Mini Kits de Metais, 05 Emaranhados de Tecidos e $20.000.000 de Berries para gastos gerais. O chalupa é uma embarcação que proporciona mais conforto aos tripulantes, conseguindo velejar sem a necessidade de remo a uma velocidade considerável, possuindo 2 espaços para armamentos (Canhões, arpões…). Além disso, o armador começa a ser capaz de realizar o reparo de sua embarcação em alto mar, como uma espécie de contenção de danos. Ao fazer isso, gasta-se 2 conjuntos de Tábuas para cada 1% de HP que deseja regenerar do navio.",
    },
    {
      tier: "TIER_III",
      title: "Primeira Martelada",
      body: "Através dessa habilidade, o armador torna-se capaz de realizar a construção de seus dois primeiros armamentos, fixando-os em seu navio. O primeiro deles é o Canhão Ofensivo. Para construir um Canhão Ofensivo, o armador necessita consumir 05 Mini Kits de Metais e realizar um Teste de Armador. Em resultados iguais ou superiores a 28, o Canhão será capaz de lançar balas de canhão com 60% de seu dano base. Em resultados iguais ou superiores a 33, o canhão dispara com 80% de seu dano base. Caso atinja resultado igual ou superior a 38, o canhão dispara com 100% de seu dano base. O dano base desse nível de canhão é 250 e utilizá 1 Mini Kit de Metal para compor cada bola de canhão disparada. Além disso, essa habilidade também concede ao armador a capacidade de criar um Arpão. Necessita-se do gasto de 10 Mini Kits de Metais e um Teste de Armador para sua criação. A depender do resultado em seu Teste de Armador, com dificuldade equivalente à do Canhão, o Arpão com corrente poderá ser disparado a até 50/80/100 metros de distância do navio.",
    },
  ],
  specializations: [
    {
      id: "construtor",
      name: "Construtor",
      description:
        "Os Construtores são armadores que dedicam todos seus conhecimentos para a criação e manutenção de navios. Esses indivíduos são peritos na coleta e uso de madeira, explorando as mais vastas ilhas para adquirir essa matéria-prima, que em suas mãos, facilmente se transforma em novas criações. Com sua experiência, o construtor expande ainda mais seus limites criativos, conseguindo criar cômodos confortáveis dentro de seus navios.",
      abilities: [
        {
          tier: "TIER_IV",
          title: "Inicio da Conquista",
          body: "Ao escolher a especialização Construtor, toda vez que o armador tentar construir um navio mais complexo que um Chalupa, é necessário 10 Testes de Armador. Para cada sucesso, o navio construído possuirá 10% de sua resistência, de forma que um navio construído com 5 falhas terá uma redução permanente em sua Resistência Máxima de 50%. Além disso, o armador aprende a construir um Bergantim, um navio de três velas com locomoção muito superior ao Chalupa e com 4 espaços para armamentos (canhões, arpões…). Para construir o Bergantim, é necessário consumir 200 Conjuntos de Tábuas, 40 Mini Kits de Metais, 25 Emaranhados de Tecidos e $50.000.000 de Berries para custos gerais. Além disso, a habilidade “Perito em Carpintaria” começa a fornecer uma recompensa adicional de 1 Aglomerado de Tábuas em resultados superiores a 40. Esse aglomerado pode substituir 5 Conjuntos de Tábuas durante qualquer tipo de utilização.",
        },
        {
          tier: "TIER_V",
          title: "Navio Mãe",
          body: "Nesse nível, o construtor começa a ser capaz de acoplar Botes Solitários no seu navio principal, possibilitando não só um método alternativo de exploração em alto mar, como também um método de fuga em momentos de necessidade. Existe um limite de quantos Botes Solitários podem ser acoplados em um navio de acordo com o seu tipo: Chalupas podem carregar até 2 Botes; Bergantins podem carregar até 4 Botes; Galeões podem carregar até 8 Botes; Galeões Mestres podem carregar até 15 Botes. Para cada Bote Solitário que deseja acoplar ao navio, é necessário o gasto de 2 Emaranhados de Tecidos.",
        },
        {
          tier: "TIER_VI",
          title: "Templo do Conquistador",
          body: "Ao avançar para esse nível de Construtor, o armador aprende a construir um Galeão, um navio de múltiplas velas com locomoção muito superior ao Chalupa e Bergantim, que possui 8 espaços para armamentos (canhões, arpões…). Para construir o Galeão, é necessário consumir 500 Conjuntos de Tábuas, 100 Mini Kits de Metais, 75 Emaranhados de Tecidos e $100.000.000 de Berries para custos gerais. Além disso, nesse nível o armador sabe otimizar quase que perfeitamente seus materiais, utilizando-os com maestria para construir uma embarcação muito mais resistente, por isso, toda vez que realiza os dez Testes de Armador para definir a resistência de um navio sendo construído, ao receber um sucesso, instantaneamente recebe mais um sucesso para o teste posterior.",
        },
        {
          tier: "TIER_VII",
          title: "Mestre dos Interiores",
          body: "Nesse nível profissional, o armador consegue expandir sua área de atuação para ir além da construção de navios. Parte de seu trabalho também é manter o navio funcional e capaz de atender as necessidades de sua tripulação, e por isso, começa a especializar-se nas alterações internas das embarcações. Com esse nível de experiência, o armador torna-se capaz de alterar a arquitetura interna do navio para instalar até 2 Quartos Agradáveis (4 em Galeões, 8 em Galeões Mestres). É necessário consumir $15.000.000 em artigos de conforto e mão de obra, 75 Conjuntos de Tábuas e 100 Emaranhados de Tecidos por Quarto Agradável que deseja instalar no navio. Estes quartos concedem aos indivíduos que descansaram agradavelmente em seu interior uma bonificação de +15% de Experiência recebida. Esse bônus só é concedido a 2 indivíduos por quarto agradável.",
        },
      ],
      domains: [
        {
          id: "monarca_carvalho",
          name: "Monarca do Carvalho",
          description:
            "O Monarca do Carvalho é um domínio do construtor, onde ele se especializa ainda mais na construção de navios, alcançando a criação de embarcações que jamais nenhum outro consegue sonhar em fazer. Nesse domínio, o construtor consegue acoplar navios uns aos outros, criando uma frota marítima unida, além de conseguir construir veículos que podem alçar voo ou até mesmo submergir.",
          abilities: [
            {
              tier: "TIER_VIII",
              title: "Martelo e Serrote",
              body: "Ao atingir esse Tier de profissão, o personagem pode se especializar no domínio do Monarca do Carvalho. Fazendo isso, ele se torna capaz de construir navios mais duradouros e resilientes, que alcançam velocidades absurdas enquanto navegam no mar. Ao alcançar esse Tier, o armador é capaz de construir o Galeão Mestre, um navio de proporções colossais que detém espaço suficiente para alocar 20 armamentos (canhões, arpões…). É necessário consumir 1.000 Conjuntos de Tábuas, 200 Mini Kits de Metais, 150 Emaranhados de Tecidos e $200.000.000 de Berries para custos gerais. Por conta de seu domínio sobre a criação de Navios de Guerra, o personagem deixa de receber 06 de modificador em Testes de Armador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
            },
            {
              tier: "TIER_IX",
              title: "Frota Unida",
              body: "Chegando nesse nível de sua profissão, o Monarca do Carvalho é capaz de acoplar navios menores em um navio maior. Para utilizar essa habilidade, o armador precisa de três dias de trabalho, que usa para transformar 500 Mini Kits de Metais em correntes, acoplando até 2 navios menores a um navio maior. Ao fazer isso, os navios menores irão se locomover com todas as velocidades (a padrão e a de viagem) do navio maior. Essa habilidade pode ser utilizada múltiplas vezes por navio, sendo que Galeões Mestres geralmente conseguem acoplar até 12 navios menores.",
            },
            {
              tier: "TIER_X",
              title: "Monarca da Terra & Mar",
              body: "Ao atingir esse Tier de progressão, o Monarca do Carvalho se torna expert em embarcações e estende seus conhecimentos para a criação de veículos terrestres. Essa habilidade concede ao armador a habilidade de criar projetos para veículos distintos que podem ser completamente customizados, como pranchas de surfe, lanchas, jet skis, ônibus, trens, carros, e outros veículos. No momento em que fizerem o projeto, a equipe avaliativa irá determinar o preço da mão de obra e quais materiais serão necessários para construir o projeto almejado.",
            },
            {
              tier: "TIER_XX",
              title: "Monarca do Céu & Profundezas",
              body: "Nesse Tier, o Monarca do Carvalho finalmente alcança o auge de suas habilidades com a carpintaria. Juntando todos os conhecimentos que adquiriu durante sua carreira, o armador torna-se capaz de erguer dois novos meios de transporte, no entanto, em vez de navios, agora se torna capaz de construir submarinos e aeronaves. Para construir qualquer um dos dois, o armador necessita gastar 200 Conjuntos de Tábuas, 1.000 Mini Kits de Metais, 500 Emaranhados de Tecidos e $400.000.000 de Berries para gastos gerais. Esses dois meios de transporte possuem uma velocidade muito superior em seu domínio, com a aeronave atingindo uma velocidade semelhante à de um Gigahouse.",
            },
          ],
        },
        {
          id: "operador_ebano",
          name: "Operador de Ébano",
          description:
            "O Operador de Ébano é um domínio do construtor, que permite que o armador se especialize no conserto de embarcações, utilizando seus métodos avançados de reparo para manter um navio operante mesmo que esteja partido ao meio. Para além disso, nesse domínio, o armador começa a atrair alguns sujeitos que são encantados pelo seu trabalho, que podem ser empregados e enviados em expedições para descobrir segredos ou simplesmente para buscarem mais matéria prima.",
          abilities: [
            {
              tier: "TIER_VIII",
              title: "Carpintaria Acelerada",
              body: "Ao atingir esse Tier de profissão, o personagem pode consolidar-se no domínio do Operador de Ébano. Ao fazer isso, o Armador refina suas habilidades ao ponto de deixar de usar Conjuntos de Tábuas de uma maneira bruta, e começa a criar Kits de Reparos. Ao juntar 25 Conjuntos de Tábuas e consumir $5.000.000, o armador pode realizar um Teste de Armador. Em resultados acima de 65, o armador cria um Mini Kit de Reparos. Em resultados superiores a 70, o armador cria um Kit de Reparos, e em resultados perfeitos (76) consegue criar um Super Kit de Reparos. Esses Kits são capazes de regenerar 30%/40%/50% do HP de um navio ao longo de três turnos, necessitando que o Operador de Ébano consuma seus turnos para manter a recuperação. Por conta de seu domínio sobre o refino e otimização de materiais de construção, o personagem deixa de receber 06 de modificador em Testes de Armador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
            },
            {
              tier: "TIER_IX",
              title: "Do Jeito Certo",
              body: "Alcançando este nível de domínio, os armadores se tornam ícones de sua profissão, fato que contribui para que uma pequena parcela de indivíduos busquem sua tutela. Recebendo essa habilidade, o Operador de Ébano recebe também quatro Aprendizes de Construtor, que o auxiliam no uso de algumas habilidades da árvore do armador. Para cada pupilo que o auxilia, o Operador do Ébano reduz em 5% o tempo de construção de algum navio, além de receber uma bonificação de +1 Conjunto de Tábuas para cada pupilo que o auxilia a coletar madeira. Os pupilos também são capazes de auxiliar o armador em reparos, permitindo que o Operador de Ébano possua seu turno normalmente enquanto os pupilos exercem o papel de manter a regeneração dos Kits de Reparos. Ao chegar em uma nova ilha, o armador poderá realizar um Teste de Armador com dificuldade 80. Em sucessos, um novo pupilo irá o abordar e solicitar sua tutela.",
            },
            {
              tier: "TIER_X",
              title: "Milagre da Carpintaria",
              body: "Ao atingir este Tier, o Operador de Ébano recebe uma ação especial que pode ser usada apenas uma vez a cada três sessões. Essa ação realiza um grande reparo no navio, utilizando 10 Kits de Reparos (Cada Super Kit contabiliza 2 Kits para essa habilidade), consumindo toda a ação de turno do Armador. Ao utilizar essa ação, o Armador consegue regenerar 90% do HP do Navio e conceder uma Redução de dano de 30% nos próximos ataques recebidos pela embarcação, proporcionando uma recuperação significativa acompanhada de uma proteção potencialmente decisiva durante situações críticas. O número de reduções a ataques é igual a 1 + o número de Pupilos que auxiliaram o armador no uso dessa habilidade.",
            },
            {
              tier: "TIER_XX",
              title: "Intercâmbio Naval",
              body: "Esse Tier representa o pico de evolução de um Operador de Ébano, e com suas habilidades de reparo de navios em seu auge, o armador começa a se especializar na tutela de seus pupilos. A partir desse nível, o armador torna-se capaz de enviar seus pupilos para expedições em ilhas. Fazendo isso, o pupilo irá fazer morada na ilha em questão, adquirir conhecimento sobre a cultura local e, quando for buscado, concederá ao Operador de Ébano 5d dias Conjuntos de Tábuas. Além disso, o Aprendiz trará informações relevantes sobre a cultura e sociedade local, visto que terá se transformado em um cidadão comum daquela localidade. Quando o pupilo voltar a integrar a tripulação do Operador de Ébano, suas histórias de sua vida cotidiana irão bonificar em +2 todas as rolagens de seus companheiros por 2 sessões.",
            },
          ],
        },
      ],
    },
    {
      id: "aprimorador",
      name: "Aprimorador",
      description:
        "Os Aprimoradores são uma especialização do armador, que ao contrário do construtor (que se especializa na construção e manutenção de embarcações), se especializa na criação de apetrechos para o seu navio, adicionando aprimoramentos diversos que aumentam em muito alguns parâmetros das embarcações e de seus armamentos.",
      abilities: [
        {
          tier: "TIER_IV",
          title: "Casca Grossa",
          body: "Ao escolher a especialização Aprimorador, o armador torna-se capaz de criar utensílios distintos que auxiliam sua tripulação de maneiras diferenciadas. Nesse nível, o armador aprende a utilizar Conjuntos de Tábuas para regenerar o HP perdido de seus aprimoramentos, tal qual faz com partes quebradas de navios, em uma proporção de 1 Conjunto de Tábua para 0,5% de HP que deseja regenerar do aprimoramento. Além disso, recebe a possibilidade de criar seu primeiro aprimoramento. Ao consumir 150 Conjuntos de Tábuas, é capaz de reforçar a parte externa do navio, necessitando de um período de 1d5 dias para finalizar o aprimoramento. Com a finalização, é necessário um Teste de Armador, e em resultados iguais ou superiores a 35, o armador cria um reforço que concede 15% de Redução a danos externos; se igual ou superior a 40 concede 30% de Redução a danos externos e se igual ou superior a 45, concede 50% de redução a danos externos. Caso o navio perca 15%/30%/50% de seu HP, esse aprimoramento é destruído.",
        },
        {
          tier: "TIER_V",
          title: "Rompe Ondas",
          body: "Ao alcançar o início de sua especialização, o armador consegue utilizar os materiais coletados para criar seu primeiro aprimoramento em seu navio. Ao utilizar essa habilidade, o armador necessita consumir 200 Emaranhados de Tecidos e 100 Conjuntos de Tábuas e começa um trabalho de 1d10 dias. No fim desse período, o armador consegue construir um mecanismo suplementar no navio e aprimorar suas velas, aumentando em dois níveis a velocidade de viagem do seu navio. Esse mecanismo só pode ser acoplado uma vez por navio. O HP do mecanismo é definido por um Teste de Armador realizado no momento de sua criação. Em resultados iguais ou superiores a 40, o mecanismo possuirá HP equivalente a 50% de seu HP base. Em resultados iguais ou superiores a 45 o mecanismo terá 75% de seu HP base. Em resultados iguais ou superiores a 50 o mecanismo terá HP equivalente a 100% do seu HP base. Esse mecanismo cobre a parte exterior do navio, de forma que sempre será o primeiro a receber danos, antes mesmo do navio.",
        },
        {
          tier: "TIER_VI",
          title: "Preparação de Guerra",
          body: "Especializando-se um pouco mais na criação de aprimoramentos de artilharia, o armador começa a ser capaz de realizar a criação de um aprimoramento para um canhão. Para isso, é necessário o gasto de $10.000.000 berries e 20 Mini Kits de Metais. Realiza-se então um Teste de Armador com Dificuldade 50. Em sucessos, consegue instalar um aprimoramento no Canhão alvo que o torna capaz de realizar dois disparos simultaneamente, realizando duas rolagens de acerto (ainda consome duas Bolas de Canhão). Caso falhe no Teste de Armador mas obtenha um resultado superior a 40, recebe 50% dos materiais de volta. Caso obtenha um resultado superior a 45, recebe 70% dos materiais de volta.",
        },
        {
          tier: "TIER_VII",
          title: "Caçador de Lenha",
          body: "Através dessa habilidade, aprendida no auge de sua especialização, o aprimorador recebe a capacidade de conceder melhorias aos seus arpões. Consumindo 30 Mini Kit de Metais e $10.000.000 de berries, o aprimorador consegue fazer com que um de seus arpões dobre o seu alcance base e passe a causar 200 de dano no momento do impacto. Caso utilize esse arpão contra um navio feito de madeira, o arpão causa o dobro de dano e é capaz de fixar-se em Botes, Chalupas e Bergantins, puxando-os em direção ao navio onde o arpão está instalado em uma velocidade de 20 metros por turno.",
        },
      ],
      domains: [
        {
          id: "mestre_artilharia",
          name: "Mestre de Artilharia",
          description:
            "O Mestre de Artilharia é um domínio do Aprimorador onde o armador se aprofunda na criação de melhorias para os armamentos ofensivos de suas embarcações. Esses indivíduos são capazes de criar uma super arma em seus navios, ou até mesmo transformar completamente uma embarcação em uma arma por um pequeno período de tempo!",
          abilities: [
            {
              tier: "TIER_VIII",
              title: "Mente Coletiva",
              body: "Ao atingir esse Tier de profissão, o personagem pode se consolidar no domínio do Mestre de Artilharia. No momento em que atinge esse nível de habilidade, é capaz de instalar um aprimoramento em seu navio e em seus canhões, consumindo 100 Emaranhados de Tecidos e 25 Mini Kits de Metais, conectando até 3 Canhões uns aos outros, permitindo que suas miras sejam controladas simultaneamente e seus disparos sejam conjuntos. Por conta de seu domínio sobre os aprimoramentos ofensivos, o personagem deixa de receber 06 de modificador em Testes de Armador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
            },
            {
              tier: "TIER_IX",
              title: "Artilharia Especializada",
              body: "Com a evolução de seu domínio sobre a artilharia, o armador começa a ser capaz de desenvolver um novo tipo de arma, customizável de acordo com sua própria vontade. Para isso, o Mestre de Artilharia precisa investir uma quantia de $100.000.000 com a adição de uma lista de materiais designados pela equipe avaliativa de acordo com seu protótipo. Galeões Mestres podem possuir até 2 dessas armas acopladas, enquanto Galeões só podem possuir uma. Os demais navios não são capazes de acoplar esse tipo de armamento especial.",
            },
            {
              tier: "TIER_X",
              title: "Destruição Ambulante",
              body: "Nesse nível de progressão, o armador se especializa ainda mais em seus aprimoramentos e começa a sua primeira grande criação como um Mestre de Artilharia. É necessário consumir $200.000.000 mais um número de materiais designado pela equipe avaliativa para construir um aprimoramento de guerra em seu navio, que permite que uma vez a cada 3 sessões o navio passe por uma transformação que dura uma hora, transformando-se em uma arma de guerra com efeitos diversos e enorme potencial danoso.",
            },
            {
              tier: "TIER_XX",
              title: "Grandioso General dos Mares",
              body: "No auge de sua carreira, o Mestre de Artilharia torna-se capaz de aprimorar suas antigas criações, exercendo ao máximo tudo o que aprendeu nos seus muitos anos de carreira. Ao atingir esse nível e adquirir essa habilidade, o armador é capaz de instalar +1 Artilharia Especializada em um navio, ultrapassando os limites impostos pelo tipo de navio. Além disso, o aprimoramento Destruição Ambulante possui o triplo de tempo de duração. Ao alcançar esse Tier da profissão, o armador é capaz de criar projetos para qualquer tipo de aprimoramento ofensivo para seu navio ou seus armamentos, passando por uma avaliação criteriosa da Equipe Avaliativa, que indicará o preço para determinado projeto, a dificuldade e os materiais necessários.",
            },
          ],
        },
        {
          id: "inspetor_bugiganga",
          name: "Inspetor Bugiganga",
          description:
            "O Inspetor Bugiganga é um domínio do aprimorador que permite que o armador se aprofunde na criação de apetrechos, criando bugigangas diversas e divertidas, que alteram completamente o funcionamento do navio, ou concedem alguma super bonificação temporária para auxiliar em um momento de necessidade.",
          abilities: [
            {
              tier: "TIER_VIII",
              title: "Super Ímã Atrativo",
              body: "Ao atingir esse Tier de profissão, o personagem pode consolidar-se no domínio do Inspetor Bugiganga. Fazendo isso, o personagem torna-se capaz de criar sua primeira bugiganga, o Super Ímã Atrativo. Consumindo $50.000.000 e 1000 Mini Kits de Metais, o Inspetor Bugiganga é capaz de aprimorar um Arpão e alterar sua funcionalidade. Através desse aprimoramento, em vez do Arpão lançar um projétil, ele atrai objetos metálicos que estejam a até 200 metros de distância, com uma velocidade de 50 metros por turno. A magnetização do Super Ímã pode ser ativada e desativada. Por conta de seu domínio sobre a criação de bugigangas, o personagem deixa de receber 06 de modificador em Testes de Armador por Tier de profissão e passa a receber 07 de modificador por Tier de profissão.",
            },
            {
              tier: "TIER_IX",
              title: "Turbo de Propulsão Hidrofóbica",
              body: "Ao alcançar esse nível no domínio Inspetor Bugiganga, o armador torna-se capaz de utilizar 250 Mini Kit de Metais juntamente a 500 conjuntos de Tábuas para instalar uma melhoria em seu navio. O armador necessita de um mês para trabalhar nessa melhoria, e ao instalá-la com sucesso, o navio recebe um sistema de propulsores que o impulsiona em uma direção, sem a necessidade de ventos naturais. Além disso, após se impulsionar, o armador adiciona a possibilidade do navio alongar um par de asas metálicas que permite que, com o auxílio do turbo, o navio alce voo por até cinco horas, aumentando em 30% sua velocidade de locomoção.",
            },
            {
              tier: "TIER_X",
              title: "Super Ultra Max Zoom",
              body: "Nesse nível de profissão, o armador utiliza seus conhecimentos acerca do domínio do Inspetor Bugiganga para criar um protótipo de um item suplementar que será acoplado a um navio. Gasta-se $200.000.000, 100 Mini Kit de Metais e 200 Emaranhados de Tecidos para construir esse item suplementar, porém quando completo, permite que os tripulantes utilizem uma espécie de luneta com um Super Ultra Máx Zoom, permitindo que o seu usuário observe com detalhes uma ilha a milhares de quilômetros de distância, conseguindo observar os cidadãos de uma ilha antes mesmo da visão de seu navio surgir no horizonte.",
            },
            {
              tier: "TIER_XX",
              title: "Bolha de Autopreservação",
              body: "Atingindo o auge dessa profissão, o armador torna-se capaz de gastar 500 Mini Kit de Metais e $250.000.000 para construir uma espécie de bugiganga suplementar em seu navio. Após 1d30 dias de construção, o Inspetor Bugiganga é capaz de desenvolver um escudo protetor que é ativado ao redor de seu navio, protegendo-o completamente do próximo dano sofrido. No momento em que o escudo sofre danos, ele é desativado e volta a ser ativado após 5 turnos. Ao alcançar esse Tier da profissão, o armador é capaz de criar projetos para qualquer tipo de aprimoramento suplementar para seu navio ou seus armamentos, passando por uma avaliação criteriosa da Equipe Avaliativa, que indicará o preço para determinado projeto, a dificuldade e os materiais necessários.",
            },
          ],
        },
      ],
    },
  ],
};
