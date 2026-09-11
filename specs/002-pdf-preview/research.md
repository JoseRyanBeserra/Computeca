# Phase 0 — Research: Pré-visualização do PDF na Tela de Detalhes

**Feature**: `002-pdf-preview` | **Date**: 2026-09-11

Todas as incógnitas foram resolvidas por leitura do código e por verificação empírica contra o
ambiente em execução. Não restou nenhum `NEEDS CLARIFICATION`.

---

## 1. Mecanismo de exibição: nativo do navegador, não PDF.js

**Decisão**: exibir com `<object type="application/pdf">`, que delega ao visualizador nativo do
navegador. **Nenhuma dependência nova.**

**Rationale**: verificação empírica contra um material real do acervo, através da URL pré-assinada
que a própria aplicação gera:

```
HTTP/1.1 206 Partial Content
Content-Type: application/pdf
Content-Range: bytes 0-1/180395
```

Três fatos decisivos:

- **`Content-Type: application/pdf`** e **ausência de `Content-Disposition: attachment`** — o
  navegador renderiza em vez de baixar.
- **Aceita *range request* (206)** — o visualizador nativo carrega o documento sob demanda, sem
  puxar o arquivo inteiro de uma vez.
- **Nenhum cabeçalho CORS** — e é isto que decide a escolha.

**Alternativas consideradas**:

- *PDF.js / `react-pdf`*: renderiza em `<canvas>` e dá controle total sobre a interface. **Inviável
  sem trabalho de infraestrutura**: a biblioteca busca o arquivo por `fetch`, e a origem do MinIO
  não envia cabeçalhos CORS. Exigiria configurar CORS no MinIO em desenvolvimento **e** no
  armazenamento de produção — que hoje é um ambiente institucional de terceiros. Acrescentaria
  ainda ~350 KB de dependência e um *worker* para uma feature que o navegador já resolve.
- *Proxy do PDF pela própria API*, eliminando o problema de origem: faria todo o tráfego de arquivo
  passar pelo Fastify, desperdiçando a URL pré-assinada, que existe justamente para evitar isso.
- *`<iframe>`*: funciona, mas perde no tratamento de falha — ver item 2.

---

## 2. `<object>` em vez de `<iframe>`

**Decisão**: `<object>`, com conteúdo de fallback no corpo do elemento.

**Rationale**: o FR-006 exige mensagem compreensível quando o documento não pode ser exibido.

`<iframe>` não permite cumprir isso de forma confiável: `onError` não dispara quando o servidor
responde com um erro que o navegador consegue renderizar (um XML de erro do S3, por exemplo, carrega
com sucesso do ponto de vista do `iframe`). E a política de mesma origem impede inspecionar o
conteúdo para descobrir o que foi carregado.

`<object>` resolve isso **nativamente**: quando o navegador não consegue exibir o recurso no tipo
declarado, ele renderiza os elementos filhos. O fallback é declarativo, não depende de detecção por
JavaScript, e cobre de uma vez o navegador sem suporte a PDF embutido — que é um dos casos de borda
da especificação.

**Alternativas consideradas**:

- *`<embed>`*: mesmo suporte de renderização, mas **não aceita conteúdo de fallback** — é um
  elemento vazio. Perde exatamente a propriedade que motivou a escolha.
- *`<iframe>` + detecção por JavaScript*: exigiria heurística frágil e temporizador para adivinhar
  falha, sem nunca alcançar a confiabilidade do fallback declarativo.

---

## 3. Renovação do acesso antes da expiração (FR-007)

**Decisão**: renovar **proativamente**, agendando nova busca da URL pouco antes de `expiresInSeconds`
se esgotar, e não reagir ao erro depois que ele acontece.

**Rationale**: a URL vale 1 hora (`PRESIGNED_URL_EXPIRY_SECONDS = 3600`). O problema é específico do
documento embutido: o visualizador nativo busca trechos do arquivo por *range request* conforme o
usuário avança nas páginas. Depois da expiração, essas buscas passam a receber `403` — e o
visualizador falha **silenciosamente**, sem notificar a aplicação. Não há evento a que reagir.

A API já devolve `expiresInSeconds` junto da URL, então o instante da expiração é conhecido. Renovar
com margem — 5 minutos antes — mantém o documento utilizável enquanto a página estiver aberta.

