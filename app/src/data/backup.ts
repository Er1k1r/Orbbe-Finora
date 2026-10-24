import type { Table } from 'dexie'
import { db } from './db'

const VERSAO = 2
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

export async function exportar(): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  // Uma transação de leitura: as seis tabelas saem do mesmo instante (sem escrita no meio).
  await db.transaction('r', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) dados[t] = await db[t].toArray()
  })
  return JSON.stringify(dados)
}

const INVALIDO = 'Arquivo de backup inválido'

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
    opc: {},
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

function validar(json: string): Record<Tabela, object[]> {
  let dados: unknown
  try { dados = JSON.parse(json) } catch { throw new Error(INVALIDO) }
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) throw new Error(INVALIDO)
  const obj = dados as Record<string, unknown>
  if (obj.versao !== VERSAO) throw new Error('Versão de backup não suportada')
  for (const t of TABELAS) {
    const linhas = obj[t]
    if (!Array.isArray(linhas)) throw new Error(INVALIDO)
    for (const l of linhas) {
      if (typeof l !== 'object' || l === null || Array.isArray(l)) throw new Error(INVALIDO)
      if (typeof (l as { id?: unknown }).id !== 'string') throw new Error(INVALIDO)
      if (!linhaValida(t, l as Linha)) throw new Error(INVALIDO)
    }
  }
  return obj as Record<Tabela, object[]>
}

export async function importar(json: string): Promise<void> {
  const dados = validar(json)
  await db.transaction('rw', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) {
      // Único cast: `db[t]` é uma união de Table<Tipo, string>; as linhas já foram validadas por tabela em `validar`.
      const tabela = db[t] as unknown as Table<object, string>
      await tabela.clear()
      await tabela.bulkPut(dados[t])
    }
  })
}
