# Contrato — Interface da pré-visualização

Esta feature não expõe nenhuma interface de rede nova. O contrato relevante é o **da interface de
usuário** e o do componente que a implementa.

---

## Componente `PdfPreview`

```
front/src/components/PdfPreview.tsx
```

### Entrada

| Propriedade | Tipo | Obrigatória | Significado |
|---|---|---|---|
| `materialId` | `string` | sim | Material cujo arquivo será exibido. |
| `materialStatus` | `MIStatus` | sim | Situação do material, usada na escolha da rota de acesso. |
| `onOpenFullscreen` | `() => void` | sim | Aciona a abertura em tela cheia. Recebida da tela para que exista **um único** caminho de abertura. |
| `title` | `string` | não | Título do documento, usado como rótulo acessível. |

O componente **não recebe a URL pronta**. Ele obtém o acesso pelo hook `useMaterialFileUrl`, para
que a escolha de rota por perfil e situação fique em um lugar só.

### Estados visuais

| Estado | O que é exibido |
|---|---|
| **Carregando** | Área com a mesma altura do documento e indicador de progresso. A altura reservada evita que o restante da página salte quando o documento chega. |
| **Documento exibido** | `<object type="application/pdf">` com o documento, altura fixa, rolagem interna. |
| **Navegador sem suporte** | Conteúdo de fallback do `<object>`: explicação e chamada para abrir em tela cheia. Declarativo, sem JavaScript. |
| **Sem permissão** | Mensagem informando que o documento não está disponível para o usuário. **Sem** botão de tentar novamente — repetir não mudaria o resultado. |
| **Falha de carregamento** | Mensagem de indisponibilidade temporária **com** botão de tentar novamente (FR-008). |
| **Tela estreita** | Cartão com o nome do documento e chamada para abrir em tela cheia. O `<object>` **não é montado**. |

### Distinção entre "sem permissão" e "falha temporária"

Vem do código de situação da resposta da API:

| Situação | Interpretação | Oferece nova tentativa? |
|---|---|---|
| `401` / `403` | Sem permissão | Não |
| `404` | Material inexistente ou removido | Não |
| Demais falhas (rede, `5xx`) | Indisponibilidade temporária | Sim |

Repetir uma requisição que foi recusada por permissão só produziria a mesma recusa — oferecer o
botão seria enganoso.

### Garantias

- **Nunca** renderiza área vazia sem explicação (SC-003).
- **Nunca** impede a renderização dos metadados: falha aqui é isolada (FR-006).
- **Nunca** captura a rolagem da página em tela estreita, porque ali não é montado (FR-009).
- **Não** abre o documento por caminho próprio: usa `onOpenFullscreen` recebida da tela.

---

## Hook `useMaterialFileUrl`

```
front/src/features/materials/hooks/useMaterialFileUrl.ts
```

### Assinatura

```ts
useMaterialFileUrl(materialId: string, materialStatus: MIStatus, enabled?: boolean)
```

Retorna o estado descrito em [data-model.md](../data-model.md#estado-acesso-ao-arquivo).

### Responsabilidades

1. **Escolher a rota** conforme perfil do usuário e situação do material — a mesma regra que
   `handleOpenPdf` já aplica hoje, extraída para cá e passando a servir aos dois usos.
2. **Agendar a renovação** para 5 minutos antes da expiração, executando apenas com a aba visível.
3. **Expor `refetch`** para a nova tentativa explícita.
4. **Respeitar `enabled`**: com `false` não emite requisição alguma — usado para não buscar o acesso
   em tela estreita, onde o documento não será exibido.

### Chave de consulta

```
['material-file-url', materialId]
```

Independente da chave do material, para que a falha de uma não contamine a outra.

---

## Alteração em `MaterialDetailPage`

A tela passa a:

1. Renderizar `PdfPreview` entre os metadados e as ações.
2. Passar `handleOpenPdf` como `onOpenFullscreen`.
3. Manter o botão "Abrir PDF" exatamente como está (FR-003).

**Nada mais muda.** Habilidades BNCC, ações administrativas, download e a seção de IA permanecem
como estão (FR-010).

---

## Testes obrigatórios (FR-011)

| Caso | Verificação |
|---|---|
| Documento disponível | O elemento de documento é renderizado com a URL obtida |
| Sem permissão (`403`) | Mensagem de indisponibilidade, **sem** botão de tentar novamente |
| Falha temporária (`500`) | Mensagem de indisponibilidade **com** botão de tentar novamente |
| Nova tentativa | Acionar o botão refaz a requisição |
| Tela estreita | O elemento de documento **não** é renderizado; a chamada de tela cheia aparece |
| Tela larga | O elemento de documento é renderizado |
| Metadados independentes | Com a busca da URL falhando, título e demais metadados seguem visíveis |
| Tela cheia preservada | O botão "Abrir PDF" continua presente e funcional em todos os estados |
| Renovação agendada | Avançando o relógio até a janela de renovação, nova busca é emitida |
| Aba oculta | Na janela de renovação com a aba oculta, nenhuma busca é emitida |
