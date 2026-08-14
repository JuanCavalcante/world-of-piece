import type { ProfessionData } from "./types";

export const HISTORIADOR: ProfessionData = {
  id: "historiador",
  name: "Historiador",
  description:
    "Os Historiadores são os indivíduos que dedicam suas vidas para desvendar os segredos do passado e do presente, preservando e interpretando o conhecimento histórico do mundo. Os profissionais que compõem essa profissão possuem um olhar aguçado para detalhes e uma mente analítica.\n\nInicialmente, os personagens que seguem este caminho iniciam na profissão Historiador, e eventualmente podem se especializar e se tornar Antropólogo ou Arqueólogo.\n\nCaso se torne um Antropólogo, evolui para o domínio Observador Cotidiano ou Investigador do Pretérito.\n\nCaso se torne um Arqueólogo, evolui para o domínio Caçador de Artefatos ou Decifrador de Babel.",
  initialAbilities: [
    { tier: "INICIAL", title: "Conhecimento Prévio", body: "Os historiadores são profissionais dedicados a descobrir, preservar e interpretar os conhecimentos históricos do mundo. Inicialmente, os historiadores são capazes de realizar Testes de Historiador para conseguirem determinar se possuem ou lembram de alguma informação ou conhecimento sobre um determinado artefato, indivíduo, local, acontecimento etc. Enquanto exerce qualquer ação que desencadeia um Teste de Historiador, o personagem recebe um acréscimo de modificadores de 06 por Tier da profissão (Inicial = 0)." },
    { tier: "TIER_I", title: "Sessão de Estudos", body: "O historiador desenvolve a capacidade de buscar novos conhecimentos ou expandir as informações já adquiridas. Deve estabelecer um tema pequeno, preciso e direto ao qual deseja estudar e dedicar 3 horas para realizar uma sessão de estudos completa. Ao fim executará um Teste de Historiador que avaliará a precisão, produtividade e eficácia de seus estudos. No mundo de World of Piece, o acesso a certos conhecimentos é bastante limitado." },
    { tier: "TIER_II", title: "Aprendizado Linguístico", body: "O historiador inicia por conta própria um processo de aprendizado linguístico. Ao usar, deve escolher o idioma, adquirindo um contador de progresso de 0 a 100%. Para fluência completa (oral e escrita) o mesmo deverá concluir o contador três vezes (básico, intermediário, avançado). Exige acesso a dicionário/livro de linguística e dedicação de 4 horas por dia. Ao fim recebe 2% de progresso e realiza um Teste de Historiador — resultado superior a 28 concede o dobro. Ter contato direto com fluentes/nativos ou imersão pode aumentar o progresso, a critério do mestre." },
    { tier: "TIER_III", title: "Pesquisa Historiográfica", body: "O historiador adquire a capacidade de realizar pesquisas históricas aprofundadas. Deve definir um campo de pesquisa e um assunto. A escolha é livre, mas a dificuldade pode variar entre básico, intermediário e avançado — a barra de progressão varia entre 100%, 200% e 300%. No fim de cada sessão, o historiador rola 1d6 como % de progresso. O progresso pode ser acelerado por outras habilidades (uma sessão de estudo conectada ao tema gera +2%). Ao concluir a pesquisa, o historiador recebe uma nova informação inovadora, rara e incomum acerca do assunto." },
  ],
  specializations: [
    {
      id: "antropologo",
      name: "Antropólogo",
      description:
        "Os Antropólogos são historiadores que se dedicam à compreensão das culturas humanoides do passado e do presente. Se especializam no contato direto com indivíduos e comunidades diversas, estudando suas práticas, crenças, organizações sociais e comportamentos.",
      abilities: [
        { tier: "TIER_IV", title: "Jornada Antropológica", body: "O historiador aprende a executar os passos para começar um processo de associação e integração parcial com uma comunidade. O personagem deve se estabelecer no local por no mínimo 6 e no máximo 30 dias, realizando uma pesquisa antropológica que usa como base a “Pesquisa Historiográfica”. Pode realizar Testes de Percepção via Teste de Historiador a cada 3 dias, gerando 2% de progresso. Só pode ser reutilizada após 3 sessões." },
        { tier: "TIER_V", title: "Caçador de Relatos", body: "Executa Rolagens de Carisma com seu Teste de Historiador para iniciar diálogo cativante e extrair informações históricas, antropológicas e culturais relevantes por meio da coleta de relatos orais e memórias, concedendo 5% de progresso em sua pesquisa antropológica. Só pode ser executada durante a jornada antropológica; informações precisam ser cuidadosamente analisadas." },
        { tier: "TIER_VI", title: "Investigador de Narrativas", body: "O antropólogo desenvolve a capacidade de identificar contradições, mentiras e imprecisões em discursos. Por meio de cruzamento de dados, pode realizar um Teste de Historiador para analisar criticamente as informações. Um sucesso indica se o discurso era verdadeiro ou falso. Informações validadas contribuem +5% a +15% de progresso na pesquisa, dependendo da importância." },
        { tier: "TIER_VII", title: "Vivendo e Convivendo", body: "Consolida a conexão do antropólogo com uma comunidade que já tenha sido objeto de uma Jornada Antropológica completa, representada por uma barra de proximidade (Pessimismo, Ruim, Neutro, Bom, Muito Bom, Excepcional). O progresso ocorre ao fim da sessão ou após 15 dias na comunidade (1d6% de progresso). Pode ser acelerado por Jornada Antropológica ou Caçador de Relatos (+5%). A cada nível concluído, o historiador recebe +5 em rolagens profissionais na localidade e pode rolar 1d100 para um acaso benéfico." },
      ],
      domains: [
        { id: "observador_cotidiano", name: "Observador Cotidiano", description: "Conteúdo em breve.", abilities: [] },
        { id: "investigador_preterito", name: "Investigador do Pretérito", description: "Conteúdo em breve.", abilities: [] },
      ],
    },
    {
      id: "arqueologo",
      name: "Arqueólogo",
      description:
        "Os Arqueólogos são historiadores que dedicam suas habilidades e conhecimentos à exploração e escavação de sítios antigos, em busca de artefatos e vestígios históricos que revelem os segredos do passado.",
      abilities: [
        { tier: "TIER_IV", title: "Expedição Arqueológica", body: "O historiador desenvolve a habilidade para organizar e liderar expedições arqueológicas, executando pesquisas arqueológicas como base técnica a “Pesquisa Historiográfica”. Para iniciar, deve definir até 3 regiões/localidades. Realiza 3 rolagens de d100 (uma por localidade) com dificuldade do mestre. Ao suceder, arqueólogo e grupo iniciam a exploração. Se completou pesquisas historiográficas relacionadas, a dificuldade é reduzida. Após concluir, aguarda 3 sessões antes de iniciar uma nova." },
        { tier: "TIER_V", title: "Acervo Pessoal", body: "O arqueólogo mantém um catálogo pessoal que organiza e preserva informações detalhadas sobre suas descobertas. Ao usar, realiza um Teste de Historiador que determina o nível de precisão. As fichas contêm aparência, nome, datação, localidade, propriedade etc. Sempre que consulta ou cria uma ficha relevante, recebe bonificação acumulativa de +1 em Testes de Historiador (limite +5) e +5% na barra de progressão de uma pesquisa historiográfica por arquivo alocado." },
        { tier: "TIER_VI", title: "Tradução Paleográfica", body: "Decifra, traduz e interpreta textos em idiomas antigos ou desconhecidos. Se não tem fluência, precisa adquirir um dicionário especializado. A tradução demanda de 12 a 60 horas, com um Teste de Historiador somado às bonificações do dicionário. Ao traduzir/paleografar documento relacionado à pesquisa, acelera o progresso em +5% a +15%." },
        { tier: "TIER_VII", title: "Restauração Conservativa", body: "Restaura e conserva fontes de pesquisa deterioradas. Cada fonte possui uma barra de restauração. Requer Kits de Restauração de Tier equivalente ou inferior. A restauração é feita via Rolagem de Profissão. Pode ser necessário repetir várias vezes, respeitando 3 dias (in-game) entre intervenções. Ao restaurar item relacionado à pesquisa, acelera o progresso arqueológico em +10% a +25%." },
      ],
      domains: [
        { id: "cacador_artefatos", name: "Caçador de Artefatos", description: "Conteúdo em breve.", abilities: [] },
        { id: "decifrador_babel", name: "Decifrador de Babel", description: "Conteúdo em breve.", abilities: [] },
      ],
    },
  ],
};
