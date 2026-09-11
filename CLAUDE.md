1. Visão Geral
   Sistema de gestão e disseminação de Materiais Instrucionais (MIs) produzidos pelo Campus IV da UFPB, para todos os professores, focado na curadoria acadêmica e no enriquecimento de conteúdos via Inteligência Artificial.
2. Arquitetura e Infraestrutura
   Armazenamento Híbrido: Persistência de arquivos em MinIO (Desenvolvimento) com transição transparente para AWS S3 (Produção).
   Motor de Busca Semântica: Utilização do Qdrant para indexação vetorial, permitindo buscas por significado e contexto, além de leitura profunda de documentos.
   Orquestração e Deploy: Ambiente totalmente conteinerizado com Docker e roteamento/proxy reverso via Nginx.
   Processamento Assíncrono: Gerenciamento de tarefas pesadas (tradução, vetorização, OCR) via Background Jobs (BullMQ/Redis) para garantir a estabilidade da API Fastify.
3. Matriz de Acessos e Perfis

| Perfil |Permissões
|Não Logado |Apenas consulta e visualização de materiais públicos.|Usuário Logado| Consultas, marcação de favoritos, coleções personalizadas e interação com IA.
Institucionalizado|Submissão de MIs para fluxo de aprovação por um docente.|Professor/Admin|Upload direto, aprovação de submissões de terceiros e gestão de permissões.

4. Inteligência Pedagógica e IA
   Motor de Tradução Multilíngue: Tradução de resumos de MIs para Inglês e Espanhol, mantendo a integridade do conteúdo técnico.
   Observabilidade de IA: Rastreio detalhado de consumo de tokens por usuário e por operação para controle de custos.
   Modularidade: Capacidade de habilitar ou desabilitar funções globalmente via painel administrativo.
5. Gestão e Auditoria
   Fluxo de Aprovação Docente: Garantia de qualidade através da revisão obrigatória de professores para submissões institucionais.
   Auditabilidade Total: Registro de logs (quem subiu, quem aprovou, quando foi alterado) para assegurar a integridade acadêmica.
   Métricas de Engajamento: Dashboard administrativo com estatísticas de consumo, buscas mais frequentes e MIs mais acessados.

---

Convenções de código (back-end)

- Os dados de requisições devem ser todos definidos seguindo o formato --> nomeFluxoRequest
