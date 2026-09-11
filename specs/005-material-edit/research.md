# Phase 0 — Research: Edição de Material Instrucional pelo Administrador

**Feature**: `005-material-edit` | **Date**: 2026-09-11

Todas as incógnitas foram resolvidas por leitura do código existente. Não restou ponto em aberto,
mas **duas limitações do sistema atual** foram descobertas no caminho e estão registradas nos itens
6 e 7 — elas não são criadas por esta feature, e uma delas merece decisão do autor.

---

## 1. A ordem das operações é o coração da feature

**Decisão**: gravar o arquivo novo sob **chave nova**, atualizar o registro, e só então remover o
arquivo antigo. Em caso de falha na atualização, remover o arquivo **novo** como compensação.

```
1. valida entrada
2. carrega o material            → 404 se não existe ou foi removido
3. valida o arquivo novo          (se houver)
4. grava o arquivo novo           → CHAVE NOVA, o antigo continua íntegro
5. atualiza o registro            → transação: metadados, ponteiro do arquivo,
                                    situação, invalidação dos dados de IA
6. remove o arquivo antigo        → só agora
7. grava o registro de auditoria
```

**Rationale**: o FR-011 exige que a substituição seja tudo-ou-nada, e o FR-010 que a remoção venha
depois. A ordem acima é a única que satisfaz as duas.

O ponto decisivo é a **chave nova**. Sobrescrever a chave existente pareceria mais simples — um
`putObject` no mesmo lugar — e seria o desenho errado: uma falha no meio da escrita deixaria o
material apontando para um objeto truncado, **sem nenhuma forma de voltar atrás**, porque o
conteúdo anterior já teria sido destruído. Com chave nova, o documento antigo permanece íntegro e
acessível até o instante em que o registro já aponta para o novo.

O tratamento de falha é assimétrico de propósito:

| Falha em | Consequência |
|---|---|
| Passo 4 (gravar o novo) | Nada mudou. Erro ao usuário. |
| Passo 5 (atualizar o registro) | Remove o arquivo novo e desfaz. Nada mudou. |
| **Passo 6 (remover o antigo)** | **A edição está concluída.** Registra advertência e segue. |

A assimetria do passo 6 é deliberada: um arquivo órfão no armazenamento é um incômodo que se
resolve depois; um material apontando para um documento inexistente é uma tela quebrada para todo
mundo. Entre os dois, o incômodo é a escolha óbvia.

**Alternativas consideradas**:

- *Sobrescrever a mesma chave*: descrito acima — destrói o original antes de saber se o novo
  chegou inteiro.
- *Remover o antigo antes de gravar o novo*: a janela em que o material não tem arquivo algum passa
  a ser garantida, em vez de improvável.
- *Manter o arquivo antigo para sempre*: seria mais seguro, e contraria a decisão explícita do
  autor de que o novo toma o lugar do antigo.

---

## 2. O parse do formulário já serve à edição, sem alteração

**Decisão**: reutilizar `parseMaterialMultipart` como está.

**Rationale**: ele já devolve `fileBuffer: Buffer | null` — o `null` existe porque o cadastro
precisa detectar arquivo ausente para recusá-lo. Na edição, esse mesmo `null` significa "não trocar
o documento". A estrutura de que a feature precisa **já existe**, e não é coincidência: o módulo foi
unificado na feature 003 exatamente para que os caminhos de cadastro não divergissem.

Consequência prática: um campo novo no cadastro passa a chegar à edição de graça, e vice-versa. É o
mesmo argumento que levou a extrair os limites para `features/materials/constants.ts` na correção do
envio por projeto.

**Alternativas consideradas**: um parser próprio para a edição. Seria um terceiro laço sobre
`request.parts()` para manter em sincronia com os outros dois — precisamente o erro que a 003
corrigiu.

---

## 3. A entrada carrega o conjunto completo de metadados

**Decisão**: o corpo da edição traz **título, descrição e habilidades sempre**, e reaproveita
`titleSchema` e `descriptionSchema` do `materialPdfUploadSchema`.

**Rationale**: o FR-004 exige que as regras sejam as mesmas do cadastro. Se os campos fossem todos
opcionais — semântica de alteração parcial —, omitir a descrição seria indistinguível de "manter a
que está", e um material com descrição inválida atravessaria a edição sem nunca ser conferido. Com o
conjunto completo, **toda edição revalida tudo**, e a regra não tem como ser contornada pela porta
da edição.

O custo é nulo para quem usa: o FR-020 já exige que o formulário venha preenchido com os valores
atuais, então o conjunto completo é o que a tela naturalmente envia de volta.

Reaproveitar os schemas do cadastro — em vez de redeclarar os limites — é o que garante que mudar o
mínimo da descrição no futuro valha nos dois lugares de uma vez.

**Alternativas consideradas**: campos opcionais com semântica de alteração parcial. Mais idiomático
para um `PATCH`, e abre o buraco descrito acima.

---

## 4. O registro de auditoria guarda o que mudou, não o estado inteiro

**Decisão**: ação `MI_UPDATED`, com `metadata` contendo **apenas os campos alterados**, cada um com
valor anterior e novo. Quando o documento é trocado, o registro guarda a identificação do arquivo
anterior.

