import { describe, it, expect } from 'vitest'
import { statusReserva } from './reserva'

describe('statusReserva', () => {
  it('3 de 6 meses = 50%', () => expect(statusReserva(300000, 100000, 6)).toEqual({ cobertos: 3, progresso: 50 }))
  it('sem custo essencial = 0', () => expect(statusReserva(300000, 0, 6)).toEqual({ cobertos: 0, progresso: 0 }))
  it('saldo negativo = 0', () => expect(statusReserva(-5000, 100000, 6).cobertos).toBe(0))
  it('limita o progresso a 100', () => expect(statusReserva(9000000, 100000, 6).progresso).toBe(100))
})
