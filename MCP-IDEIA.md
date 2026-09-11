# Ideia de Servidor MCP — EQ15

**Domínio:** Plataforma de Materiais Instrucionais (RAG com OpenAI+Qdrant)  
**Data:** 2026-07-01

## O que é

Um **servidor MCP (Model Context Protocol)** expõe as operações do seu sistema como *tools* e *resources* que qualquer assistente de IA (Claude Desktop, Cursor, etc.) pode chamar com segurança. Na prática, é uma camada fina sobre a **API que vocês já têm** — cada tool chama um endpoint/service existente. Assim o projeto deixa de ser só uma tela e passa a ser operável por um agente de IA.

## Servidor proposto: `materiais-mcp`

### Tools sugeridas

- `buscar_material(consulta_semantica)` — busca vetorial
- `perguntar_sobre_pdf(materialId, pergunta)` — QA sobre o PDF (RAG)
- `listar_por_disciplina(disciplina)` — filtra acervo

### Resources (somente leitura)

- acervo de MIs como resource; exponha os PDFs indexados

### Exemplos de uso com um LLM

- "O que este material diz sobre avaliação formativa?" (RAG sobre o PDF)

## Esqueleto para começar (Node / TypeScript)

```ts
// npm i @modelcontextprotocol/sdk zod
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "materiais-mcp", version: "0.1.0" });
const API = "http://localhost:3000";   // sua API local (ajuste a porta)

server.tool("buscar_material", { /* params */ }, async (args) => {
  const res = await fetch(`${API}/seu/endpoint`);   // reaproveite sua API
  return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
});

await server.connect(new StdioServerTransport());
```

## Boas práticas

- **Segurança:** cada tool que altera dados deve exigir autenticação e registrar no **log de auditoria** (o mesmo do requisito da disciplina).
- **Escopo mínimo:** exponha só o necessário; separe tools de leitura das de escrita.
- **Reaproveite:** as tools devem chamar seus *services*/*controllers* existentes, não reimplementar regra de negócio.

## Referências
- Documentação MCP: https://modelcontextprotocol.io
- SDKs: Python (`mcp`), TypeScript (`@modelcontextprotocol/sdk`), Java (Spring AI MCP Server).

*Sugestão gerada em 2026-07-01 para orientar a integração de LLMs ao projeto.*