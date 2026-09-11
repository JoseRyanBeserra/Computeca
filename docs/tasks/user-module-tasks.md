# Tasks — Módulo de Usuários

**Projeto:** Plataforma de Gestão de Materiais Instrucionais — Campus IV UFPB  
**Módulo:** Usuários  
**Spec de referência:** `docs/superpowers/specs/2026-05-13-user-module-design.md`  
**Data:** 2026-05-13  

---

## Legenda

| Campo | Valores possíveis |
|---|---|
| **Complexidade** | Baixa / Média / Alta |
| **Prioridade** | Alta / Média / Baixa |
| **Status** | Pendente / Em andamento / Concluída |

---

## Prioridade Alta — Base do Módulo

---

### TASK-01 — Configurar Seed do Admin Master

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Bloqueante para** | TASK-10 (Promoção de Professor) |

**Descrição:**
Criação do primeiro usuário administrador da plataforma via configuração inicial do sistema (seed), sem passar pelo fluxo de cadastro comum.

**O que deve ser feito:**
Definir um mecanismo de seed que, na primeira execução do sistema, crie automaticamente uma conta de Admin com credenciais configuráveis via variáveis de ambiente. Esse Admin é o único capaz de promover outros usuários ao perfil de Professor.

**Critérios de aceite:**
- O Admin é criado automaticamente na primeira inicialização do sistema caso não exista nenhum
- As credenciais do Admin (e-mail e senha) são definidas via variáveis de ambiente, nunca fixas no código
- O seed não é executado se um Admin já existir no banco

---

### TASK-02 — Configurar Fila Assíncrona para Envio de E-mails Transacionais

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Bloqueante para** | TASK-05 (Verificação de E-mail), TASK-07 (Recuperação de Senha) |

**Descrição:**
Infraestrutura de processamento assíncrono de e-mails para garantir que o envio de mensagens transacionais não bloqueie as respostas da API.

**O que deve ser feito:**
Configurar a integração com o sistema de filas (Redis) para processar o envio de e-mails em background. A API deve enfileirar o job de envio e retornar a resposta ao cliente imediatamente, sem aguardar a conclusão do envio. Deve haver mecanismo de retentativa em caso de falha no envio.

**Critérios de aceite:**
- O envio de e-mail não bloqueia a resposta da API
- Falhas no envio são reprocessadas automaticamente até um número máximo de tentativas configurável
- Após esgotar as tentativas, a falha é registrada em log para análise
- Verificação de conta e recuperação de senha utilizam a fila assíncrona

---

### TASK-03 — Implementar Autenticação (Login e Logout)

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Bloqueante para** | Todos os fluxos autenticados |

**Descrição:**
Mecanismo central de autenticação da plataforma, responsável por validar credenciais e gerenciar o ciclo de vida das sessões de todos os perfis.

**O que deve ser feito:**
Criar os endpoints de login e logout. No login, o sistema valida e-mail e senha, verifica se a conta está ativa (não suspensa), emite um token stateless com tempo de expiração definido e retorna ao cliente. No logout, o token é invalidado. Todas as rotas protegidas devem rejeitar tokens inválidos ou expirados.

**Critérios de aceite:**
- Login bem-sucedido emite um token com tempo de expiração configurável
- Contas suspensas recebem mensagem informativa e têm o acesso negado
- Logout invalida o token emitido
- Requisições com tokens expirados ou inválidos recebem resposta de não autorizado
- Credenciais incorretas retornam mensagem genérica, sem indicar qual campo está errado

---

### TASK-04 — Implementar Proteção contra Força Bruta no Login

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Depende de** | TASK-03 (Autenticação) |

**Descrição:**
Mecanismo de segurança para detectar e bloquear tentativas automatizadas de acesso não autorizado via o endpoint de login.

**O que deve ser feito:**
Implementar limitação de tentativas de login por IP e por e-mail. Após um número configurável de falhas consecutivas, o sistema bloqueia temporariamente novas tentativas do mesmo IP ou para o mesmo e-mail. O tempo de bloqueio e o limite de tentativas devem ser configuráveis via variáveis de ambiente.

**Critérios de aceite:**
- Após o número configurável de falhas, o IP ou e-mail é bloqueado temporariamente
- O sistema informa que o acesso está temporariamente bloqueado, sem revelar detalhes internos
- O bloqueio expira automaticamente após o tempo configurado
- Tentativas bem-sucedidas reiniciam o contador de falhas
- O limite de tentativas e o tempo de bloqueio são configuráveis

