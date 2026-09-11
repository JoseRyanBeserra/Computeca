// src/components/AppShell.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from './AppShell'
import { renderWithProviders, setSession, makeUser } from '../test/utils'

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renderiza o conteúdo filho', () => {
    renderWithProviders(<AppShell><p>Conteúdo interno</p></AppShell>)
    expect(screen.getByText('Conteúdo interno')).toBeInTheDocument()
  })

  it('mostra o botão "Entrar" para usuário anônimo', () => {
    renderWithProviders(<AppShell><p>x</p></AppShell>)
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument()
  })

  it('exibe navegação de admin para usuário ADMIN', () => {
    setSession(makeUser({ role: 'ADMIN', email: 'admin@dcx.ufpb.br' }))
    renderWithProviders(<AppShell><p>x</p></AppShell>)
    expect(screen.getByText('Usuários')).toBeInTheDocument()
    expect(screen.getByText('Logs')).toBeInTheDocument()
    expect(screen.getByText('Revisar')).toBeInTheDocument()
  })

  it('não exibe navegação de admin para PROFESSOR comum', () => {
    setSession(makeUser({ role: 'PROFESSOR' }))
    renderWithProviders(<AppShell><p>x</p></AppShell>)
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
    expect(screen.getByText('Projetos')).toBeInTheDocument()
  })

  it('abre o drawer mobile pelo hambúrguer e fecha ao navegar', async () => {
    const user = userEvent.setup()
    setSession(makeUser())
    renderWithProviders(<AppShell><p>x</p></AppShell>)

    // Drawer fechado por padrão
    expect(screen.queryByRole('dialog', { name: /Menu de navegação/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Abrir menu/i }))
    const drawer = screen.getByRole('dialog', { name: /Menu de navegação/i })
    expect(within(drawer).getByText('Meus Materiais')).toBeInTheDocument()

    // Navegar por um item fecha o drawer
    await user.click(within(drawer).getByText('Início'))
    expect(screen.queryByRole('dialog', { name: /Menu de navegação/i })).not.toBeInTheDocument()
  })

  it('fecha o drawer mobile com a tecla Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppShell><p>x</p></AppShell>)

    await user.click(screen.getByRole('button', { name: /Abrir menu/i }))
    expect(screen.getByRole('dialog', { name: /Menu de navegação/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /Menu de navegação/i })).not.toBeInTheDocument()
  })

  it('abre o menu do usuário e permite sair', async () => {
    const user = userEvent.setup()
    setSession(makeUser({ name: 'Ana Souza' }))
    renderWithProviders(<AppShell><p>x</p></AppShell>)

    await user.click(screen.getByRole('button', { name: /AS/ }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: /Sair da conta/i }))
    // Após logout a sessão é limpa
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
