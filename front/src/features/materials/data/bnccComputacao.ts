// src/features/materials/data/bnccComputacao.ts
//
// ARQUIVO GERADO — não edite à mão. Atualize habilidades_bncc_computacao.csv
// (ao lado) e rode `node scripts/gerarCatalogoBncc.mjs` na pasta front/.
// O teste bnccComputacao.test.ts falha se este arquivo divergir do CSV.
//
// Habilidades da BNCC de Computação (Complemento à BNCC — "Normas sobre Computação
// na Educação Básica", Resolução CNE/CEB nº 1/2022), da Educação Infantil ao
// Ensino Médio. As descrições são o TEXTO INTEGRAL do arquivo oficial.
//
// Única correção sobre o arquivo: o código EF05CO011 é registrado como EF05CO11,
// no formato de dois dígitos de sequência usado por todos os demais.
//
// Usado como base de seleção no seletor de habilidades do cadastro e da edição.

export interface BnccHabilidade {
  codigo:    string
  descricao: string
}

export interface BnccGrupo {
  etapa:       string
  habilidades: BnccHabilidade[]
}

export const BNCC_COMPUTACAO: BnccGrupo[] = [
  {
    etapa: 'Educação Infantil',
    habilidades: [
      { codigo: 'EI03CO01', descricao: 'Reconhecer padrão de repetição em sequência de sons, movimentos, desenhos.' },
      { codigo: 'EI03CO02', descricao: 'Expressar as etapas para a realização de uma tarefa de forma clara e ordenada.' },
      { codigo: 'EI03CO03', descricao: 'Experienciar a execução de algoritmos brincando com objetos (des)plugados.' },
      { codigo: 'EI03CO04', descricao: 'Criar e representar algoritmos para resolver problemas.' },
      { codigo: 'EI03CO05', descricao: 'Comparar soluções algorítmicas para resolver um mesmo problema.' },
      { codigo: 'EI03CO06', descricao: 'Compreender decisões em dois estados (verdadeiro ou falso).' },
      { codigo: 'EI03CO07', descricao: 'Reconhecer dispositivos eletrônicos (e não-eletrônicos), identificando quando estão ligados ou desligados (abertos ou fechados).' },
      { codigo: 'EI03CO08', descricao: 'Compreender o conceito de interfaces para comunicação com objetos (des)plugados.' },
      { codigo: 'EI03CO09', descricao: 'Identificar dispositivos computacionais e as diferentes formas de interação.' },
      { codigo: 'EI03CO10', descricao: 'Utilizar tecnologia digital de maneira segura, consciente e respeitosa.' },
      { codigo: 'EI03CO11', descricao: 'Adotar hábitos saudáveis de uso de artefatos computacionais, seguindo recomendações de órgãos de saúde competentes.' },
    ],
  },
  {
    etapa: 'Ensino Fundamental — Anos Iniciais (1º ao 5º ano)',
    habilidades: [
      { codigo: 'EF01CO01', descricao: 'Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.' },
      { codigo: 'EF01CO02', descricao: 'Identificar e seguir sequências de passos aplicados no dia a dia para resolver problemas.' },
      { codigo: 'EF01CO03', descricao: 'Reorganizar e criar sequências de passos em meios físicos ou digitais, relacionando essas sequências à palavra ‘Algoritmos’.' },
      { codigo: 'EF01CO04', descricao: 'Reconhecer o que é a informação, que ela pode ser armazenada, transmitida como mensagem por diversos meios e descrita em várias linguagens.' },
      { codigo: 'EF01CO05', descricao: 'Representar informação usando diferentes codificações.' },
      { codigo: 'EF01CO06', descricao: 'Reconhecer e explorar artefatos computacionais voltados a atender necessidades pessoais ou coletivas.' },
      { codigo: 'EF01CO07', descricao: 'Conhecer as possibilidades de uso seguro das tecnologias computacionais para proteção dos dados pessoais e para garantir a própria segurança.' },
      { codigo: 'EF02CO01', descricao: 'Criar e comparar modelos (representações) de objetos, identificando padrões e atributos essenciais.' },
      { codigo: 'EF02CO02', descricao: 'Criar e simular algoritmos representados em linguagem oral, escrita ou pictográfica, construídos como sequências com repetições simples (iterações definidas) com base em instruções preestabelecidas ou criadas, analisando como a precisão da instrução impacta na execução do algoritmo.' },
      { codigo: 'EF02CO03', descricao: 'Identificar que máquinas diferentes executam conjuntos próprios de instruções e que podem ser usadas para definir algoritmos.' },
      { codigo: 'EF02CO04', descricao: 'Diferenciar componentes físicos (hardware) e programas que fornecem as instruções (software) para o hardware.' },
      { codigo: 'EF02CO05', descricao: 'Reconhecer as características e usos das tecnologias computacionais no cotidiano dentro e fora da escola.' },
      { codigo: 'EF02CO06', descricao: 'Reconhecer os cuidados com a segurança no uso de dispositivos computacionais.' },
      { codigo: 'EF03CO01', descricao: 'Associar os valores \'verdadeiro\' e \'falso\' a sentenças lógicas que dizem respeito a situações do dia a dia, fazendo uso de termos que indicam negação.' },
      { codigo: 'EF03CO02', descricao: 'Criar e simular algoritmos representados em linguagem oral, escrita ou pictográfica, que incluam sequências e repetições simples com condição (iterações indefinidas), para resolver problemas de forma independente e em colaboração.' },
      { codigo: 'EF03CO03', descricao: 'Aplicar a estratégia de decomposição para resolver problemas complexos, dividindo esse problema em partes menores, resolvendo-as e combinando suas soluções.' },
      { codigo: 'EF03CO04', descricao: 'Relacionar o conceito de informação com o de dado.' },
      { codigo: 'EF03CO05', descricao: 'Compreender que dados são estruturados em formatos específicos dependendo da informação armazenada.' },
      { codigo: 'EF03CO06', descricao: 'Reconhecer que, para um computador realizar tarefas, ele se comunica com o mundo exterior com o uso de interfaces físicas (dispositivos de entrada e saída).' },
      { codigo: 'EF03CO07', descricao: 'Utilizar diferentes navegadores e ferramentas de busca para pesquisar e acessar informações.' },
      { codigo: 'EF03CO08', descricao: 'Usar ferramentas computacionais em situações didáticas para se expressar em diferentes formatos digitais.' },
      { codigo: 'EF03CO09', descricao: 'Reconhecer o potencial impacto do compartilhamento de informações pessoais ou de seus pares em meio digital.' },
      { codigo: 'EF04CO01', descricao: 'Reconhecer objetos do mundo real e/ou digital que podem ser representados através de matrizes que estabelecem uma organização na qual cada componente está em uma posição definida por coordenadas, fazendo manipulações simples sobre estas representações.' },
      { codigo: 'EF04CO02', descricao: 'Reconhecer objetos do mundo real e/ou digital que podem ser representados através de registros que estabelecem uma organização na qual cada componente é identificado por um nome, fazendo manipulações sobre estas representações.' },
      { codigo: 'EF04CO03', descricao: 'Criar e simular algoritmos representados em linguagem oral, escrita ou pictográfica, que incluam sequências e repetições simples e aninhadas (iterações definidas e indefinidas), para resolver problemas de forma independente e em colaboração.' },
      { codigo: 'EF04CO04', descricao: 'Entender que para guardar, manipular e transmitir dados deve-se codificá-los de alguma forma que seja compreendida pela máquina (formato digital).' },
      { codigo: 'EF04CO05', descricao: 'Codificar diferentes informações para representação em computador (binária, ASCII, atributos de pixel, como RGB etc.).' },
      { codigo: 'EF04CO06', descricao: 'Usar diferentes ferramentas computacionais para criação de conteúdo (textos, apresentações, vídeos etc.).' },
      { codigo: 'EF04CO07', descricao: 'Demonstrar postura ética nas atividades de coleta, transferência, guarda e uso de dados.' },
      { codigo: 'EF04CO08', descricao: 'Reconhecer a importância de verificar a confiabilidade das fontes de informações obtidas na Internet.' },
      { codigo: 'EF05CO01', descricao: 'Reconhecer objetos do mundo real e/ou digital que podem ser representados através de listas que estabelecem uma organização na qual há um número variável de itens dispostos em sequência, fazendo manipulações simples sobre estas representações.' },
      { codigo: 'EF05CO02', descricao: 'Reconhecer objetos do mundo real e digital que podem ser representados através de grafos que estabelecem uma organização com uma quantidade variável de vértices conectados por arestas, fazendo manipulações simples sobre estas representações.' },
      { codigo: 'EF05CO03', descricao: 'Realizar operações de negação, conjunção e disjunção sobre sentenças lógicas e valores \'verdadeiro\' e \'falso\'.' },
      { codigo: 'EF05CO04', descricao: 'Criar e simular algoritmos representados em linguagem oral, escrita ou pictográfica, que incluam sequências, repetições e seleções condicionais para resolver problemas de forma independente e em colaboração.' },
      { codigo: 'EF05CO05', descricao: 'Identificar os componentes principais de um computador (dispositivos de entrada/saída, processadores e armazenamento).' },
      { codigo: 'EF05CO06', descricao: 'Reconhecer que os dados podem ser armazenados em um dispositivo local ou remoto.' },
      { codigo: 'EF05CO07', descricao: 'Reconhecer a necessidade de um sistema operacional para a execução de programas e gerenciamento do hardware.' },
      { codigo: 'EF05CO08', descricao: 'Acessar as informações na Internet de forma crítica para distinguir os conteúdos confiáveis de não confiáveis.' },
      { codigo: 'EF05CO09', descricao: 'Usar informações considerando aplicações e limites dos direitos autorais em diferentes mídias digitais.' },
      { codigo: 'EF05CO10', descricao: 'Expressar-se crítica e criativamente na compreensão das mudanças tecnológicas no mundo do trabalho e sobre a evolução da sociedade.' },
      { codigo: 'EF05CO11', descricao: 'Identificar a adequação de diferentes tecnologias computacionais na resolução de problemas.' },
      { codigo: 'EF15CO01', descricao: 'Identificar as principais formas de organizar e representar a informação de maneira estruturada (matrizes, registros, listas e grafos) ou não estruturada (números, palavras, valores verdade).' },
      { codigo: 'EF15CO02', descricao: 'Construir e simular algoritmos, de forma independente ou em colaboração, que resolvam problemas simples e do cotidiano com uso de sequências, seleções condicionais e repetições de instruções.' },
      { codigo: 'EF15CO03', descricao: 'Realizar operações de negação, conjunção e disjunção sobre sentenças lógicas e valores \'verdadeiro\' e \'falso\'.' },
      { codigo: 'EF15CO04', descricao: 'Aplicar a estratégia de decomposição para resolver problemas complexos, dividindo esse problema em partes menores, resolvendo-as e combinando suas soluções.' },
      { codigo: 'EF15CO05', descricao: 'Codificar a informação de diferentes formas, entendendo a importância desta codificação para o armazenamento, manipulação e transmissão em dispositivos computacionais.' },
      { codigo: 'EF15CO06', descricao: 'Conhecer os componentes básicos de dispositivos computacionais, entendendo os princípios de seu funcionamento.' },
      { codigo: 'EF15CO07', descricao: 'Conhecer o conceito de Sistema Operacional e sua importância na integração entre software e hardware.' },
      { codigo: 'EF15CO08', descricao: 'Reconhecer e utilizar tecnologias computacionais para pesquisar e acessar informações, expressar-se crítica e criativamente e resolver problemas.' },
      { codigo: 'EF15CO09', descricao: 'Entender que as tecnologias devem ser utilizadas de maneira segura, ética e responsável, respeitando direitos autorais, de imagem e as leis vigentes.' },
    ],
  },
  {
    etapa: 'Ensino Fundamental — Anos Finais (6º ao 9º ano)',
    habilidades: [
      { codigo: 'EF06CO01', descricao: 'Classificar informações, agrupando-as em coleções (conjuntos) e associando cada coleção a um ‘tipo de dados’' },
      { codigo: 'EF06CO02', descricao: 'Elaborar algoritmos que envolvam instruções sequenciais, de repetição e de seleção usando uma linguagem de programação.' },
      { codigo: 'EF06CO03', descricao: 'Descrever com precisão a solução de um problema, construindo o programa que implementa a solução descrita.' },
      { codigo: 'EF06CO04', descricao: 'Construir soluções de problemas usando a técnica de decomposição e automatizar tais soluções usando uma linguagem de programação.' },
      { codigo: 'EF06CO05', descricao: 'Identificar os recursos ou insumos necessários (entradas) para a resolução de problemas, bem como os resultados esperados (saídas), determinando os respectivos tipos de dados, e estabelecendo a definição de problema como uma relação entre entrada e saída.' },
      { codigo: 'EF06CO06', descricao: 'Comparar diferentes casos particulares (instâncias) de um mesmo problema, identificando as semelhanças e diferenças entre eles, e criar um algoritmo para resolver todos, fazendo uso de variáveis (parâmetros) para permitir o tratamento de todos os casos de forma genérica.' },
      { codigo: 'EF06CO07', descricao: 'Entender o processo de transmissão de dados, como a informação é quebrada em pedaços, transmitida em pacotes através de múltiplos equipamentos, e reconstruída no destino.' },
      { codigo: 'EF06CO08', descricao: 'Compreender e utilizar diferentes formas de armazenar, manipular, compactar e recuperar arquivos, documentos e metadados.' },
      { codigo: 'EF06CO09', descricao: 'Apresentar conduta e linguagem apropriadas ao se comunicar em ambiente digital, considerando a ética e o respeito.' },
      { codigo: 'EF06CO10', descricao: 'Analisar o consumo de tecnologia na sociedade, compreendendo criticamente o caminho da produção dos recursos bem como aspectos ligados à obsolescência e a sustentabilidade.' },
      { codigo: 'EF07CO01', descricao: 'Criar soluções de problemas para os quais seja adequado o uso de registros e matrizes unidimensionais para descrever suas informações e automatizá-las usando uma linguagem de programação.' },
      { codigo: 'EF07CO02', descricao: 'Analisar programas para detectar e remover erros, ampliando a confiança na sua correção.' },
      { codigo: 'EF07CO03', descricao: 'Construir soluções computacionais de problemas de diferentes áreas do conhecimento, de forma individual e colaborativa, selecionando as estruturas de dados e técnicas adequadas, aperfeiçoando e articulando saberes escolares.' },
      { codigo: 'EF07CO04', descricao: 'Explorar propriedades básicas de grafos.' },
      { codigo: 'EF07CO05', descricao: 'Criar algoritmos fazendo uso da decomposição e do reúso no processo de solução de forma colaborativa e cooperativa e automatizá-los usando uma linguagem de programação.' },
      { codigo: 'EF07CO06', descricao: 'Compreender o papel de protocolos para a transmissão de dados.' },
      { codigo: 'EF07CO07', descricao: 'Identificar problemas de segurança cibernética e experimentar formas de proteção.' },
      { codigo: 'EF07CO08', descricao: 'Demonstrar empatia sobre opiniões divergentes na web.' },
      { codigo: 'EF07CO09', descricao: 'Reconhecer e debater sobre cyberbullying.' },
      { codigo: 'EF07CO10', descricao: 'Identificar os impactos ambientais do descarte de peças de computadores e eletrônicos, bem como sua relação com a sustentabilidade.' },
      { codigo: 'EF07CO11', descricao: 'Criar, documentar e publicar, de forma individual ou colaborativa, produtos (vídeos, podcasts, web sites) usando recursos de tecnologia.' },
      { codigo: 'EF08CO01', descricao: 'Construir soluções de problemas usando a técnica de recursão e automatizar tais soluções usando uma linguagem de programação.' },
      { codigo: 'EF08CO02', descricao: 'Criar soluções de problemas para os quais seja adequado o uso de listas para descrever suas informações e automatizá-las usando uma linguagem de programação, empregando ou não a recursão como uma técnica de resolver o problema.' },
      { codigo: 'EF08CO03', descricao: 'Utilizar algoritmos clássicos de manipulação sobre listas.' },
      { codigo: 'EF08CO04', descricao: 'Construir soluções computacionais de problemas de diferentes áreas do conhecimento, de forma individual e colaborativa, selecionando as estruturas de dados e técnicas adequadas, aperfeiçoando e articulando saberes escolares.' },
      { codigo: 'EF08CO05', descricao: 'Compreender os conceitos de paralelismo, concorrência e armazenamento/ processamento distribuídos.' },
      { codigo: 'EF08CO06', descricao: 'Entender como é a estrutura e funcionamento da internet.' },
      { codigo: 'EF08CO07', descricao: 'Compartilhar informações por meio de redes sociais, compreendendo a sua dinâmica de funcionamento, de forma responsável e avaliando sua confiabilidade, considerando o respeito e a ética.' },
      { codigo: 'EF08CO08', descricao: 'Distinguir os tipos de dados pessoais que são solicitados em espaços digitais e os riscos associados.' },
      { codigo: 'EF08CO09', descricao: 'Analisar criticamente as políticas de termos de uso das redes sociais e demais plataformas.' },
      { codigo: 'EF08CO10', descricao: 'Discutir questões sobre segurança e privacidade relacionadas ao uso dos ambientes virtuais.' },
      { codigo: 'EF08CO11', descricao: 'Avaliar a precisão, relevância, adequação, abrangência e vieses que ocorrem em fontes de informação eletrônica.' },
      { codigo: 'EF09CO01', descricao: 'Criar soluções de problemas para os quais seja adequado o uso de árvores e grafos para descrever suas informações e automatizá-las usando uma linguagem de programação.' },
      { codigo: 'EF09CO02', descricao: 'Construir soluções computacionais de problemas de diferentes áreas do conhecimento, de forma individual e colaborativa, selecionando as estruturas de dados e técnicas adequadas, aperfeiçoando e articulando saberes escolares.' },
      { codigo: 'EF09CO03', descricao: 'Usar autômatos para descrever comportamentos de forma abstrata automatizando-os através de uma linguagem de programação baseada em eventos.' },
      { codigo: 'EF09CO04', descricao: 'Compreender o funcionamento de malwares e outros ataques cibernéticos.' },
      { codigo: 'EF09CO05', descricao: 'Analisar técnicas de criptografia para armazenamento e transmissão de dados.' },
      { codigo: 'EF09CO06', descricao: 'Analisar problemas sociais de sua cidade e estado a partir de ambientes digitais, propondo soluções.' },
      { codigo: 'EF09CO07', descricao: 'Avaliar aplicações e implicações políticas, socioambientais e culturais das tecnologias digitais para propor alternativas aos desafios do mundo contemporâneo, incluindo aqueles relativos ao mundo do trabalho.' },
      { codigo: 'EF09CO08', descricao: 'Discutir como a distribuição desigual de recursos de computação em uma economia global levanta questões de equidade, acesso e poder.' },
      { codigo: 'EF09CO09', descricao: 'Criar ou utilizar conteúdo em meio digital, compreendendo questões éticas relacionadas a direitos autorais e de uso de imagem.' },
      { codigo: 'EF09CO10', descricao: 'Avaliar a veracidade, credibilidade e relevância da informação em seus diferentes formatos, sendo capaz de identificar o propósito pelo qual foi disseminada.' },
      { codigo: 'EF69CO01', descricao: 'Classificar informações, agrupando-as em coleções (conjuntos) e associando cada coleção a um ‘tipo de dado’.' },
      { codigo: 'EF69CO02', descricao: 'Elaborar algoritmos que envolvam instruções sequenciais, de repetição e de seleção usando uma linguagem de programação.' },
      { codigo: 'EF69CO03', descricao: 'Descrever com precisão a solução de um problema, construindo o programa que implementa a solução descrita.' },
      { codigo: 'EF69CO04', descricao: 'Construir soluções de problemas usando a técnica de decomposição e automatizar tais soluções usando uma linguagem de programação.' },
      { codigo: 'EF69CO05', descricao: 'Identificar os recursos ou insumos necessários (entradas) para a resolução de problemas, bem como os resultados esperados (saídas), determinando os respectivos tipos de dados, e estabelecendo a definição de problema como uma relação entre entrada e saída.' },
      { codigo: 'EF69CO06', descricao: 'Comparar diferentes casos particulares (instâncias) de um mesmo problema, identificando as semelhanças e diferenças entre eles, e criar um algoritmo para resolver todos, fazendo uso de variáveis (parâmetros) para permitir o tratamento de todos os casos de forma genérica.' },
      { codigo: 'EF69CO07', descricao: 'Entender o processo de transmissão de dados, como a informação é quebrada em pedaços, transmitida em pacotes através de múltiplos equipamentos, e reconstruída no destino.' },
      { codigo: 'EF69CO08', descricao: 'Compreender e utilizar diferentes formas de armazenar, manipular, compactar e recuperar arquivos, documentos e metadados.' },
      { codigo: 'EF69CO09', descricao: 'Compreender os conceitos de paralelismo, concorrência e armazenamento/ processamento distribuídos.' },
      { codigo: 'EF69CO10', descricao: 'Entender como é a estrutura e funcionamento da internet.' },
      { codigo: 'EF69CO11', descricao: 'Apresentar conduta e linguagem apropriadas ao se comunicar em ambiente digital, considerando a ética e o respeito.' },
      { codigo: 'EF69CO12', descricao: 'Analisar o consumo de tecnologia na sociedade, compreendendo criticamente o caminho da produção dos recursos bem como aspectos ligados à obsolescência e a sustentabilidade.' },
    ],
  },
  {
    etapa: 'Ensino Médio',
    habilidades: [
      { codigo: 'EM13CO01', descricao: 'Explorar e construir a solução de problemas por meio da reutilização de partes de soluções existentes.' },
      { codigo: 'EM13CO02', descricao: 'Explorar e construir a solução de problemas por meio de refinamentos, utilizando diversos níveis de abstração desde a especificação até a implementação.' },
      { codigo: 'EM13CO03', descricao: 'Identificar o comportamento dos algoritmos no que diz respeito ao consumo de recursos como tempo de execução, espaço de memória e energia, entre outros.' },
      { codigo: 'EM13CO04', descricao: 'Reconhecer o conceito de metaprogramação como uma forma de generalização na construção de programas, permitindo que algoritmos sejam entrada ou saída para outros algoritmos.' },
      { codigo: 'EM13CO05', descricao: 'Identificar os limites da Computação para diferenciar o que pode ou não ser automatizado, buscando uma compreensão mais ampla dos limites dos processos mentais envolvidos na resolução de problemas.' },
      { codigo: 'EM13CO06', descricao: 'Avaliar software levando em consideração diferentes características e métricas associadas.' },
      { codigo: 'EM13CO07', descricao: 'Compreender as diferentes tecnologias, bem como equipamentos, protocolos e serviços envolvidos no funcionamento de redes de computadores, identificando suas possibilidades de escala e confiabilidade.' },
      { codigo: 'EM13CO08', descricao: 'Entender como mudanças na tecnologia afetam a segurança, incluindo novas maneiras de preservar sua privacidade e dados pessoais on-line, reportando suspeitas e buscando ajuda em situações de risco.' },
      { codigo: 'EM13CO09', descricao: 'Identificar tecnologias digitais, sua presença e formas de uso, nas diferentes atividades no mundo do trabalho.' },
      { codigo: 'EM13CO10', descricao: 'Conhecer os fundamentos da Inteligência Artificial, comparando-a com a inteligência humana, analisando suas potencialidades, riscos e limites.' },
      { codigo: 'EM13CO11', descricao: 'Criar e explorar modelos computacionais simples para simular e fazer previsões, identificando sua importância no desenvolvimento científico.' },
      { codigo: 'EM13CO12', descricao: 'Produzir, analisar, gerir e compartilhar informações a partir de dados, utilizando princípios de ciência de dados.' },
      { codigo: 'EM13CO13', descricao: 'Analisar e utilizar as diferentes formas de representação e consulta a dados em formato digital para pesquisas científicas.' },
      { codigo: 'EM13CO14', descricao: 'Avaliar a confiabilidade das informações encontradas em meio digital, investigando seus modos de construção e considerando a autoria, a estrutura e o propósito da mensagem.' },
      { codigo: 'EM13CO15', descricao: 'Analisar a interação entre usuários e artefatos computacionais, abordando aspectos da experiência do usuário e promovendo reflexão sobre a qualidade do uso dos artefatos nas esferas do trabalho, do lazer e do estudo.' },
      { codigo: 'EM13CO16', descricao: 'Desenvolver projetos com robótica, utilizando artefatos físicos ou simuladores.' },
      { codigo: 'EM13CO17', descricao: 'Construir redes virtuais de interação e colaboração, favorecendo o desenvolvimento de projetos de forma segura, legal e ética.' },
      { codigo: 'EM13CO18', descricao: 'Planejar e gerenciar projetos integrados às áreas de conhecimento de forma colaborativa, solucionando problemas, usando diversos artefatos computacionais.' },
      { codigo: 'EM13CO19', descricao: 'Expor, argumentar e negociar propostas, produtos e serviços, utilizando diferentes mídias e ferramentas digitais.' },
      { codigo: 'EM13CO20', descricao: 'Criar conteúdos, disponibilizando-os em ambientes virtuais para publicação e compartilhamento, avaliando a confiabilidade e as consequências da disseminação dessas informações.' },
      { codigo: 'EM13CO21', descricao: 'Comunicar ideias complexas de forma clara por meio de objetos digitais como mapas conceituais, infográficos, hipertextos e outros.' },
      { codigo: 'EM13CO22', descricao: 'Produzir e publicar conteúdo como textos, imagens, áudios, vídeos e suas associações, bem como ferramentas para sua integração, organização e apresentação, utilizando diferentes mídias digitais.' },
      { codigo: 'EM13CO23', descricao: 'Analisar criticamente as experiências em comunidades virtuais e as relações advindas da interação e comunicação com outras pessoas, bem como seus impactos na sociedade.' },
      { codigo: 'EM13CO24', descricao: 'Identificar e reconhecer como as redes sociais e artefatos computacionais em geral interferem na saúde física e mental de seus usuários.' },
      { codigo: 'EM13CO25', descricao: 'Dialogar em ambientes virtuais com segurança e respeito às diferenças culturais e pessoais, reconhecendo e denunciando atitudes abusivas.' },
      { codigo: 'EM13CO26', descricao: 'Aplicar os conceitos e pressupostos do direito digital em sua conduta e experiências com o cotidiano da cultura digital, bem como na produção e uso de artefatos computacionais.' },
    ],
  },
]

/** Lista achatada de todas as habilidades, para busca. */
export const BNCC_COMPUTACAO_FLAT: BnccHabilidade[] = BNCC_COMPUTACAO.flatMap((g) => g.habilidades)

/** Mapa código → descrição, para exibir a descrição de um código conhecido. */
export const BNCC_COMPUTACAO_MAP: Record<string, string> = Object.fromEntries(
  BNCC_COMPUTACAO_FLAT.map((h) => [h.codigo, h.descricao]),
)
