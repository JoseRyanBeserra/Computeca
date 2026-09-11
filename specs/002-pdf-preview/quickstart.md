# Quickstart — Validação da Pré-visualização do PDF

**Feature**: `002-pdf-preview` | **Date**: 2026-09-11

Roteiro para provar que a feature funciona de ponta a ponta. Cada cenário aponta o requisito ou
critério de sucesso que verifica.

---

## Pré-requisitos

- Docker Desktop em execução
- Infraestrutura no ar: `docker compose -f MI-server/docker-compose.yml up -d`
- API (`npm --prefix MI-server run dev`) e front (`npm --prefix front run dev`) em execução
- Pelo menos um material aprovado no acervo, com o arquivo presente no armazenamento

> **Windows**: encerre o Docker Desktop pelo menu da bandeja, nunca por encerramento forçado —
> encerramento abrupto deixa sockets órfãos que impedem a próxima inicialização.

---

## Cenário 1 — O documento aparece na própria tela (FR-001, FR-002, SC-001)

Abra os detalhes de um material aprovado.

**Esperado**:

- O documento é exibido renderizado dentro da página, junto dos metadados
- É possível percorrer as páginas dentro da área do documento, sem sair da tela
- **Nenhuma aba nova é aberta**

---

## Cenário 2 — Metadados não esperam o documento (FR-004, SC-002)

Com a rede limitada pelas ferramentas do navegador (perfil "Slow 3G"), abra os detalhes.

**Esperado**: título, autor, tamanho e habilidades BNCC aparecem **antes** do documento terminar de
carregar. A área do documento mostra progresso próprio, com altura já reservada — o restante da
página não salta quando o documento chega.

---

## Cenário 3 — Tela cheia preservada (FR-003)

Com a pré-visualização exibida, acione "Abrir PDF".

**Esperado**: o documento abre fora da página, exatamente como antes desta feature.

---

## Cenário 4 — Falha de carregamento (FR-006, FR-008, SC-003)

Derrube o armazenamento e recarregue a tela de detalhes:

```bash
docker compose -f MI-server/docker-compose.yml stop minio
```

**Esperado**:

- Os metadados continuam visíveis
- No lugar do documento, mensagem de indisponibilidade temporária **com** botão de tentar novamente
- O botão "Abrir PDF" continua presente

Suba o armazenamento de volta e acione "tentar novamente":

```bash
docker compose -f MI-server/docker-compose.yml start minio
```

**Esperado**: o documento carrega, sem recarregar a página.

---

## Cenário 5 — Sem permissão (FR-005, FR-006)

Entre com um usuário de perfil `COMMON` e abra os detalhes de um material **não aprovado** que não
lhe pertença.

**Esperado**: mensagem informando indisponibilidade, **sem** botão de tentar novamente — repetir não
mudaria o resultado. Nenhuma mensagem de erro técnico.

Confirme também que nenhum acesso foi ampliado: o mesmo usuário continua sem conseguir abrir o
documento em tela cheia.

---

## Cenário 6 — Tela estreita (FR-009, SC-004)

Reduza a janela para menos de 768px de largura, ou use a emulação de dispositivo móvel.

**Esperado**:

- No lugar do documento, um cartão com chamada para abrir em tela cheia
- A página rola de ponta a ponta sem ficar presa em nenhuma área
- Na aba de rede das ferramentas do navegador, **nenhuma requisição do arquivo PDF** — ele não deve
  ser baixado onde não será exibido

Volte para largura de desktop e confirme que o documento volta a aparecer embutido.

---

## Cenário 7 — Renovação do acesso (FR-007)

O acesso expira em 1 hora, então a verificação direta é demorada. Duas formas:

**Rápida, pelos testes**: a suíte cobre o agendamento com relógio simulado — ver
[contracts](./contracts/pdf-preview-component.md#testes-obrigatórios-fr-011).

**Completa, no ambiente real**: deixe a tela de detalhes aberta por mais de 55 minutos e observe a
aba de rede.

**Esperado**: uma nova requisição da URL é emitida antes da expiração, e o documento continua
navegável depois de ultrapassada a hora. Sem a renovação, avançar páginas passaria a falhar
silenciosamente.

---

## Cenário 8 — Nada mais na tela mudou (FR-010, SC-005)

Percorra a tela de detalhes conferindo que continuam funcionando: download, habilidades BNCC, ações
administrativas de professor e administrador, e o comportamento da área de IA conforme o
interruptor da feature 001.

---

## Suíte automatizada

```bash
npm --prefix front run test
```

**Esperado**: tudo passando, sem alteração de expectativa nos testes que já existiam (SC-005).

O back não é tocado por esta feature, mas vale confirmar que segue íntegro:

```bash
npm --prefix MI-server run test:unit
npm --prefix MI-server run test:integration
```

Referências: [contratos](./contracts/), [modelo de dados](./data-model.md),
[decisões técnicas](./research.md).