**Rationale**: o FR-016 pede saber "de qual valor para qual", e o FR-017 que uma edição sem
alteração não produza registro. Ambos exigem **comparar antes e depois** — feito o diff, gravar só
o que mudou sai de graça e produz um histórico legível.

Guardar o estado inteiro a cada edição encheria a tabela de campos que não mudaram e deixaria quem
lê procurando a diferença.

O valor anterior da descrição é guardado **por inteiro**, não truncado. É exatamente ele que
permite reconstruir o que existia antes — e num acervo cujos metadados agora são mutáveis, essa é a
única rede de proteção que sobra.

A estrutura já existe: `AuditLog.metadata` é `Json?`, e `createAuditLog` já aceita um objeto
arbitrário. Nenhuma mudança de modelo.

**Alternativas consideradas**:

- *Gravar o estado completo antes e depois*: histórico maior e menos legível, sem ganho.
- *Tabela de versões do material*: daria um histórico navegável e restaurável, muito além do que a
  especificação pede — e a spec registra explicitamente que não há histórico de versões.

---

## 5. A invalidação dos dados de IA não é opcional

**Decisão**: ao substituir o documento, zerar resumo, data do resumo e estados de processamento
(`summaryStatus` e `vectorStatus` voltam a `PENDING`).

**Rationale**: resumo e vetores foram apurados sobre o **documento antigo**. Mantê-los faria o
sistema afirmar sobre o material novo coisas que nunca leu — e no caso do resumo, apresentá-las ao
usuário como se descrevessem o que ele está vendo.

As funcionalidades de IA estão desligadas hoje, o que torna a invalidação invisível no momento. Isso
é justamente o motivo de fazê-la agora: existe `npm run ai:backfill` para reprocessar o acervo, e o
dia em que ele rodar é o dia em que resumos de documentos substituídos apareceriam como corretos.

**Alternativas consideradas**: reenfileirar a vetorização na hora da troca. Rejeitado — com a IA
desativada não há fila; e mesmo ligada, o material volta para revisão (FR-013), e a vetorização já
acontece na aprovação.

---

## 6. Limitação descoberta: material rejeitado não tem como voltar

**Registro, não decisão.** Esta feature não cria o problema e não o resolve.

A especificação prevê que material rejeitado possa ser editado — é o caso em que corrigir tem mais
valor. Mas o fluxo de revisão atual recusa qualquer decisão sobre material que não esteja
aguardando revisão:

```
if (material.status !== 'PENDING_REVIEW') → 400 MI_NOT_PENDING
```

Ou seja, **`REJECTED` já é terminal hoje**, antes desta feature. Corrigir um material rejeitado pela
edição melhora os dados, e ele continuará rejeitado para sempre, porque nada o devolve à fila.

O FR-013 manda devolver à revisão apenas o material **aprovado** cujo documento foi trocado, e o
plano segue isso à risca. Fazer `REJECTED` voltar a `PENDING_REVIEW` seria útil e **não está na
especificação** — é decisão do autor, não do plano.

---

## 7. Limitação herdada: o cadastro não grava auditoria

**Registro.** Verificado que `materialPdfUploadService` grava apenas log estruturado
(`evento: 'mi_enviado'`), **sem `AuditLog`** — embora o Princípio III liste "upload" entre as ações
que exigem registro. Aprovação, rejeição e remoção gravam corretamente.

A edição **não herda** essa lacuna: ela grava `AuditLog` desde o primeiro commit, como o Princípio
III exige. A pendência do cadastro segue existindo e é anterior a esta feature.

---

## 8. A tela é uma página, não uma janela sobreposta

**Decisão**: rota própria de edição, alcançável a partir dos detalhes do material.

**Rationale**: o formulário carrega título, descrição longa, seletor de habilidades e troca de
arquivo — é do mesmo tamanho do formulário de cadastro, que já ocupa uma página inteira. Espremer
isso numa janela sobreposta prejudicaria justamente o campo mais importante da feature, a descrição,
que precisa de área para ser lida enquanto se escreve.

Uma rota também é endereçável: dá para voltar a ela depois de uma falha sem refazer a navegação.

O acesso reaproveita `isSysAdmin(user)`, que já existe em `lib/permissions.ts` e já significa
exatamente "é ADMIN" — o predicado de que o FR-019 precisa, sem inventar regra nova.

**Alternativas consideradas**: edição em linha na própria tela de detalhes. Boa para um campo,
ruim para cinco, e obrigaria a tela de detalhes a carregar responsabilidade de formulário.

---

## 9. A confirmação da troca de arquivo fica na tela

**Decisão**: a confirmação explícita do FR-012 é responsabilidade da interface; o servidor não
exige campo de confirmação.

**Rationale**: a confirmação existe para proteger **a pessoa** de um clique irreversível — é
problema de interface. Exigir um campo `confirmar=true` no servidor daria falsa sensação de
proteção: quem chama a rota diretamente o preencheria sem pensar, e quem usa a tela já confirmou.

O que o servidor garante é outra coisa, e essa sim é estrutural: só ADMIN altera (FR-002), e a troca
nunca deixa o material sem documento (FR-011).

**Alternativas consideradas**: campo obrigatório de confirmação na requisição. Cerimônia sem
proteção real.
