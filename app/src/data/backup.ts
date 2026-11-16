import type { Table } from 'dexie'
import { db } from './db'

const VERSAO = 3
const VERSOES_ACEITAS = [2, 3] // v2 (sem preferências) continua importável: não orfanar backups existentes
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

const OBJETIVOS = ['destino', 'nao_estourar', 'contas_em_dia', 'meta'] as const

/** Preferências do aparelho que viajam no backup (a UI passa o conteúdo do seu store; a camada de dados não importa de `ui/`). */
export interface PreferenciasBackup {
  objetivos?: (typeof OBJETIVOS)[number][]
  checklistFechado?: boolean
  semFinanciamento?: boolean
  contaPadraoId?: string
}

export async function exportar(preferencias?: PreferenciasBackup): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  if (typeof preferencias === 'object' && preferencias !== null) dados.preferencias = limparPreferencias(preferencias)
  // Uma transação de leitura: as seis tabelas saem do mesmo instante (sem escrita no meio).
  await db.transaction('r', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) dados[t] = await db[t].toArray()
  })
  return JSON.stringify(dados)
}

const INVALIDO = 'Arquivo de backup inválido'

/**
 * Só as chaves conhecidas COM valor válido (chave desconhecida ou valor inválido é descartado, nunca gravado):
 * um localStorage corrompido não pode gerar um backup que `importar` rejeita.
 */
function limparPreferencias(p: PreferenciasBackup): PreferenciasBackup {
  const { objetivos, checklistFechado, semFinanciamento, contaPadraoId } = p as Record<string, unknown>
  return {
    ...(Array.isArray(objetivos) ? { objetivos: objetivos.filter((o): o is (typeof OBJETIVOS)[number] => OBJETIVOS.includes(o as never)) } : {}),
    ...(typeof checklistFechado === 'boolean' ? { checklistFechado } : {}),
    ...(typeof semFinanciamento === 'boolean' ? { semFinanciamento } : {}),
    ...(typeof contaPadraoId === 'string' ? { contaPadraoId } : {}),
  }
}

/** Valida o bloco `preferencias` (todos os campos opcionais); lança INVALIDO sem tocar em nada. Chaves extras são ignoradas. */
function validarPreferencias(v: unknown): PreferenciasBackup {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(INVALIDO)
  const p = v as Record<string, unknown>
  const { objetivos, checklistFechado, semFinanciamento, contaPadraoId } = p
  if (objetivos !== undefined && !(Array.isArray(objetivos) && objetivos.every((o) => OBJETIVOS.includes(o as never)))) throw new Error(INVALIDO)
  if (checklistFechado !== undefined && typeof checklistFechado !== 'boolean') throw new Error(INVALIDO)
  if (semFinanciamento !== undefined && typeof semFinanciamento !== 'boolean') throw new Error(INVALIDO)
  if (contaPadraoId !== undefined && typeof contaPadraoId !== 'string') throw new Error(INVALIDO)
  return limparPreferencias(p as PreferenciasBackup)
}

type Tabela = (typeof TABELAS)[number]
type Linha = Record<string, unknown>

const ehInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
const ehIntMin = (min: number) => (v: unknown) => ehInt(v) && v >= min
const ehIntEntre = (min: number, max: number) => (v: unknown) => ehInt(v) && v >= min && v <= max
const ehTexto = (v: unknown) => typeof v === 'string'
const ehBool = (v: unknown) => typeof v === 'boolean'
const ehEnum = (...vals: string[]) => (v: unknown) => typeof v === 'string' && vals.includes(v)
const ehFinitoMin0 = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0
const ehDataReal = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [a, m, d] = v.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1) return false
  return d <= new Date(Date.UTC(a, m, 0)).getUTCDate()
}
const ehParcelamento = (v: unknown) => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const p = v as Record<string, unknown>
  return ehTexto(p.grupoId) && ehIntMin(1)(p.numero) && ehIntMin(2)(p.total) && (p.numero as number) <= (p.total as number)
}
const ehMesReal = (v: unknown) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

