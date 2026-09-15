# Phase 0 — Research: Atualização do Catálogo de Habilidades da BNCC Computação

**Feature**: `006-bncc-habilidades-update` | **Date**: 2026-09-14

Todas as incógnitas foram resolvidas por leitura do código e comparação direta com o arquivo. Não
restou nenhum ponto em aberto.

---

## 1. Onde o catálogo vive hoje — e quem o consome

**Achado**: o catálogo é **exclusivamente do front-end**, em
`front/src/features/materials/data/bnccComputacao.ts`, e só um componente o consome:
`components/BnccHabilidadePicker.tsx` (sugestões agrupadas, busca e mapa código → descrição).

| Consumidor verificado | Usa o catálogo? |
|---|---|
| `BnccHabilidadePicker` (cadastro e edição) | **Sim** — `BNCC_COMPUTACAO` e `BNCC_COMPUTACAO_MAP` |
| `HabilidadesBncc` (chips no detalhe e nas listas) | Não — exibe só o código |
| `HabilidadeFilter` (filtro da listagem) | Não — usa `GET /mis/habilidades`, montado a partir dos materiais |
| Servidor (`materialPdfUploadSchema`) | Não — aceita qualquer texto, normalizado |

**Consequência**: a feature não toca o servidor, o banco nem nenhuma rota. O FR-009 (acervo
intacto) é satisfeito **por construção** — nada que grava habilidades é alterado.

---

## 2. Forma do catálogo: arquivo TypeScript gerado, não CSV lido em tempo de execução

**Decisão**: manter o catálogo como **arquivo TypeScript tipado**, regenerado a partir do CSV, e
versionar o CSV ao lado dele.

**Rationale**:

- A lista é revisável em diff: quem abre o PR vê exatamente quais habilidades entraram e que texto
  mudou. Um CSV parseado no navegador esconderia isso atrás do parser.
- Nenhum parser de CSV vai para o bundle. O arquivo tem campos entre aspas com vírgulas internas —
  um parser ingênuo por `split(',')` quebraria em 60% das linhas; um correto é código a mais em
  produção para um dado que muda uma vez por ano, se tanto.
- Tipo e forma são verificados pelo `tsc` do build, e não descobertos em tempo de execução.

**O risco dessa escolha é a divergência** — alguém edita o `.ts` à mão e ele deixa de corresponder
ao arquivo oficial. Ele é fechado pelo item 3.

**Alternativas consideradas**:

- *Importar o CSV em tempo de execução* (`?raw` + parse no navegador): fonte única, sem risco de
  divergência. Rejeitado pelo parser em produção e pela perda de revisão em diff.
- *Mover o catálogo para o servidor, com rota própria*: permitiria validar códigos no cadastro.
  Rejeitado: a spec mantém habilidade personalizada (FR-010), então validar contra o catálogo não é
  desejado, e o custo seria uma rota, um service e uma consulta extra no formulário sem ganho.
- *Tabela no banco com importação pelo painel*: explicitamente fora do escopo (Assumptions).

---

## 3. Como garantir que o catálogo corresponde ao arquivo (FR-012)

**Decisão**: um **teste** importa o CSV com o sufixo `?raw` do Vite, faz o parse no próprio teste e
compara com o catálogo — quantidade, códigos (com a normalização do item 4) e descrições, **na
mesma ordem**.

**Rationale**:

- `?raw` já é tipado pelo `vite/client`, declarado em `front/tsconfig.json`. Não exige
  `@types/node` nem `fs`, que o front não tem.
- Os testes estão fora do `tsc` do build (`exclude` em `tsconfig.json`), e o CSV só é importado pelo
  teste — **ele não entra no bundle**.
- O parser fica no teste, onde um erro dele falha a suíte em vez de quebrar a tela.

**Onde o CSV mora**: `front/src/features/materials/data/habilidades_bncc_computacao.csv`, ao lado
do catálogo. A cópia em `specs/006-bncc-habilidades-update/` é o anexo da especificação; a do front
é a que o teste confere. Ambas são o mesmo arquivo — o teste garante o catálogo, e a tarefa de
cópia garante a igualdade entre as duas.

**Alternativas consideradas**:

- *Ler o CSV de `specs/` com `fs`*: exigiria `@types/node` no front e acoplaria os testes do front a
  uma pasta de documentação fora do projeto — que nem entra no contexto do build Docker.
- *Não testar, confiar na geração*: é exatamente o que deixou o catálogo atual com 109 habilidades
  e descrições resumidas sem que ninguém percebesse.

---

## 4. O código `EF05CO011`

**Decisão**: registrar como **`EF05CO11`**. A normalização é explícita e isolada: uma única regra
no gerador e a mesma regra no teste de correspondência.

