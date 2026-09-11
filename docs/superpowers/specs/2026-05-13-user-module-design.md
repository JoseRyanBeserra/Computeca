# Especificação — Módulo de Usuários

**Projeto:** Plataforma de Gestão de Materiais Instrucionais — Campus IV UFPB  
**Data:** 2026-05-13  
**Status:** Aprovado para planejamento  

---

## 1. Visão Geral

O módulo de usuários é responsável pelo ciclo de vida completo das contas na plataforma: cadastro, autenticação, gerenciamento de perfis e controle de permissões. Ele opera como porta de entrada para todos os demais módulos e adota uma arquitetura de **RBAC com permissões avulsas** — usuários possuem um perfil base fixo e podem receber permissões adicionais sem mudança de perfil.

---

## 2. Perfis e Hierarquia de Acesso

| Perfil | Origem | Verificação de e-mail |
|---|---|---|
| Não Logado | — | — |
| Usuário Comum | Qualquer e-mail + senha | Não |
| Institucionalizado | Domínio `@dcx.ufpb.br` ou link de convite | Sim |
| Professor | Promovido pelo Admin | Não |
| Admin | Seed inicial do sistema | Não |

### Permissão Avulsa de Upload

Admin e Professor podem conceder permissão de upload a um Usuário Comum sem alterar seu perfil base. A permissão é revogável a qualquer momento e não promove o usuário na hierarquia.

### Hierarquia de Promoção

- **Admin (seed)** → promove usuários para Professor
- **Professor ou Admin** → gera links de convite para Institucionalizado
- **Admin ou Professor** → concede e revoga permissão avulsa de upload para Usuário Comum

---

## 3. Requisitos Funcionais

### RF01 — Cadastro de Usuário Comum

O sistema deve permitir que qualquer pessoa se cadastre informando nome, e-mail e senha. O acesso é liberado imediatamente após o cadastro, sem necessidade de verificação de e-mail.

### RF02 — Cadastro Institucionalizado por Domínio

O sistema deve detectar automaticamente o domínio `@dcx.ufpb.br` durante o cadastro e atribuir o perfil Institucionalizado. O acesso ao perfil fica bloqueado até a confirmação do e-mail.

### RF03 — Cadastro Institucionalizado por Convite

Um usuário com qualquer e-mail pode acessar um link de convite gerado por Professor ou Admin e, ao concluir o cadastro através desse link, receber automaticamente o perfil Institucionalizado. O acesso ao perfil fica bloqueado até a confirmação do e-mail.

### RF04 — Verificação de E-mail

O sistema deve enviar um e-mail com link de confirmação aos usuários que se cadastrarem com perfil Institucionalizado. O acesso às funcionalidades do perfil Institucionalizado permanece bloqueado até que a confirmação seja concluída. Usuários Comuns e Professores não passam por essa etapa.

### RF05 — Autenticação

O sistema deve permitir login via e-mail e senha para todos os perfis. Após autenticação bem-sucedida, o sistema emite um token de sessão com tempo de expiração definido.

### RF06 — Recuperação de Senha

O sistema deve permitir que o usuário solicite recuperação de senha informando seu e-mail cadastrado. Um código numérico temporário é enviado ao e-mail. O usuário insere o código na plataforma e define uma nova senha. O código é invalidado após o uso ou ao expirar o prazo de validade.

### RF07 — Encerramento de Sessão

O sistema deve permitir que o usuário autenticado encerre sua sessão ativa, invalidando o token emitido.

### RF08 — Geração de Link de Convite

Professor e Admin devem poder gerar links de convite com prazo de expiração e limite de usos configuráveis. O sistema deve registrar o consumo de cada link e bloqueá-lo automaticamente ao atingir o limite de usos ou ao expirar, o que ocorrer primeiro.

### RF09 — Concessão de Permissão Avulsa de Upload

Admin e Professor devem poder conceder permissão de upload a um Usuário Comum sem alterar seu perfil base. A permissão deve ser revogável a qualquer momento pelos mesmos papéis que a concederam.

### RF10 — Promoção para Professor

