# Finanças Pessoais v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA mobile-first de finanças pessoais, local-first, com lançamento rápido, contas, fontes de renda por perfil, sobra normal/otimizada, financiamentos com simulador de amortização e insights por regras.

**Architecture:** Motor financeiro em TypeScript puro (`src/domain`), sem dependência de UI ou banco, todo em centavos (inteiros). Persistência atrás de um repositório (`src/data`) com adaptador Dexie/IndexedDB. UI React (`src/ui`) lê via `dexie-react-hooks` e chama o motor.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, Dexie + dexie-react-hooks, react-router-dom (HashRouter), @phosphor-icons/react, vite-plugin-pwa, Vitest, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-10-19-financas-pessoais-design.md`

## Global Constraints

- Valores monetários são **inteiros em centavos** (`Centavos = number`) em todo o domínio, banco e testes. Só a camada de formatação converte para reais.
- Mês de referência é a string `'YYYY-MM'`; datas são `'YYYY-MM-DD'` (sem fuso).
- `src/domain` não importa React, Dexie nem nada de `ui/` ou `data/`.
- Parcelas de financiamento **não** são lançamentos: o motor as soma à despesa do mês a partir do cadastro do financiamento (evita contagem dupla).
- Visual: Soft Structuralism, sem Inter/Roboto/Arial, ícones Phosphor Light, cartões em dupla moldura, curva `cubic-bezier(0.32,0.72,0,1)`, anima só `transform`/`opacity` (exceção: o traço do anel SVG), respeita `prefers-reduced-motion`. Tokens de cor exatamente os do spec §8.
- Cor nunca é a única pista: sempre sinal +/− e rótulo.
- Alvos de toque ≥ 44 px; `min-h-[100dvh]`, nunca `h-screen`.
- Nada de padrão visual Tely.

**User decisions (already made):** PWA local-first com caminho para APK via Capacitor · perfil por fonte de renda (`fixa`/`variavel`/`eventual`) · escopo v1 = núcleo + financiamentos + insights por regras (13º/férias e fatura de cartão ficam para v2) · visual próprio inspirado nas referências (drawer, seletor de mês, FAB, anel) · ideias do Kontto aprovadas em 2026-10-23: onboarding em 3 perguntas com objetivos, checklist "Vamos começar", cartão de privacidade, restaurar backup na abertura, e interpretador de notificação bancária no motor (Task 14). A captura nativa de notificações fica na fase APK (fora deste plano).

**Desvio do spec (registrado):** no drawer, **Orçamento** e **Gráficos** ficam para a v1.1; **Reserva** vira um cartão dentro da tela Insights. O restante do spec §7 está coberto.

## File Structure

```
app/
  index.html
  vite.config.ts
  src/
    main.tsx, App.tsx, index.css
    domain/
      tipos.ts            tipos e constantes
      meses.ts            utilitários de mês
      dinheiro.ts         formatação BRL e parse de dígitos
      amortizacao.ts      SAC/Price + simulação de aporte
      fluxo.ts            saldo, previsto, saldo seguro, sobras
      renda.ts            renda esperada, custo essencial, reserva alvo
      recorrencia.ts      geração de lançamentos mensais
      insights.ts         regras de insight
      *.test.ts
    data/
      db.ts               schema Dexie
      repo.ts             operações de repositório
      seed.ts             categorias padrão
      backup.ts           exportar/importar JSON
      *.test.ts
    ui/
      tema.css            tokens
      componentes/        Cartao, Moldura, SobraRing, SeletorMes, Drawer, Fab, Icone
      telas/              Resumo, LancamentoRapido, Lancamentos, Contas, Dividas, DividaDetalhe,
                          Insights, Fontes, Categorias, Backup, Onboarding
      hooks/useDados.ts
```

---

### Task 0: Scaffold do projeto

**Goal:** Projeto `app/` rodando com Vite, React, TS, Tailwind, Vitest e git.

**Files:**
- Create: `app/` (via Vite), `app/vite.config.ts`, `app/src/index.css`
- Modify: `app/package.json`

**Acceptance Criteria:**
- [ ] `npm run build` termina sem erro.
- [ ] `npx vitest run` roda (mesmo sem testes ainda, com `--passWithNoTests`).
- [ ] Repositório git criado na raiz com primeiro commit.

**Verify:** `cd app && npm run build && npx vitest run --passWithNoTests` → build OK, vitest exit 0

**Steps:**

- [ ] **Step 1: Criar projeto e instalar dependências**

```bash
git init
npm create vite@latest app -- --template react-ts
cd app
npm install dexie dexie-react-hooks react-router-dom @phosphor-icons/react @fontsource/plus-jakarta-sans @fontsource/geist-mono
npm install -D tailwindcss @tailwindcss/vite vitest fake-indexeddb jsdom @testing-library/react vite-plugin-pwa
```

- [ ] **Step 2: Configurar `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Finanças Pessoais',
        short_name: 'Finanças',
        display: 'standalone',
        start_url: '.',
        background_color: '#F4F5F2',
        theme_color: '#0F5C4A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['./src/test-setup.ts'] },
})
```

- [ ] **Step 3: Setup de teste e script**

Criar `app/src/test-setup.ts`:

```ts
import 'fake-indexeddb/auto'
```

Em `package.json`, adicionar `"test": "vitest run"` aos scripts. Remover o conteúdo demo de `src/App.tsx` e `src/App.css`, deixando `App.tsx` retornar `<div>Finanças</div>`.

- [ ] **Step 4: Verificar**

Run: `npm run build && npx vitest run --passWithNoTests`
Expected: build gera `dist/`; vitest sai com código 0.

- [ ] **Step 5: Commit**

```bash
cd .. && git add -A && git commit -m "chore: scaffold app (vite, react, ts, tailwind, vitest, pwa)"
```

---

### Task 1: Tipos, meses e dinheiro

**Goal:** Tipos de domínio e utilitários de mês/dinheiro usados por todo o resto.

**Files:**
- Create: `app/src/domain/tipos.ts`, `app/src/domain/meses.ts`, `app/src/domain/dinheiro.ts`
- Test: `app/src/domain/meses.test.ts`, `app/src/domain/dinheiro.test.ts`

**Acceptance Criteria:**
- [ ] `mesAnterior('2026-01', 1)` retorna `'2025-12'`.
- [ ] `formatarBRL(123456)` retorna `R$ 1.234,56` (com espaço não separável tolerado).
- [ ] `centavosDeDigitos('1250')` retorna `1250`; string vazia retorna `0`.

**Verify:** `cd app && npx vitest run src/domain/meses.test.ts src/domain/dinheiro.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

`meses.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mesDe, mesAnterior, mesesAnteriores, fimDoMes } from './meses'

describe('meses', () => {
  it('mesDe extrai YYYY-MM', () => expect(mesDe('2026-10-19')).toBe('2026-10'))
  it('mesAnterior atravessa o ano', () => {
    expect(mesAnterior('2026-01', 1)).toBe('2025-12')
    expect(mesAnterior('2026-03', 0)).toBe('2026-03')
  })
  it('mesesAnteriores devolve n meses antes do mês', () => {
    expect(mesesAnteriores('2026-02', 3)).toEqual(['2025-11', '2025-12', '2026-01'])
  })
  it('fimDoMes', () => expect(fimDoMes('2026-02')).toBe('2026-02-28'))
})
```

`dinheiro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatarBRL, centavosDeDigitos } from './dinheiro'

describe('dinheiro', () => {
  it('formata em reais', () => {
    expect(formatarBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
    expect(formatarBRL(-5000).replace(/\s/g, ' ')).toBe('-R$ 50,00')
  })
  it('centavosDeDigitos', () => {
    expect(centavosDeDigitos('1250')).toBe(1250)
    expect(centavosDeDigitos('')).toBe(0)
    expect(centavosDeDigitos('0007')).toBe(7)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/meses.test.ts src/domain/dinheiro.test.ts`
Expected: FAIL (módulos não existem)

- [ ] **Step 3: Implementar**

`tipos.ts`:

```ts
export type Centavos = number
export type Mes = string // 'YYYY-MM'
export type TipoLancamento = 'entrada' | 'saida'
export type Natureza = 'fixo' | 'variavel'
export type StatusLancamento = 'pago' | 'pendente'
export type TipoFonte = 'fixa' | 'variavel' | 'eventual'
export type SistemaAmortizacao = 'SAC' | 'PRICE'
export type EfeitoAporte = 'reduzir_prazo' | 'reduzir_parcela'

export interface Conta {
  id: string
  nome: string
  tipo: 'banco' | 'caixa' | 'carteira'
  saldoInicial: Centavos
}
export interface FonteDeRenda {
  id: string
  nome: string
  tipo: TipoFonte
  valorEsperado: Centavos
  diaPagamento?: number
}
export interface Categoria {
  id: string
  nome: string
  icone: string
  tipo: TipoLancamento
  natureza: Natureza
  essencial: boolean
}
export interface Lancamento {
  id: string
  valor: Centavos
  data: string // 'YYYY-MM-DD'
  tipo: TipoLancamento
  categoriaId: string
  natureza: Natureza
  contaId: string
  fonteId?: string
  observacao?: string
  status: StatusLancamento
  recorrencia?: 'mensal'
  origemId?: string // lançamento-modelo de uma recorrência
}
export interface Financiamento {
  id: string
  nome: string
  saldoDevedor: Centavos
  taxaMensal: number // 0.01 = 1% a.m.
  prazoRestante: number
  sistema: SistemaAmortizacao
  diaVencimento: number
}
export interface PlanoAmortizacao {
  id: string
  financiamentoId: string
  aporteExtraMensal: Centavos
  efeito: EfeitoAporte
}
```

`meses.ts`:

```ts
import type { Mes } from './tipos'

export const mesDe = (data: string): Mes => data.slice(0, 7)

export function mesAnterior(mes: Mes, n: number): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString().slice(0, 7)
}

/** n meses imediatamente antes de `mes`, do mais antigo ao mais recente. */
export function mesesAnteriores(mes: Mes, n: number): Mes[] {
  return Array.from({ length: n }, (_, i) => mesAnterior(mes, n - i))
}

export function fimDoMes(mes: Mes): string {
  const [y, m] = mes.split('-').map(Number)
  const dia = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}
```

`dinheiro.ts`:

```ts
import type { Centavos } from './tipos'

export function formatarBRL(c: Centavos): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Teclado numérico estilo caixa: dígitos digitados = centavos. */
export function centavosDeDigitos(digitos: string): Centavos {
  const limpo = digitos.replace(/\D/g, '')
  return limpo === '' ? 0 : Number(limpo)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/meses.test.ts src/domain/dinheiro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): tipos, utilitarios de mes e dinheiro"
```

---

### Task 2: Amortização SAC/Price e simulador

**Goal:** Cronograma SAC/Price e comparação com aporte extra (reduzir prazo ou parcela).

**Files:**
- Create: `app/src/domain/amortizacao.ts`
- Test: `app/src/domain/amortizacao.test.ts`

**Acceptance Criteria:**
- [ ] Price 100000 centavos, 1% a.m., 3 meses: parcela 1 = 34002, juros totais = 2007, saldo final 0.
- [ ] SAC 120000, 1%, 4 meses: parcelas 31200/30900/30600/30300; juros totais 3000.
- [ ] SAC com aporte 30000 e `reduzir_prazo`: 2 parcelas, juros totais 1800, economia de juros 1200.
- [ ] SAC com aporte 30000 e `reduzir_parcela`: parcela do mês 2 = 20600 (< 30900 original).

**Verify:** `cd app && npx vitest run src/domain/amortizacao.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { gerarCronograma, resumirCronograma, simularAporte } from './amortizacao'

describe('Price', () => {
  const c = gerarCronograma({ saldo: 100000, taxa: 0.01, prazo: 3, sistema: 'PRICE' })
  it('calcula parcelas e quita no fim', () => {
    expect(c).toHaveLength(3)
    expect(c[0].parcela).toBe(34002)
    expect(c[2].saldo).toBe(0)
    expect(resumirCronograma(c).jurosTotais).toBe(2007)
  })
})

describe('SAC', () => {
  const c = gerarCronograma({ saldo: 120000, taxa: 0.01, prazo: 4, sistema: 'SAC' })
  it('parcelas decrescentes', () => {
    expect(c.map((p) => p.parcela)).toEqual([31200, 30900, 30600, 30300])
    expect(resumirCronograma(c).jurosTotais).toBe(3000)
  })
})

describe('aporte extra', () => {
  const base = { saldo: 120000, taxa: 0.01, prazo: 4, sistema: 'SAC' as const }
  it('reduzir_prazo encurta o prazo e economiza juros', () => {
    const r = simularAporte({ ...base, aporte: 30000, efeito: 'reduzir_prazo' })
    expect(r.comAporte.prazo).toBe(2)
    expect(r.comAporte.jurosTotais).toBe(1800)
    expect(r.economiaJuros).toBe(1200)
    expect(r.mesesEconomizados).toBe(2)
  })
  it('reduzir_parcela mantém prazo e baixa a parcela', () => {
    const c = gerarCronograma({ ...base, aporte: 30000, efeito: 'reduzir_parcela' })
    expect(c[1].parcela).toBe(20600)
  })
  it('sem aporte, cenário igual ao atual', () => {
    const r = simularAporte({ ...base, aporte: 0, efeito: 'reduzir_prazo' })
    expect(r.economiaJuros).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/amortizacao.test.ts` → FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
import type { Centavos, EfeitoAporte, SistemaAmortizacao } from './tipos'

export interface Parcela {
  numero: number
  juros: Centavos
  amortizacao: Centavos
  extra: Centavos
  parcela: Centavos // juros + amortização (sem o extra)
  saldo: Centavos // saldo após parcela e extra
}

export interface EntradaCronograma {
  saldo: Centavos
  taxa: number
  prazo: number
  sistema: SistemaAmortizacao
  aporte?: Centavos
  efeito?: EfeitoAporte
}

function calcPmt(saldo: Centavos, taxa: number, n: number): Centavos {
  if (taxa === 0) return Math.round(saldo / n)
  return Math.round((saldo * taxa) / (1 - Math.pow(1 + taxa, -n)))
}

export function gerarCronograma(e: EntradaCronograma): Parcela[] {
  const { taxa, sistema, aporte = 0, efeito = 'reduzir_prazo' } = e
  let saldo = e.saldo
  let restante = e.prazo
  let pmt = sistema === 'PRICE' ? calcPmt(saldo, taxa, restante) : 0
  let amortFixa = sistema === 'SAC' ? Math.round(saldo / restante) : 0
  const out: Parcela[] = []

  while (saldo > 0 && out.length < 1200) {
    const juros = Math.round(saldo * taxa)
    let amort = sistema === 'PRICE' ? pmt - juros : amortFixa
    if (amort >= saldo || restante <= 1) amort = saldo
    const extra = Math.min(aporte, saldo - amort)
    const saldoApos = saldo - amort - extra
    out.push({
      numero: out.length + 1,
      juros,
      amortizacao: amort,
      extra,
      parcela: juros + amort,
      saldo: saldoApos,
    })
    saldo = saldoApos
    restante -= 1
    if (efeito === 'reduzir_parcela' && extra > 0 && saldo > 0 && restante > 0) {
      pmt = calcPmt(saldo, taxa, restante)
      amortFixa = Math.round(saldo / restante)
    }
  }
  return out
}

