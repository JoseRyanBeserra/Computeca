# Relatório de Avaliação — EQ15 (DSC)

| | |
|---|---|
| **Data** | 2026-06-25 |
| **Repositório** | https://github.com/des-sist-corp-ufpb/projeto-eq15 |
| **Aplicação** | https://eq15.dsc.rodrigor.com |
| **Período de atividade** | 2026-06-25 → 2026-06-25 |
| **Total de commits** (sem merges, branch main) | 4 |
| **Integrantes** | Ryan Pereira De Souza (@ryanpsouzaa), Jose Ryan Da Silva Beserra (@JoseRyanBeserra) |

---

## 1. Tecnologias

- Stack não identificada automaticamente

---

## 2. Análise Funcional

### Endpoints REST

Não detectados automaticamente.

### Entidades / Tabelas (10 encontradas)

- `User (via migration.sql)`
- `RefreshToken (via migration.sql)`
- `AuditLog (via migration.sql)`
- `MaterialInstrucional (via migration.sql)`
- `InspectionLog (via migration.sql)`
- `Organization (via migration.sql)`
- `OrganizationMember (via migration.sql)`
- `OrganizationInvite (via migration.sql)`
- `MaterialInstrucionalOrganization (via migration.sql)`
- `EmailVerificationToken (via migration.sql)`

---

## 3. Análise Arquitetural

| Aspecto | Status | Observação |
|---------|--------|-----------|
| Arquitetura em camadas | ❌ | controller=❌  service=❌  repository=❌ |
| Testes automatizados | ✅ | 0 Java, 28 JS/TS, 0 Python |
| Migrations versionadas | ❌ | não encontradas |
| Logging | ❌ | não detectado |
| Autenticação / Segurança | ❌ | não detectado |
| DTOs / Separação de dados | ❌ | não detectado |
| Tratamento global de exceções | ❌ | não detectado |
| Documentação de API (OpenAPI) | ❌ | não detectado |
| Variáveis de ambiente | ❌ | não detectado |
| Dockerfile / docker-compose | ✅ | presente |

---

## 4. Contribuição por Usuário

### Resumo

| Usuário | Commits (main) | Commits (GitHub API) | Linhas adicionadas | Linhas no código atual | % código atual |
|---------|---------------|---------------------|-------------------|----------------------|----------------|
| Ryan Pereira De Souza (@ryanpsouzaa) | 2 | **116** ⚠️ | 32.022 | 19.402 | 100% |
| Jose Ryan Da Silva Beserra (@JoseRyanBeserra) | 0 | **6** ⚠️ | 0 | 0 | 0% |
| *(sem login GitHub)* | 2 | 50% | — | — | — |

> **⚠️ Divergência entre commits locais e GitHub API:**
> - **@ryanpsouzaa**: 2 commit(s) na branch `main` vs **116** registrados na API GitHub (commits em branches não mergeadas ou absorvidos via squash-merge sem preservação de autoria).
> - **@JoseRyanBeserra**: 0 commit(s) na branch `main` vs **6** registrados na API GitHub (commits em branches não mergeadas ou absorvidos via squash-merge sem preservação de autoria).
>

### Contribuição por Camada

| Camada | Total linhas | Ryan Pereira De Souza (@ryanpsouzaa) | Jose Ryan Da Silva Beserra (@JoseRyanBeserra) |
|--------|-------------|---------|---------|
| Controller | 4.684 | 100% | 0% |
| Frontend | 940 | 100% | 0% |
| Migration | 251 | 100% | 0% |
| Repository | 510 | 100% | 0% |
| Service | 4.156 | 100% | 0% |

---

## 5. Contribuição por Funcionalidade

Baseado em `git blame` nos arquivos de controller e service.

