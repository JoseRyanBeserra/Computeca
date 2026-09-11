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