export function resumirCronograma(c: Parcela[]) {
  return {
    prazo: c.length,
    jurosTotais: c.reduce((s, p) => s + p.juros, 0),
    totalPago: c.reduce((s, p) => s + p.parcela + p.extra, 0),
    primeiraParcela: c[0]?.parcela ?? 0,
  }
}

export function simularAporte(e: EntradaCronograma & { aporte: Centavos }) {
  const atual = resumirCronograma(gerarCronograma({ ...e, aporte: 0 }))
  const comAporte = resumirCronograma(gerarCronograma(e))
  return {
    atual,
    comAporte,
    economiaJuros: atual.jurosTotais - comAporte.jurosTotais,
    mesesEconomizados: atual.prazo - comAporte.prazo,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/amortizacao.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): amortizacao SAC/Price e simulador de aporte"
```

---

### Task 3: Fluxo de caixa e sobras

**Goal:** Saldo, previsto, saldo seguro, resumo do mês e sobra normal/otimizada.

**Files:**
- Create: `app/src/domain/fluxo.ts`
- Test: `app/src/domain/fluxo.test.ts`

**Acceptance Criteria:**
- [ ] Saldo soma `saldoInicial` das contas mais lançamentos `pago` (entrada +, saída −); `pendente` não entra.
- [ ] `resumoMes` separa realizado e pendente e retorna `sobraNormal` = receitas − despesas − parcelas, e `sobraOtimizada` = sobraNormal − aporte.
- [ ] `saldoSeguro` = saldo − saídas pendentes até o fim do mês; `previsto` = saldo + entradas pendentes − saídas pendentes.
- [ ] `parcelaDoMes(financiamento)` devolve a primeira parcela do cronograma sem aporte.

**Verify:** `cd app && npx vitest run src/domain/fluxo.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { saldoContas, resumoMes, parcelaDoMes } from './fluxo'
import type { Conta, Lancamento, Financiamento } from './tipos'

const conta: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 100000 }
const l = (p: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36).slice(2),
  valor: 0, data: '2026-10-10', tipo: 'saida', categoriaId: 'x', natureza: 'variavel',
  contaId: 'c1', status: 'pago', ...p,
})
const fin: Financiamento = {
  id: 'f1', nome: 'Carro', saldoDevedor: 120000, taxaMensal: 0.01,
  prazoRestante: 4, sistema: 'SAC', diaVencimento: 5,
}

describe('saldoContas', () => {
  it('ignora pendentes', () => {
    const ls = [
      l({ tipo: 'entrada', valor: 50000 }),
      l({ valor: 20000 }),
      l({ valor: 99999, status: 'pendente' }),
    ]
    expect(saldoContas([conta], ls)).toBe(100000 + 50000 - 20000)
  })
})

describe('parcelaDoMes', () => {
  it('primeira parcela sem aporte', () => expect(parcelaDoMes(fin)).toBe(31200))
})

describe('resumoMes', () => {
  const ls = [
    l({ tipo: 'entrada', valor: 300000 }),
    l({ valor: 80000 }),
    l({ valor: 20000, status: 'pendente' }),
    l({ tipo: 'entrada', valor: 10000, status: 'pendente' }),
    l({ valor: 5000, data: '2026-09-10' }), // outro mês
  ]
  const r = resumoMes({ mes: '2026-10', contas: [conta], lancamentos: ls, financiamentos: [fin], aporteExtra: 10000 })
  it('receitas e despesas do mês', () => {
    expect(r.receitas).toBe(310000)
    expect(r.despesas).toBe(100000)
    expect(r.parcelas).toBe(31200)
  })
  it('sobras', () => {
    expect(r.sobraNormal).toBe(310000 - 100000 - 31200)
    expect(r.sobraOtimizada).toBe(r.sobraNormal - 10000)
  })
  it('saldo, previsto e saldo seguro', () => {
    // saldo = 100000 + 300000 - 80000 - 5000 = 315000
    expect(r.saldo).toBe(315000)
    expect(r.previsto).toBe(315000 + 10000 - 20000)
    expect(r.saldoSeguro).toBe(315000 - 20000)
    expect(r.inicial).toBe(100000 - 5000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/fluxo.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { gerarCronograma } from './amortizacao'
import { mesDe } from './meses'
import type { Centavos, Conta, Financiamento, Lancamento, Mes } from './tipos'

const sinal = (l: Lancamento) => (l.tipo === 'entrada' ? l.valor : -l.valor)
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

export function saldoContas(contas: Conta[], lancs: Lancamento[]): Centavos {
  const inicial = contas.reduce((s, c) => s + c.saldoInicial, 0)
  return inicial + lancs.filter((l) => l.status === 'pago').reduce((s, l) => s + sinal(l), 0)
}

export function parcelaDoMes(f: Financiamento): Centavos {
  return (
    gerarCronograma({
      saldo: f.saldoDevedor, taxa: f.taxaMensal, prazo: f.prazoRestante, sistema: f.sistema,
    })[0]?.parcela ?? 0
  )
}

export interface EntradaResumo {
  mes: Mes
  contas: Conta[]
  lancamentos: Lancamento[]
  financiamentos: Financiamento[]
  aporteExtra: Centavos
}

export function resumoMes(e: EntradaResumo) {
  const doMes = e.lancamentos.filter((l) => mesDe(l.data) === e.mes)
  const entradas = doMes.filter((l) => l.tipo === 'entrada')
  const saidas = doMes.filter((l) => l.tipo === 'saida')
  const parcelas = e.financiamentos.reduce((s, f) => s + parcelaDoMes(f), 0)

  const receitas = soma(entradas)
  const despesas = soma(saidas)
  const sobraNormal = receitas - despesas - parcelas

  const saldo = saldoContas(e.contas, e.lancamentos)
  const ateMes = e.lancamentos.filter((l) => mesDe(l.data) <= e.mes && l.status === 'pendente')
  const receitasPendentes = soma(ateMes.filter((l) => l.tipo === 'entrada'))
  const despesasPendentes = soma(ateMes.filter((l) => l.tipo === 'saida'))
  const antes = e.lancamentos.filter((l) => mesDe(l.data) < e.mes)

  return {
    receitas,
    despesas,
    parcelas,
    receitasPendentes,
    despesasPendentes,
    sobraNormal,
    sobraOtimizada: sobraNormal - e.aporteExtra,
    saldo,
    inicial: saldoContas(e.contas, antes),
    previsto: saldo + receitasPendentes - despesasPendentes,
    saldoSeguro: saldo - despesasPendentes,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/fluxo.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): fluxo de caixa, saldo seguro e sobras"
```

---

### Task 4: Renda esperada, custo essencial e reserva alvo

**Goal:** Cálculos que adaptam o app ao perfil de renda.

**Files:**
- Create: `app/src/domain/renda.ts`
- Test: `app/src/domain/renda.test.ts`

**Acceptance Criteria:**
- [ ] Fonte `fixa` conta `valorEsperado`; `eventual` conta 0; `variavel` usa o mínimo entre média e mediana dos 3 meses anteriores (sem histórico, usa `valorEsperado`).
- [ ] `reservaAlvoMeses` = 6 se renda fixa ≥ 50% da esperada, senão 12; sem renda esperada = 12.
- [ ] `custoEssencial` = média mensal (dos até 3 meses anteriores + o mês atual, só meses com saída essencial) das saídas em categorias `essencial`, mais parcelas.

**Verify:** `cd app && npx vitest run src/domain/renda.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { rendaEsperada, reservaAlvoMeses, custoEssencial } from './renda'
import type { Categoria, FonteDeRenda, Lancamento } from './tipos'

const fonte = (p: Partial<FonteDeRenda>): FonteDeRenda => ({
  id: 'f', nome: 'F', tipo: 'fixa', valorEsperado: 0, ...p,
})
const ent = (fonteId: string, data: string, valor: number): Lancamento => ({
  id: data + valor, valor, data, tipo: 'entrada', categoriaId: 'r', natureza: 'variavel',
  contaId: 'c', fonteId, status: 'pago',
})

describe('rendaEsperada', () => {
  it('fixa usa valor cadastrado, eventual zero', () => {
    const fontes = [fonte({ id: 'a', valorEsperado: 500000 }), fonte({ id: 'b', tipo: 'eventual', valorEsperado: 90000 })]
    expect(rendaEsperada(fontes, [], '2026-10')).toBe(500000)
  })
  it('variável usa min(média, mediana) dos 3 meses anteriores', () => {
    const fontes = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
    const ls = [ent('v', '2026-07-05', 100000), ent('v', '2026-08-05', 100000), ent('v', '2026-09-05', 400000)]
    // média 200000, mediana 100000 → 100000
    expect(rendaEsperada(fontes, ls, '2026-10')).toBe(100000)
  })
  it('variável sem histórico cai no valor esperado', () => {
    const fontes = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
    expect(rendaEsperada(fontes, [], '2026-10')).toBe(300000)
  })
})

describe('reservaAlvoMeses', () => {
  it('fixa dominante → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 600000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 200000 })])).toBe(6)
  })
  it('variável dominante → 12', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 100000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 400000 })])).toBe(12)
  })
  it('sem fontes → 12', () => expect(reservaAlvoMeses([])).toBe(12))
})

