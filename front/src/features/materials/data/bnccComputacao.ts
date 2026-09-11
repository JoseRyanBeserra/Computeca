// src/features/materials/data/bnccComputacao.ts
//
// Habilidades da BNCC de Computação (Complemento à BNCC — "Normas sobre Computação
// na Educação Básica", Resolução CNE/CEB nº 1/2022), para Ensino Fundamental
// (Anos Iniciais e Finais) e Ensino Médio.
//
// Usado como base de seleção no formulário de habilidades da página de upload.
// As descrições estão em forma resumida para caber na UI — para o texto integral,
// consulte o documento oficial. Códigos no formato EF<ano>CO<seq> e EM13CO<seq>.
//
// Fonte de referência: https://www.computacional.com.br/bncc/

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
    etapa: 'Ensino Fundamental — Anos Iniciais (1º ao 5º ano)',
    habilidades: [
      { codigo: 'EF01CO01', descricao: 'Organizar objetos físicos ou digitais considerando diferentes características.' },
      { codigo: 'EF01CO02', descricao: 'Identificar e seguir sequências de passos aplicados no dia a dia.' },
      { codigo: 'EF01CO03', descricao: 'Reorganizar e criar sequências de passos em meios físicos ou digitais.' },
      { codigo: 'EF01CO04', descricao: 'Reconhecer o que é a informação e que ela pode ser armazenada.' },
      { codigo: 'EF01CO05', descricao: 'Representar informação usando diferentes codificações.' },
      { codigo: 'EF01CO06', descricao: 'Reconhecer e explorar artefatos computacionais que atendem necessidades.' },
      { codigo: 'EF01CO07', descricao: 'Conhecer as possibilidades de uso seguro das tecnologias computacionais.' },

      { codigo: 'EF02CO01', descricao: 'Criar e comparar modelos (representações) de objetos.' },
      { codigo: 'EF02CO02', descricao: 'Criar e simular algoritmos em linguagem oral, escrita ou pictográfica.' },
      { codigo: 'EF02CO03', descricao: 'Identificar que máquinas diferentes executam conjuntos próprios de instruções.' },
      { codigo: 'EF02CO04', descricao: 'Diferenciar componentes físicos (hardware) e programas (software).' },
      { codigo: 'EF02CO05', descricao: 'Reconhecer as características e usos das tecnologias computacionais.' },
      { codigo: 'EF02CO06', descricao: 'Reconhecer os cuidados com a segurança no uso de dispositivos computacionais.' },

      { codigo: 'EF03CO01', descricao: 'Associar os valores verdadeiro e falso a sentenças lógicas.' },
      { codigo: 'EF03CO02', descricao: 'Criar e simular algoritmos com sequências e repetições com condição.' },
      { codigo: 'EF03CO03', descricao: 'Aplicar a estratégia de decomposição para resolver problemas complexos.' },
      { codigo: 'EF03CO04', descricao: 'Relacionar o conceito de informação com o de dado.' },
      { codigo: 'EF03CO05', descricao: 'Compreender que dados são estruturados em formatos específicos.' },
      { codigo: 'EF03CO06', descricao: 'Reconhecer que o computador se comunica com o mundo exterior via interfaces.' },
      { codigo: 'EF03CO07', descricao: 'Utilizar diferentes navegadores e ferramentas de busca.' },
      { codigo: 'EF03CO08', descricao: 'Usar ferramentas computacionais para se expressar em diferentes formatos.' },
      { codigo: 'EF03CO09', descricao: 'Reconhecer o impacto do compartilhamento de informações pessoais.' },

      { codigo: 'EF04CO01', descricao: 'Reconhecer objetos representados por matrizes com coordenadas.' },
      { codigo: 'EF04CO02', descricao: 'Reconhecer objetos representados por registros identificados por nome.' },
      { codigo: 'EF04CO03', descricao: 'Criar e simular algoritmos com sequências e repetições simples e aninhadas.' },
      { codigo: 'EF04CO04', descricao: 'Entender que dados devem ser codificados para a máquina (formato digital).' },
      { codigo: 'EF04CO05', descricao: 'Codificar diferentes informações (binária, ASCII, RGB).' },
      { codigo: 'EF04CO06', descricao: 'Usar ferramentas computacionais para criação de conteúdo.' },
      { codigo: 'EF04CO07', descricao: 'Demonstrar postura ética na coleta, transferência e uso de dados.' },
      { codigo: 'EF04CO08', descricao: 'Reconhecer a importância de verificar a confiabilidade de fontes da internet.' },

      { codigo: 'EF05CO01', descricao: 'Reconhecer objetos representados por listas em sequência.' },
      { codigo: 'EF05CO02', descricao: 'Reconhecer objetos representados por grafos com vértices e arestas.' },
      { codigo: 'EF05CO03', descricao: 'Realizar operações de negação, conjunção e disjunção sobre sentenças lógicas.' },
      { codigo: 'EF05CO04', descricao: 'Criar algoritmos com sequências, repetições e seleções condicionais.' },
      { codigo: 'EF05CO05', descricao: 'Identificar os componentes principais de um computador.' },
      { codigo: 'EF05CO06', descricao: 'Reconhecer que dados podem ser armazenados localmente ou remotamente.' },
      { codigo: 'EF05CO07', descricao: 'Reconhecer a necessidade de um sistema operacional.' },
      { codigo: 'EF05CO08', descricao: 'Acessar informações da internet de forma crítica.' },
      { codigo: 'EF05CO09', descricao: 'Usar informações considerando aplicações de direitos autorais.' },
      { codigo: 'EF05CO10', descricao: 'Expressar-se criticamente sobre mudanças tecnológicas no mundo do trabalho.' },
      { codigo: 'EF05CO11', descricao: 'Identificar a adequação de diferentes tecnologias computacionais.' },
    ],
  },
  {
    etapa: 'Ensino Fundamental — Anos Finais (6º ao 9º ano)',
    habilidades: [
      { codigo: 'EF06CO01', descricao: 'Classificar informações agrupando-as em coleções (conjuntos).' },
      { codigo: 'EF06CO02', descricao: 'Elaborar algoritmos de sequência, repetição e seleção em linguagem de programação.' },
      { codigo: 'EF06CO03', descricao: 'Descrever com precisão a solução de um problema.' },
      { codigo: 'EF06CO04', descricao: 'Construir soluções usando decomposição e automatizar com programação.' },
      { codigo: 'EF06CO05', descricao: 'Identificar recursos necessários (entradas) e resultados esperados (saídas).' },
      { codigo: 'EF06CO06', descricao: 'Comparar instâncias de um problema e criar algoritmo genérico.' },
      { codigo: 'EF06CO07', descricao: 'Entender o processo de transmissão de dados em pacotes.' },
      { codigo: 'EF06CO08', descricao: 'Compreender formas de armazenar, manipular e recuperar arquivos.' },
      { codigo: 'EF06CO09', descricao: 'Apresentar conduta apropriada ao se comunicar em ambiente digital.' },
      { codigo: 'EF06CO10', descricao: 'Analisar o consumo de tecnologia e aspectos de sustentabilidade.' },

      { codigo: 'EF07CO01', descricao: 'Criar soluções usando registros e matrizes unidimensionais.' },
      { codigo: 'EF07CO02', descricao: 'Analisar programas para detectar e remover erros.' },
      { codigo: 'EF07CO03', descricao: 'Construir soluções selecionando estruturas de dados adequadas.' },
      { codigo: 'EF07CO04', descricao: 'Explorar propriedades básicas de grafos.' },
      { codigo: 'EF07CO05', descricao: 'Criar algoritmos fazendo uso de decomposição e reúso.' },
      { codigo: 'EF07CO06', descricao: 'Compreender o papel de protocolos na transmissão de dados.' },
      { codigo: 'EF07CO07', descricao: 'Identificar problemas de segurança cibernética e formas de proteção.' },
      { codigo: 'EF07CO08', descricao: 'Demonstrar empatia diante de opiniões divergentes na web.' },
      { codigo: 'EF07CO09', descricao: 'Reconhecer e debater sobre cyberbullying.' },
      { codigo: 'EF07CO10', descricao: 'Identificar impactos ambientais do descarte de eletrônicos.' },
      { codigo: 'EF07CO11', descricao: 'Criar, documentar e publicar produtos usando recursos de tecnologia.' },

      { codigo: 'EF08CO01', descricao: 'Construir soluções usando a técnica de recursão.' },
      { codigo: 'EF08CO02', descricao: 'Criar soluções usando listas com ou sem recursão.' },
      { codigo: 'EF08CO03', descricao: 'Utilizar algoritmos clássicos de manipulação sobre listas.' },
      { codigo: 'EF08CO04', descricao: 'Construir soluções selecionando estruturas de dados adequadas.' },
      { codigo: 'EF08CO05', descricao: 'Compreender paralelismo, concorrência e processamento distribuído.' },
      { codigo: 'EF08CO06', descricao: 'Entender a estrutura e o funcionamento da internet.' },
      { codigo: 'EF08CO07', descricao: 'Compartilhar informações por redes sociais de forma responsável.' },
      { codigo: 'EF08CO08', descricao: 'Distinguir tipos de dados pessoais solicitados em espaços digitais.' },
      { codigo: 'EF08CO09', descricao: 'Analisar criticamente termos de uso de plataformas.' },
      { codigo: 'EF08CO10', descricao: 'Discutir segurança e privacidade em ambientes virtuais.' },
      { codigo: 'EF08CO11', descricao: 'Avaliar a precisão e relevância de fontes de informação eletrônica.' },

      { codigo: 'EF09CO01', descricao: 'Criar soluções usando árvores e grafos para descrever informações.' },
      { codigo: 'EF09CO02', descricao: 'Construir soluções selecionando estruturas de dados.' },
      { codigo: 'EF09CO03', descricao: 'Usar autômatos para descrever comportamentos de forma abstrata.' },
      { codigo: 'EF09CO04', descricao: 'Compreender o funcionamento de malwares e ataques cibernéticos.' },
      { codigo: 'EF09CO05', descricao: 'Analisar técnicas de criptografia para armazenamento e transmissão.' },
      { codigo: 'EF09CO06', descricao: 'Analisar problemas sociais a partir de ambientes digitais.' },
      { codigo: 'EF09CO07', descricao: 'Avaliar aplicações e implicações políticas das tecnologias digitais.' },
      { codigo: 'EF09CO08', descricao: 'Discutir a distribuição desigual de recursos de computação globalmente.' },
      { codigo: 'EF09CO09', descricao: 'Criar ou utilizar conteúdo compreendendo questões éticas.' },
      { codigo: 'EF09CO10', descricao: 'Avaliar a veracidade e a credibilidade da informação.' },
    ],
  },
  {
    etapa: 'Ensino Médio',
    habilidades: [
      { codigo: 'EM13CO01', descricao: 'Explorar a solução de problemas pela reutilização de partes existentes.' },
      { codigo: 'EM13CO02', descricao: 'Explorar soluções por refinamentos com diversos níveis de abstração.' },
      { codigo: 'EM13CO03', descricao: 'Identificar o comportamento de algoritmos quanto ao consumo de recursos.' },
      { codigo: 'EM13CO04', descricao: 'Reconhecer a metaprogramação como generalização na construção de programas.' },
      { codigo: 'EM13CO05', descricao: 'Identificar os limites da Computação para diferenciar o automatizável.' },
      { codigo: 'EM13CO06', descricao: 'Avaliar software considerando diferentes características e métricas.' },
      { codigo: 'EM13CO07', descricao: 'Compreender tecnologias de redes (escalabilidade e confiabilidade).' },
      { codigo: 'EM13CO08', descricao: 'Entender como mudanças tecnológicas afetam segurança e privacidade.' },
      { codigo: 'EM13CO09', descricao: 'Identificar tecnologias digitais nas atividades do mundo do trabalho.' },
      { codigo: 'EM13CO10', descricao: 'Conhecer fundamentos da Inteligência Artificial e suas potencialidades.' },
      { codigo: 'EM13CO11', descricao: 'Criar modelos computacionais para simular e fazer previsões.' },
      { codigo: 'EM13CO12', descricao: 'Produzir, analisar e compartilhar informações usando ciência de dados.' },
      { codigo: 'EM13CO13', descricao: 'Analisar diferentes formas de representação e consulta de dados.' },
      { codigo: 'EM13CO14', descricao: 'Avaliar a confiabilidade de informações investigando sua construção.' },
      { codigo: 'EM13CO15', descricao: 'Analisar a interação entre usuários e artefatos computacionais.' },
      { codigo: 'EM13CO16', descricao: 'Desenvolver projetos de robótica com artefatos físicos ou simuladores.' },
      { codigo: 'EM13CO17', descricao: 'Construir redes virtuais de interação e colaboração segura.' },
      { codigo: 'EM13CO18', descricao: 'Planejar e gerenciar projetos integrados de forma colaborativa.' },
      { codigo: 'EM13CO19', descricao: 'Expor, argumentar e negociar propostas usando mídias digitais.' },
      { codigo: 'EM13CO20', descricao: 'Criar conteúdos avaliando confiabilidade e consequências da disseminação.' },
      { codigo: 'EM13CO21', descricao: 'Comunicar ideias complexas por meio de objetos digitais.' },
      { codigo: 'EM13CO22', descricao: 'Produzir e publicar conteúdo multimídia integrando diferentes mídias.' },
      { codigo: 'EM13CO23', descricao: 'Analisar criticamente experiências em comunidades virtuais.' },
      { codigo: 'EM13CO24', descricao: 'Identificar como redes sociais interferem na saúde dos usuários.' },
      { codigo: 'EM13CO25', descricao: 'Dialogar em ambientes virtuais com segurança e respeito.' },
      { codigo: 'EM13CO26', descricao: 'Aplicar conceitos de direito digital na experiência com a cultura digital.' },
    ],
  },
]

/** Lista achatada de todas as habilidades, para busca. */
export const BNCC_COMPUTACAO_FLAT: BnccHabilidade[] = BNCC_COMPUTACAO.flatMap((g) => g.habilidades)

/** Mapa código → descrição, para exibir a descrição de um código conhecido. */
export const BNCC_COMPUTACAO_MAP: Record<string, string> = Object.fromEntries(
  BNCC_COMPUTACAO_FLAT.map((h) => [h.codigo, h.descricao]),
)