type Regra = (v: unknown) => boolean
// Campos obrigatórios e opcionais (opcionais só são checados quando presentes e != undefined).
const REGRAS: Record<Tabela, { obrig: Record<string, Regra>; opc: Record<string, Regra> }> = {
  contas: {
    obrig: { nome: ehTexto, tipo: ehEnum('banco', 'caixa', 'carteira'), saldoInicial: ehInt },
    opc: { limiteChequeEspecial: ehIntMin(0), taxaChequeEspecial: ehFinitoMin0, reserva: ehBool },
  },
  fontes: {
    obrig: { nome: ehTexto, tipo: ehEnum('fixa', 'variavel', 'eventual'), valorEsperado: ehIntMin(0) },
    opc: { diaPagamento: ehIntEntre(1, 31) },
  },
  categorias: {
    obrig: {
      nome: ehTexto, icone: ehTexto, tipo: ehEnum('entrada', 'saida'),
      natureza: ehEnum('fixo', 'variavel'), essencial: ehBool,
    },
    opc: { sistema: ehBool },
  },
  lancamentos: {
    obrig: {
      valor: ehIntMin(0), data: ehDataReal, tipo: ehEnum('entrada', 'saida'),
      categoriaId: ehTexto, natureza: ehEnum('fixo', 'variavel'), contaId: ehTexto,
      status: ehEnum('pago', 'pendente'),
    },
    opc: {
      fonteId: ehTexto, observacao: ehTexto, origemId: ehTexto, financiamentoId: ehTexto,
      recorrencia: ehEnum('mensal'), geradoAte: ehMesReal,
      descricao: ehTexto, especie: ehEnum('transferencia', 'ajuste'), transferenciaId: ehTexto,
      pagamentoFinanciamento: ehEnum('parcela', 'antecipacao'), recorrenciaAte: ehMesReal, parcelamento: ehParcelamento,
    },
  },
  financiamentos: {
    obrig: {
      nome: ehTexto, valorFinanciado: ehIntMin(1), valorParcela: ehIntMin(1), totalParcelas: ehIntEntre(1, 1200),
      sistema: ehEnum('SAC', 'PRICE'), taxaMensal: ehFinitoMin0, primeiraParcela: ehDataReal, parcelasPagasAntes: ehIntMin(0),
    },
    opc: { tipo: ehEnum('carro', 'moto', 'casa', 'outro') },
  },
  planos: {
    obrig: {
      financiamentoId: ehTexto, aporteExtraMensal: ehIntMin(0), efeito: ehEnum('reduzir_prazo', 'reduzir_parcela'),
    },
    opc: {},
  },
}

function linhaValida(t: Tabela, l: Linha): boolean {
  const { obrig, opc } = REGRAS[t]
  for (const [k, ok] of Object.entries(obrig)) if (!ok(l[k])) return false
  for (const [k, ok] of Object.entries(opc)) if (l[k] !== undefined && !ok(l[k])) return false
  return true
}

function validar(json: string): { tabelas: Record<Tabela, object[]>; preferencias?: PreferenciasBackup } {
  let dados: unknown
  try { dados = JSON.parse(json) } catch { throw new Error(INVALIDO) }
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) throw new Error(INVALIDO)
  const obj = dados as Record<string, unknown>
  if (typeof obj.versao !== 'number' || !VERSOES_ACEITAS.includes(obj.versao)) throw new Error('Versão de backup não suportada')
  for (const t of TABELAS) {
    const linhas = obj[t]
    if (!Array.isArray(linhas)) throw new Error(INVALIDO)
    for (const l of linhas) {
      if (typeof l !== 'object' || l === null || Array.isArray(l)) throw new Error(INVALIDO)
      if (typeof (l as { id?: unknown }).id !== 'string') throw new Error(INVALIDO)
      if (!linhaValida(t, l as Linha)) throw new Error(INVALIDO)
    }
  }
  const tabelas = obj as Record<Tabela, object[]>
  if (obj.versao !== 3 || obj.preferencias === undefined) return { tabelas }
  const preferencias = validarPreferencias(obj.preferencias)
  // Conta padrão que não existe entre as contas importadas é descartada.
  if (preferencias.contaPadraoId !== undefined && !tabelas.contas.some((c) => (c as { id: string }).id === preferencias.contaPadraoId)) {
    delete preferencias.contaPadraoId
  }
  return { tabelas, preferencias }
}

/** Importa o backup (v2 ou v3). Nada é apagado antes de a validação passar. Devolve as preferências para a UI aplicar. */
export async function importar(json: string): Promise<{ preferencias?: PreferenciasBackup }> {
  const { tabelas: dados, preferencias } = validar(json)
  await db.transaction('rw', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) {
      // Único cast: `db[t]` é uma união de Table<Tipo, string>; as linhas já foram validadas por tabela em `validar`.
      const tabela = db[t] as unknown as Table<object, string>
      await tabela.clear()
      await tabela.bulkPut(dados[t])
    }
  })
  return preferencias ? { preferencias } : {}
}
