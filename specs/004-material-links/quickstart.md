# Quickstart — Validação dos Links Relacionados

**Feature**: `004-material-links` | **Date**: 2026-09-11

Roteiro para provar a feature de ponta a ponta. Cada cenário aponta o requisito que verifica.

---

## Pré-requisitos

- Docker Desktop em execução
- Infraestrutura no ar: `docker compose -f MI-server/docker-compose.yml up -d`
- Migração aplicada: `npm --prefix MI-server run db:migrate`
- API e front em execução
- Conta com permissão de upload

> **Windows**: encerre o Docker Desktop pelo menu da bandeja, nunca por encerramento forçado.
>
> **Depois de migrar**, reinicie a API. O processo carrega o cliente Prisma na subida e `tsx watch`
> recarrega TypeScript, não o cliente gerado — foi o que custou uma iteração na feature 003.

---

## Cenário 1 — O acervo existente sobrevive à migração (SC-005)

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  "select count(*) total, count(*) filter (where \"relatedLinks\"::text = '[]') sem_links from \"MaterialInstrucional\";"
```

**Esperado**: `total` igual ao número de materiais antes da migração, e `sem_links` igual a `total`.
Todos passam a ter lista vazia, que é o significado correto.

Abra os detalhes de um desses materiais.

**Esperado**: a tela carrega normalmente e **nenhuma área de links aparece** — sem rótulo de seção,
sem espaço, sem aviso (FR-007).

---

## Cenário 2 — Os botões aparecem e levam ao destino (FR-003 a FR-006, SC-001)

Cadastre um material com dois ou três links e abra seus detalhes.

**Esperado**:

- Os botões aparecem **imediatamente abaixo da descrição**
- Cada botão exibe o **rótulo**, não o endereço
- A aparência é a mesma dos chips de habilidade BNCC, com matiz própria
- Passar o cursor sobre um botão revela o **endereço completo**
- Acionar um botão abre o destino **fora da tela atual**, e a página do material continua aberta

---

## Cenário 3 — O formulário informa as regras antes do envio (FR-014, SC-004)

Na tela de envio, tente acrescentar links inválidos:

| Tentativa | Esperado |
|---|---|
| Rótulo vazio | Impedido, com a exigência informada |
| Endereço malformado (`abc`) | Impedido, com o formato esperado |
| Endereço `javascript:alert(1)` | Impedido |
| Décimo primeiro link | Impedido, com o limite informado |

**Esperado em todos**: o impedimento acontece **ao acrescentar**, não ao enviar — ninguém descobre a
regra por uma recusa do servidor.

Acrescente um link válido e remova-o.

**Esperado**: entra e sai da lista sem afetar os demais campos.

---

## Cenário 4 — Links são opcionais (FR-002)

Cadastre um material **sem informar nenhum link**.

**Esperado**: o cadastro conclui normalmente, e a tela de detalhes não exibe área de links.

---

## Cenário 5 — A proteção não depende da interface (FR-012, SC-003)

Este é o cenário central da US3. Chame a rota diretamente, contornando a tela:

```bash
curl -X POST http://127.0.0.1:3333/mis \
  -H "Authorization: Bearer <token>" \
  -F "file=@arquivo.pdf" \
  -F "title=Teste" \
  -F "description=<descrição com pelo menos cinquenta caracteres para passar na validação>" \
  -F 'relatedLinks=[{"label":"Clique","url":"javascript:alert(1)"}]' \
  -w '\n[%{http_code}]\n'
```

**Esperado**: `422`. Nenhum material é criado.

Repita com `data:text/html,<script>x</script>`, `file:///etc/passwd` e `ftp://x.com`.

**Esperado**: `422` em todos. Este é o conjunto que `z.string().url()` sozinho **aceitaria** — a
verificação de protocolo é o que os recusa.

Repita com 11 links, com rótulo de 61 caracteres e com rótulo vazio.

**Esperado**: `422`. Com exatamente 10 links e rótulo de exatamente 60, **esperado `201`** — os
limites são inclusivos.

---

## Cenário 6 — A regra vale pelo caminho da organização (FR-013)

Repita o cenário 5 em `POST /organizations/<orgId>/mis`.

**Esperado**: exatamente os mesmos resultados. Uma regra que valesse só num dos caminhos deixaria
link perigoso entrar pela porta lateral.

---

## Cenário 7 — Isolamento da página de origem (FR-015)

Com um material com links aberto, inspecione um dos botões nas ferramentas do navegador.

**Esperado**: o botão declara abertura em contexto separado **e** a relação que impede o destino de
obter referência à janela de origem e de receber o endereço de procedência.

Sem isso, a página de destino poderia redirecionar a aba de origem — risco real num acervo que
aceita submissões de terceiros.

---

## Cenário 8 — Nada mais mudou (FR-016, SC-006)

Percorra os fluxos de material conferindo que seguem funcionando: upload, título e descrição
obrigatórios, habilidades BNCC, aprovação, exclusão, download, pré-visualização do documento e o
comportamento da área de IA conforme o interruptor da feature 001.

Confirme também que os **chips de habilidade continuam idênticos** — eles passaram a consumir o
estilo compartilhado, e a mudança não deve ser perceptível.

---

## Suíte automatizada

```bash
npm --prefix MI-server run test:unit
npm --prefix MI-server run test:integration
npm --prefix front run test
```

**Esperado**: tudo passando, sem alteração de expectativa nos testes que já existiam (SC-006).

Referências: [contratos](./contracts/), [modelo de dados](./data-model.md),
[decisões técnicas](./research.md).
