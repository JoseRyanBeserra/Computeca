// src/components/auth/BrandingPanel.tsx
import { GraduationCap, Users, Search } from 'lucide-react'

export function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[52%] bg-indigo-700 flex-col justify-between p-12 text-white select-none">
      {/* Topo — logotipo */}
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-xl p-1.5 shadow-sm">
          <img src="/logo.png" alt="" aria-hidden className="h-9 w-9 object-contain" />
        </div>
        <div>
          <p className="font-bold text-lg leading-tight">Computeca</p>
          <p className="text-indigo-200 text-xs">Acervo de Materiais Instrucionais</p>
        </div>
      </div>

      {/* Centro — headline */}
      <div className="space-y-6">
        <h1 className="text-4xl font-extrabold leading-tight">
          Acervo acadêmico
          <br />
          ao alcance de todos.
        </h1>
        <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
          A Computeca reúne e dissemina os materiais instrucionais do
          Campus IV da UFPB, com curadoria docente e busca semântica por IA.
        </p>

        <ul className="space-y-3 pt-2">
          {[
            { icon: GraduationCap, label: 'Aprovação e curadoria por professores' },
            { icon: Search,        label: 'Busca semântica por conteúdo' },
            { icon: Users,         label: 'Acesso para toda a comunidade acadêmica' },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-indigo-100">
              <div className="shrink-0 bg-white/10 rounded-lg p-1.5">
                <Icon size={14} />
              </div>
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* Rodapé */}
      <p className="text-indigo-300 text-xs">
        Campus IV · UFPB — Rio Tinto / Mamanguape
      </p>
    </div>
  )
}
