# Quickstart — Validação: Atualização do Catálogo de Habilidades da BNCC Computação

Roteiro para provar, de ponta a ponta, que a feature funciona. Regras e números de referência estão
em [data-model.md](./data-model.md) e [contracts/bncc-catalog.md](./contracts/bncc-catalog.md).

## Pré-requisitos

- Front e API em execução (ver "Como Executar — Desenvolvimento" no `README.md`)
- Uma conta com permissão de upload, e uma conta **ADMIN** para o cenário de edição
- Ao menos um material já cadastrado com habilidades (o acervo de desenvolvimento tem um, com
  `EF06CO01`, `EF06CO02` e `EF06CO04`)

---

## Cenário 1 — O acervo não muda (FR-009, SC-003)

**Antes** de aplicar a feature, registre as habilidades gravadas:

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  'select id, "habilidadesBncc" from "MaterialInstrucional" order by id;'
```

Aplique a feature e repita a consulta.

**Esperado**: saída idêntica, linha por linha.

---

## Cenário 2 — Todas as habilidades são encontradas (FR-001, FR-006, SC-001)

Em **Upload de Material**, no campo de habilidades, busque:

| Busca | Esperado |
|---|---|
| `EI03CO07` | Aparece sob **Educação Infantil** |
| `EF15CO05` | Aparece sob **Anos Iniciais** |
| `EF69CO10` | Aparece sob **Anos Finais** |
| `EF05CO11` | Aparece; `EF05CO011` não retorna sugestão oficial |
| `robótica` | `EM13CO16` entre as sugestões |
| `padrão de repetição` | `EI03CO01` entre as sugestões |

A cobertura dos 141 códigos é verificada pela suíte automatizada (cenário 7); aqui a amostra
confirma o comportamento na tela real.

---

## Cenário 3 — Descrição integral, sem corte (FR-002, FR-007)

Busque `EF02CO02`.

**Esperado**: a descrição aparece inteira — termina em "…impacta na execução do algoritmo." —, sem
reticências. Selecione-a e passe o cursor sobre a tag: o texto integral aparece.

---

## Cenário 4 — Etapas na ordem (FR-004, FR-005)

Clique no campo de habilidades sem digitar nada.

**Esperado**: os grupos aparecem na ordem Educação Infantil → Ensino Fundamental — Anos Iniciais →
Ensino Fundamental — Anos Finais → Ensino Médio.

---

## Cenário 5 — Edição usa o mesmo catálogo (FR-008)

Com a conta ADMIN, abra a edição de um material e busque `EI03CO03`.

**Esperado**: aparece exatamente como no cadastro. As habilidades já gravadas no material
continuam selecionadas.

---

## Cenário 6 — Personalizada continua valendo; a que virou oficial ganha descrição (FR-010, FR-011)

1. No cadastro, digite `MINHA-HAB-01` e escolha **Adicionar habilidade personalizada**.
   **Esperado**: é acrescentada, com o aviso "Habilidade personalizada" ao passar o cursor.
2. Digite `EI03CO01`.
   **Esperado**: **não** é oferecida como personalizada — aparece como sugestão oficial.

---

## Cenário 7 — Suíte automatizada (FR-012, FR-013, SC-002, SC-005)

```bash
npm --prefix front run test
```

**Esperado**: todos passam, inclusive a correspondência catálogo × arquivo, e nenhum teste
preexistente teve expectativa alterada.

Para confirmar que a verificação de fato protege, altere uma vírgula numa descrição de
`bnccComputacao.ts` e rode de novo: o teste de correspondência **deve falhar** apontando o código.
Desfaça a alteração.

---

## Cenário 8 — Nada no servidor mudou

```bash
git diff --stat main -- MI-server
```

**Esperado**: nenhum arquivo do `MI-server` alterado por esta feature.