O Admin deve poder promover qualquer usuário cadastrado ao perfil de Professor. A promoção é reversível pelo Admin.

### RF11 — Suspensão de Conta

O Admin deve poder suspender temporariamente a conta de qualquer usuário, bloqueando o acesso sem excluir os dados. O usuário suspenso deve receber uma mensagem informativa ao tentar acessar a plataforma.

### RF12 — Exclusão de Conta

O Admin deve poder excluir definitivamente a conta de um usuário. A ação exige confirmação explícita, é irreversível e deve acionar o processo de remoção ou anonimização dos dados pessoais conforme a LGPD.

### RF13 — Visualização e Edição de Perfil

O usuário autenticado deve poder visualizar seus dados cadastrais e editar informações permitidas, como nome e senha. O e-mail não deve ser editável após o cadastro.

### RF14 — Listagem e Busca de Usuários

O Admin deve ter acesso a uma listagem de todos os usuários do sistema, com filtros por perfil, status (ativo/suspenso) e data de cadastro.

---

## 4. Requisitos Não Funcionais

### RNF01 — Segurança de Credenciais

Senhas devem ser armazenadas com algoritmo de hash seguro e adaptativo. Nenhuma senha deve ser persistida em texto plano em nenhuma camada do sistema, incluindo logs e mensagens de erro.

### RNF02 — Gestão de Sessão por Token

A autenticação deve ser baseada em tokens stateless com tempo de expiração definido. Tokens expirados devem ser rejeitados em todas as rotas protegidas da API.

### RNF03 — Proteção contra Força Bruta

O endpoint de login deve implementar limitação de tentativas por IP e por e-mail, bloqueando o acesso temporariamente após um número configurável de falhas consecutivas.

### RNF04 — Validade de Códigos e Links Temporários

Códigos de recuperação de senha e links de convite devem ter prazo de expiração configurável. Links de convite também devem respeitar o limite de usos. Após expiração ou esgotamento do limite, ambos devem ser invalidados automaticamente pelo sistema.

### RNF05 — Auditabilidade

Toda ação sensível do módulo deve gerar um registro de auditoria imutável contendo: identificador do ator, perfil do ator, alvo da ação, tipo da ação e timestamp. As ações auditáveis incluem: cadastro, login, logout, promoção de perfil, concessão e revogação de permissão, suspensão, exclusão e geração de links de convite.

### RNF06 — Conformidade com a LGPD

O sistema deve coletar apenas os dados estritamente necessários para cada perfil. A exclusão de conta deve remover ou anonimizar os dados pessoais do usuário. Os campos mínimos por perfil serão definidos em reunião de planejamento.

### RNF07 — Desempenho de Autenticação

Os endpoints de login e validação de token devem responder em no máximo 500ms sob carga normal de uso, garantindo fluidez na navegação entre rotas protegidas.

### RNF08 — Disponibilidade

O módulo de autenticação deve estar disponível sempre que a plataforma estiver no ar, por ser a porta de entrada de todos os demais módulos. Falhas internas no módulo de usuários não devem comprometer a disponibilidade das funcionalidades públicas de consulta.

### RNF09 — Modularidade de Permissões

O sistema de perfis e permissões avulsas deve ser desacoplado da lógica de negócio dos demais módulos. Alterações de permissão não devem exigir mudanças fora do módulo de usuários.

### RNF10 — Comunicação Assíncrona por E-mail

O envio de e-mails transacionais (verificação de conta, recuperação de senha) deve ser gerenciado de forma assíncrona via fila de jobs, sem bloquear o fluxo de resposta da API.

---

## 5. Decisões Pendentes

- Campos detalhados do perfil Institucionalizado (matrícula, curso, período) — a definir em reunião.
- Campos detalhados do perfil Professor/Admin (SIAPE, departamento) — a definir em reunião.
- Tempo de expiração padrão para tokens de sessão — a definir em reunião.
- Tempo de expiração padrão para códigos de recuperação de senha — a definir em reunião.
- Limite padrão de tentativas de login antes do bloqueio — a definir em reunião.