**Rationale**: todos os outros 140 códigos do arquivo usam dois dígitos de sequência
(`EF05CO10`, `EF07CO11`, `EM13CO26`). O catálogo atual já usa `EF05CO11`, e é o código que qualquer
material classificado com essa habilidade tem gravado. Adotar `EF05CO011` faria o material deixar
de reconhecer a própria habilidade como oficial.

A regra de normalização é **específica** — remover o zero à esquerda de uma sequência de três
dígitos — e o teste confirma que ela afeta **exatamente um** código. Se um arquivo futuro trouxer
outra anomalia, o teste falha em vez de corrigi-la em silêncio.

**Alternativas consideradas**: *manter `EF05CO011` como está no arquivo* — rejeitado pelo acima;
*mapear os dois códigos* — duplicaria a habilidade nas sugestões.

---

## 5. Agrupamento por etapa

**Decisão**: a etapa é **derivada do prefixo** do código, com quatro grupos em ordem de
escolaridade:

| Prefixo | Etapa |
|---|---|
| `EI03` | Educação Infantil |
| `EF01`–`EF05`, `EF15` | Ensino Fundamental — Anos Iniciais (1º ao 5º ano) |
| `EF06`–`EF09`, `EF69` | Ensino Fundamental — Anos Finais (6º ao 9º ano) |
| `EM13` | Ensino Médio |

Dentro de cada grupo vale a ordem do arquivo (FR-005). Verificado que o arquivo **já está
contíguo por etapa** nessa ordem — `EI03`, `EF01..EF05`, `EF15`, `EF06..EF09`, `EF69`, `EM13` —,
então a ordem do arquivo e a ordem por grupo coincidem.

Um prefixo fora da tabela faz o **gerador falhar**, e não cair num grupo "outros": a lista de
etapas é pequena e estável, e um código inesperado merece ser olhado.

**Alternativas consideradas**: *grupos separados para `EF15` e `EF69`* ("Anos Iniciais —
segmento") — rejeitado; cria seis grupos para quatro etapas e separa habilidades que o autor busca
juntas. *Etapa como coluna do CSV* — o arquivo não a tem, e acrescentá-la alteraria a fonte oficial.

---

## 6. Descrições longas na interface (FR-007)

**Achado**: o `BnccHabilidadePicker` **já exibe a descrição sem truncar** — o texto da sugestão é um
bloco que quebra linha, e a lista de sugestões tem rolagem própria. A tag de habilidade selecionada
expõe a descrição pelo `title`, lida do mapa.

A maior descrição do arquivo tem **283 caracteres** (`EF02CO02`). Em largura de formulário isso dá
três a quatro linhas de texto pequeno — cabe na lista de sugestões, que já rola.

**Decisão**: **nenhuma mudança visual** no componente. O que muda é o comentário do catálogo, que
hoje justifica o resumo "para caber na UI" — premissa que a verificação mostrou falsa.

~~**Limite por grupo mantido** (`MAX_POR_GRUPO = 8`)~~ — **decisão revertida na clarificação de
2026-09-14.** O limite era justamente o que fazia a lista mostrar "apenas algumas" habilidades: sem
termo, só 8 de cada etapa apareciam, e habilidades como `EF05CO09` ou `EM13CO20` só eram alcançáveis
por quem já soubesse o que buscar.

**Decisão atual**: remover o limite. A lista mostra todas as correspondências, agrupadas, com
rolagem própria; a altura máxima da lista cresce um pouco para comportar mais itens por vez.

**Custo verificado**: 141 itens, cada um um botão com dois textos, é uma lista pequena para o
navegador — dispensa virtualização. A filtragem por `includes` sobre 141 entradas acontece a cada
tecla sem custo perceptível.

**Alternativas consideradas**: *limite com "ver mais" por etapa* — mais cliques para chegar ao que
o pedido quer ver de imediato; *virtualização da lista* — complexidade sem necessidade nesta escala.

---

## 7. FR-011 sai de graça

**Achado**: o picker decide se um código é conhecido consultando `BNCC_COMPUTACAO_MAP`, e a tag usa
o mesmo mapa para o `title`. Um material que gravou `EI03CO01` como personalizada passa a exibir a
descrição oficial assim que o código entra no mapa — sem nenhuma linha nova e sem tocar no registro.

---

## 8. Testes existentes afetados

| Teste | Afetado? |
|---|---|
| `BnccHabilidadePicker.test.tsx` — busca "inteligência artificial" → `EM13CO10` | Não: o texto integral contém "Inteligência Artificial" |
| `BnccHabilidadePicker.test.tsx` — `EF01CO01` conhecido, `ABC-123` personalizado | Não |
| `UploadPage.test.tsx` / `MaterialEditPage.test.tsx` — `EF06CO02`, `EF06CO01` | Não: códigos mantidos |

Nenhum teste depende do texto resumido. O SC-005 deve fechar sem expectativa alterada.