| Arquivo | Total linhas | Ryan Pereira De Souza (@ryanpsouzaa) | Jose Ryan Da Silva Beserra (@JoseRyanBeserra) |
|---------|-------------|---------|---------|
| `authService.test.ts` | 384 | 100% | 0% |
| `authController.test.ts` | 379 | 100% | 0% |
| `materialPdfChatService.ts` | 310 | 100% | 0% |
| `inviteUserService.test.ts` | 304 | 100% | 0% |
| `respondInviteService.test.ts` | 284 | 100% | 0% |
| `usersService.test.ts` | 282 | 100% | 0% |
| `setUserAsProfessorService.test.ts` | 270 | 100% | 0% |
| `setUserAsProfessorController.test.ts` | 268 | 100% | 0% |
| `removeMemberService.test.ts` | 234 | 100% | 0% |
| `createOrganizationService.test.ts` | 222 | 100% | 0% |
| `createOrganizationController.test.ts` | 217 | 100% | 0% |
| `usersController.test.ts` | 215 | 100% | 0% |
| `updateOrganizationService.test.ts` | 208 | 100% | 0% |
| `Router.tsx` | 195 | 100% | 0% |
| `cancelInviteService.test.ts` | 180 | 100% | 0% |
| `listOrgMembersService.test.ts` | 179 | 100% | 0% |
| `archiveOrganizationService.test.ts` | 169 | 100% | 0% |
| `leaveOrganizationService.test.ts` | 166 | 100% | 0% |
| `listUsersController.test.ts` | 151 | 100% | 0% |
| `listUsersService.test.ts` | 151 | 100% | 0% |
| `ResourceCard.tsx` | 151 | 100% | 0% |
| `materialPdfUploadRoutes.ts` | 139 | 100% | 0% |
| `emailVerificationService.ts` | 135 | 100% | 0% |
| `authController.ts` | 125 | 100% | 0% |
| `materialPdfUploadService.ts` | 121 | 100% | 0% |
| `listMyOrganizationsService.test.ts` | 121 | 100% | 0% |
| `materialPdfChatController.ts` | 105 | 100% | 0% |
| `listMyInvitesService.test.ts` | 104 | 100% | 0% |
| `materialPdfUploadController.ts` | 103 | 100% | 0% |
| `authService.ts` | 97 | 100% | 0% |
| `setUserAsProfessorController.ts` | 89 | 100% | 0% |
| `createOrganizationController.ts` | 89 | 100% | 0% |
| `pendingInviteCountService.test.ts` | 89 | 100% | 0% |
| `uploadOrgMaterialController.ts` | 87 | 100% | 0% |
| `archiveOrganizationController.ts` | 85 | 100% | 0% |
| `usersService.ts` | 81 | 100% | 0% |
| `organizationsRoutes.ts` | 76 | 100% | 0% |
| `usersController.ts` | 75 | 100% | 0% |
| `updateOrganizationController.ts` | 69 | 100% | 0% |
| `materialPdfPresignedUrlService.ts` | 68 | 100% | 0% |
| `inviteUserController.ts` | 64 | 100% | 0% |
| `respondInviteController.ts` | 64 | 100% | 0% |
| `index.ts` | 63 | 100% | 0% |
| `removeMemberController.ts` | 63 | 100% | 0% |
| `listOrgMaterialsController.ts` | 62 | 100% | 0% |
| `listOrgMembersController.ts` | 62 | 100% | 0% |
| `materialPdfAllListRepository.ts` | 61 | 100% | 0% |
| `cancelInviteController.ts` | 59 | 100% | 0% |
| `leaveOrganizationController.ts` | 59 | 100% | 0% |
| `listMyInvitesController.ts` | 57 | 100% | 0% |
| `listMyOrganizationsController.ts` | 56 | 100% | 0% |
| `inviteUserService.ts` | 52 | 100% | 0% |
| `materialPdfPendingListRepository.ts` | 51 | 100% | 0% |
| `materialPdfPresignedUrlController.ts` | 50 | 100% | 0% |
| `materialPdfReviewController.ts` | 47 | 100% | 0% |
| `respondInviteService.ts` | 46 | 100% | 0% |
| `materialPdfReviewService.ts` | 46 | 100% | 0% |
| `usersRoutes.ts` | 46 | 100% | 0% |
| `setUserAsProfessorService.ts` | 45 | 100% | 0% |
| `materialPdfListByUserController.ts` | 44 | 100% | 0% |
| `materialPdfPublicPresignedUrlController.ts` | 43 | 100% | 0% |
| `materialPdfUploadRepository.ts` | 40 | 100% | 0% |
| `materialPdfPendingListController.ts` | 40 | 100% | 0% |
| `removeMemberService.ts` | 39 | 100% | 0% |
| `materialPdfReviewPresignedUrlController.ts` | 38 | 100% | 0% |
| `createOrganizationService.ts` | 36 | 100% | 0% |
| `materialPdfAllListController.ts` | 36 | 100% | 0% |
| `emailVerificationController.ts` | 36 | 100% | 0% |
| `listInspectionLogsController.ts` | 35 | 100% | 0% |
| `listUsersController.ts` | 35 | 100% | 0% |
| `authRoutes.ts` | 35 | 100% | 0% |
| `cancelInviteService.ts` | 34 | 100% | 0% |
| `leaveOrganizationService.ts` | 34 | 100% | 0% |
| `listOrgMaterialsService.ts` | 33 | 100% | 0% |
| `listOrgMembersService.ts` | 33 | 100% | 0% |
| `updateOrganizationService.ts` | 30 | 100% | 0% |
| `materialPdfPublicListController.ts` | 30 | 100% | 0% |
| `archiveOrganizationService.ts` | 27 | 100% | 0% |
| `materialPdfReviewRepository.ts` | 27 | 100% | 0% |
| `materialPdfListByUserRepository.ts` | 24 | 100% | 0% |
| `materialPdfViewRepository.ts` | 23 | 100% | 0% |
| `pendingInviteCountController.ts` | 22 | 100% | 0% |
| `logsRoutes.ts` | 22 | 100% | 0% |
| `listMyInvitesService.ts` | 21 | 100% | 0% |
| `listMyOrganizationsService.ts` | 20 | 100% | 0% |
| `pendingInviteCountService.ts` | 20 | 100% | 0% |
| `materialPdfListByUserService.ts` | 20 | 100% | 0% |
| `materialPdfAllListService.ts` | 19 | 100% | 0% |
| `materialPdfPublicListService.ts` | 18 | 100% | 0% |
| `materialPdfReviewSchema.ts` | 16 | 100% | 0% |
| `materialPdfChatRepository.ts` | 16 | 100% | 0% |
| `materialPdfChatSchema.ts` | 14 | 100% | 0% |
| `materialPdfPendingListService.ts` | 14 | 100% | 0% |
| `listInspectionLogsService.ts` | 13 | 100% | 0% |
| `listUsersService.ts` | 13 | 100% | 0% |
| `materialPdfPresignedUrlSchema.ts` | 10 | 100% | 0% |

---

*Relatório gerado automaticamente em 2026-06-25.*
*Os dados de contribuição são baseados em `git log --numstat` (linhas adicionadas) e `git blame` (linhas no código atual), excluindo commits de merge.*