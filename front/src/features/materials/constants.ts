// src/features/materials/constants.ts
//
// Limites do cadastro de material, espelhados do servidor —
// ver MI-server/src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts
//
// Eles vivem aqui, e não em cada tela, porque existem DOIS formulários de
// cadastro: o envio direto (UploadPage) e o envio por projeto
// (OrganizationDetailPage). Quando a descrição passou a ser obrigatória, só o
// primeiro foi atualizado — e o segundo passou a receber 422 em todo envio sem
// que nenhum teste percebesse. Uma origem só para os limites é o que impede a
// próxima regra de valer em apenas uma das telas.
//
// Espelhar não é validar: a validação continua no servidor. Aqui os limites
// servem para o usuário conhecer a regra ANTES de tentar enviar.

/** Descrição: obrigatória, limites inclusivos, contados após aparar as pontas. */
export const DESCRIPTION_MIN_LENGTH = 50
export const DESCRIPTION_MAX_LENGTH = 2000

/** Título: obrigatório, no máximo 255 caracteres após aparar as pontas. */
export const TITLE_MAX_LENGTH = 255

/** Links relacionados: opcionais, no máximo 10 por material. */
export const RELATED_LINKS_MAX = 10

/** Nome do link: obrigatório, no máximo 60 caracteres após aparar as pontas. */
export const RELATED_LINK_LABEL_MAX_LENGTH = 60
