// src/utils/omitAiFields.ts
// Remove das respostas os campos de estado de processamento por IA.
//
// Com as funcionalidades de IA desativadas o dado permanece no banco — nada o
// apaga —, mas não trafega para nenhum cliente. Esconder apenas na interface
// deixaria o estado exposto a quem inspecionasse a resposta.

/** Campos de IA que não devem trafegar enquanto a funcionalidade estiver desativada. */
type WithVectorStatus = { vectorStatus?: unknown }

/**
 * Devolve o material sem `vectorStatus` quando a IA está desativada.
 * Com a IA ativada o objeto passa intacto.
 */
export function omitAiFields<T extends WithVectorStatus>(material: T, aiEnabled: boolean): T {
  if (aiEnabled) return material

  const { vectorStatus: _omitido, ...rest } = material
  return rest as T
}

/** Versão para listas. */
export function omitAiFieldsFromList<T extends WithVectorStatus>(
  materials: T[],
  aiEnabled: boolean,
): T[] {
  if (aiEnabled) return materials

  return materials.map((m) => omitAiFields(m, aiEnabled))
}
