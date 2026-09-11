# front Computeca

- O layout base com a barra de pesquisa, titulo de 'Computeca' e as opcoes do sub-menu a esquerda devem permanecer em qualquer tela, sendo realmente um layout base
- As telas que forem sendo implementadas devem seguir a estrutura base ja consolidada com as cores, designs e etc

## Funcionalidades de IA

A instalação pode ter a IA desativada. Antes de renderizar qualquer elemento de
IA (resumo, chat, estado de processamento), combine as duas dimensões:

```tsx
const { ai } = useFeatures()
const podeConversar = ai.enabled && canUseAiChat(user)
```

- `useFeatures()` responde sobre a **existência** da funcionalidade nesta
  instalação (`features/config/hooks/useFeatures.ts`).
- `lib/permissions.ts` responde sobre o **perfil** do usuário e permanece puro —
  não misture o estado da instalação nele, senão deixa de ser possível
  distinguir "não pode" de "não existe".
- A API **omite** `vectorStatus` quando a IA está desativada: o campo é opcional
  no tipo e o código precisa tolerar sua ausência.
- Em testes, `renderWithProviders` aceita `features` para injetar o estado sem
  mockar a rota. O padrão é IA ligada.

## Pré-visualização de documento

A tela de detalhes exibe o PDF embutido. Ao mexer nessa área:

- **Nunca monte `<object>` diretamente.** Use `components/PdfPreview.tsx`, que já trata
  carregamento, falha por permissão, falha temporária e tela estreita.
- **O acesso ao arquivo vem sempre de `useMaterialFileUrl`**
  (`features/materials/hooks/`), que escolhe a rota pré-assinada pelo perfil e pela situação do
  material. Não replique essa escolha: concentrá-la ali é o que impede a pré-visualização e a
  abertura em tela cheia de divergirem em permissão.
- **Em tela estreita o documento não é montado** — `useIsNarrowScreen()` decide antes da
  montagem. Esconder por classe CSS manteria o elemento no DOM e o navegador baixaria o PDF para
  quem não vai vê-lo.
- **O acesso expira em 1 hora** e é renovado automaticamente 5 minutos antes, só com a aba
  visível. Não há erro a que reagir: depois da expiração, as buscas por *range* do visualizador
  nativo falham silenciosamente.

### Ao testar

No jsdom o `<object>` **nunca falha ao carregar** e seus filhos ficam sempre no DOM. Asseverar
sempre pelos atributos (`data`, `type`), **nunca** pela presença do texto de fallback — ele está
presente também no estado de sucesso, o que tornaria a asserção vazia. O fallback só é verificável
manualmente, em navegador sem suporte a PDF embutido.
