// src/components/MaterialLinks.tsx
// Exibe os links relacionados de um material como botões com a aparência dos
// chips de habilidade BNCC — mesma forma e peso, matiz própria, porque são
// clicáveis. Sem links, nada é renderizado: não ter links é o estado normal da
// maior parte do acervo, e avisar a ausência em quase toda tela seria ruído.
import { ExternalLink, Link2 } from 'lucide-react'
import { chipClasses } from './chipStyles'
import type { MaterialLink } from '../features/materials/api/materialsApi'

interface MaterialLinksProps {
  links: MaterialLink[]
}

export function MaterialLinks({ links }: MaterialLinksProps) {
  if (!links?.length) return null

  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Link2 size={13} className="text-teal-500" />
        Links relacionados
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((link, i) => (
          // A ordem é a de cadastro, e endereço repetido é permitido: o índice é
          // a única chave estável.
          <li key={i}>
            <a
              href={link.url}
              // Abre fora da tela do material (FR-006). `noopener` impede o destino
              // de obter referência a esta janela e redirecioná-la (tabnabbing);
              // `noreferrer` não lhe conta de onde o usuário veio (FR-015).
              target="_blank"
              rel="noopener noreferrer"
              // O endereço completo é revelado antes do clique (FR-005): um botão
              // "Videoaula" que esconde o destino é justamente o vetor de engano.
              title={link.url}
              className={`${chipClasses('teal')} gap-1`}
            >
              {link.label}
              <ExternalLink size={10} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