---

### TASK-05 — Implementar Cadastro de Usuário Comum

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Alta |
| **Status** | Pendente |

**Descrição:**
Fluxo de registro para qualquer pessoa que deseje acessar a plataforma com funcionalidades básicas de consulta.

**O que deve ser feito:**
Criar o endpoint de cadastro que receba nome, e-mail e senha. O sistema valida o formato do e-mail, garante unicidade, aplica hash seguro na senha e persiste o usuário com perfil Comum. O acesso é liberado imediatamente, sem etapa de verificação.

**Critérios de aceite:**
- Usuário é criado com perfil Comum ao informar nome, e-mail válido e senha
- Não é possível cadastrar dois usuários com o mesmo e-mail
- A senha nunca é armazenada em texto plano
- E-mails com domínio `@dcx.ufpb.br` não são aceitos nesse fluxo
- O usuário recebe confirmação imediata de cadastro bem-sucedido

---

### TASK-06 — Implementar Geração de Link de Convite

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Bloqueante para** | TASK-08 (Cadastro por Convite) |

**Descrição:**
Funcionalidade que permite a Professor e Admin gerar links para convidar usuários externos a se tornarem Institucionalizados na plataforma.

**O que deve ser feito:**
Criar o endpoint para geração de links de convite. Professor ou Admin configura o prazo de expiração e o limite máximo de usos ao gerar o link. O sistema armazena o link com seu prazo, limite e contador de usos. O link é bloqueado automaticamente ao atingir o limite ou ao expirar. Professor e Admin podem visualizar os links gerados com o status de cada um.

**Critérios de aceite:**
- Professor e Admin podem gerar links com prazo de expiração e limite de usos configuráveis
- O sistema registra e exibe o número de usos consumidos por link
- Links expirados ou com usos esgotados são bloqueados automaticamente
- O gerador pode listar e visualizar o status dos seus links
- Um link inválido exibe mensagem informativa ao ser acessado

---

### TASK-07 — Implementar Cadastro Institucionalizado por Domínio

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Bloqueante para** | TASK-09 (Verificação de E-mail) |

**Descrição:**
Fluxo de registro automático para membros do Campus IV que possuem e-mail institucional `@dcx.ufpb.br`.

**O que deve ser feito:**
O sistema identifica o domínio `@dcx.ufpb.br` durante o cadastro e atribui automaticamente o perfil Institucionalizado. O acesso ao perfil fica bloqueado até a verificação do e-mail. Após verificação, o usuário tem acesso completo, incluindo submissão de MIs para aprovação.

**Critérios de aceite:**
- Ao informar um e-mail `@dcx.ufpb.br`, o sistema atribui o perfil Institucionalizado automaticamente
- Um e-mail de verificação é enviado imediatamente após o cadastro
- O perfil Institucionalizado permanece bloqueado até a confirmação do e-mail
- Após confirmar o e-mail, o usuário tem acesso total ao perfil Institucionalizado
- Não é possível cadastrar dois usuários com o mesmo e-mail

---

### TASK-08 — Implementar Cadastro Institucionalizado por Convite

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Depende de** | TASK-06 (Geração de Link de Convite) |
| **Bloqueante para** | TASK-09 (Verificação de E-mail) |

**Descrição:**
Fluxo de registro para usuários externos (sem e-mail `@dcx.ufpb.br`) que receberam um link de convite gerado por Professor ou Admin.

**O que deve ser feito:**
Ao acessar um link de convite válido, o usuário é direcionado ao fluxo de cadastro. Ao concluir o registro, o sistema verifica a validade do link, atribui o perfil Institucionalizado, decrementa o contador de usos do link e envia o e-mail de verificação.

**Critérios de aceite:**
- Ao acessar um link válido e concluir o cadastro, o usuário recebe o perfil Institucionalizado
- O sistema rejeita cadastros via links expirados ou com limite esgotado, informando o motivo
- O contador de usos do link é decrementado a cada cadastro bem-sucedido
- Um e-mail de verificação é enviado imediatamente após o cadastro
- O perfil Institucionalizado permanece bloqueado até a confirmação do e-mail

---