Trocar a URL remonta o elemento e reinicia o documento na primeira página. Por isso a renovação só
acontece **enquanto a aba está visível**: renovar em segundo plano gastaria requisição à toa, e
renovar no momento em que o usuário retorna evita puxar o documento de volta ao início no meio de
uma leitura.

**Alternativas consideradas**:

- *Reagir ao erro*: impossível — não há erro observável a que reagir.
- *Aumentar a validade da URL no servidor*: empurra o problema para frente e afrouxa uma janela de
  acesso por um motivo de interface. Alteraria o back, que esta feature não toca.
- *Renovar a cada foco na aba*: simples, mas remontaria o documento sem necessidade, jogando o
  leitor de volta à primeira página.

---

## 4. Tela estreita: decidir em JavaScript, não em CSS

**Decisão**: `useIsNarrowScreen()` com `matchMedia`, para **não montar** o elemento em telas
estreitas. Ponto de corte em 768px, o mesmo `md` do Tailwind já usado no projeto.

**Rationale**: esconder com `hidden md:block` deixaria o elemento no DOM, e o navegador começaria a
baixar o PDF mesmo sem ninguém poder vê-lo — desperdício de dados justamente para quem está no
celular. A decisão precisa acontecer antes da montagem.

Há ainda o motivo que originou o requisito: um documento embutido numa tela estreita captura o gesto
de rolagem, e o usuário fica preso. Não montar elimina o problema na raiz, em vez de tentar contornar
com `touch-action`.

**Alternativas consideradas**:

- *CSS puro*: mais simples, mas baixa o arquivo à toa e não elimina o sequestro de rolagem se o
  elemento for exibido em qualquer largura intermediária.
- *Detecção por user agent*: frágil e não responde a redimensionamento de janela.

---

## 5. Metadados não esperam o documento (FR-004)

**Decisão**: a URL pré-assinada é buscada por um hook próprio, com chave de consulta própria,
independente da consulta que traz o material.

**Rationale**: a tela já carrega o material por `useQuery`. Uma consulta separada para a URL corre
em paralelo e falha de forma isolada — se o armazenamento estiver fora do ar, os metadados aparecem
normalmente e só a área do documento reporta indisponibilidade, que é exatamente o que o FR-006
pede.

Segue o padrão já estabelecido por `useMaterialSummary`, que também é uma consulta secundária e
independente na mesma tela.

**Alternativas consideradas**: incluir a URL na resposta do material. Acoplaria o carregamento dos
metadados à disponibilidade do armazenamento e exigiria alterar o back — que esta feature não toca.

---

## 6. Nenhuma permissão nova

**Decisão**: reaproveitar integralmente a seleção de rota já existente em `handleOpenPdf`.

**Rationale**: a tela já escolhe entre três rotas conforme perfil e situação do material:

| Situação | Rota |
|---|---|
| `PROFESSOR` ou `ADMIN` | `review-presigned-url` |
| Material `APPROVED` | `public-presigned-url` |
| Demais casos (autor do material) | `presigned-url` |

Extrair essa decisão para o hook novo e usá-la nos dois lugares — pré-visualização e tela cheia —
garante que as duas nunca divirjam. Quem pode abrir, pode pré-visualizar; quem não pode, não vê
nenhuma das duas. O Princípio II fica satisfeito sem tocar em nenhuma rota.

**Alternativas consideradas**: criar uma rota dedicada à pré-visualização. Seria superfície de
acesso nova para resolver um problema que já está resolvido, e exigiria nova análise de
autorização.

---

## 7. Ausência de CSP confirmada

**Decisão**: nenhuma configuração adicional é necessária para enquadrar a origem do armazenamento.

**Rationale**: verificado que não há `Content-Security-Policy` nem `X-Frame-Options` no `nginx.conf`
do front nem no `index.html`. Nada bloqueia a exibição embutida de recurso de outra origem.

**Ponto de atenção para o futuro**: se um CSP for adicionado ao projeto, ele precisará permitir a
origem do armazenamento em `object-src` / `frame-src`, ou esta feature deixa de funcionar sem aviso.
Registrado aqui para que a ligação não se perca.
