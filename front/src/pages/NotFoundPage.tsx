// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

export function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                                shadow-sm focus:ring-indigo-500 focus:ring-offset-0" />
      </div>
      <div className="text-center space-y-4">
        <p className="text-6xl font-extrabold text-gray-200 dark:text-gray-700">404</p>
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
          Página não encontrada
        </h1>
        <Link
          to="/"
          className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}