### TASK-09 — Implementar Verificação de E-mail

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Depende de** | TASK-02 (Fila de E-mails), TASK-07 e TASK-08 (Cadastros Institucionalizados) |

**Descrição:**
Mecanismo de confirmação de e-mail aplicado exclusivamente a usuários com perfil Institucionalizado, garantindo a autenticidade do endereço antes de liberar o acesso ao perfil.

**O que deve ser feito:**
Após o cadastro institucionalizado, o sistema gera um link de confirmação com prazo de expiração e o envia via fila assíncrona. Ao clicar no link, o sistema valida o token, marca o e-mail como verificado e libera o acesso ao perfil. Deve ser possível solicitar reenvio do e-mail de confirmação.

**Critérios de aceite:**
- O e-mail de verificação é enviado automaticamente após o cadastro institucionalizado
- O link de verificação expira após prazo configurável
- Ao clicar no link válido, o perfil Institucionalizado é liberado imediatamente
- Links expirados ou já utilizados são rejeitados com mensagem informativa
- O usuário pode solicitar reenvio do e-mail de verificação
- Usuários Comuns e Professores não passam por essa etapa

---

### TASK-10 — Implementar Recuperação de Senha via Código

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Depende de** | TASK-02 (Fila de E-mails) |

**Descrição:**
Fluxo de redefinição de senha para usuários que perderam acesso às suas contas, utilizando código numérico temporário enviado por e-mail.

**O que deve ser feito:**
Criar o fluxo em duas etapas: na primeira, o usuário informa o e-mail e o sistema envia um código numérico temporário via fila assíncrona. Na segunda, o usuário informa o código e define uma nova senha. O sistema não deve revelar se o e-mail existe, retornando sempre uma resposta genérica.

**Critérios de aceite:**
- O sistema envia um código numérico ao e-mail informado
- O sistema retorna resposta genérica independentemente de o e-mail existir ou não
- O código expira após prazo configurável
- O código é invalidado imediatamente após ser utilizado com sucesso
- Após redefinição, a senha anterior não funciona mais
- Não é possível reutilizar um código expirado ou já utilizado

---

### TASK-11 — Implementar Log de Auditoria do Módulo de Usuários

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Alta |
| **Status** | Pendente |
| **Observação** | Requisito transversal — deve ser integrado junto a cada funcionalidade |

**Descrição:**
Sistema de registro imutável de todas as ações sensíveis realizadas no módulo de usuários, garantindo rastreabilidade completa para fins acadêmicos e de segurança.

**O que deve ser feito:**
Implementar o mecanismo de registro de auditoria que capture automaticamente toda ação sensível do módulo. Cada registro deve conter: identificador do ator, perfil do ator, identificador do alvo (quando aplicável), tipo da ação e timestamp. Os logs não devem ser editáveis ou excluídos por nenhum perfil.

**Ações auditáveis:**
- Cadastro de usuário
- Login e logout
- Promoção e reversão de perfil
- Concessão e revogação de permissão avulsa de upload
- Suspensão e reativação de conta
- Exclusão de conta
- Geração de links de convite
- Falhas de autenticação

**Critérios de aceite:**
- Toda ação sensível gera um registro de auditoria automaticamente
- Cada registro contém ator, perfil do ator, alvo, tipo de ação e timestamp
- Os registros são imutáveis — nenhum perfil pode editá-los ou excluí-los
- O Admin pode consultar os logs de auditoria do módulo
- Falhas de autenticação também são registradas

---

## Prioridade Média — Gestão e Permissões

---

### TASK-12 — Implementar Promoção e Reversão do Perfil de Professor

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-01 (Seed do Admin) |

**Descrição:**
Funcionalidade exclusiva do Admin para elevar um usuário ao perfil de Professor e reverter essa promoção quando necessário.

**O que deve ser feito:**
Criar os endpoints de promoção e reversão de perfil. A promoção altera o perfil do usuário para Professor e registra a ação. A reversão retorna o perfil ao estado anterior e remove as permissões de Professor imediatamente.

**Critérios de aceite:**
- Somente o Admin pode promover ou reverter o perfil de Professor
- A promoção é refletida imediatamente no próximo acesso do usuário
- A reversão remove as permissões de Professor imediatamente
- O sistema registra quem realizou a promoção ou reversão e quando

---

### TASK-13 — Implementar Concessão e Revogação de Permissão Avulsa de Upload

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-03 (Autenticação) |

