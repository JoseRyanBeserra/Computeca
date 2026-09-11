// src/utils/buildMaterialEditDiff.ts
//
// Comparação entre o material como está e o que a edição pretende gravar.
//
// Função PURA, de propósito: é o que permite testá-la sem banco e sem MinIO, e
// é dela que saem as duas garantias do FR-016 e do FR-017 — o registro de
// auditoria sabe "de qual valor para qual", e uma edição que não altera nada não
// produz registro algum.

/** Um campo alterado, com o valor anterior e o novo. */
export interface FieldChange<T> {
  from: T
  to:   T
}

export interface MaterialEditDiff {
  changed: string[]
  title?:           FieldChange<string>
  description?:     FieldChange<string | null>
  habilidadesBncc?: FieldChange<string[]>
  file?: FieldChange<{ storageKey: string; originalFileName: string }>
  status?:          FieldChange<string>
}

/** O recorte do material de que a comparação precisa. */
export interface MaterialEditSnapshot {
  title:            string
  description?:     string | null
  habilidadesBncc:  string[]
  storageKey:       string
  originalFileName: string
  status:           string
}

export interface MaterialEditIncoming {
  title:           string
  description:     string
  habilidadesBncc: string[]
}

/** Substituição de documento, quando houve. */
export interface FileReplacement {
  storageKey:       string
  originalFileName: string
  /** A situação resultante, quando a troca invalidou a aprovação. */
  status?:          string
}

/**
 * Compara conteúdo, não referência: duas listas com os mesmos códigos na mesma
 * ordem não são alteração. A ordem importa — reordenar habilidades é uma
 * mudança visível na tela, e o registro deve refleti-la.
 */
function habilidadesIguais(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i])
}

export function buildMaterialEditDiff(
  atual: MaterialEditSnapshot,
  novo: MaterialEditIncoming,
  arquivo?: FileReplacement,
): MaterialEditDiff {
  const diff: MaterialEditDiff = { changed: [] }

  // Os valores já chegam aparados pelo schema; comparar aqui de novo evita que
  // um espaço invisível na ponta apareça como alteração no histórico.
  const tituloNovo = novo.title.trim()
  if (atual.title !== tituloNovo) {
    diff.changed.push('title')
    diff.title = { from: atual.title, to: tituloNovo }
  }

  const descricaoNova = novo.description.trim()
  const descricaoAtual = atual.description ?? null
  if (descricaoAtual !== descricaoNova) {
    diff.changed.push('description')
    // `from` pode ser null: material cadastrado antes da exigência de descrição.
    diff.description = { from: descricaoAtual, to: descricaoNova }
  }

  if (!habilidadesIguais(atual.habilidadesBncc, novo.habilidadesBncc)) {
    diff.changed.push('habilidadesBncc')
    diff.habilidadesBncc = { from: atual.habilidadesBncc, to: novo.habilidadesBncc }
  }

  if (arquivo) {
    diff.changed.push('file')
    diff.file = {
      from: { storageKey: atual.storageKey,       originalFileName: atual.originalFileName },
      to:   { storageKey: arquivo.storageKey,     originalFileName: arquivo.originalFileName },
    }

    if (arquivo.status && arquivo.status !== atual.status) {
      diff.changed.push('status')
      diff.status = { from: atual.status, to: arquivo.status }
    }
  }

  return diff
}
