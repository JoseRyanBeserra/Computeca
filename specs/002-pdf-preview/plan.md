# Implementation Plan: Pré-visualização do PDF na Tela de Detalhes

**Branch**: `002-pdf-preview` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-pdf-preview/spec.md`

## Summary

Exibir o PDF renderizado dentro da tela de detalhes, sem troca de aba, preservando a abertura em
tela cheia.

A abordagem é **inteiramente de front-end**. O documento é exibido pelo visualizador nativo do
navegador, através de um `<object>` apontando para a mesma URL pré-assinada que o botão "Abrir PDF"
já obtém — mesma rota, mesma permissão, nenhum acesso novo.

Três problemas concretos determinam o desenho, e nenhum deles existia quando o PDF abria em outra
aba:

1. **A URL expira em 1 hora.** Um botão não sofria com isso: quem clicava já tinha saído da página.
   Um documento embutido continua buscando trechos do arquivo por *range request* conforme o
   usuário avança nas páginas — e essas buscas falham silenciosamente após a expiração. A API já
   devolve `expiresInSeconds`, que permite renovar **antes** de quebrar.
2. **`<iframe>` não sinaliza falha de forma confiável.** O evento `onError` não dispara quando o
   conteúdo carrega mas é um erro do servidor. `<object>` resolve isso nativamente: o conteúdo
   filho é renderizado quando o objeto não pode ser exibido, o que atende ao FR-006 sem depender de
   detecção por JavaScript.
3. **Em tela estreita o documento não deve ser montado.** Esconder por CSS ainda baixaria o
   arquivo. A decisão precisa acontecer em JavaScript, antes de montar o elemento.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js >= 20

**Primary Dependencies**: React 19, Vite 8, TanStack Query, Axios. **Nenhuma dependência nova** —
ver `research.md`, item 1.

**Storage**: Nenhum. A feature não persiste nada.

**Testing**: Vitest + Testing Library (`front`). Nenhum teste de back é necessário: o back não muda.

**Target Platform**: Navegadores modernos de desktop e celular.

**Project Type**: Aplicação web; esta feature toca **apenas o front-end**.

**Performance Goals**: Os metadados não podem esperar o documento (FR-004). A consulta da URL
pré-assinada é independente da consulta do material e corre em paralelo.

**Constraints**:

- O PDF é servido por origem distinta (MinIO) **sem cabeçalhos CORS** — verificado. Isso descarta
  qualquer visualizador que busque o arquivo por `fetch`/XHR, como PDF.js.
- Não há CSP nem `X-Frame-Options` no front — verificado; nada impede o enquadramento.
- Nenhuma permissão pode ser ampliada: a pré-visualização usa a seleção de rota já existente.

**Scale/Scope**: 1 componente novo, 1 hook novo, 1 tela alterada. Nenhuma rota de API.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa (não se aplica ao back) | Nenhum endpoint novo. No front, o hook e o componente têm tipos explícitos; o formato `{ url, expiresInSeconds }` já é tipado em `materialsApi.ts`. |
| **II. Autorização explícita por perfil** | ✅ Passa | Nenhuma rota nova e nenhuma regra de acesso alterada. A pré-visualização reutiliza a seleção já existente entre as três rotas de URL pré-assinada, por perfil e situação do material. **Nenhuma permissão é ampliada.** |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa | Visualizar não altera estado, então não há `AuditLog` a gravar. Nenhum controller novo, logo nenhum `InspectionLog`. Nenhuma chamada a modelo de IA. |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa | Nada é processado no servidor. O navegador busca o arquivo direto do armazenamento, sem passar pela API. |
| **V. Teste acompanha a feature** | ✅ Passa | O FR-011 exige cobertura dos quatro caminhos: sucesso, sem permissão, falha de carregamento e renovação do acesso expirado. |

**Restrições de Stack** — dois pontos merecem registro:

- *"As telas devem seguir a estrutura base já consolidada com as cores e designs"* (`front/CLAUDE.md`):
  o componente novo usa os mesmos tokens de borda, fundo e tipografia das seções existentes da tela
  de detalhes.
- *"O layout base deve permanecer em qualquer tela"*: a pré-visualização vive **dentro** do
  conteúdo da página, sem alterar `AppShell`.

**Resultado do gate: aprovado, sem violações.** Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/002-pdf-preview/
├── plan.md              # Este arquivo
├── spec.md              # Especificação
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   └── pdf-preview-component.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
front/
└── src/
    ├── features/materials/
    │   ├── hooks/
    │   │   └── useMaterialFileUrl.ts       # novo — obtém e renova a URL pré-assinada
    │   └── api/materialsApi.ts             # inalterado — as três rotas já existem
    ├── components/
    │   ├── PdfPreview.tsx                  # novo — o visualizador embutido
    │   └── PdfPreview.test.tsx             # novo
    ├── hooks/
    │   └── useIsNarrowScreen.ts            # novo — decisão de montagem em tela estreita
    └── pages/
        ├── MaterialDetailPage.tsx          # alterada — insere a pré-visualização
        └── MaterialDetailPage.test.tsx     # alterada — casos novos

MI-server/                                  # SEM ALTERAÇÕES
```

**Structure Decision**: mantida a estrutura existente do front. O hook de dados fica junto dos
demais hooks de material (`features/materials/hooks/`), seguindo o padrão de `useAllMaterials` e
`useMaterialSummary`. O componente de apresentação fica em `components/`, ao lado de `ResourceCard`
e dos demais compartilhados, porque não carrega regra de domínio — recebe uma URL e a exibe. O hook
de largura de tela fica em `hooks/` por ser utilitário genérico, sem vínculo com materiais.

**O back-end não é tocado.** Nenhum arquivo em `MI-server/` muda.

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação identificada. Seção intencionalmente vazia.