**Descrição:**
Mecanismo que permite a Admin e Professor conceder a um Usuário Comum a capacidade de fazer upload de MIs, sem alterar seu perfil base.

**O que deve ser feito:**
Criar os endpoints de concessão e revogação da permissão avulsa de upload. A concessão associa a flag de upload ao usuário alvo sem modificar seu perfil. A revogação remove a flag imediatamente. O sistema deve registrar quem concedeu a permissão e quando.

**Critérios de aceite:**
- Admin e Professor podem conceder permissão de upload a qualquer Usuário Comum
- A concessão não altera o perfil base do usuário
- A permissão pode ser revogada a qualquer momento pelos mesmos papéis que a concederam
- Após revogação, o usuário perde o acesso de upload imediatamente
- O sistema registra o ator e o timestamp da concessão e da revogação

---

### TASK-14 — Implementar Suspensão de Conta

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-03 (Autenticação) |

**Descrição:**
Funcionalidade administrativa para bloquear temporariamente o acesso de um usuário à plataforma sem excluir seus dados.

**O que deve ser feito:**
Criar o endpoint de suspensão que marca a conta como suspensa. Ao tentar acessar rotas protegidas, o usuário suspenso recebe mensagem informativa. Tokens ativos do usuário suspenso devem ser invalidados. A suspensão é reversível pelo Admin.

**Critérios de aceite:**
- O Admin pode suspender a conta de qualquer usuário
- Usuário suspenso não consegue fazer login e recebe mensagem informativa
- Tokens ativos de usuários suspensos são invalidados
- A suspensão é reversível pelo Admin
- O sistema registra quem suspendeu, o alvo e quando

---

### TASK-15 — Implementar Exclusão Definitiva de Conta

| Campo | Valor |
|---|---|
| **Complexidade** | Média |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-03 (Autenticação) |

**Descrição:**
Funcionalidade administrativa para remover permanentemente a conta de um usuário da plataforma, em conformidade com a LGPD.

**O que deve ser feito:**
Criar o endpoint de exclusão definitiva. A ação exige confirmação explícita. Ao excluir, o sistema remove ou anonimiza os dados pessoais do usuário conforme a LGPD, invalida quaisquer tokens ativos e registra a exclusão no log de auditoria. A operação é irreversível.

**Critérios de aceite:**
- Somente o Admin pode excluir contas definitivamente
- A exclusão exige confirmação explícita da ação
- Dados pessoais são removidos ou anonimizados conforme a LGPD
- Tokens ativos do usuário excluído são invalidados imediatamente
- A exclusão é registrada no log de auditoria com ator e timestamp
- A operação não pode ser desfeita

---

### TASK-16 — Implementar Visualização e Edição de Perfil

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-03 (Autenticação) |

**Descrição:**
Funcionalidade que permite ao usuário autenticado consultar e atualizar suas próprias informações cadastrais.

**O que deve ser feito:**
Criar os endpoints de visualização e edição do perfil do usuário autenticado. O usuário pode editar nome e senha. O e-mail não é editável após o cadastro. A alteração de senha exige confirmação da senha atual.

**Critérios de aceite:**
- O usuário autenticado pode visualizar seus próprios dados cadastrais
- Nome e senha podem ser alterados pelo próprio usuário
- O e-mail não pode ser alterado após o cadastro
- A alteração de senha exige a senha atual como confirmação
- Dados de outros usuários não são acessíveis por esse endpoint

---

### TASK-17 — Implementar Listagem e Busca de Usuários (Admin)

| Campo | Valor |
|---|---|
| **Complexidade** | Baixa |
| **Prioridade** | Média |
| **Status** | Pendente |
| **Depende de** | TASK-01 (Seed do Admin) |

**Descrição:**
Painel administrativo para visualização e busca de todos os usuários cadastrados na plataforma.

**O que deve ser feito:**
Criar o endpoint de listagem de usuários acessível apenas pelo Admin. A listagem suporta filtros por perfil, status (ativo/suspenso) e data de cadastro. Os resultados são paginados. Dados sensíveis como senhas e tokens não são expostos.

**Critérios de aceite:**
- Somente o Admin acessa a listagem de usuários
- É possível filtrar por perfil, status e data de cadastro
- Os resultados são paginados
- Senhas, tokens e dados sensíveis não são expostos na resposta
- A listagem reflete o estado atual dos usuários em tempo real
