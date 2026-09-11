// src/test/setup.ts
// Setup global dos testes: matchers do jest-dom e limpeza do DOM entre casos.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom não implementa scrollIntoView — stub noop para componentes que fazem auto-scroll.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}

afterEach(() => {
  cleanup()
})
