import type { PlanoAmortizacao } from '../domain/tipos'
import { db } from './db'

/**
 * Troca o plano de um financiamento: remove os existentes e grava o novo (se houver) numa ÚNICA transação,
 * então uma falha no meio nunca deixa a dívida sem plano. Sem `novo`, só remove.
 */
export async function substituirPlano(financiamentoId: string, novo: PlanoAmortizacao | undefined): Promise<void> {
  await db.transaction('rw', db.planos, async () => {
    await db.planos.where('financiamentoId').equals(financiamentoId).delete()
    if (novo) await db.planos.put(novo)
  })
}