describe('custoEssencial', () => {
  const cats: Categoria[] = [
    { id: 'mor', nome: 'Moradia', icone: 'house', tipo: 'saida', natureza: 'fixo', essencial: true },
    { id: 'laz', nome: 'Lazer', icone: 'film', tipo: 'saida', natureza: 'variavel', essencial: false },
  ]
  const s = (categoriaId: string, data: string, valor: number): Lancamento => ({
    id: categoriaId + data, valor, data, tipo: 'saida', categoriaId, natureza: 'fixo',
    contaId: 'c', status: 'pago',
  })
  it('média das saídas essenciais mais parcelas', () => {
    const ls = [s('mor', '2026-09-01', 100000), s('mor', '2026-10-01', 120000), s('laz', '2026-10-02', 50000)]
    expect(custoEssencial(ls, cats, 30000, '2026-10')).toBe(110000 + 30000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/renda.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { mesDe, mesesAnteriores } from './meses'
import type { Categoria, Centavos, FonteDeRenda, Lancamento, Mes } from './tipos'

const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function rendaEsperada(fontes: FonteDeRenda[], lancs: Lancamento[], mes: Mes): Centavos {
  const anteriores = mesesAnteriores(mes, 3)
  let total = 0
  for (const f of fontes) {
    if (f.tipo === 'fixa') total += f.valorEsperado
    else if (f.tipo === 'variavel') {
      const porMes = anteriores
        .map((m) => lancs.filter((l) => l.fonteId === f.id && l.tipo === 'entrada' && mesDe(l.data) === m))
        .filter((ls) => ls.length > 0)
        .map((ls) => ls.reduce((s, l) => s + l.valor, 0))
      total += porMes.length === 0 ? f.valorEsperado : Math.round(Math.min(media(porMes), mediana(porMes)))
    }
  }
  return total
}

export function reservaAlvoMeses(fontes: FonteDeRenda[]): 6 | 12 {
  const total = fontes.reduce((s, f) => s + (f.tipo === 'eventual' ? 0 : f.valorEsperado), 0)
  if (total === 0) return 12
  const fixa = fontes.filter((f) => f.tipo === 'fixa').reduce((s, f) => s + f.valorEsperado, 0)
  return fixa / total >= 0.5 ? 6 : 12
}

export function custoEssencial(
  lancs: Lancamento[], categorias: Categoria[], parcelas: Centavos, mes: Mes,
): Centavos {
  const essenciais = new Set(categorias.filter((c) => c.essencial).map((c) => c.id))
  const meses = [...mesesAnteriores(mes, 3), mes]
  const totais = meses
    .map((m) =>
      lancs.filter((l) => l.tipo === 'saida' && essenciais.has(l.categoriaId) && mesDe(l.data) === m),
    )
    .filter((ls) => ls.length > 0)
    .map((ls) => ls.reduce((s, l) => s + l.valor, 0))
  const base = totais.length === 0 ? 0 : Math.round(media(totais))
  return base + parcelas
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/domain/renda.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): renda esperada, reserva alvo e custo essencial"
```

---

### Task 5: Recorrência de lançamentos

**Goal:** Gerar automaticamente os lançamentos mensais de despesas/receitas recorrentes até o mês atual.

**Files:**
- Create: `app/src/domain/recorrencia.ts`
- Test: `app/src/domain/recorrencia.test.ts`

**Acceptance Criteria:**
- [ ] Para um modelo com `recorrencia: 'mensal'` em 2026-08-05, com hoje = 2026-10-19, gera cópias em 2026-09-05 e 2026-10-05 com `origemId` do modelo e `status: 'pendente'`.
- [ ] Não duplica: rodar duas vezes sobre o resultado não gera novos itens.
- [ ] Dia 31 em mês curto cai no último dia do mês.

**Verify:** `cd app && npx vitest run src/domain/recorrencia.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { gerarRecorrentes } from './recorrencia'
import type { Lancamento } from './tipos'

const modelo: Lancamento = {
  id: 'm1', valor: 150000, data: '2026-08-05', tipo: 'saida', categoriaId: 'mor',
  natureza: 'fixo', contaId: 'c', status: 'pago', recorrencia: 'mensal',
}
const idGen = (() => { let n = 0; return () => `g${++n}` })()

describe('gerarRecorrentes', () => {
  it('gera meses faltantes como pendentes', () => {
    const novos = gerarRecorrentes([modelo], '2026-10-19', idGen)
    expect(novos.map((n) => n.data)).toEqual(['2026-09-05', '2026-10-05'])
    expect(novos.every((n) => n.origemId === 'm1' && n.status === 'pendente' && !n.recorrencia)).toBe(true)
  })
  it('é idempotente', () => {
    const novos = gerarRecorrentes([modelo], '2026-10-19', idGen)
    expect(gerarRecorrentes([modelo, ...novos], '2026-10-19', idGen)).toEqual([])
  })
  it('ajusta dia 31 em mês curto', () => {
    const m = { ...modelo, data: '2026-01-31' }
    const novos = gerarRecorrentes([m], '2026-02-28', idGen)
    expect(novos.map((n) => n.data)).toEqual(['2026-02-28'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/recorrencia.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { fimDoMes, mesDe } from './meses'
import type { Lancamento, Mes } from './tipos'

function proximoMes(mes: Mes): Mes {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)
}

export function gerarRecorrentes(
  existentes: Lancamento[], hoje: string, novoId: () => string,
): Lancamento[] {
  const mesHoje = mesDe(hoje)
  const novos: Lancamento[] = []
  for (const modelo of existentes.filter((l) => l.recorrencia === 'mensal')) {
    const dia = Number(modelo.data.slice(8, 10))
    let mes = proximoMes(mesDe(modelo.data))
    while (mes <= mesHoje) {
      const jaExiste = existentes.some((l) => l.origemId === modelo.id && mesDe(l.data) === mes)
      if (!jaExiste) {
        const ultimo = Number(fimDoMes(mes).slice(8, 10))
        const data = `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
        const { recorrencia: _r, ...resto } = modelo
        novos.push({ ...resto, id: novoId(), data, status: 'pendente', origemId: modelo.id })
      }
      mes = proximoMes(mes)
    }
  }
  return novos
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/domain/recorrencia.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): geracao de lancamentos recorrentes"
```

---

### Task 6: Gerador de insights

**Goal:** As 8 regras de insight do spec §6, com limites configuráveis e o dado que gerou cada uma.

**Files:**
- Create: `app/src/domain/insights.ts`
- Test: `app/src/domain/insights.test.ts`

**Acceptance Criteria:**
- [ ] Cada regra tem um teste que dispara e um que não dispara.
- [ ] Todo `Insight` traz `id`, `tipo`, `severidade`, `titulo`, `detalhe` (texto com os números) e `dados`.
- [ ] Limites vêm de `CONFIG_INSIGHTS` e podem ser sobrescritos via `ctx.config`.

**Verify:** `cd app && npx vitest run src/domain/insights.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { gerarInsights, type ContextoInsights } from './insights'
import type { Categoria, Conta, Financiamento, FonteDeRenda, Lancamento } from './tipos'

const cat = (id: string, p: Partial<Categoria> = {}): Categoria => ({
  id, nome: id, icone: 'x', tipo: 'saida', natureza: 'variavel', essencial: false, ...p,
})
const conta: Conta = { id: 'c', nome: 'B', tipo: 'banco', saldoInicial: 0 }
const sai = (categoriaId: string, data: string, valor: number, natureza: 'fixo' | 'variavel' = 'variavel'): Lancamento => ({
  id: categoriaId + data + valor, valor, data, tipo: 'saida', categoriaId, natureza, contaId: 'c', status: 'pago',
})
const ent = (data: string, valor: number, fonteId = 'f1'): Lancamento => ({
  id: 'e' + data + valor, valor, data, tipo: 'entrada', categoriaId: 'sal', natureza: 'fixo',
  contaId: 'c', fonteId, status: 'pago',
})
const fonteFixa: FonteDeRenda = { id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 500000 }
const base = (p: Partial<ContextoInsights>): ContextoInsights => ({
  mes: '2026-10', lancamentos: [], categorias: [cat('mer'), cat('alu', { natureza: 'fixo', essencial: true })],
  fontes: [fonteFixa], financiamentos: [], planos: [], contas: [conta], ...p,
})
const tipos = (c: ContextoInsights) => gerarInsights(c).map((i) => i.tipo)

describe('gasto_crescendo', () => {
  const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
  it('dispara com +30%', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-03', 130000)] }))).toContain('gasto_crescendo'))
  it('não dispara com +10%', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-03', 110000)] }))).not.toContain('gasto_crescendo'))
})

describe('pico_atipico', () => {
  const hist = ['01', '02', '03', '04'].map((d) => sai('mer', `2026-09-${d}`, 10000))
  it('dispara acima de 3x a mediana', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-05', 40000)] }))).toContain('pico_atipico'))
  it('não dispara em valor comum', () =>
    expect(tipos(base({ lancamentos: [...hist, sai('mer', '2026-10-05', 12000)] }))).not.toContain('pico_atipico'))
})

describe('despesa_fixa_alta', () => {
  it('dispara quando fixo passa de 5% da renda', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('despesa_fixa_alta'))
  it('não dispara quando é pequena', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 10000, 'fixo')] }))).not.toContain('despesa_fixa_alta'))
})

describe('reserva_baixa', () => {
  const ls = [sai('alu', '2026-10-05', 200000, 'fixo')]
  it('dispara com saldo abaixo da meta', () =>
    expect(tipos(base({ lancamentos: [ent('2026-10-01', 500000), ...ls] }))).toContain('reserva_baixa'))
  it('não dispara com saldo acima da meta', () => {
    const c = base({ lancamentos: ls, contas: [{ ...conta, saldoInicial: 5000000 }] })
    expect(tipos(c)).not.toContain('reserva_baixa')
  })
})

describe('financiamentos', () => {
  const f = (id: string, taxa: number): Financiamento => ({
    id, nome: id, saldoDevedor: 1200000, taxaMensal: taxa, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5,
  })
  it('divida_mais_cara só com 2 ou mais', () => {
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('divida_mais_cara')
    expect(tipos(base({ financiamentos: [f('a', 0.01), f('b', 0.02)] }))).toContain('divida_mais_cara')
  })
  it('comprometimento_renda dispara acima de 30%', () => {
    const grande = { ...f('a', 0.01), saldoDevedor: 24000000 }
    expect(tipos(base({ financiamentos: [grande] }))).toContain('comprometimento_renda')
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('comprometimento_renda')
  })
  it('sobra_para_divida com sobra positiva e reserva no alvo', () => {
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [ent('2026-10-01', 500000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    expect(tipos(c)).toContain('sobra_para_divida')
  })
})

describe('mes_de_risco', () => {
  const fontes: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 300000 }]
  it('dispara quando receita < esperado e fixos não cobertos', () =>
    expect(tipos(base({ fontes, lancamentos: [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('mes_de_risco'))
  it('não dispara sem renda variável', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco'))
})

describe('config', () => {
  it('limite pode ser sobrescrito', () => {
    const hist = [sai('mer', '2026-07-03', 100000), sai('mer', '2026-08-03', 100000), sai('mer', '2026-09-03', 100000)]
    const c = base({ lancamentos: [...hist, sai('mer', '2026-10-03', 110000)], config: { crescimentoMinimo: 0.05 } })
    expect(tipos(c)).toContain('gasto_crescendo')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/insights.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { simularAporte } from './amortizacao'
import { parcelaDoMes, resumoMes, saldoContas } from './fluxo'
import { formatarBRL } from './dinheiro'
import { mesDe, mesesAnteriores } from './meses'
import { custoEssencial, rendaEsperada, reservaAlvoMeses } from './renda'
import type {
  Categoria, Conta, Financiamento, FonteDeRenda, Lancamento, Mes, PlanoAmortizacao,
} from './tipos'

export const CONFIG_INSIGHTS = {
  crescimentoMinimo: 0.2,
  pisoCrescimento: 5000,
  picoFator: 3,
  picoMinimoAmostras: 4,
  fixoPctRenda: 0.05,
  comprometimentoMax: 0.3,
}

export interface Insight {
  id: string
  tipo:
    | 'gasto_crescendo' | 'pico_atipico' | 'despesa_fixa_alta' | 'reserva_baixa'
    | 'sobra_para_divida' | 'divida_mais_cara' | 'mes_de_risco' | 'comprometimento_renda'
  severidade: 'info' | 'alerta'
  titulo: string
  detalhe: string
  dados: Record<string, number | string>
}

export interface ContextoInsights {
  mes: Mes
  lancamentos: Lancamento[]
  categorias: Categoria[]
  fontes: FonteDeRenda[]
  financiamentos: Financiamento[]
  planos: PlanoAmortizacao[]
  contas: Conta[]
  config?: Partial<typeof CONFIG_INSIGHTS>
}

const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function gerarInsights(ctx: ContextoInsights): Insight[] {
  const cfg = { ...CONFIG_INSIGHTS, ...ctx.config }
  const out: Insight[] = []
  const nomeCat = (id: string) => ctx.categorias.find((c) => c.id === id)?.nome ?? id
  const saidas = ctx.lancamentos.filter((l) => l.tipo === 'saida')
  const doMes = saidas.filter((l) => mesDe(l.data) === ctx.mes)
  const anteriores = mesesAnteriores(ctx.mes, 3)
  const renda = rendaEsperada(ctx.fontes, ctx.lancamentos, ctx.mes)
  const parcelas = ctx.financiamentos.reduce((s, f) => s + parcelaDoMes(f), 0)

  // 1. gasto crescendo
  for (const catId of new Set(doMes.map((l) => l.categoriaId))) {
    const atual = soma(doMes.filter((l) => l.categoriaId === catId))
    const hist = anteriores
      .map((m) => soma(saidas.filter((l) => l.categoriaId === catId && mesDe(l.data) === m)))
      .filter((v) => v > 0)
    if (hist.length === 0) continue
    const media = hist.reduce((s, v) => s + v, 0) / hist.length
    if (atual > media * (1 + cfg.crescimentoMinimo) && atual - media >= cfg.pisoCrescimento) {
      const pct = Math.round(((atual - media) / media) * 100)
      out.push({
        id: `crescendo-${catId}`, tipo: 'gasto_crescendo', severidade: 'alerta',
        titulo: `${nomeCat(catId)} subiu ${pct}%`,
        detalhe: `Este mês: ${formatarBRL(atual)}. Média dos meses anteriores: ${formatarBRL(Math.round(media))}.`,
        dados: { categoria: catId, atual, media: Math.round(media) },
      })
    }
  }

  // 2. pico atípico
  for (const l of doMes) {
    const amostra = saidas.filter((x) => x.categoriaId === l.categoriaId && x.id !== l.id).map((x) => x.valor)
    if (amostra.length < cfg.picoMinimoAmostras) continue
    const med = mediana(amostra)
    if (l.valor > med * cfg.picoFator) {
      out.push({
        id: `pico-${l.id}`, tipo: 'pico_atipico', severidade: 'info',
        titulo: `Gasto fora do padrão em ${nomeCat(l.categoriaId)}`,
        detalhe: `${formatarBRL(l.valor)} em ${l.data}; o comum nessa categoria é ${formatarBRL(Math.round(med))}.`,
        dados: { lancamento: l.id, valor: l.valor, mediana: Math.round(med) },
      })
    }
  }

  // 3. despesa fixa alta
  if (renda > 0) {
    const fixas = doMes.filter((l) => l.natureza === 'fixo')
    for (const catId of new Set(fixas.map((l) => l.categoriaId))) {
      const total = soma(fixas.filter((l) => l.categoriaId === catId))
      if (total > renda * cfg.fixoPctRenda) {
        out.push({
          id: `fixa-${catId}`, tipo: 'despesa_fixa_alta', severidade: 'info',
          titulo: `${nomeCat(catId)} pesa ${Math.round((total / renda) * 100)}% da renda`,
          detalhe: `${formatarBRL(total)} por mês. Vale renegociar ou comparar preços.`,
          dados: { categoria: catId, total, renda },
        })
      }
    }
  }

  // 4. reserva baixa
  const saldo = saldoContas(ctx.contas, ctx.lancamentos)
  const essencial = custoEssencial(ctx.lancamentos, ctx.categorias, parcelas, ctx.mes)
  const meses = reservaAlvoMeses(ctx.fontes)
  const meta = essencial * meses
  const reservaOk = essencial > 0 && saldo >= meta
  if (essencial > 0 && saldo < meta) {
    const cobertos = Math.max(0, saldo / essencial)
    out.push({
      id: 'reserva-baixa', tipo: 'reserva_baixa', severidade: 'alerta',
      titulo: 'Reserva abaixo da meta',
      detalhe: `Você cobre ${cobertos.toFixed(1)} de ${meses} meses de custo essencial. Faltam ${formatarBRL(meta - saldo)}.`,
      dados: { saldo, meta, meses },
    })
  }

  // 5. sobra para a dívida / 6. dívida mais cara
  const maisCara = [...ctx.financiamentos].sort((a, b) => b.taxaMensal - a.taxaMensal)[0]
  const resumo = resumoMes({
    mes: ctx.mes, contas: ctx.contas, lancamentos: ctx.lancamentos,
    financiamentos: ctx.financiamentos, aporteExtra: 0,
  })
  if (maisCara && resumo.sobraNormal > 0) {
    const aporte = reservaOk ? resumo.sobraNormal : Math.round(resumo.sobraNormal / 2)
    const sim = simularAporte({
      saldo: maisCara.saldoDevedor, taxa: maisCara.taxaMensal, prazo: maisCara.prazoRestante,
      sistema: maisCara.sistema, aporte, efeito: 'reduzir_prazo',
    })
    out.push({
      id: 'sobra-divida', tipo: 'sobra_para_divida', severidade: 'info',
      titulo: reservaOk ? 'Use a sobra para quitar mais rápido' : 'Divida a sobra entre reserva e dívida',
      detalhe: `Um aporte de ${formatarBRL(aporte)}/mês em ${maisCara.nome} economiza ${formatarBRL(sim.economiaJuros)} em juros e ${sim.mesesEconomizados} meses.`,
      dados: { financiamento: maisCara.id, aporte, economia: sim.economiaJuros },
    })
  }
  if (ctx.financiamentos.length > 1 && maisCara) {
    out.push({
      id: 'divida-cara', tipo: 'divida_mais_cara', severidade: 'info',
      titulo: `Priorize ${maisCara.nome}`,
      detalhe: `Maior taxa entre as dívidas: ${(maisCara.taxaMensal * 100).toFixed(2)}% ao mês.`,
      dados: { financiamento: maisCara.id, taxa: maisCara.taxaMensal },
    })
  }

  // 7. mês de risco (renda variável/eventual)
  const temVariavel = ctx.fontes.some((f) => f.tipo !== 'fixa')
  const recebido = soma(
    ctx.lancamentos.filter((l) => l.tipo === 'entrada' && l.status === 'pago' && mesDe(l.data) === ctx.mes),
  )
  const fixosMes = soma(doMes.filter((l) => l.natureza === 'fixo')) + parcelas
  if (temVariavel && renda > 0 && recebido < renda && fixosMes > recebido) {
    out.push({
      id: 'mes-risco', tipo: 'mes_de_risco', severidade: 'alerta',
      titulo: 'Mês de risco: fixos ainda não cobertos',
      detalhe: `Recebido ${formatarBRL(recebido)} de ${formatarBRL(renda)} esperados; custos fixos somam ${formatarBRL(fixosMes)}.`,
      dados: { recebido, renda, fixos: fixosMes },
    })
  }

  // 8. comprometimento de renda
  if (renda > 0 && parcelas / renda > cfg.comprometimentoMax) {
    out.push({
      id: 'comprometimento', tipo: 'comprometimento_renda', severidade: 'alerta',
      titulo: `Parcelas consomem ${Math.round((parcelas / renda) * 100)}% da renda`,
      detalhe: `${formatarBRL(parcelas)} de ${formatarBRL(renda)} esperados. O limite saudável é ${Math.round(cfg.comprometimentoMax * 100)}%.`,
      dados: { parcelas, renda },
    })
  }

  return out.sort((a, b) => Number(b.severidade === 'alerta') - Number(a.severidade === 'alerta'))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/insights.test.ts`
Expected: PASS. Se algum teste de regra falhar por valores de fixture, ajustar a fixture (não afrouxar a regra) e registrar o motivo no commit.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): gerador de insights por regras"
```

---

### Task 7: Camada de dados (Dexie, seed e backup)

**Goal:** Persistência local com repositório, categorias padrão e exportar/importar JSON.

**Files:**
- Create: `app/src/data/db.ts`, `app/src/data/repo.ts`, `app/src/data/seed.ts`, `app/src/data/backup.ts`
- Test: `app/src/data/repo.test.ts`, `app/src/data/backup.test.ts`

**Acceptance Criteria:**
- [ ] `salvar` + `listar` de cada entidade funciona; `remover` apaga.
- [ ] `semearCategorias` insere as categorias padrão uma única vez (idempotente).
- [ ] `exportar()` → `importar()` em banco vazio reproduz os mesmos dados; JSON inválido ou `versao` diferente é rejeitado com erro legível.

**Verify:** `cd app && npx vitest run src/data` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

`repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { semearCategorias, CATEGORIAS_PADRAO } from './seed'

beforeEach(async () => { await db.delete(); await db.open() })

describe('repo', () => {
  it('salva, lista e remove contas', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 })
    expect(await repo.contas.listar()).toHaveLength(1)
    await repo.contas.remover('c1')
    expect(await repo.contas.listar()).toHaveLength(0)
  })
})

describe('seed', () => {
  it('é idempotente', async () => {
    await semearCategorias()
    await semearCategorias()
    expect(await repo.categorias.listar()).toHaveLength(CATEGORIAS_PADRAO.length)
  })
})
```

`backup.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { exportar, importar } from './backup'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup', () => {
  it('exporta e importa', async () => {
    await repo.contas.salvar({ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 })
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(await repo.contas.listar()).toEqual([{ id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000 }])
  })
  it('rejeita JSON inválido e versão desconhecida', async () => {
    await expect(importar('não é json')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 99 }))).rejects.toThrow('Versão de backup não suportada')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/data` → FAIL

- [ ] **Step 3: Implementar**

`db.ts`:

```ts
import Dexie, { type Table } from 'dexie'
import type {
  Categoria, Conta, Financiamento, FonteDeRenda, Lancamento, PlanoAmortizacao,
} from '../domain/tipos'

class FinancasDB extends Dexie {
  contas!: Table<Conta, string>
  fontes!: Table<FonteDeRenda, string>
  categorias!: Table<Categoria, string>
  lancamentos!: Table<Lancamento, string>
  financiamentos!: Table<Financiamento, string>
  planos!: Table<PlanoAmortizacao, string>

  constructor() {
    super('financas')
    this.version(1).stores({
      contas: 'id',
      fontes: 'id',
      categorias: 'id',
      lancamentos: 'id, data, contaId, categoriaId, origemId',
      financiamentos: 'id',
      planos: 'id, financiamentoId',
    })
  }
}

export const db = new FinancasDB()
```

`repo.ts`:

```ts
import type { Table } from 'dexie'
import { db } from './db'

function criar<T extends { id: string }>(t: Table<T, string>) {
  return {
    listar: () => t.toArray(),
    obter: (id: string) => t.get(id),
    salvar: async (x: T) => { await t.put(x) },
    remover: (id: string) => t.delete(id),
  }
}

export const repo = {
  contas: criar(db.contas),
  fontes: criar(db.fontes),
  categorias: criar(db.categorias),
  lancamentos: criar(db.lancamentos),
  financiamentos: criar(db.financiamentos),
  planos: criar(db.planos),
}

export const novoId = () => crypto.randomUUID()
```

`seed.ts`:

```ts
import type { Categoria } from '../domain/tipos'
import { db } from './db'

const s = (id: string, nome: string, icone: string, natureza: 'fixo' | 'variavel', essencial: boolean): Categoria =>
  ({ id, nome, icone, tipo: 'saida', natureza, essencial })
const e = (id: string, nome: string, icone: string): Categoria =>
  ({ id, nome, icone, tipo: 'entrada', natureza: 'variavel', essencial: false })

export const CATEGORIAS_PADRAO: Categoria[] = [
  s('moradia', 'Moradia', 'House', 'fixo', true),
  s('alimentacao', 'Alimentação', 'ForkKnife', 'variavel', true),
  s('mercado', 'Mercado', 'ShoppingCart', 'variavel', true),
  s('veiculo', 'Veículo / Combustível', 'GasPump', 'variavel', true),
  s('transporte', 'Transporte', 'Bus', 'variavel', true),
  s('saude', 'Saúde', 'Heartbeat', 'variavel', true),
  s('contas', 'Contas (luz, água, internet)', 'Lightning', 'fixo', true),
  s('educacao', 'Educação', 'GraduationCap', 'fixo', false),
  s('lazer', 'Lazer', 'FilmSlate', 'variavel', false),
  s('compras', 'Compras', 'Bag', 'variavel', false),
  s('investimentos', 'Investimentos', 'ChartLineUp', 'variavel', false),
  s('outros', 'Outros', 'DotsThree', 'variavel', false),
  e('salario', 'Salário', 'Wallet'),
  e('vendas', 'Vendas', 'Storefront'),
  e('extras', 'Extras e bicos', 'Hammer'),
  e('rendimentos', 'Rendimentos', 'TrendUp'),
]

export async function semearCategorias(): Promise<void> {
  if ((await db.categorias.count()) === 0) await db.categorias.bulkPut(CATEGORIAS_PADRAO)
}
```

`backup.ts`:

```ts
import { db } from './db'

const VERSAO = 1
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

export async function exportar(): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  for (const t of TABELAS) dados[t] = await db[t].toArray()
  return JSON.stringify(dados)
}

export async function importar(json: string): Promise<void> {
  let dados: Record<string, unknown>
  try { dados = JSON.parse(json) } catch { throw new Error('Arquivo de backup inválido') }
  if (typeof dados !== 'object' || dados === null) throw new Error('Arquivo de backup inválido')
  if (dados.versao !== VERSAO) throw new Error('Versão de backup não suportada')
  await db.transaction('rw', TABELAS.map((t) => db[t]), async () => {
    for (const t of TABELAS) {
      await db[t].clear()
      await db[t].bulkPut((dados[t] as never[]) ?? [])
    }
  })
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/data` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/data && git commit -m "feat(data): dexie, repositorio, seed de categorias e backup JSON"
```

---

### Task 8: Tema, componentes base e shell do app

**Goal:** Tokens visuais, componentes `Moldura`/`Cartao`/`SeletorMes`/`Fab`/`Drawer`, rotas e hook de dados.

**Files:**
- Create: `app/src/ui/tema.css`, `app/src/ui/componentes/Moldura.tsx`, `SeletorMes.tsx`, `Fab.tsx`, `Drawer.tsx`, `app/src/ui/hooks/useDados.ts`
- Modify: `app/src/index.css`, `app/src/main.tsx`, `app/src/App.tsx`, `app/index.html`

**Acceptance Criteria:**
- [ ] App abre com cabeçalho (menu, seletor de mês) e FAB; menu abre o drawer com as entradas do spec §7 (exceto Orçamento/Gráficos).
- [ ] Tema claro e escuro seguem `prefers-color-scheme` com os hex do spec §8.
- [ ] `npm run build` passa; sem erros no console ao abrir.

**Verify:** `cd app && npm run build` → sucesso; abrir `npm run dev` e conferir o shell no navegador (390×844)

**Steps:**

- [ ] **Step 1: Tokens (`tema.css`) e importação de fontes**

`app/src/ui/tema.css`:

```css
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/600.css';
@import '@fontsource/plus-jakarta-sans/800.css';
@import '@fontsource/geist-mono/500.css';

:root {
  --papel: #f4f5f2;
  --superficie: #ffffff;
  --tinta: #14201c;
  --tinta-suave: #5d6b66;
  --marca: #0f5c4a;
  --positivo: #2fa87a;
  --negativo: #d9534f;
  --alerta: #e39a2d;
  --divida: #2a6f86;
  --casca: rgba(20, 32, 28, 0.05);
  --linha: rgba(20, 32, 28, 0.08);
  --sombra: 0 24px 48px -24px rgba(20, 32, 28, 0.18);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
}
@media (prefers-color-scheme: dark) {
  :root {
    --papel: #0b100e;
    --superficie: #131b18;
    --tinta: #eef2ef;
    --tinta-suave: #98a8a1;
    --marca: #3fbf99;
    --casca: rgba(255, 255, 255, 0.05);
    --linha: rgba(255, 255, 255, 0.1);
    --sombra: 0 24px 48px -24px rgba(0, 0, 0, 0.6);
  }
}
```

`app/src/index.css`:

```css
@import 'tailwindcss';
@import './ui/tema.css';

@theme {
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --color-papel: var(--papel);
  --color-superficie: var(--superficie);
  --color-tinta: var(--tinta);
  --color-suave: var(--tinta-suave);
  --color-marca: var(--marca);
  --color-positivo: var(--positivo);
  --color-negativo: var(--negativo);
  --color-alerta: var(--alerta);
  --color-divida: var(--divida);
}

html, body, #root { min-height: 100dvh; }
body {
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
.valor { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 2: Componentes base**

`Moldura.tsx` (dupla moldura):

```tsx
import type { ReactNode } from 'react'

export function Moldura({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2rem] p-1.5 ring-1 ring-[var(--linha)] bg-[var(--casca)] ${className}`}>
      <div
        className="rounded-[calc(2rem-0.375rem)] bg-[var(--superficie)] p-5"
        style={{ boxShadow: 'var(--sombra), inset 0 1px 1px rgba(255,255,255,0.25)' }}
      >
        {children}
      </div>
    </div>
  )
}
```

`SeletorMes.tsx`:

```tsx
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { mesAnterior } from '../../domain/meses'

const NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function SeletorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  const [ano, m] = mes.split('-').map(Number)
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Mês anterior" className="size-11 grid place-items-center rounded-full active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
        onClick={() => onChange(mesAnterior(mes, 1))}>
        <CaretLeft size={20} weight="light" />
      </button>
      <span className="min-w-32 text-center font-semibold">{NOMES[m - 1]} <span className="text-suave font-normal">{ano}</span></span>
      <button aria-label="Próximo mês" className="size-11 grid place-items-center rounded-full active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
        onClick={() => onChange(mesAnterior(mes, -1))}>
        <CaretRight size={20} weight="light" />
      </button>
    </div>
  )
}
```

`Fab.tsx`:

```tsx
import { Plus } from '@phosphor-icons/react'

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Novo lançamento" onClick={onClick}
      className="fixed bottom-6 right-5 size-14 rounded-full bg-marca text-[var(--papel)] grid place-items-center active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
      style={{ boxShadow: '0 16px 32px -12px rgba(15,92,74,0.55)' }}>
      <Plus size={26} weight="light" />
    </button>
  )
}
```

`Drawer.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { House, Bank, Receipt, Scales, Lightbulb, Tag, Briefcase, FloppyDisk } from '@phosphor-icons/react'

const ITENS = [
  { para: '/', rotulo: 'Resumo', Icone: House },
  { para: '/contas', rotulo: 'Contas', Icone: Bank },
  { para: '/lancamentos', rotulo: 'Lançamentos', Icone: Receipt },
  { para: '/dividas', rotulo: 'Dívidas', Icone: Scales },
  { secao: 'Analisar' },
  { para: '/insights', rotulo: 'Insights e reserva', Icone: Lightbulb },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tag },
  { secao: 'Configurar' },
  { para: '/fontes', rotulo: 'Fontes de renda', Icone: Briefcase },
  { para: '/backup', rotulo: 'Backup', Icone: FloppyDisk },
] as const

export function Drawer({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  return (
    <>
      <div onClick={fechar} aria-hidden
        className={`fixed inset-0 bg-black/40 transition-opacity duration-500 ease-[var(--ease)] ${aberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <nav aria-label="Menu" inert={!aberto}
        className={`fixed inset-y-0 left-0 w-[82%] max-w-80 bg-[var(--superficie)] p-4 pt-8 transition-transform duration-500 ease-[var(--ease)] ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <ul className="grid gap-1">
          {ITENS.map((it, i) =>
            'secao' in it ? (
              <li key={i} className="mt-5 mb-1 px-3 text-[10px] uppercase tracking-[0.2em] text-suave">{it.secao}</li>
            ) : (
              <li key={it.para}>
                <NavLink to={it.para} end={it.para === '/'} onClick={fechar}
                  className={({ isActive }) => `flex items-center gap-3 rounded-full px-4 min-h-12 ${isActive ? 'bg-[var(--casca)] text-marca font-semibold' : ''}`}>
                  <it.Icone size={22} weight="light" /> {it.rotulo}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </>
  )
}
```

- [ ] **Step 3: Hook de dados e shell**

`useDados.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'

export function useDados() {
  const contas = useLiveQuery(() => db.contas.toArray())
  const fontes = useLiveQuery(() => db.fontes.toArray())
  const categorias = useLiveQuery(() => db.categorias.toArray())
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray())
  const financiamentos = useLiveQuery(() => db.financiamentos.toArray())
  const planos = useLiveQuery(() => db.planos.toArray())
  const pronto = [contas, fontes, categorias, lancamentos, financiamentos, planos].every((x) => x !== undefined)
  return {
    pronto,
    contas: contas ?? [], fontes: fontes ?? [], categorias: categorias ?? [],
    lancamentos: lancamentos ?? [], financiamentos: financiamentos ?? [], planos: planos ?? [],
  }
}
```

`App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { List } from '@phosphor-icons/react'
import { Drawer } from './ui/componentes/Drawer'
import { Fab } from './ui/componentes/Fab'
import { SeletorMes } from './ui/componentes/SeletorMes'
import { useDados } from './ui/hooks/useDados'
import { semearCategorias } from './data/seed'
import { repo, novoId } from './data/repo'
import { gerarRecorrentes } from './domain/recorrencia'
import { mesDe } from './domain/meses'

const hoje = () => new Date().toISOString().slice(0, 10)

function Shell() {
  const [aberto, setAberto] = useState(false)
  const [mes, setMes] = useState(mesDe(hoje()))
  const [lancando, setLancando] = useState(false)
  const dados = useDados()
  const nav = useNavigate()

  useEffect(() => { semearCategorias() }, [])
  useEffect(() => {
    if (!dados.pronto) return
    gerarRecorrentes(dados.lancamentos, hoje(), novoId).forEach((l) => repo.lancamentos.salvar(l))
  }, [dados.pronto]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados.pronto) return null
  // Telas são plugadas nas tarefas 9–12; rotas já declaradas aqui apontam para elas.
  return (
    <div className="mx-auto max-w-md min-h-[100dvh] px-4 pb-28">
      <header className="flex items-center justify-between pt-4 pb-3">
        <button aria-label="Abrir menu" className="size-11 grid place-items-center" onClick={() => setAberto(true)}>
          <List size={26} weight="light" />
        </button>
        <SeletorMes mes={mes} onChange={setMes} />
        <span className="size-11" />
      </header>
      <Routes>
        <Route path="*" element={<div>Em construção</div>} />
      </Routes>
      <Fab onClick={() => setLancando(true)} />
      <Drawer aberto={aberto} fechar={() => setAberto(false)} />
      {lancando && null}
      {void nav}
    </div>
  )
}

export default function App() {
  return <HashRouter><Shell /></HashRouter>
}
```

(`lancando` e `nav` são conectados na Task 10 e Task 9; manter como está até lá.)

`main.tsx` importa `./index.css`. `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#0F5C4A">`, `lang="pt-BR"`, título "Finanças Pessoais".

- [ ] **Step 4: Verificar**

Run: `npm run build` → sucesso. Rodar `npm run dev`, abrir no navegador em 390×844: menu abre/fecha com animação, seletor de mês troca, FAB visível, tema acompanha o sistema, console sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): tema, componentes base, drawer e shell"
```

---

### Task 9: Tela Resumo com o anel da sobra

**Goal:** Home com seletor de mês, anel da sobra (assinatura), trio Inicial/Saldo/Previsto, pendências com saldo seguro, visão geral, insights e últimos lançamentos.

**Files:**
- Create: `app/src/ui/componentes/SobraRing.tsx`, `app/src/ui/telas/Resumo.tsx`, `app/src/ui/hooks/useResumo.ts`, `app/src/ui/componentes/ChecklistInicial.tsx`, `app/src/ui/hooks/usePreferencias.ts`, `app/src/ui/telas/ordemCartoes.ts`, `app/src/domain/categorias.ts`, `app/src/domain/reserva.ts`
- Test: `app/src/ui/telas/ordemCartoes.test.ts`, `app/src/domain/categorias.test.ts`, `app/src/domain/reserva.test.ts`
- Modify: `app/src/App.tsx` (rota `/`, passa `mes`)

**Acceptance Criteria:**
- [ ] Anel mostra arco verde (sobra otimizada), arco azul-petróleo (aporte) e trilho; sobra normal ≤ 0 mostra anel coral com valor negativo.
- [ ] Valores vêm de `resumoMes`; Saldo seguro e pendências refletem lançamentos `pendente`.
- [ ] Até 3 insights aparecem com título e detalhe; vazio mostra "Sem alertas este mês".
- [ ] Sem dados, mostra estado vazio com convite "Registre seu primeiro lançamento".
- [ ] Cartão "Vamos começar" (checklist de 4 passos: conta, primeiro gasto, renda, financiamento) aparece enquanto houver passo pendente e não tiver sido fechado; "Não tenho financiamento" conclui o 4º passo.
- [ ] Ordem e presença dos cartões seguem os objetivos do onboarding (`ordemCartoes`): `contas_em_dia` coloca Pendências primeiro; `destino` adiciona "Para onde foi o dinheiro" (top 3 categorias); `meta` adiciona o cartão de Reserva.
- [ ] `topCategorias` e `statusReserva` têm testes e valores conferidos à mão.

**Verify:** `cd app && npm run build` e conferência visual no navegador com dados de teste (criar 3–4 lançamentos pelo console: `indexedDB` ou pela Task 10)

**Steps:**

- [ ] **Step 1: `SobraRing.tsx`**

```tsx
import { formatarBRL } from '../../domain/dinheiro'
import type { Centavos } from '../../domain/tipos'

const R = 52

function Arco({ inicio, pct, cor }: { inicio: number; pct: number; cor: string }) {
  if (pct <= 0) return null
  return (
    <circle cx="60" cy="60" r={R} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round"
      pathLength={100} strokeDasharray={`${Math.max(pct - 1.5, 0.5)} ${100 - Math.max(pct - 1.5, 0.5)}`}
      strokeDashoffset={-inicio} transform="rotate(-90 60 60)"
      style={{ transition: 'stroke-dasharray 900ms var(--ease)' }} />
  )
}

export function SobraRing({ normal, otimizada, aporte }: { normal: Centavos; otimizada: Centavos; aporte: Centavos }) {
  const negativa = normal <= 0
  const base = Math.max(normal, 1)
  const pctOtima = negativa ? 100 : Math.max(0, Math.min(100, (Math.max(otimizada, 0) / base) * 100))
  const pctAporte = negativa ? 0 : Math.max(0, Math.min(100 - pctOtima, (aporte / base) * 100))
  return (
    <div className="relative mx-auto size-56" role="img"
      aria-label={`Sobra normal ${formatarBRL(normal)}, sobra otimizada ${formatarBRL(otimizada)}, aporte ${formatarBRL(aporte)}`}>
      <svg viewBox="0 0 120 120" className="size-full">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--linha)" strokeWidth="10" />
        {negativa ? (
          <Arco inicio={0} pct={100} cor="var(--negativo)" />
        ) : (
          <>
            <Arco inicio={0} pct={pctOtima} cor="var(--positivo)" />
            <Arco inicio={pctOtima} pct={pctAporte} cor="var(--divida)" />
          </>
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-suave">Sobra normal</span>
        <span className={`valor text-2xl font-medium ${negativa ? 'text-negativo' : ''}`}>{formatarBRL(normal)}</span>
        <span className="mt-1 text-xs text-suave">
          otimizada <span className="valor text-tinta">{formatarBRL(otimizada)}</span>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `useResumo.ts`**

```ts
import { useMemo } from 'react'
import { resumoMes } from '../../domain/fluxo'
import { gerarInsights } from '../../domain/insights'
import type { Mes } from '../../domain/tipos'
import { useDados } from './useDados'

export function useResumo(mes: Mes) {
  const d = useDados()
  return useMemo(() => {
    const aporte = d.planos.reduce((s, p) => s + p.aporteExtraMensal, 0)
    const resumo = resumoMes({
      mes, contas: d.contas, lancamentos: d.lancamentos, financiamentos: d.financiamentos, aporteExtra: aporte,
    })
    const insights = gerarInsights({ mes, ...d })
    return { ...d, aporte, resumo, insights }
  }, [mes, d.contas, d.lancamentos, d.financiamentos, d.planos, d.fontes, d.categorias]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 3: `Resumo.tsx`**

Estrutura (todos os cartões usam `Moldura`; valores com classe `valor`; entrada `text-positivo` com prefixo `+`, saída `text-negativo` com prefixo `−`, pendente `text-alerta`):

```tsx
import { Link } from 'react-router-dom'
import { Moldura } from '../componentes/Moldura'
import { SobraRing } from '../componentes/SobraRing'
import { useResumo } from '../hooks/useResumo'
import { formatarBRL } from '../../domain/dinheiro'
import { mesDe } from '../../domain/meses'
import type { Mes } from '../../domain/tipos'

const Linha = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) => (
  <div className="flex items-baseline justify-between py-2">
    <span className="text-suave">{rotulo}</span>
    <span className={`valor ${cor ?? ''}`}>{valor}</span>
  </div>
)

export default function Resumo({ mes, abrirLancamento }: { mes: Mes; abrirLancamento: () => void }) {
  const { resumo: r, aporte, insights, lancamentos, categorias } = useResumo(mes)
  const doMes = lancamentos.filter((l) => mesDe(l.data) === mes)
  const nomeCat = (id: string) => categorias.find((c) => c.id === id)?.nome ?? ''
  const ultimos = [...doMes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)

  if (lancamentos.length === 0)
    return (
      <Moldura>
        <h2 className="text-xl font-semibold">Comece pelo primeiro lançamento</h2>
        <p className="mt-2 text-suave">Registre uma entrada ou saída para ver sua sobra do mês.</p>
        <button onClick={abrirLancamento} className="mt-4 min-h-12 rounded-full bg-marca px-6 font-semibold text-[var(--papel)]">
          Registrar lançamento
        </button>
      </Moldura>
    )

  return (
    <div className="grid gap-5">
      <Moldura>
        <SobraRing normal={r.sobraNormal} otimizada={r.sobraOtimizada} aporte={aporte} />
        <div className="mt-4 grid grid-cols-3 text-center text-sm">
          <div><div className="text-suave">Inicial</div><div className="valor">{formatarBRL(r.inicial)}</div></div>
          <div><div className="text-suave">Saldo</div><div className="valor font-semibold">{formatarBRL(r.saldo)}</div></div>
          <div><div className="text-suave">Previsto</div><div className="valor">{formatarBRL(r.previsto)}</div></div>
        </div>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Pendências</h3>
        <Linha rotulo="Receitas pendentes" valor={`+ ${formatarBRL(r.receitasPendentes)}`} cor="text-alerta" />
        <Linha rotulo="Despesas pendentes" valor={`− ${formatarBRL(r.despesasPendentes)}`} cor="text-alerta" />
        <div className="mt-1 border-t border-[var(--linha)] pt-2">
          <Linha rotulo="Saldo seguro" valor={formatarBRL(r.saldoSeguro)} />
          <p className="text-xs text-suave">Saldo das contas menos as despesas pendentes.</p>
        </div>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Visão geral</h3>
        <Linha rotulo="Receitas" valor={`+ ${formatarBRL(r.receitas)}`} cor="text-positivo" />
        <Linha rotulo="Despesas" valor={`− ${formatarBRL(r.despesas)}`} cor="text-negativo" />
        <Linha rotulo="Financiamentos" valor={`− ${formatarBRL(r.parcelas)}`} cor="text-divida" />
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Insights</h3>
        {insights.length === 0 && <p className="mt-2 text-suave">Sem alertas este mês.</p>}
        <ul className="mt-2 grid gap-3">
          {insights.slice(0, 3).map((i) => (
            <li key={i.id}>
              <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-alerta' : ''}`}>{i.titulo}</div>
              <div className="text-sm text-suave">{i.detalhe}</div>
            </li>
          ))}
        </ul>
        <Link to="/insights" className="mt-3 inline-block text-marca font-semibold">Ver todos</Link>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Últimos lançamentos</h3>
        <ul className="mt-2 divide-y divide-[var(--linha)]">
          {ultimos.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-3">
              <div>
                <div>{nomeCat(l.categoriaId)}</div>
                <div className="text-xs text-suave">{l.data.slice(8)}/{l.data.slice(5, 7)}{l.status === 'pendente' ? ' · pendente' : ''}</div>
              </div>
              <span className={`valor ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
              </span>
            </li>
          ))}
        </ul>
      </Moldura>
    </div>
  )
}
```

Em `App.tsx`, trocar o `Routes` por `<Route path="/" element={<Resumo mes={mes} abrirLancamento={() => setLancando(true)} />} />` mantendo o `*` de reserva.

- [ ] **Step 3b: Funções puras (com teste), preferências, checklist e ordem dos cartões**

`domain/categorias.ts`:

```ts
import { mesDe } from './meses'
import type { Centavos, Lancamento, Mes } from './tipos'

export function topCategorias(lancs: Lancamento[], mes: Mes, n: number) {
  const saidas = lancs.filter((l) => l.tipo === 'saida' && mesDe(l.data) === mes)
  const total = saidas.reduce((s, l) => s + l.valor, 0)
  if (total === 0) return []
  const por = new Map<string, Centavos>()
  for (const l of saidas) por.set(l.categoriaId, (por.get(l.categoriaId) ?? 0) + l.valor)
  return [...por]
    .map(([categoriaId, t]) => ({ categoriaId, total: t, pct: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n)
}
```

`categorias.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { topCategorias } from './categorias'
import type { Lancamento } from './tipos'

const s = (categoriaId: string, valor: number, data = '2026-10-05'): Lancamento => ({
  id: categoriaId + valor + data, valor, data, tipo: 'saida', categoriaId,
  natureza: 'variavel', contaId: 'c', status: 'pago',
})

describe('topCategorias', () => {
  const ls = [s('mer', 6000), s('alu', 3000), s('mer', 1000), s('mer', 9999, '2026-09-01')]
  it('agrupa, ordena e calcula percentual do mês', () => {
    expect(topCategorias(ls, '2026-10', 5)).toEqual([
      { categoriaId: 'mer', total: 7000, pct: 70 },
      { categoriaId: 'alu', total: 3000, pct: 30 },
    ])
  })
  it('respeita o limite n', () => expect(topCategorias(ls, '2026-10', 1)).toHaveLength(1))
  it('mês sem saídas devolve lista vazia', () => expect(topCategorias(ls, '2026-11', 3)).toEqual([]))
})
```

`domain/reserva.ts`:

```ts
import type { Centavos } from './tipos'

export function statusReserva(saldo: Centavos, custoEssencialMensal: Centavos, alvoMeses: number) {
  const cobertos = custoEssencialMensal > 0 ? Math.max(0, saldo / custoEssencialMensal) : 0
  return { cobertos, progresso: Math.min(100, (cobertos / alvoMeses) * 100) }
}
```

`reserva.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { statusReserva } from './reserva'

describe('statusReserva', () => {
  it('3 de 6 meses = 50%', () => expect(statusReserva(300000, 100000, 6)).toEqual({ cobertos: 3, progresso: 50 }))
  it('sem custo essencial = 0', () => expect(statusReserva(300000, 0, 6)).toEqual({ cobertos: 0, progresso: 0 }))
  it('saldo negativo = 0', () => expect(statusReserva(-5000, 100000, 6).cobertos).toBe(0))
  it('limita o progresso a 100', () => expect(statusReserva(9000000, 100000, 6).progresso).toBe(100))
})
```

`ui/hooks/usePreferencias.ts` (preferências de interface por aparelho; dados financeiros continuam no Dexie):

```ts
import { useSyncExternalStore } from 'react'

export type Objetivo = 'destino' | 'nao_estourar' | 'contas_em_dia' | 'meta'
interface Prefs { objetivos: Objetivo[]; checklistFechado: boolean; semFinanciamento: boolean }

const CHAVE = 'financas.prefs'
const PADRAO: Prefs = { objetivos: [], checklistFechado: false, semFinanciamento: false }
const ouvintes = new Set<() => void>()
let cache: Prefs | null = null

function ler(): Prefs {
  if (cache) return cache
  try { cache = { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') } } catch { cache = PADRAO }
  return cache!
}
export function salvarPrefs(p: Partial<Prefs>) {
  cache = { ...ler(), ...p }
  try { localStorage.setItem(CHAVE, JSON.stringify(cache)) } catch { /* modo privado: segue em memória */ }
  ouvintes.forEach((f) => f())
}
export const usePrefs = () =>
  useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, ler)
```

`ui/telas/ordemCartoes.ts`:

```ts
import type { Objetivo } from '../hooks/usePreferencias'

export type Cartao = 'sobra' | 'pendencias' | 'visaoGeral' | 'destino' | 'reserva' | 'insights' | 'ultimos'

export function ordemCartoes(obj: Objetivo[]): Cartao[] {
  const extras: Cartao[] = []
  if (obj.includes('destino')) extras.push('destino')
  if (obj.includes('meta')) extras.push('reserva')
  const lista: Cartao[] = ['sobra', ...extras, 'pendencias', 'visaoGeral', 'insights', 'ultimos']
  return obj.includes('contas_em_dia') ? ['pendencias', ...lista.filter((c) => c !== 'pendencias')] : lista
}
```

`ordemCartoes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ordemCartoes } from './ordemCartoes'

describe('ordemCartoes', () => {
  it('padrão', () => expect(ordemCartoes([])).toEqual(['sobra', 'pendencias', 'visaoGeral', 'insights', 'ultimos']))
  it('contas_em_dia põe pendências primeiro', () => expect(ordemCartoes(['contas_em_dia'])[0]).toBe('pendencias'))
  it('destino e meta entram depois da sobra', () =>
    expect(ordemCartoes(['destino', 'meta']).slice(0, 3)).toEqual(['sobra', 'destino', 'reserva']))
  it('nao_estourar mantém o padrão', () => expect(ordemCartoes(['nao_estourar'])).toEqual(ordemCartoes([])))
})
```

`ui/componentes/ChecklistInicial.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { CheckCircle, Circle } from '@phosphor-icons/react'
import { Moldura } from './Moldura'
import { useDados } from '../hooks/useDados'
import { salvarPrefs, usePrefs } from '../hooks/usePreferencias'

export function ChecklistInicial({ abrirLancamento }: { abrirLancamento: () => void }) {
  const d = useDados()
  const prefs = usePrefs()
  const passos = [
    { id: 'conta', rotulo: 'Criar conta bancária', feito: d.contas.length > 0, para: '/contas', acao: 'Adicionar conta' },
    { id: 'gasto', rotulo: 'Registrar o primeiro gasto', feito: d.lancamentos.some((l) => l.tipo === 'saida'), acao: 'Registrar gasto' },
    { id: 'renda', rotulo: 'Cadastrar sua renda', feito: d.fontes.length > 0, para: '/fontes', acao: 'Cadastrar renda' },
    { id: 'divida', rotulo: 'Cadastrar um financiamento', feito: d.financiamentos.length > 0 || prefs.semFinanciamento, para: '/dividas', acao: 'Adicionar financiamento' },
  ]
  const feitos = passos.filter((p) => p.feito).length
  if (prefs.checklistFechado || feitos === passos.length) return null
  const proximo = passos.find((p) => !p.feito)!

  return (
    <Moldura>
      <h3 className="text-lg font-semibold">Vamos começar</h3>
      <div className="mt-3 grid grid-cols-4 gap-1.5" role="progressbar" aria-valuenow={feitos} aria-valuemin={0} aria-valuemax={4}>
        {passos.map((p) => <div key={p.id} className={`h-1.5 rounded-full ${p.feito ? 'bg-marca' : 'bg-[var(--linha)]'}`} />)}
      </div>
      <p className="mt-1 text-sm text-suave">{feitos} de 4 concluídos</p>
      <ul className="mt-3">
        {passos.map((p) => (
          <li key={p.id} className="flex min-h-11 items-center gap-3">
            {p.feito ? <CheckCircle size={22} weight="fill" className="text-marca" /> : <Circle size={22} weight="light" />}
            <span className={p.feito ? 'text-suave line-through' : 'font-semibold'}>{p.rotulo}</span>
          </li>
        ))}
      </ul>
      {proximo.para ? (
        <Link to={proximo.para} className="mt-3 grid min-h-12 place-items-center rounded-full bg-marca font-semibold text-[var(--papel)]">{proximo.acao}</Link>
      ) : (
        <button onClick={abrirLancamento} className="mt-3 min-h-12 w-full rounded-full bg-marca font-semibold text-[var(--papel)]">{proximo.acao}</button>
      )}
      {proximo.id === 'divida' && (
        <button onClick={() => salvarPrefs({ semFinanciamento: true })} className="mt-1 min-h-11 w-full text-sm text-suave">Não tenho financiamento</button>
      )}
      <button onClick={() => salvarPrefs({ checklistFechado: true })} className="min-h-11 w-full text-sm text-suave">Dispensar</button>
    </Moldura>
  )
}
```

Em `Resumo.tsx`: montar um `Record<Cartao, ReactNode>` com os cartões já escritos no Step 3, mais:
- `destino`: `<Moldura>` "Para onde foi o dinheiro" listando `topCategorias(lancamentos, mes, 3)` com nome da categoria, `%` e `formatarBRL(total)` (saída em coral com sinal −).
- `reserva`: `<Moldura>` com `statusReserva(saldoContas(...), custoEssencial(...), reservaAlvoMeses(fontes))`, texto "X de N meses" e `<Link to="/insights">`.
Renderizar `ordemCartoes(usePrefs().objetivos).map((c) => <Fragment key={c}>{cartoes[c]}</Fragment>)` e colocar `<ChecklistInicial abrirLancamento={abrirLancamento} />` no topo. O estado vazio (sem lançamentos) passa a mostrar o checklist em vez do cartão simples.

Rodar: `npx vitest run src/domain/categorias.test.ts src/domain/reserva.test.ts src/ui/telas/ordemCartoes.test.ts` → PASS. Commit: `feat(ui): checklist inicial, cartoes por objetivo e funcoes de apoio`.

- [ ] **Step 4: Verificar**

Run: `npm run build` → sucesso. No navegador: estado vazio aparece; após criar lançamentos (Task 10), anel e trio refletem os números.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): tela Resumo com anel da sobra"
```

---

### Task 10: Lançamento rápido, lista de lançamentos e onboarding

**Goal:** Fluxo de registrar em < 10 s, lista editável do mês, e primeiro uso que cria fonte(s) de renda e conta.

**Files:**
- Create: `app/src/ui/telas/LancamentoRapido.tsx`, `app/src/ui/telas/Lancamentos.tsx`, `app/src/ui/telas/Onboarding.tsx`, `app/src/ui/telas/EtapaRenda.tsx`, `app/src/ui/componentes/Privacidade.tsx`, `app/src/ui/componentes/Icone.tsx`
- Modify: `app/src/App.tsx`

**Acceptance Criteria:**
- [ ] Abas Saída | Entrada; teclado numérico abre com foco no valor; digitar `1250` mostra `R$ 12,50`.
- [ ] Grade de categorias do tipo escolhido, ordenadas por uso; tocar numa categoria **salva** (valor > 0) e fecha; data padrão = hoje.
- [ ] "Mais opções": conta, data, natureza, fonte (entrada), observação, pendente, repete todo mês.
- [ ] Lista de lançamentos do mês com filtro por tipo e exclusão (botão de lixeira com confirmação).
- [ ] Sem fontes cadastradas, o app mostra o Onboarding e, ao concluir, cria fontes e uma conta.
- [ ] Onboarding em 3 perguntas: (1) o que resolver primeiro (seleção múltipla, grava `objetivos` via `salvarPrefs`), (2) fontes de renda, (3) saldo atual; tela inicial "Controle seus gastos. Fácil assim." com cartão de privacidade e botão "Já uso, restaurar backup" que importa um JSON.

**Verify:** `cd app && npm run build`; no navegador: criar saída de R$ 12,50 em Mercado em 3 toques e vê-la no Resumo e em Lançamentos

**Steps:**

- [ ] **Step 1: `Icone.tsx`** — mapeia o nome salvo na categoria para o componente Phosphor:

```tsx
import * as Ph from '@phosphor-icons/react'

export function Icone({ nome, size = 24 }: { nome: string; size?: number }) {
  const C = (Ph as unknown as Record<string, React.ComponentType<{ size?: number; weight?: 'light' }>>)[nome] ?? Ph.DotsThree
  return <C size={size} weight="light" />
}
```

- [ ] **Step 2: `LancamentoRapido.tsx`** (folha inferior; salva ao tocar a categoria)

```tsx
import { useMemo, useRef, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import type { Categoria, Lancamento, TipoLancamento } from '../../domain/tipos'

const hoje = () => new Date().toISOString().slice(0, 10)

export default function LancamentoRapido({ fechar }: { fechar: () => void }) {
  const d = useDados()
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  const [digitos, setDigitos] = useState('')
  const [mais, setMais] = useState(false)
  const [data, setData] = useState(hoje())
  const [obs, setObs] = useState('')
  const [pendente, setPendente] = useState(false)
  const [repete, setRepete] = useState(false)
  const [contaId, setContaId] = useState('')
  const [fonteId, setFonteId] = useState('')
  const [natureza, setNatureza] = useState<'auto' | 'fixo' | 'variavel'>('auto')
  const valor = centavosDeDigitos(digitos)
  const campo = useRef<HTMLInputElement>(null)

  const categorias = useMemo(() => {
    const usos = new Map<string, number>()
    d.lancamentos.forEach((l) => usos.set(l.categoriaId, (usos.get(l.categoriaId) ?? 0) + 1))
    return d.categorias.filter((c) => c.tipo === tipo).sort((a, b) => (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0))
  }, [d.categorias, d.lancamentos, tipo])

  async function salvar(c: Categoria) {
    if (valor <= 0) { campo.current?.focus(); return }
    const l: Lancamento = {
      id: novoId(), valor, data, tipo, categoriaId: c.id,
      natureza: natureza === 'auto' ? c.natureza : natureza,
      contaId: contaId || d.contas[0]?.id || '',
      fonteId: tipo === 'entrada' ? fonteId || d.fontes[0]?.id : undefined,
      observacao: obs || undefined,
      status: pendente ? 'pendente' : 'pago',
      recorrencia: repete ? 'mensal' : undefined,
    }
    await repo.lancamentos.salvar(l)
    fechar()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-md rounded-t-[2rem] bg-[var(--superficie)] p-5 pb-8 max-h-[92dvh] overflow-y-auto">
        <div role="tablist" className="grid grid-cols-2 rounded-full bg-[var(--casca)] p-1">
          {(['saida', 'entrada'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}
              className={`min-h-11 rounded-full font-semibold transition-colors duration-300 ease-[var(--ease)] ${tipo === t ? (t === 'saida' ? 'bg-negativo text-white' : 'bg-positivo text-white') : 'text-suave'}`}>
              {t === 'saida' ? 'Saída' : 'Entrada'}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-center">
          <span className="sr-only">Valor</span>
          <input ref={campo} autoFocus inputMode="numeric" value={digitos}
            onChange={(e) => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="absolute opacity-0 pointer-events-none" aria-label="Valor em centavos" />
          <span onClick={() => campo.current?.focus()} className="valor block text-4xl font-medium">{formatarBRL(valor)}</span>
        </label>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {categorias.map((c) => (
            <button key={c.id} onClick={() => salvar(c)}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--casca)] p-2 text-center text-[11px] leading-tight active:scale-95 transition-transform duration-300 ease-[var(--ease)]">
              <Icone nome={c.icone} />
              {c.nome}
            </button>
          ))}
        </div>

        <button onClick={() => setMais(!mais)} className="mt-4 min-h-11 text-sm font-semibold text-marca">
          {mais ? 'Menos opções' : 'Mais opções'}
        </button>
        {mais && (
          <div className="mt-2 grid gap-3 text-sm">
            <label className="grid gap-1">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
            <label className="grid gap-1">Conta
              <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                {d.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            {tipo === 'entrada' && (
              <label className="grid gap-1">Fonte de renda
                <select value={fonteId} onChange={(e) => setFonteId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                  {d.fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </label>
            )}
            <label className="grid gap-1">Natureza
              <select value={natureza} onChange={(e) => setNatureza(e.target.value as typeof natureza)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                <option value="auto">Padrão da categoria</option><option value="fixo">Fixo</option><option value="variavel">Variável</option>
              </select>
            </label>
            <label className="grid gap-1">Observação<input value={obs} onChange={(e) => setObs(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={pendente} onChange={(e) => setPendente(e.target.checked)} className="size-5" />Ainda não foi pago/recebido</label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={repete} onChange={(e) => setRepete(e.target.checked)} className="size-5" />Repete todo mês</label>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-suave">Digite o valor e toque na categoria para salvar.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `Lancamentos.tsx`** — lista do mês com filtro e exclusão

```tsx
import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { Moldura } from '../componentes/Moldura'
import { useDados } from '../hooks/useDados'
import { repo } from '../../data/repo'
import { formatarBRL } from '../../domain/dinheiro'
import { mesDe } from '../../domain/meses'

export default function Lancamentos({ mes }: { mes: string }) {
  const d = useDados()
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
  const itens = d.lancamentos
    .filter((l) => mesDe(l.data) === mes && (filtro === 'todos' || l.tipo === filtro))
    .sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 rounded-full bg-[var(--casca)] p-1 text-sm">
        {(['todos', 'entrada', 'saida'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`min-h-11 rounded-full font-semibold ${filtro === f ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
            {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
      </div>
      <Moldura>
        {itens.length === 0 && <p className="text-suave">Nenhum lançamento neste mês.</p>}
        <ul className="divide-y divide-[var(--linha)]">
          {itens.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate">{nome(l.categoriaId)}</div>
                <div className="text-xs text-suave">
                  {l.data.slice(8)}/{l.data.slice(5, 7)} · {l.natureza}{l.status === 'pendente' ? ' · pendente' : ''}{l.observacao ? ` · ${l.observacao}` : ''}
                </div>
              </div>
              <span className={`valor ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
              </span>
              <button aria-label="Excluir lançamento" className="size-11 grid place-items-center text-suave"
                onClick={() => { if (confirm('Excluir este lançamento?')) repo.lancamentos.remover(l.id) }}>
                <Trash size={20} weight="light" />
              </button>
            </li>
          ))}
        </ul>
      </Moldura>
    </div>
  )
}
```

- [ ] **Step 4: `EtapaRenda.tsx`** — perguntas 2 e 3 do onboarding: escolhe fontes por exemplo e cria conta (o `Onboarding.tsx` que orquestra as etapas está no Step 4b)

```tsx
import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { repo, novoId } from '../../data/repo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import type { TipoFonte } from '../../domain/tipos'

const OPCOES: { tipo: TipoFonte; nome: string; exemplo: string }[] = [
  { tipo: 'fixa', nome: 'Salário fixo', exemplo: 'Recebo o mesmo valor todo mês' },
  { tipo: 'variavel', nome: 'Vendas / negócio próprio', exemplo: 'Muda de mês para mês' },
  { tipo: 'eventual', nome: 'Bicos e extras', exemplo: 'Aparece de vez em quando' },
]

export function EtapaRenda() {
  const [sel, setSel] = useState<Record<string, string>>({})
  const [saldo, setSaldo] = useState('')

  async function concluir() {
    await repo.contas.salvar({ id: novoId(), nome: 'Conta principal', tipo: 'banco', saldoInicial: centavosDeDigitos(saldo) })
    for (const o of OPCOES.filter((o) => sel[o.tipo] !== undefined))
      await repo.fontes.salvar({ id: novoId(), nome: o.nome, tipo: o.tipo, valorEsperado: centavosDeDigitos(sel[o.tipo]) })
  }

  return (
    <div className="grid gap-5 pt-4">
      <h1 className="text-2xl font-extrabold">De onde vem o seu dinheiro?</h1>
      <p className="text-suave">Marque tudo o que se aplica. O app ajusta orçamento e reserva ao seu tipo de renda.</p>
      {OPCOES.map((o) => {
        const ativo = sel[o.tipo] !== undefined
        return (
          <Moldura key={o.tipo}>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5" checked={ativo}
                onChange={(e) => setSel((s) => { const n = { ...s }; if (e.target.checked) n[o.tipo] = ''; else delete n[o.tipo]; return n })} />
              <span><span className="block font-semibold">{o.nome}</span><span className="text-sm text-suave">{o.exemplo}</span></span>
            </label>
            {ativo && (
              <label className="mt-3 grid gap-1 text-sm">Quanto você espera por mês?
                <input inputMode="numeric" value={sel[o.tipo]} placeholder="0"
                  onChange={(e) => setSel((s) => ({ ...s, [o.tipo]: e.target.value.replace(/\D/g, '') }))}
                  className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                <span className="text-suave">{formatarBRL(centavosDeDigitos(sel[o.tipo]))}</span>
              </label>
            )}
          </Moldura>
        )
      })}
      <Moldura>
        <label className="grid gap-1 text-sm">Quanto você tem hoje em conta e carteira?
          <input inputMode="numeric" value={saldo} onChange={(e) => setSaldo(e.target.value.replace(/\D/g, ''))}
            className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
          <span className="text-suave">{formatarBRL(centavosDeDigitos(saldo))}</span>
        </label>
      </Moldura>
      <button disabled={Object.keys(sel).length === 0} onClick={concluir}
        className="min-h-12 rounded-full bg-marca px-6 font-semibold text-[var(--papel)] disabled:opacity-40">
        Começar
      </button>
    </div>
  )
}
```

- [ ] **Step 4b: `Privacidade.tsx` e `Onboarding.tsx` (boas-vindas, objetivos, restaurar)**

`componentes/Privacidade.tsx`:

```tsx
import { CheckCircle, Lock } from '@phosphor-icons/react'

export function Privacidade() {
  return (
    <ul className="grid gap-3 rounded-2xl bg-[var(--casca)] p-4 text-sm">
      <li className="flex gap-3"><Lock size={22} weight="light" className="shrink-0 text-marca" />Nada sai do seu celular: o app não envia seus dados para lugar nenhum.</li>
      <li className="flex gap-3"><CheckCircle size={22} weight="light" className="shrink-0 text-marca" />Faça um backup de vez em quando para não perder nada ao trocar de aparelho.</li>
    </ul>
  )
}
```

`telas/Onboarding.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { Privacidade } from '../componentes/Privacidade'
import { EtapaRenda } from './EtapaRenda'
import { salvarPrefs, type Objetivo } from '../hooks/usePreferencias'
import { importar } from '../../data/backup'

const OBJETIVOS: { id: Objetivo; rotulo: string }[] = [
  { id: 'destino', rotulo: 'Pra onde vai meu dinheiro' },
  { id: 'nao_estourar', rotulo: 'Não estourar o mês' },
  { id: 'contas_em_dia', rotulo: 'Contas e parcelas em dia' },
  { id: 'meta', rotulo: 'Juntar pra uma meta ou reserva' },
]

export default function Onboarding() {
  const [etapa, setEtapa] = useState<'inicio' | 'objetivos' | 'renda'>('inicio')
  const [sel, setSel] = useState<Objetivo[]>([])
  const arquivo = useRef<HTMLInputElement>(null)

  async function restaurar(f: File) {
    if (!confirm('Isso substitui todos os dados atuais. Continuar?')) return
    try { await importar(await f.text()) } catch (e) { alert((e as Error).message) }
  }

  if (etapa === 'renda') return <EtapaRenda />

  if (etapa === 'objetivos')
    return (
      <div className="grid gap-5 pt-4">
        <h1 className="text-2xl font-extrabold">O que você quer resolver primeiro?</h1>
        <p className="text-suave">Escolha quantos quiser. O app se organiza em volta disso.</p>
        {OBJETIVOS.map((o) => {
          const ativo = sel.includes(o.id)
          return (
            <button key={o.id} role="checkbox" aria-checked={ativo}
              onClick={() => setSel(ativo ? sel.filter((x) => x !== o.id) : [...sel, o.id])}
              className={`min-h-14 rounded-2xl px-4 text-left font-semibold ring-1 transition-colors duration-300 ease-[var(--ease)] ${ativo ? 'bg-[var(--casca)] ring-marca' : 'ring-[var(--linha)]'}`}>
              {o.rotulo}
            </button>
          )
        })}
        <button disabled={sel.length === 0}
          onClick={() => { salvarPrefs({ objetivos: sel }); setEtapa('renda') }}
          className="min-h-12 rounded-full bg-marca font-semibold text-[var(--papel)] disabled:opacity-40">
          Continuar
        </button>
      </div>
    )

  return (
    <div className="grid gap-5 pt-8">
      <h1 className="text-3xl font-extrabold leading-tight">Controle seus gastos.<br />Fácil assim.</h1>
      <p className="text-suave">Responda 3 perguntas e o app se monta do seu jeito.</p>
      <Moldura><Privacidade /></Moldura>
      <button onClick={() => setEtapa('objetivos')} className="min-h-12 rounded-full bg-marca font-semibold text-[var(--papel)]">Montar meu controle</button>
      <p className="text-center text-xs text-suave">Leva menos de 1 minuto · sem cadastro</p>
      <button onClick={() => arquivo.current?.click()} className="min-h-11 text-sm font-semibold text-marca">Já uso · Restaurar backup</button>
      <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restaurar(e.target.files[0])} />
    </div>
  )
}
```

Commit junto com o Step 6 (o FAB e as rotas ainda não existem no onboarding: manter o FAB oculto enquanto `fontes.length === 0 || contas.length === 0`).

- [ ] **Step 5: Conectar no `App.tsx`**

- Se `dados.fontes.length === 0 || dados.contas.length === 0`: renderizar `<Onboarding />` no lugar das rotas e esconder o FAB.
- `{lancando && <LancamentoRapido fechar={() => setLancando(false)} />}` no lugar do placeholder.
- Rota `/lancamentos` → `<Lancamentos mes={mes} />`. Remover `useNavigate`/`nav` não usados.

- [ ] **Step 6: Verificar e commitar**

Run: `npm run build` → sucesso. No navegador: onboarding → criar saída de R$ 12,50 em Mercado (valor + 1 toque) → aparece no Resumo e em Lançamentos; marcar "pendente" altera Saldo seguro.

```bash
git add -A && git commit -m "feat(ui): lancamento rapido, lista de lancamentos e onboarding"
```

---

### Task 11: Contas, fontes de renda e categorias

**Goal:** Telas de gestão de contas (banco/caixa), fontes de renda e categorias.

**Files:**
- Create: `app/src/ui/telas/Contas.tsx`, `Fontes.tsx`, `Categorias.tsx`, `app/src/ui/componentes/FormRapido.tsx`
- Modify: `app/src/App.tsx` (rotas `/contas`, `/fontes`, `/categorias`)

**Acceptance Criteria:**
- [ ] Contas: lista com saldo atual (saldoContas por conta), adicionar, editar nome/saldo inicial, remover (bloqueia se houver lançamentos na conta, com mensagem).
- [ ] Fontes: lista com tipo e valor esperado; adicionar/editar/remover.
- [ ] Categorias: lista por tipo; adicionar com nome, ícone (escolha entre 12 ícones), natureza e "essencial"; remover bloqueado se em uso.

**Verify:** `cd app && npm run build`; no navegador: adicionar conta "Caixa", ver saldo; criar categoria "Pet" essencial e usá-la no lançamento rápido

**Steps:**

- [ ] **Step 1: `FormRapido.tsx`** — folha inferior genérica

```tsx
import type { ReactNode } from 'react'

export function FormRapido({ titulo, onSalvar, onCancelar, children }: {
  titulo: string; onSalvar: () => void; onCancelar: () => void; children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onCancelar}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSalvar() }}
        className="mx-auto grid w-full max-w-md gap-3 rounded-t-[2rem] bg-[var(--superficie)] p-5 pb-8">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {children}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancelar} className="min-h-12 rounded-full bg-[var(--casca)] font-semibold">Cancelar</button>
          <button type="submit" className="min-h-12 rounded-full bg-marca font-semibold text-[var(--papel)]">Salvar</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: `Contas.tsx`**

```tsx
import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { saldoContas } from '../../domain/fluxo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import type { Conta } from '../../domain/tipos'

export default function Contas() {
  const d = useDados()
  const [edit, setEdit] = useState<Conta | null>(null)
  const [saldo, setSaldo] = useState('')

  const abrir = (c: Conta) => { setEdit(c); setSaldo(String(c.saldoInicial)) }
  const novo = () => abrir({ id: novoId(), nome: '', tipo: 'banco', saldoInicial: 0 })
  async function salvar() {
    if (!edit || !edit.nome.trim()) return
    await repo.contas.salvar({ ...edit, nome: edit.nome.trim(), saldoInicial: centavosDeDigitos(saldo) })
    setEdit(null)
  }
  async function remover(c: Conta) {
    if (d.lancamentos.some((l) => l.contaId === c.id)) { alert('Esta conta tem lançamentos. Mova ou exclua-os antes.'); return }
    if (confirm(`Remover ${c.nome}?`)) await repo.contas.remover(c.id)
  }

  return (
    <div className="grid gap-4">
      {d.contas.map((c) => (
        <Moldura key={c.id}>
          <div className="flex items-center justify-between">
            <div><div className="font-semibold">{c.nome}</div><div className="text-xs text-suave">{c.tipo}</div></div>
            <div className="valor text-lg">{formatarBRL(saldoContas([c], d.lancamentos.filter((l) => l.contaId === c.id)))}</div>
          </div>
          <div className="mt-3 flex gap-2 text-sm font-semibold">
            <button className="min-h-11 px-3 text-marca" onClick={() => abrir(c)}>Editar</button>
            <button className="min-h-11 px-3 text-negativo" onClick={() => remover(c)}>Remover</button>
          </div>
        </Moldura>
      ))}
      <button onClick={novo} className="min-h-12 rounded-full bg-marca font-semibold text-[var(--papel)]">Adicionar conta</button>
      {edit && (
        <FormRapido titulo="Conta" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome<input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <label className="grid gap-1 text-sm">Tipo
            <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as Conta['tipo'] })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              <option value="banco">Banco</option><option value="caixa">Caixa</option><option value="carteira">Carteira</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Saldo inicial
            <input inputMode="numeric" value={saldo} onChange={(e) => setSaldo(e.target.value.replace(/\D/g, ''))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(saldo))}</span>
          </label>
        </FormRapido>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `Fontes.tsx`** — mesmo padrão de `Contas.tsx`, com campos `nome`, `tipo` (`fixa`/`variavel`/`eventual`, rótulos "Fixa", "Variável", "Eventual"), `valorEsperado` (dígitos→centavos) e, se `fixa`, `diaPagamento` (1–31). Remover é bloqueado se houver lançamento com `fonteId` igual (mensagem "Esta fonte tem entradas registradas."). Lista exibe nome, tipo e `formatarBRL(valorEsperado)`; botão "Adicionar fonte de renda".

```tsx
// Esqueleto exato do estado e do salvar (o restante segue Contas.tsx):
const novo = () => abrir({ id: novoId(), nome: '', tipo: 'fixa', valorEsperado: 0 })
async function salvar() {
  if (!edit || !edit.nome.trim()) return
  await repo.fontes.salvar({
    ...edit, nome: edit.nome.trim(), valorEsperado: centavosDeDigitos(valor),
    diaPagamento: edit.tipo === 'fixa' && dia ? Math.min(31, Math.max(1, Number(dia))) : undefined,
  })
  setEdit(null)
}
```

- [ ] **Step 4: `Categorias.tsx`** — lista agrupada por tipo (Saídas / Entradas); formulário com nome, ícone (grade com `['House','ForkKnife','ShoppingCart','GasPump','Bus','Heartbeat','Lightning','GraduationCap','FilmSlate','Bag','PawPrint','Gift']` usando `Icone`), natureza padrão, e checkbox "Essencial (entra no custo de vida)". Salvar:

```tsx
await repo.categorias.salvar({
  ...edit, nome: edit.nome.trim(),
})
```

Remover bloqueado com `alert('Esta categoria tem lançamentos.')` se `d.lancamentos.some((l) => l.categoriaId === c.id)`.

- [ ] **Step 5: Rotas, verificar e commitar**

Adicionar em `App.tsx`: `/contas` → `<Contas />`, `/fontes` → `<Fontes />`, `/categorias` → `<Categorias />`.

Run: `npm run build` → sucesso; conferir no navegador os critérios.

```bash
git add -A && git commit -m "feat(ui): contas, fontes de renda e categorias"
```

---

### Task 12: Dívidas e simulador de amortização

**Goal:** Cadastro de financiamentos e simulador lado a lado (atual × com aporte) com opção reduzir prazo/parcela e plano salvo.

**Files:**
- Create: `app/src/ui/telas/Dividas.tsx`, `app/src/ui/telas/DividaDetalhe.tsx`
- Modify: `app/src/App.tsx` (rotas `/dividas`, `/dividas/:id`)

**Acceptance Criteria:**
- [ ] Lista mostra saldo devedor, parcela do mês (`parcelaDoMes`), prazo restante e sistema.
- [ ] Formulário: nome, saldo devedor, taxa mensal (% ao mês, ex. `1,5`), prazo restante, SAC/Price, dia do vencimento.
- [ ] Detalhe: campo de aporte e escolha reduzir prazo/parcela; mostra lado a lado prazo, parcela inicial, juros totais e **economia de juros** + meses economizados; botão "Salvar como plano" grava `PlanoAmortizacao` (substitui o existente do financiamento).
- [ ] Sugestão de aporte: botão "Usar sobra do mês" preenche o aporte com a sobra normal (se > 0).
- [ ] Os números do simulador batem com `simularAporte` (conferência: SAC 1.200,00 / 1% / 4 meses / aporte 300,00 → economia R$ 12,00 e 2 meses).

**Verify:** `cd app && npm run build`; no navegador, cadastrar o financiamento de conferência e comparar com os valores acima

**Steps:**

- [ ] **Step 1: `Dividas.tsx`** — lista + formulário de cadastro/edição (mesmo padrão de `Contas.tsx` com `FormRapido`). Taxa é digitada em % e convertida: `taxaMensal = Number(taxaTexto.replace(',', '.')) / 100`. Cada item é `Link` para `/dividas/:id`. Remover apaga também os planos do financiamento:

```tsx
async function remover(f: Financiamento) {
  if (!confirm(`Remover ${f.nome}?`)) return
  await repo.financiamentos.remover(f.id)
  for (const p of d.planos.filter((p) => p.financiamentoId === f.id)) await repo.planos.remover(p.id)
}
```

Cada cartão exibe: `nome`, `formatarBRL(f.saldoDevedor)`, `Parcela do mês ${formatarBRL(parcelaDoMes(f))}`, `${f.prazoRestante} meses · ${f.sistema}`, em azul-petróleo (`text-divida`) no valor da parcela.

- [ ] **Step 2: `DividaDetalhe.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Moldura } from '../componentes/Moldura'
import { useResumo } from '../hooks/useResumo'
import { repo, novoId } from '../../data/repo'
import { simularAporte } from '../../domain/amortizacao'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import type { EfeitoAporte } from '../../domain/tipos'

export default function DividaDetalhe({ mes }: { mes: string }) {
  const { id } = useParams()
  const { financiamentos, planos, resumo } = useResumo(mes)
  const f = financiamentos.find((x) => x.id === id)
  const plano = planos.find((p) => p.financiamentoId === id)
  const [digitos, setDigitos] = useState(plano ? String(plano.aporteExtraMensal) : '')
  const [efeito, setEfeito] = useState<EfeitoAporte>(plano?.efeito ?? 'reduzir_prazo')
  const aporte = centavosDeDigitos(digitos)

  const sim = useMemo(
    () => f && simularAporte({ saldo: f.saldoDevedor, taxa: f.taxaMensal, prazo: f.prazoRestante, sistema: f.sistema, aporte, efeito }),
    [f, aporte, efeito],
  )
  if (!f || !sim) return <p>Financiamento não encontrado.</p>

  async function salvarPlano() {
    for (const p of planos.filter((p) => p.financiamentoId === f!.id)) await repo.planos.remover(p.id)
    if (aporte > 0)
      await repo.planos.salvar({ id: novoId(), financiamentoId: f!.id, aporteExtraMensal: aporte, efeito })
  }

  const Col = ({ titulo, r }: { titulo: string; r: typeof sim.atual }) => (
    <div className="grid gap-2 text-sm">
      <div className="text-[10px] uppercase tracking-[0.2em] text-suave">{titulo}</div>
      <div><div className="text-suave">Prazo</div><div className="valor">{r.prazo} meses</div></div>
      <div><div className="text-suave">1ª parcela</div><div className="valor">{formatarBRL(r.primeiraParcela)}</div></div>
      <div><div className="text-suave">Juros totais</div><div className="valor">{formatarBRL(r.jurosTotais)}</div></div>
    </div>
  )

  return (
    <div className="grid gap-5">
      <Moldura>
        <h2 className="text-xl font-semibold">{f.nome}</h2>
        <p className="text-suave">Saldo {formatarBRL(f.saldoDevedor)} · {(f.taxaMensal * 100).toFixed(2)}% a.m. · {f.sistema}</p>
      </Moldura>
      <Moldura>
        <label className="grid gap-1 text-sm">Aporte extra por mês
          <input inputMode="numeric" value={digitos} onChange={(e) => setDigitos(e.target.value.replace(/\D/g, ''))}
            className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
          <span className="text-suave">{formatarBRL(aporte)}</span>
        </label>
        <button disabled={resumo.sobraNormal <= 0} onClick={() => setDigitos(String(Math.max(0, resumo.sobraNormal)))}
          className="mt-2 min-h-11 text-sm font-semibold text-marca disabled:opacity-40">
          Usar sobra do mês ({formatarBRL(Math.max(0, resumo.sobraNormal))})
        </button>
        <div role="radiogroup" className="mt-3 grid grid-cols-2 rounded-full bg-[var(--casca)] p-1 text-sm">
          {(['reduzir_prazo', 'reduzir_parcela'] as const).map((e) => (
            <button key={e} role="radio" aria-checked={efeito === e} onClick={() => setEfeito(e)}
              className={`min-h-11 rounded-full font-semibold ${efeito === e ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
              {e === 'reduzir_prazo' ? 'Reduzir prazo' : 'Reduzir parcela'}
            </button>
          ))}
        </div>
      </Moldura>
      <Moldura>
        <div className="grid grid-cols-2 gap-4">
          <Col titulo="Atual" r={sim.atual} />
          <Col titulo="Com aporte" r={sim.comAporte} />
        </div>
        <div className="mt-4 rounded-2xl bg-[var(--casca)] p-4">
          <div className="text-suave text-sm">Economia de juros</div>
          <div className="valor text-2xl text-positivo">+ {formatarBRL(sim.economiaJuros)}</div>
          <div className="text-sm text-suave">{sim.mesesEconomizados} meses a menos</div>
        </div>
        <button onClick={salvarPlano} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-[var(--papel)]">
          Salvar como plano
        </button>
      </Moldura>
    </div>
  )
}
```

- [ ] **Step 3: Rotas, verificar e commitar**

Adicionar em `App.tsx`: `/dividas` → `<Dividas />`, `/dividas/:id` → `<DividaDetalhe mes={mes} />`.

Run: `npm run build` → sucesso. No navegador, cadastrar SAC R$ 1.200,00 / 1% / 4 meses, aporte R$ 300,00, "Reduzir prazo" → economia R$ 12,00 e 2 meses. Salvar plano → sobra otimizada no Resumo cai em R$ 300,00 (anel mostra arco azul-petróleo).

```bash
git add -A && git commit -m "feat(ui): dividas e simulador de amortizacao"
```

---

### Task 13: Insights, backup e acabamento PWA

**Goal:** Tela Insights (com cartão de Reserva), tela Backup, ícones PWA e verificação final de ponta a ponta.

**Files:**
- Create: `app/src/ui/telas/Insights.tsx`, `app/src/ui/telas/Backup.tsx`, `app/public/icon-192.png`, `app/public/icon-512.png`
- Modify: `app/src/App.tsx` (rotas `/insights`, `/backup`)

**Acceptance Criteria:**
- [ ] Insights lista todos os insights do mês com título e detalhe (alertas primeiro) e um cartão "Reserva" com meses cobertos × meta do perfil (6 ou 12) e barra de progresso.
- [ ] Backup: "Exportar" baixa `financas-AAAA-MM-DD.json`; "Importar" lê arquivo, pede confirmação ("Isso substitui todos os dados atuais") e mostra erro legível se o arquivo for inválido.
- [ ] `npm run build` gera PWA (service worker + manifest); app abre offline após o primeiro carregamento (verificar em DevTools → Application).
- [ ] A tela Backup mostra o cartão de privacidade ("Nada sai do seu celular"); o cartão de Reserva usa `statusReserva` (mesma função do Resumo).
- [ ] `npx vitest run` passa inteiro.
- [ ] Revisão visual em 390×844 e 1280×800, claro e escuro: sem rolagem horizontal, alvos ≥ 44 px, anel legível, nenhum texto cortado.

**Verify:** `cd app && npx vitest run && npm run build` → tudo verde; checagem manual descrita acima

**Steps:**

- [ ] **Step 1: `Insights.tsx`**

```tsx
import { Moldura } from '../componentes/Moldura'
import { useResumo } from '../hooks/useResumo'
import { parcelaDoMes, saldoContas } from '../../domain/fluxo'
import { custoEssencial, reservaAlvoMeses } from '../../domain/renda'
import { statusReserva } from '../../domain/reserva'
import { formatarBRL } from '../../domain/dinheiro'

export default function Insights({ mes }: { mes: string }) {
  const { insights, contas, lancamentos, categorias, fontes, financiamentos } = useResumo(mes)
  const saldo = saldoContas(contas, lancamentos)
  const essencial = custoEssencial(lancamentos, categorias, financiamentos.reduce((s, f) => s + parcelaDoMes(f), 0), mes)
  const alvo = reservaAlvoMeses(fontes)
  const { cobertos, progresso } = statusReserva(saldo, essencial, alvo)

  return (
    <div className="grid gap-5">
      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Reserva</h3>
        <p className="mt-2 valor text-2xl">{cobertos.toFixed(1)} <span className="text-base text-suave">de {alvo} meses</span></p>
        <div className="mt-3 h-2 rounded-full bg-[var(--linha)]" role="progressbar" aria-valuenow={Math.round(progresso)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-positivo" style={{ width: `${progresso}%` }} />
        </div>
        <p className="mt-2 text-sm text-suave">
          Custo essencial mensal {formatarBRL(essencial)}. A meta é {alvo} meses porque {alvo === 12 ? 'sua renda é variável' : 'sua renda é predominantemente fixa'}.
        </p>
      </Moldura>
      {insights.length === 0 && <Moldura><p className="text-suave">Sem alertas este mês.</p></Moldura>}
      {insights.map((i) => (
        <Moldura key={i.id}>
          <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-alerta' : ''}`}>{i.titulo}</div>
          <p className="mt-1 text-sm text-suave">{i.detalhe}</p>
        </Moldura>
      ))}
    </div>
  )
}
```

(A barra usa `width` dentro de um elemento pequeno e estático; sem animação.)

- [ ] **Step 2: `Backup.tsx`**

```tsx
import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { exportar, importar } from '../../data/backup'
import { Privacidade } from '../componentes/Privacidade'

export default function Backup() {
  const [msg, setMsg] = useState('')
  const arquivo = useRef<HTMLInputElement>(null)

  async function baixar() {
    const blob = new Blob([await exportar()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `financas-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup exportado.')
  }
  async function ler(f: File) {
    if (!confirm('Isso substitui todos os dados atuais. Continuar?')) return
    try { await importar(await f.text()); setMsg('Backup importado.') }
    catch (e) { setMsg((e as Error).message) }
  }

  return (
    <div className="grid gap-4">
      <Moldura>
        <Privacidade />
        <button onClick={baixar} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-[var(--papel)]">Exportar backup</button>
        <button onClick={() => arquivo.current?.click()} className="mt-2 min-h-12 w-full rounded-full bg-[var(--casca)] font-semibold">Importar backup</button>
        <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} />
        {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      </Moldura>
    </div>
  )
}
```

- [ ] **Step 3: Rotas e ícones PWA**

Adicionar `/insights` → `<Insights mes={mes} />` e `/backup` → `<Backup />`. Gerar `public/icon-192.png` e `icon-512.png` (fundo `#0F5C4A` com um anel claro centralizado; pode ser desenhado em um SVG simples e exportado com qualquer ferramenta) e conferir que o manifest os referencia.

- [ ] **Step 4: Verificação final**

Run: `cd app && npx vitest run && npm run build && npm run preview`
Expected: testes PASS; build gera `dist/sw.js` e `manifest.webmanifest`. Abrir o preview, percorrer: onboarding → lançamento rápido (3 toques) → Resumo → Contas → Dívidas/simulador → Insights → Backup (exportar e importar). Conferir offline no DevTools e os dois temas nas duas larguras.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: insights, backup e acabamento PWA"
```

---

### Task 14: Interpretador de notificação bancária (motor, sem UI)

**Goal:** Transformar o texto de uma notificação de app de banco em um lançamento sugerido (valor, tipo, estabelecimento, categoria, banco), para a captura automática da fase APK. Independente das Tasks 8-13; pode rodar logo após a Task 7.

**Files:**
- Create: `app/src/domain/notificacao.ts`
- Test: `app/src/domain/notificacao.test.ts`

**Acceptance Criteria:**
- [ ] "Compra aprovada de R$ 32,90 em PADARIA DOCE PÃO" do pacote `com.nu.production` → `{ valor: 3290, tipo: 'saida', estabelecimento: 'PADARIA DOCE PÃO', categoriaId: 'alimentacao', banco: 'Nubank' }`.
- [ ] "Você recebeu uma transferência de R$ 1.250,00 de João Silva" do pacote `com.itau.app` → valor 125000, tipo `entrada`, estabelecimento `João Silva`, categoria `extras`.
- [ ] "Você enviou um Pix de R$ 80,00 para Maria" → saída de 8000, estabelecimento `Maria`, categoria `outros`.
- [ ] Pacote que não é de banco conhecido (ex.: `com.whatsapp`), texto sem valor e texto com valor sem direção (ex.: "Fatura fechada R$ 100,00") devolvem `null`.
- [ ] O módulo não importa nada de `ui/` nem de `data/`.

**Verify:** `cd app && npx vitest run src/domain/notificacao.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { interpretarNotificacao } from './notificacao'

const n = (pacote: string, titulo: string, texto: string) => ({ pacote, titulo, texto })

describe('interpretarNotificacao', () => {
  it('compra no Nubank', () => {
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Compra aprovada de R$ 32,90 em PADARIA DOCE PÃO'))).toEqual({
      valor: 3290, tipo: 'saida', estabelecimento: 'PADARIA DOCE PÃO', categoriaId: 'alimentacao', banco: 'Nubank',
    })
  })
  it('transferência recebida com milhar', () => {
    expect(interpretarNotificacao(n('com.itau.app', 'Itaú', 'Você recebeu uma transferência de R$ 1.250,00 de João Silva'))).toEqual({
      valor: 125000, tipo: 'entrada', estabelecimento: 'João Silva', categoriaId: 'extras', banco: 'Itaú',
    })
  })
  it('pix enviado', () => {
    const r = interpretarNotificacao(n('br.com.intermedium', 'Inter', 'Você enviou um Pix de R$ 80,00 para Maria'))
    expect(r).toMatchObject({ valor: 8000, tipo: 'saida', estabelecimento: 'Maria', categoriaId: 'outros' })
  })
  it('categoria por estabelecimento', () => {
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Compra aprovada de R$ 200,00 em POSTO IPIRANGA'))?.categoriaId).toBe('veiculo')
  })
  it('ignora app que não é banco', () =>
    expect(interpretarNotificacao(n('com.whatsapp', 'Ana', 'Paguei R$ 10,00 pra você'))).toBeNull())
  it('ignora texto sem valor', () =>
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Seu extrato está disponível'))).toBeNull())
  it('ignora valor sem direção (fatura)', () =>
    expect(interpretarNotificacao(n('com.nu.production', 'Nubank', 'Fatura fechada R$ 100,00'))).toBeNull())
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/notificacao.test.ts` → FAIL (módulo inexistente)

- [ ] **Step 3: Implementar**

```ts
import type { Centavos, TipoLancamento } from './tipos'

export interface NotificacaoBruta { pacote: string; titulo: string; texto: string }
export interface LancamentoSugerido {
  valor: Centavos
  tipo: TipoLancamento
  estabelecimento: string
  categoriaId: string
  banco: string
}

// Lista inicial: validar os nomes de pacote em aparelho real na fase APK.
const BANCOS: [prefixo: string, nome: string][] = [
  ['com.nu.production', 'Nubank'],
  ['com.itau', 'Itaú'],
  ['br.com.intermedium', 'Inter'],
  ['com.bradesco', 'Bradesco'],
  ['br.com.bb.android', 'Banco do Brasil'],
  ['com.c6bank.app', 'C6 Bank'],
  ['com.mercadopago', 'Mercado Pago'],
  ['com.santander', 'Santander'],
  ['br.com.gabba.Caixa', 'Caixa'],
]

const VALOR = /R\$\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/
const ENTRADA = /recebeu|recebid|dep[óo]sito|estorno/i
const SAIDA = /compra|pagamento|pagou|d[ée]bito|enviou|enviad|saque|pix/i
const ESTABELECIMENTO = /^\s*(?:em|no|na|para|de)\s+(.+?)\s*(?:[.;]|\s+no cart[aã]o|\s+com final|$)/i

const CATEGORIAS: [RegExp, string][] = [
  [/padaria|restaurante|lanchonete|ifood|pizz|burger|caf[eé]/i, 'alimentacao'],
  [/mercado|atacad|hortifruti/i, 'mercado'],
  [/posto|shell|ipiranga|combust/i, 'veiculo'],
  [/farm[aá]cia|drogaria|droga/i, 'saude'],
  [/uber|\b99\b|metr[oô]|[oô]nibus/i, 'transporte'],
  [/netflix|spotify|cinema|steam/i, 'lazer'],
]

export function interpretarNotificacao(n: NotificacaoBruta): LancamentoSugerido | null {
  const banco = BANCOS.find(([prefixo]) => n.pacote.startsWith(prefixo))?.[1]
  if (!banco) return null

  const corpo = `${n.titulo} ${n.texto}`.trim()
  const m = VALOR.exec(corpo)
  if (!m) return null

  const tipo: TipoLancamento | null = ENTRADA.test(corpo) ? 'entrada' : SAIDA.test(corpo) ? 'saida' : null
  if (!tipo) return null

  const valor = Number(m[1].replace(/\./g, '')) * 100 + Number(m[2])
  const achado = ESTABELECIMENTO.exec(corpo.slice(m.index + m[0].length))
  const estabelecimento = achado ? achado[1].trim() : n.titulo.trim() || banco

  const categoriaId =
    tipo === 'entrada'
      ? /sal[aá]rio|folha/i.test(corpo) ? 'salario' : 'extras'
      : CATEGORIAS.find(([re]) => re.test(estabelecimento))?.[1] ?? 'outros'

  return { valor, tipo, estabelecimento, categoriaId, banco }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/domain/notificacao.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain && git commit -m "feat(domain): interpretador de notificacao bancaria"
```

---

## Self-Review (spec × plano)

- §11 do spec (ideias do Kontto): onboarding e checklist → Tasks 9-10; privacidade e restaurar → Tasks 10 e 13; parser de notificação → Task 14; captura nativa → fase APK, sem tarefa neste plano.

- §4 modelo de dados → Task 1 (tipos), 7 (Dexie). `essencial`, `status`, `origemId` incluídos.
- §5 regras (sobras, saldo, previsto, saldo seguro, renda esperada, custo essencial, reserva, amortização) → Tasks 2–4, testadas.
- §6 8 insights → Task 6, cada um com teste de disparo e de não disparo; limites configuráveis.
- §7 telas: Resumo (T9), lançamento rápido + onboarding + lista (T10), contas/fontes/categorias (T11), dívidas/simulador (T12), insights/reserva/backup (T13). Recorrência (T5, acionada no shell em T8). Orçamento e Gráficos adiados (registrado no topo).
- §8 visual → tokens e componentes em T8; anel em T9.
- §9 testes → Vitest nas Tasks 1–7; UI verificada por build e navegador.
- Consistência de nomes: `resumoMes`, `parcelaDoMes`, `saldoContas`, `simularAporte`, `gerarCronograma`, `rendaEsperada`, `reservaAlvoMeses`, `custoEssencial`, `gerarRecorrentes`, `gerarInsights`, `repo.*`, `novoId` usados de forma idêntica entre tarefas.
