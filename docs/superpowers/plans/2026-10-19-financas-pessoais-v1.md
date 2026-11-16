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
- Parcelas de financiamento entram no motor a partir do cadastro (`parcelaDoMes`). Um pagamento real é uma saída com `financiamentoId` de um financiamento **existente**: ela representa a parcela (não conta em dobro em despesas, sobra nem insights de despesa); com o financiamento apagado o `financiamentoId` deixa de ser vínculo e a saída é comum. Pagamento acima da parcela: o excesso conta como despesa comum. Parcela pendente de mês anterior continua devida (`parcelasAtrasadas`).
- A data de hoje vem de `hojeLocal()` (`domain/meses.ts`, calendário local); nunca `new Date().toISOString().slice(0, 10)` (UTC). Números e porcentagens exibidos usam `formatarNumero`/`formatarPct` (vírgula pt-BR); nunca `toFixed`.
- A UI nunca grava `null` em campo opcional (omitir, via spread condicional, ou `undefined`); o importador de backup rejeita `null`. Formulários de financiamento chamam `validarContrato` (taxa calculada por `taxaImplicita`) e nunca gravam `NaN`. Categorias com `sistema: true` (transferência, ajuste) nunca aparecem em grades nem telas de gestão (`categoriasDaGrade`).
- O estado do banco é lido **uma vez**, no `Shell`, e entregue por contexto (`DadosContext`); telas não montam `useLiveQuery` próprio (evita piscar estados vazios e permite pré-preencher dados salvos).
- Visual: identidade "petróleo e limão" do spec §13 (base `cfc_platform`), sem Inter/Roboto/Arial, ícones Phosphor Light, cartões em dupla moldura com raio 16 px, curva `cubic-bezier(0.32,0.72,0,1)`, anima só `transform`/`opacity` (exceção: o traço do anel SVG), respeita `prefers-reduced-motion`. Tokens de cor, claro e escuro, **exatamente os do spec §13**; fontes Red Hat Display (títulos e números) e Figtree (texto).
- Regra do limão (`--destaque`, 10%): só como **preenchimento** (botão principal/FAB, aba ou item atual do menu sobre `--marinho`, aporte no anel, um realce por tela). **Nunca texto limão sobre fundo claro**: todo texto/ícone de ação em petróleo usa `text-marca-texto` (`--azul-texto`); o antigo `text-marca-texto` não existe mais (conferir cada ocorrência ao implementar).
- Pendente nunca é texto colorido: use o chip `chip-pendente` (fundo `--amarelo-bg`, texto `--texto`) ou o bloco `aviso`. Entradas/saídas: `text-positivo` (`--verde-texto`) e `text-negativo` (`--vermelho-texto`), sempre com sinal.
- Campos numéricos: todo `<input inputMode="numeric">` filtra com `somenteDigitos` (até 12 dígitos, `ui/validacao.ts`); toda data digitada passa por `dataReal` antes de salvar (nunca grava data vazia ou inválida).
- Cor nunca é a única pista: sempre sinal +/− e rótulo.
- Alvos de toque ≥ 44 px; `min-h-[100dvh]`, nunca `h-screen`.
- Nada de padrão visual Tely.

**User decisions (already made):** PWA local-first com caminho para APK via Capacitor · perfil por fonte de renda (`fixa`/`variavel`/`eventual`) · escopo v1 = núcleo + financiamentos + insights por regras (13º/férias e fatura de cartão ficam para v2) · visual próprio inspirado nas referências (drawer, seletor de mês, FAB, anel) · ideias do Kontto aprovadas em 2026-10-23: onboarding em 3 perguntas com objetivos, checklist "Vamos começar", cartão de privacidade, restaurar backup na abertura, e interpretador de notificação bancária no motor (Task 14). A captura nativa de notificações fica na fase APK (fora deste plano). Motor v1.1 (spec §12, decisões do dono de 2026-10-23): financiamento é um contrato cadastrado pelo carnê (taxa calculada), compra parcelada, contas com cheque especial, reserva, transferência e ajuste, custo essencial com lançados e futuros, "Comprometido nos próximos meses" e armazenamento persistente; as telas das Tasks 8–13 usam essas APIs.

**Limitação conhecida (registrada, decisão do dono pendente):** a previsão por conta (`situacaoContas(...).previsto`, o aviso "vai ficar negativa até o fim do mês") **não inclui parcelas de contrato que ainda não têm lançamento**, porque o financiamento não tem `contaId`. Se o dono decidir, a v1.2 adiciona `contaId` ao financiamento e a previsão da conta passa a somar a parcela do contrato.

**Desvio do spec (registrado):** no drawer, **Orçamento** e **Gráficos** ficam para a v1.1; **Reserva** vira um cartão (`CartaoReserva`) no Resumo e na tela Insights. O restante do spec §7 está coberto.

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
      telas/              Resumo, Compromissos, LancamentoRapido, Lancamentos, Contas, Dividas, DividaDetalhe,
                          FormPagamento, Insights, Fontes, Categorias, Backup, Onboarding
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
npm install dexie dexie-react-hooks react-router-dom @phosphor-icons/react @fontsource/red-hat-display @fontsource/figtree
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
        background_color: '#f1f5f4',
        theme_color: '#0d2b30',
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
  financiamentoId?: string // marca o lançamento como pagamento da parcela deste financiamento
  geradoAte?: Mes // marca d'água: recorrência já gerada até este mês (inclusive); preservar ao editar o modelo
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

/** Data de hoje no calendário LOCAL ('YYYY-MM-DD'); nunca usa toISOString (UTC). */
export function hojeLocal(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
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
- [ ] `saldo` é o saldo ao **fim do mês visualizado** (`saldoContas(contas, lancs, ate)`); `inicial` é o saldo antes do mês. `saldoSeguro` = saldo − despesas pendentes até o mês − `parcelasPendentes` (parcela do mês ainda não paga, por financiamento) − `parcelasAtrasadas` (saídas vinculadas pendentes de meses anteriores); `previsto` = saldoSeguro + entradas pendentes.
- [ ] Saída com `financiamentoId` de financiamento existente não entra em `despesas`; `financiamentoId` órfão (financiamento apagado) é saída comum; pagamento acima da parcela soma o excesso às despesas.
- [ ] `ehPagamentoParcela(l, ids)` é a única definição de "saída vinculada a financiamento existente".
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
    // parcela do mês (31200) ainda não paga entra em previsto e saldoSeguro
    expect(r.parcelasPendentes).toBe(31200)
    expect(r.previsto).toBe(315000 + 10000 - 20000 - 31200)
    expect(r.saldoSeguro).toBe(315000 - 20000 - 31200)
    expect(r.inicial).toBe(100000 - 5000)
  })
})

describe('parcelas de financiamento no saldo (financiamentoId)', () => {
  const conta2: Conta = { id: 'c1', nome: 'Banco', tipo: 'banco', saldoInicial: 1000000 }
  // SAC 3.600.000 / 24 = 150.000 amortização + 1% de 3.600.000 = 36.000 juros => parcela 186.000
  const grande: Financiamento = { ...fin, saldoDevedor: 3600000, prazoRestante: 24 }
  const entrada = l({ tipo: 'entrada', valor: 500000 })
  const resumo = (ls: Lancamento[]) =>
    resumoMes({ mes: '2026-10', contas: [conta2], lancamentos: ls, financiamentos: [grande], aporteExtra: 0 })
  it('parcela do mês', () => expect(parcelaDoMes(grande)).toBe(186000))
  it('(a) nada registrado: parcela pendente reduz previsto e saldoSeguro', () => {
    const r = resumo([entrada])
    expect(r.sobraNormal).toBe(500000 - 186000) // 314.000
    expect(r.saldo).toBe(1500000)
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.previsto).toBe(1500000 - 186000) // 1.314.000
    expect(r.saldoSeguro).toBe(1314000)
  })
  it('(b) saída paga com financiamentoId não conta em dobro', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1' })])
    expect(r.despesas).toBe(0)
    expect(r.sobraNormal).toBe(314000)
    expect(r.saldo).toBe(1314000)
    expect(r.parcelasPendentes).toBe(0)
    expect(r.previsto).toBe(1314000)
    expect(r.saldoSeguro).toBe(1314000)
  })
  it('(c) saída pendente com financiamentoId é excluída das despesas pendentes', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(0)
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.previsto).toBe(1314000)
  })
  const f2: Financiamento = { ...grande, id: 'f2' }
  const resumo2 = (ls: Lancamento[], mes = '2026-10') =>
    resumoMes({ mes, contas: [conta2], lancamentos: ls, financiamentos: [grande, f2], aporteExtra: 0 })
  it('(f) pagamento vinculado a um financiamento não abate a parcela de outro', () => {
    const r = resumo2([entrada, l({ valor: 186000, financiamentoId: 'f1' })])
    expect(r.parcelas).toBe(372000)
    expect(r.parcelasPendentes).toBe(186000) // só f2 segue pendente
  })
  it('(g) pagamento acima da parcela zera as pendentes (sem negativo) e o excesso vira despesa', () => {
    const r = resumo([entrada, l({ valor: 200000, financiamentoId: 'f1' })])
    expect(r.parcelasPendentes).toBe(0)
    expect(r.despesas).toBe(14000)
    expect(r.sobraNormal).toBe(500000 - 14000 - 186000) // 300.000
    expect(r.saldo).toBe(1300000)
    expect(r.previsto).toBe(1300000)
  })
  it('(h) pagamento de outro mês não abate a parcela do mês visto', () => {
    const r = resumo([entrada, l({ valor: 186000, financiamentoId: 'f1', data: '2026-09-10' })])
    expect(r.parcelasPendentes).toBe(186000)
    expect(r.despesas).toBe(0)
  })
  it('(d) parcela pendente de mês anterior continua devida em previsto e saldoSeguro', () => {
    const atrasada = l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-09-10' })
    const r = resumo([entrada, atrasada])
    expect(r.saldo).toBe(1500000)
    expect(r.despesasPendentes).toBe(0)
    expect(r.parcelasPendentes).toBe(186000) // só a parcela do mês visto
    expect(r.parcelasAtrasadas).toBe(186000)
    expect(r.previsto).toBe(1500000 - 186000 - 186000) // 1.128.000
    expect(r.saldoSeguro).toBe(1128000)
  })
  it('(e) parcela pendente do mês visto ou de mês posterior não entra como atrasada', () => {
    const r = resumo([
      entrada,
      l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-10-20' }),
      l({ valor: 186000, financiamentoId: 'f1', status: 'pendente', data: '2026-11-10' }),
    ])
    expect(r.parcelasAtrasadas).toBe(0)
    expect(r.previsto).toBe(1314000)
  })
})

describe('financiamentoId órfão (financiamento apagado)', () => {
  const r = (ls: Lancamento[], fs: Financiamento[] = []) =>
    resumoMes({ mes: '2026-10', contas: [conta], lancamentos: ls, financiamentos: fs, aporteExtra: 0 })
  it('saída paga órfã é despesa comum e reduz a sobra', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado' })])
    expect(x.despesas).toBe(50000)
    expect(x.sobraNormal).toBe(-50000)
    expect(x.saldo).toBe(50000)
  })
  it('saída pendente órfã entra nas despesas pendentes e em previsto', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado', status: 'pendente' })])
    expect(x.despesasPendentes).toBe(50000)
    expect(x.previsto).toBe(50000)
  })
  it('órfã de mês anterior pendente não vira parcela atrasada, só despesa pendente', () => {
    const x = r([l({ valor: 50000, financiamentoId: 'apagado', status: 'pendente', data: '2026-09-10' })])
    expect(x.parcelasAtrasadas).toBe(0)
    expect(x.despesasPendentes).toBe(50000)
  })
  it('com o financiamento existente continua sendo vínculo', () => {
    const x = r([l({ valor: 31200, financiamentoId: 'f1' })], [fin])
    expect(x.despesas).toBe(0)
  })
})

describe('saldo até o fim do mês visualizado', () => {
  const c = { ...conta, saldoInicial: 100000 }
  const ls = [
    l({ tipo: 'entrada', valor: 50000, data: '2026-08-10' }),
    l({ valor: 30000, data: '2026-10-10' }),
  ]
  const ver = (mes: string, lancamentos: Lancamento[] = ls) =>
    resumoMes({ mes, contas: [c], lancamentos, financiamentos: [], aporteExtra: 0 })
  it('mês passado mostra o saldo do fim daquele mês', () => {
    const r = ver('2026-08')
    expect(r.inicial).toBe(100000)
    expect(r.saldo).toBe(150000)
  })
  it('mês seguinte parte do saldo anterior', () => {
    const r = ver('2026-10')
    expect(r.inicial).toBe(150000)
    expect(r.saldo).toBe(120000)
  })
  it('saldoContas com ate ignora datas posteriores', () => {
    expect(saldoContas([c], ls, '2026-09-30')).toBe(150000)
    expect(saldoContas([c], ls)).toBe(120000)
  })
  it('pendente de mês anterior conta em previsto e saldoSeguro', () => {
    const r = ver('2026-10', [l({ valor: 20000, data: '2026-09-15', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(20000)
    expect(r.previsto).toBe(80000)
    expect(r.saldoSeguro).toBe(80000)
  })
  it('pendente de mês posterior não conta', () => {
    const r = ver('2026-10', [l({ valor: 20000, data: '2026-11-15', status: 'pendente' })])
    expect(r.despesasPendentes).toBe(0)
    expect(r.previsto).toBe(100000)
    expect(r.saldoSeguro).toBe(100000)
  })
  it('entradas vazias', () => {
    const r = resumoMes({ mes: '2026-10', contas: [], lancamentos: [], financiamentos: [], aporteExtra: 0 })
    expect(r).toMatchObject({ receitas: 0, despesas: 0, parcelas: 0, parcelasPendentes: 0, sobraNormal: 0, saldo: 0, inicial: 0, previsto: 0, saldoSeguro: 0 })
    expect(saldoContas([], [])).toBe(0)
    expect(saldoContas([c, { ...c, id: 'c2', saldoInicial: 5000 }], [])).toBe(105000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/fluxo.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { gerarCronograma } from './amortizacao'
import { fimDoMes, mesDe } from './meses'
import type { Centavos, Conta, Financiamento, Lancamento, Mes } from './tipos'

const sinal = (l: Lancamento) => (l.tipo === 'entrada' ? l.valor : -l.valor)
const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0)

/**
 * `financiamentoId` só vale como vínculo quando aponta para um financiamento existente;
 * com o financiamento apagado o lançamento volta a ser uma saída comum.
 */
export const ehPagamentoParcela = (l: Lancamento, ids: ReadonlySet<string>): boolean =>
  l.tipo === 'saida' && l.financiamentoId !== undefined && ids.has(l.financiamentoId)

/** Saldo das contas; com `ate` ('YYYY-MM-DD') só conta pagos com data <= ate. */
export function saldoContas(contas: Conta[], lancs: Lancamento[], ate?: string): Centavos {
  const inicial = contas.reduce((s, c) => s + c.saldoInicial, 0)
  return (
    inicial +
    lancs
      .filter((l) => l.status === 'pago' && (ate === undefined || l.data <= ate))
      .reduce((s, l) => s + sinal(l), 0)
  )
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
  const ids = new Set(e.financiamentos.map((f) => f.id))
  const doMes = e.lancamentos.filter((l) => mesDe(l.data) === e.mes)
  const entradas = doMes.filter((l) => l.tipo === 'entrada')
  // Pagamentos de parcela (financiamentoId de financiamento existente) já estão em `parcelas`.
  const saidas = doMes.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, ids))
  const parcelas = e.financiamentos.reduce((s, f) => s + parcelaDoMes(f), 0)
  let parcelasPendentes = 0
  let excessoParcelas = 0 // pago acima da parcela do mês: gasto comum, não some da sobra
  for (const f of e.financiamentos) {
    const pago = soma(
      doMes.filter((l) => l.financiamentoId === f.id && l.tipo === 'saida' && l.status === 'pago'),
    )
    parcelasPendentes += Math.max(0, parcelaDoMes(f) - pago)
    excessoParcelas += Math.max(0, pago - parcelaDoMes(f))
  }

  const receitas = soma(entradas)
  const despesas = soma(saidas) + excessoParcelas
  const sobraNormal = receitas - despesas - parcelas

  const saldo = saldoContas(e.contas, e.lancamentos, fimDoMes(e.mes))
  const ateMes = e.lancamentos.filter((l) => mesDe(l.data) <= e.mes && l.status === 'pendente')
  const receitasPendentes = soma(ateMes.filter((l) => l.tipo === 'entrada'))
  const despesasPendentes = soma(ateMes.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, ids)))
  const antes = e.lancamentos.filter((l) => mesDe(l.data) < e.mes)
  // Parcela pendente de mês anterior continua devida (a do mês visto já está em parcelasPendentes).
  const parcelasAtrasadas = soma(
    antes.filter((l) => ehPagamentoParcela(l, ids) && l.status === 'pendente'),
  )

  return {
    receitas,
    despesas,
    parcelas,
    parcelasPendentes,
    parcelasAtrasadas,
    receitasPendentes,
    despesasPendentes,
    sobraNormal,
    sobraOtimizada: sobraNormal - e.aporteExtra,
    saldo,
    inicial: saldoContas(e.contas, antes),
    previsto: saldo + receitasPendentes - despesasPendentes - parcelasPendentes - parcelasAtrasadas,
    saldoSeguro: saldo - despesasPendentes - parcelasPendentes - parcelasAtrasadas,
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
- [ ] `custoEssencial(lancs, categorias, parcelas, mes, financiamentoIds)` = média mensal (dos até 3 meses anteriores + o mês atual, só meses com saída essencial) das saídas em categorias `essencial`, mais parcelas.

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

describe('rendaEsperada: histórico da renda variável', () => {
  const v = [fonte({ id: 'v', tipo: 'variavel', valorEsperado: 300000 })]
  it('meses vazios depois do primeiro recebimento contam como zero', () => {
    // janela [jul 300000, ago 0, set 0]: média 100000, mediana 0 → 0
    expect(rendaEsperada(v, [ent('v', '2026-07-05', 300000)], '2026-10')).toBe(0)
  })
  it('meses antes do primeiro recebimento ficam fora da janela', () => {
    // janela [set 90000] → 90000
    expect(rendaEsperada(v, [ent('v', '2026-09-05', 90000)], '2026-10')).toBe(90000)
  })
  it('entrada pendente (não recebida) é ignorada', () => {
    const pendente = { ...ent('v', '2026-09-05', 90000), status: 'pendente' as const }
    expect(rendaEsperada(v, [pendente], '2026-10')).toBe(300000)
  })
  it('entradas de outra fonte não vazam', () => {
    const ls = [ent('outra', '2026-07-05', 999999), ent('v', '2026-09-05', 90000)]
    expect(rendaEsperada(v, ls, '2026-10')).toBe(90000)
  })
  it('recebimentos do próprio mês ou posteriores não entram no histórico', () => {
    expect(rendaEsperada(v, [ent('v', '2026-10-05', 90000)], '2026-10')).toBe(300000)
  })
})

describe('reservaAlvoMeses', () => {
  it('fixa dominante → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 600000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 200000 })])).toBe(6)
  })
  it('variável dominante → 12', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 100000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 400000 })])).toBe(12)
  })
  it('exatamente 50% fixa → 6', () => {
    expect(reservaAlvoMeses([fonte({ valorEsperado: 500000 }), fonte({ id: 'v', tipo: 'variavel', valorEsperado: 500000 })])).toBe(6)
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
    expect(custoEssencial(ls, cats, 30000, '2026-10', [])).toBe(110000 + 30000)
  })
  it('ignora saída com financiamentoId (parcela já somada à parte)', () => {
    const base = [s('mor', '2026-10-01', 120000)]
    const pagamento = { ...s('mor', '2026-10-05', 62000), id: 'pg', financiamentoId: 'f1' }
    expect(custoEssencial([...base, pagamento], cats, 30000, '2026-10', ['f1']))
      .toBe(custoEssencial(base, cats, 30000, '2026-10', ['f1']))
    expect(custoEssencial([...base, pagamento], cats, 30000, '2026-10', ['f1'])).toBe(120000 + 30000)
  })
  it('financiamentoId órfão (financiamento apagado) é saída essencial comum', () => {
    const base = [s('mor', '2026-10-01', 120000)]
    const orfao = { ...s('mor', '2026-10-05', 60000), id: 'pg', financiamentoId: 'apagado' }
    // mês único: 120.000 + 60.000 = 180.000, mais parcelas 30.000
    expect(custoEssencial([...base, orfao], cats, 30000, '2026-10', ['f1'])).toBe(180000 + 30000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/renda.test.ts` → FAIL

- [ ] **Step 3: Implementar**

```ts
import { ehPagamentoParcela } from './fluxo'
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
      // Só entradas efetivamente recebidas da fonte, antes do mês consultado.
      const pagas = lancs.filter(
        (l) => l.fonteId === f.id && l.tipo === 'entrada' && l.status === 'pago' && mesDe(l.data) < mes,
      )
      if (pagas.length === 0) {
        total += f.valorEsperado
        continue
      }
      const primeiro = pagas.reduce((m, l) => (mesDe(l.data) < m ? mesDe(l.data) : m), mesDe(pagas[0].data))
      // Meses sem recebimento dentro da janela (a partir do primeiro recebimento) contam como 0.
      const porMes = anteriores
        .filter((m) => m >= primeiro)
        .map((m) => pagas.filter((l) => mesDe(l.data) === m).reduce((s, l) => s + l.valor, 0))
      total += Math.round(Math.min(media(porMes), mediana(porMes)))
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
  financiamentoIds: Iterable<string>,
): Centavos {
  const ids = new Set(financiamentoIds)
  const essenciais = new Set(categorias.filter((c) => c.essencial).map((c) => c.id))
  const meses = [...mesesAnteriores(mes, 3), mes]
  const totais = meses
    .map((m) =>
      lancs.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, ids) && essenciais.has(l.categoriaId) && mesDe(l.data) === m),
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
- [ ] `gerarRecorrentes(existentes, hoje)` é pura e devolve `{ copias, modelos }` (sem `novoId`): ids determinísticos `${modelo.id}:${mes}`; `modelos` são os modelos com `geradoAte` avançado.
- [ ] Não duplica: rodar duas vezes sobre o resultado não gera novos itens; cópia apagada não volta; nunca emite cópia cujo id já exista (edição do usuário não é revertida).
- [ ] O chamador persiste `modelos` + `copias` em UMA transação Dexie com `bulkPut` (JSDoc da função).
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

/** Aplica o resultado como a camada de dados faria: troca os modelos e acrescenta as cópias. */
const aplicar = (existentes: Lancamento[], r: ReturnType<typeof gerarRecorrentes>): Lancamento[] => [
  ...existentes.map((l) => r.modelos.find((m) => m.id === l.id) ?? l),
  ...r.copias,
]

describe('gerarRecorrentes', () => {
  it('gera meses faltantes como pendentes', () => {
    const { copias } = gerarRecorrentes([modelo], '2026-10-19')
    expect(copias.map((n) => n.data)).toEqual(['2026-09-05', '2026-10-05'])
    expect(copias.every((n) => n.origemId === 'm1' && n.status === 'pendente' && !n.recorrencia)).toBe(true)
    expect(copias.map((n) => n.id)).toEqual(['m1:2026-09', 'm1:2026-10'])
  })
  it('é idempotente', () => {
    const salvo = aplicar([modelo], gerarRecorrentes([modelo], '2026-10-19'))
    expect(gerarRecorrentes(salvo, '2026-10-19')).toEqual({ copias: [], modelos: [] })
  })
  it('ajusta dia 31 em mês curto', () => {
    const m = { ...modelo, data: '2026-01-31' }
    const { copias } = gerarRecorrentes([m], '2026-02-28')
    expect(copias.map((n) => n.data)).toEqual(['2026-02-28'])
  })
  it('atravessa dezembro para janeiro', () => {
    const m = { ...modelo, data: '2025-12-15' }
    const { copias } = gerarRecorrentes([m], '2026-02-01')
    expect(copias.map((n) => n.data)).toEqual(['2026-01-15', '2026-02-15'])
  })
  it('preenche lacunas quando só alguns meses têm cópia (sem geradoAte)', () => {
    const existente: Lancamento = { ...modelo, id: 'x', origemId: 'm1', recorrencia: undefined, data: '2026-09-05', status: 'pendente' }
    const { copias } = gerarRecorrentes([modelo, existente], '2026-11-20')
    expect(copias.map((n) => n.data)).toEqual(['2026-10-05', '2026-11-05'])
  })
  it('modelo datado no mês atual ou depois não gera nada nem muda', () => {
    expect(gerarRecorrentes([{ ...modelo, data: '2026-10-05' }], '2026-10-19')).toEqual({ copias: [], modelos: [] })
    expect(gerarRecorrentes([{ ...modelo, data: '2026-12-05' }], '2026-10-19')).toEqual({ copias: [], modelos: [] })
  })
  it('devolve o modelo com geradoAte no mês de hoje', () => {
    const { modelos } = gerarRecorrentes([modelo], '2026-10-19')
    expect(modelos).toEqual([{ ...modelo, geradoAte: '2026-10' }])
  })
  it('cópia apagada não é regenerada depois que o modelo tem geradoAte', () => {
    const salvo = aplicar([modelo], gerarRecorrentes([modelo], '2026-10-19'))
    const semSetembro = salvo.filter((l) => l.id !== 'm1:2026-09')
    expect(gerarRecorrentes(semSetembro, '2026-10-25')).toEqual({ copias: [], modelos: [] })
    // no mês seguinte só o mês novo é gerado
    const { copias } = gerarRecorrentes(semSetembro, '2026-11-02')
    expect(copias.map((c) => c.data)).toEqual(['2026-11-05'])
  })
  it('nunca emite cópia cujo id determinístico já existe (modelo sem geradoAte, cópia movida)', () => {
    // usuário moveu a cópia de setembro para outubro e mudou o valor; o modelo perdeu o geradoAte
    const movida: Lancamento = {
      ...modelo, id: 'm1:2026-09', origemId: 'm1', recorrencia: undefined,
      data: '2026-10-20', valor: 99000, status: 'pago',
    }
    const { copias, modelos } = gerarRecorrentes([modelo, movida], '2026-10-19')
    expect(copias.map((c) => c.id)).not.toContain('m1:2026-09')
    expect(copias).toEqual([])
    expect(modelos).toEqual([{ ...modelo, geradoAte: '2026-10' }])
  })
  it('chamar duas vezes com as mesmas entradas dá ids idênticos (StrictMode)', () => {
    const a = gerarRecorrentes([modelo], '2026-10-19')
    const b = gerarRecorrentes([modelo], '2026-10-19')
    expect(a).toEqual(b)
    expect(a.copias.map((c) => c.id)).toEqual(b.copias.map((c) => c.id))
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

export interface ResultadoRecorrencia {
  /** Novos lançamentos pendentes (ids determinísticos `${modelo.id}:${mes}`). */
  copias: Lancamento[]
  /** Modelos cuja marca d'água `geradoAte` avançou (já com o campo atualizado). */
  modelos: Lancamento[]
}

/**
 * Gera as cópias mensais que faltam até o mês de `hoje`. Função pura e idempotente: meses
 * <= `geradoAte` nunca são regenerados (mesmo que o usuário tenha apagado/movido a cópia),
 * meses que já têm cópia com o mesmo `origemId` são pulados e nunca se emite uma cópia cujo
 * id determinístico (`${modelo.id}:${mes}`) já exista em `existentes` — assim um `put` não
 * reverte a edição do usuário numa cópia movida, mesmo que o modelo perca o `geradoAte`.
 *
 * O que o chamador deve persistir: `modelos` (com `geradoAte` avançado) e `copias`, juntos em
 * UMA transação do Dexie (`db.transaction('rw', db.lancamentos, ...)`) com `bulkPut` — sem
 * transação, uma falha entre os dois escritos regenera cópias; os ids determinísticos tornam
 * a repetição (StrictMode, duas abas) inofensiva. Ao editar um modelo na UI, preserve o
 * `geradoAte` existente (nunca o regrave como ausente), senão a marca d'água se perde.
 */
export function gerarRecorrentes(existentes: Lancamento[], hoje: string): ResultadoRecorrencia {
  const mesHoje = mesDe(hoje)
  const idsExistentes = new Set(existentes.map((l) => l.id))
  const copias: Lancamento[] = []
  const modelos: Lancamento[] = []
  for (const modelo of existentes.filter((l) => l.recorrencia === 'mensal')) {
    const mesModelo = mesDe(modelo.data)
    if (mesModelo >= mesHoje) continue
    const dia = Number(modelo.data.slice(8, 10))
    const marca = modelo.geradoAte
    let mes = proximoMes(mesModelo)
    while (mes <= mesHoje) {
      const coberto = marca !== undefined && mes <= marca
      const id = `${modelo.id}:${mes}`
      const jaExiste = existentes.some((l) => l.origemId === modelo.id && mesDe(l.data) === mes)
      if (!coberto && !jaExiste && !idsExistentes.has(id)) {
        const ultimo = Number(fimDoMes(mes).slice(8, 10))
        const data = `${mes}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
        const { recorrencia: _r, geradoAte: _g, ...resto } = modelo
        copias.push({ ...resto, id, data, status: 'pendente', origemId: modelo.id })
      }
      mes = proximoMes(mes)
    }
    if (marca === undefined || marca < mesHoje) modelos.push({ ...modelo, geradoAte: mesHoje })
  }
  return { copias, modelos }
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
- [ ] Regras 1, 2, 3 e 7 ignoram saídas vinculadas a financiamento existente (parcelas); `financiamentoId` órfão é saída comum.
- [ ] Regra 7 dispara com fonte variável quando fixos > recebido e recebido < max(renda esperada, soma dos valores esperados das fontes variáveis), mesmo com renda esperada 0; regras 3 continua exigindo renda > 0; regra 8 também dispara com renda 0 e parcelas > 0 ("Parcelas sem renda esperada cadastrada").
- [ ] Regra 5 limita o aporte sugerido ao saldo devedor; textos numéricos usam `formatarNumero`/`formatarPct` (pt-BR).

**Verify:** `cd app && npx vitest run src/domain/insights.test.ts` → PASS

**Steps:**

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { gerarInsights, type ContextoInsights } from './insights'
import { simularAporte } from './amortizacao'
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
  it('não dispara com menos de 4 amostras', () => {
    const poucas = hist.slice(0, 3)
    expect(tipos(base({ lancamentos: [...poucas, sai('mer', '2026-10-05', 400000)] }))).not.toContain('pico_atipico')
  })
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
  const achar = (c: ContextoInsights, t: string) => gerarInsights(c).find((i) => i.tipo === t)
  // f('a', 0.01): SAC 1.200.000 / 24 = 50.000 amortização + 1% de 1.200.000 = 12.000 juros => parcela 62.000
  // f('b', 0.02) com saldo 600.000: 600.000 / 24 = 25.000 + 2% de 600.000 = 12.000 => parcela 37.000
  it('divida_mais_cara e sobra_para_divida apontam o financiamento de maior taxa', () => {
    // sobra = 500.000 - (62.000 + 37.000) = 401.000; saldo 50.500.000 >= meta 6 * 99.000 = 594.000 (reserva ok)
    const c = base({
      financiamentos: [f('a', 0.01), { ...f('b', 0.02), saldoDevedor: 600000 }],
      lancamentos: [ent('2026-10-01', 500000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    expect(achar(c, 'divida_mais_cara')?.dados.financiamento).toBe('b')
    expect(achar(c, 'sobra_para_divida')?.dados.financiamento).toBe('b')
  })
  it('sobra_para_divida com sobra positiva e reserva no alvo', () => {
    // sobra = 500.000 - 62.000 = 438.000; saldo 50.500.000 >= meta 6 * 62.000 = 372.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [ent('2026-10-01', 500000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.titulo).toBe('Use a sobra para quitar mais rápido')
    expect(i?.dados.aporte).toBe(438000)
  })
  it('sobra_para_divida com reserva baixa divide a sobra ao meio', () => {
    // entrada pendente: sobra = 500.000 - 62.000 = 438.000, mas saldo = 0 < meta 6 * 62.000 = 372.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [{ ...ent('2026-10-01', 500000), status: 'pendente' }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.titulo).toBe('Divida a sobra entre reserva e dívida')
    expect(i?.dados.aporte).toBe(Math.round(438000 / 2))
  })
  it('sobra_para_divida não dispara com sobra <= 0', () => {
    // sem entradas: sobra = 0 - 62.000 = -62.000
    expect(tipos(base({ financiamentos: [f('a', 0.01)] }))).not.toContain('sobra_para_divida')
  })
  it('sobra_para_divida não dispara sem financiamento', () => {
    expect(tipos(base({ lancamentos: [ent('2026-10-01', 500000)] }))).not.toContain('sobra_para_divida')
  })
  it('com plano salvo, a sugestão parte da sobra otimizada e a economia é incremental', () => {
    // sobraNormal = 376.000 - 62.000 = 314.000; plano existente 300.000 => sobraOtimizada 14.000
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 300000, efeito: 'reduzir_prazo' as const }
    const c = base({
      financiamentos: [f('a', 0.01)], planos: [plano],
      lancamentos: [ent('2026-10-01', 376000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const i = achar(c, 'sobra_para_divida')
    expect(i?.dados.aporte).toBe(14000)
    const s = (x: number) => simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito: 'reduzir_prazo' })
    expect(i?.dados.economia).toBe(s(314000).economiaJuros - s(300000).economiaJuros)
  })
  it('sobra_para_divida limita o aporte ao saldo devedor', () => {
    // sobra = 10.000.000 - 62.000 = 9.938.000 > saldo devedor 1.200.000
    const c = base({
      financiamentos: [f('a', 0.01)],
      lancamentos: [ent('2026-10-01', 10000000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    expect(achar(c, 'sobra_para_divida')?.dados.aporte).toBe(1200000)
  })
  it('meses economizados no texto são incrementais ao plano salvo', () => {
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 300000, efeito: 'reduzir_prazo' as const }
    const c = base({
      financiamentos: [f('a', 0.01)], planos: [plano],
      lancamentos: [ent('2026-10-01', 376000)],
      contas: [{ ...conta, saldoInicial: 50000000 }],
    })
    const s = (x: number) => simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito: 'reduzir_prazo' })
    const incremental = s(314000).mesesEconomizados - s(300000).mesesEconomizados
    expect(incremental).not.toBe(s(314000).mesesEconomizados)
    expect(achar(c, 'sobra_para_divida')?.detalhe).toContain(`e ${incremental} meses.`)
  })
  it('efeito segue o plano existente; sem plano usa reduzir_prazo', () => {
    const s = (x: number, efeito: 'reduzir_prazo' | 'reduzir_parcela') =>
      simularAporte({ saldo: 1200000, taxa: 0.01, prazo: 24, sistema: 'SAC', aporte: x, efeito })
    const lancamentos = [ent('2026-10-01', 500000)]
    const contas = [{ ...conta, saldoInicial: 50000000 }]
    const comPlano = base({
      financiamentos: [f('a', 0.01)], lancamentos, contas,
      planos: [{ id: 'p1', financiamentoId: 'a', aporteExtraMensal: 0, efeito: 'reduzir_parcela' }],
    })
    const semPlano = base({ financiamentos: [f('a', 0.01)], lancamentos, contas })
    // sobra = 500.000 - 62.000 = 438.000
    expect(achar(comPlano, 'sobra_para_divida')?.dados.economia).toBe(s(438000, 'reduzir_parcela').economiaJuros)
    expect(achar(semPlano, 'sobra_para_divida')?.dados.economia).toBe(s(438000, 'reduzir_prazo').economiaJuros)
    expect(s(438000, 'reduzir_parcela').economiaJuros).not.toBe(s(438000, 'reduzir_prazo').economiaJuros)
  })
  it('sobra_para_divida não dispara quando o plano já consome a sobra', () => {
    const plano = { id: 'p1', financiamentoId: 'a', aporteExtraMensal: 314000, efeito: 'reduzir_prazo' as const }
    const c = base({ financiamentos: [f('a', 0.01)], planos: [plano], lancamentos: [ent('2026-10-01', 376000)] })
    expect(tipos(c)).not.toContain('sobra_para_divida')
  })
  it('financiamento quitado (saldo 0) não é candidato', () => {
    const quitado = { ...f('a', 0.05), saldoDevedor: 0 }
    const c = base({ financiamentos: [quitado, f('b', 0.01)], lancamentos: [ent('2026-10-01', 500000)] })
    expect(tipos(c)).not.toContain('divida_mais_cara')
    expect(achar(c, 'sobra_para_divida')?.dados.financiamento).toBe('b')
  })
  it('sobra_para_divida não dispara quando a economia de juros é zero', () => {
    const c = base({ financiamentos: [f('a', 0)], lancamentos: [ent('2026-10-01', 500000)] })
    expect(tipos(c)).not.toContain('sobra_para_divida')
  })
  it('texto da taxa usa vírgula pt-BR', () => {
    const c = base({ financiamentos: [f('a', 0.0199), f('b', 0.01)] })
    expect(achar(c, 'divida_mais_cara')?.detalhe).toContain('1,99%')
  })
})

describe('reserva_baixa: texto', () => {
  it('usa vírgula decimal pt-BR nos meses cobertos', () => {
    // essencial = 100.000 (alu paga em outubro); saldo = 670.000 - 100.000 = 570.000; meta 6 * 100.000
    const c = base({
      lancamentos: [sai('alu', '2026-10-05', 100000, 'fixo')],
      contas: [{ ...conta, saldoInicial: 670000 }],
    })
    expect(gerarInsights(c).find((i) => i.tipo === 'reserva_baixa')?.detalhe).toContain('5,7 de 6 meses')
  })
})

describe('mes_de_risco', () => {
  const fontes: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 300000 }]
  it('dispara quando receita < esperado e fixos não cobertos', () =>
    expect(tipos(base({ fontes, lancamentos: [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 150000, 'fixo')] }))).toContain('mes_de_risco'))
  it('não dispara sem renda variável', () =>
    expect(tipos(base({ lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco'))
  it('fonte apenas fixa + eventual não conta como variável', () => {
    const fs: FonteDeRenda[] = [fonteFixa, { id: 'ev', nome: 'Bico', tipo: 'eventual', valorEsperado: 100000 }]
    expect(tipos(base({ fontes: fs, lancamentos: [sai('alu', '2026-10-05', 150000, 'fixo')] }))).not.toContain('mes_de_risco')
  })
  it('não dispara quando recebido >= renda esperada', () => {
    const ls = [ent('2026-10-02', 300000, 'v'), sai('alu', '2026-10-05', 400000, 'fixo')]
    expect(tipos(base({ fontes, lancamentos: ls }))).not.toContain('mes_de_risco')
  })
  it('não dispara quando fixos <= recebido', () => {
    const ls = [ent('2026-10-02', 50000, 'v'), sai('alu', '2026-10-05', 40000, 'fixo')]
    expect(tipos(base({ fontes, lancamentos: ls }))).not.toContain('mes_de_risco')
  })
})

describe('pagamento de parcela (financiamentoId) fora das regras de despesa', () => {
  // SAC 3.600.000 / 24 = 150.000 + 1% de 3.600.000 = 36.000 => parcela 186.000
  const fin: Financiamento = {
    id: 'X', nome: 'Casa', saldoDevedor: 3600000, taxaMensal: 0.01, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5,
  }
  const pg = (data: string, valor = 186000): Lancamento => ({ ...sai('alu', data, valor, 'fixo'), id: 'pg' + data + valor, financiamentoId: 'X' })
  const fonteVar: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 500000 }]
  it('regras 7 e 3: parcela paga não dobra os fixos nem vira despesa fixa alta', () => {
    // fixos = 0 + parcela 186.000 < recebido 200.000 => sem alerta; renda 500.000 (sem histórico)
    const c = base({ fontes: fonteVar, financiamentos: [fin], lancamentos: [ent('2026-10-02', 200000, 'v'), pg('2026-10-05')] })
    expect(tipos(c)).not.toContain('mes_de_risco')
    expect(tipos(c)).not.toContain('despesa_fixa_alta')
  })
  it('regras 1 e 2: pagamentos de parcela não geram gasto_crescendo nem pico_atipico', () => {
    const hist = ['2026-07-03', '2026-08-03', '2026-09-03'].map((d) => pg(d, 100000))
    const c = base({ financiamentos: [fin], lancamentos: [...hist, pg('2026-10-03', 130000)] })
    expect(tipos(c)).not.toContain('gasto_crescendo')
    const picos = ['01', '02', '03', '04'].map((d) => pg(`2026-09-${d}`, 10000))
    const c2 = base({ financiamentos: [fin], lancamentos: [...picos, pg('2026-10-05', 40000)] })
    expect(tipos(c2)).not.toContain('pico_atipico')
  })
  it('financiamentoId sem financiamento correspondente é saída comum (R4)', () => {
    const hist = ['2026-07-03', '2026-08-03', '2026-09-03'].map((d) => pg(d, 100000))
    const c = base({ financiamentos: [], lancamentos: [...hist, pg('2026-10-03', 130000)] })
    expect(tipos(c)).toContain('gasto_crescendo')
  })
})

describe('renda esperada zero (R2)', () => {
  const v: FonteDeRenda[] = [{ id: 'v', nome: 'Brownie', tipo: 'variavel', valorEsperado: 500000 }]
  // janela jul 300.000, ago 0, set 0 => mediana 0 => rendaEsperada 0
  const hist = ent('2026-07-05', 300000, 'v')
  const fixo = sai('alu', '2026-10-05', 150000, 'fixo')
  it('regra 7 dispara com renda esperada 0 e fonte variável', () =>
    expect(tipos(base({ fontes: v, lancamentos: [hist, fixo] }))).toContain('mes_de_risco'))
  it('regra 7 não dispara quando recebido cobre o valor esperado da fonte variável', () => {
    const c = base({ fontes: v, lancamentos: [hist, ent('2026-10-02', 500000, 'v'), sai('alu', '2026-10-05', 600000, 'fixo')] })
    expect(tipos(c)).not.toContain('mes_de_risco')
  })
  it('regra 7 não dispara com renda esperada 0 se fixos <= recebido', () => {
    const c = base({ fontes: v, lancamentos: [hist, ent('2026-10-02', 200000, 'v'), fixo] })
    expect(tipos(c)).not.toContain('mes_de_risco')
  })
  it('regra 3 continua exigindo renda > 0', () =>
    expect(tipos(base({ fontes: v, lancamentos: [hist, fixo] }))).not.toContain('despesa_fixa_alta'))
  const f: Financiamento = { id: 'a', nome: 'Carro', saldoDevedor: 1200000, taxaMensal: 0.01, prazoRestante: 24, sistema: 'SAC', diaVencimento: 5 }
  it('regra 8 com renda 0 e parcelas > 0 avisa que não há renda cadastrada', () => {
    const i = gerarInsights(base({ fontes: [], financiamentos: [f] })).find((x) => x.tipo === 'comprometimento_renda')
    expect(i?.severidade).toBe('alerta')
    expect(i?.titulo).toBe('Parcelas sem renda esperada cadastrada')
    expect(i?.dados).toEqual({ parcelas: 62000, renda: 0 })
  })
  it('regra 8 não dispara com renda 0 e sem parcelas', () =>
    expect(tipos(base({ fontes: [] }))).not.toContain('comprometimento_renda'))
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
import { ehPagamentoParcela, parcelaDoMes, resumoMes, saldoContas } from './fluxo'
import { formatarBRL, formatarNumero, formatarPct } from './dinheiro'
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
  const idsFin = new Set(ctx.financiamentos.map((f) => f.id))
  // Pagamentos de parcela já entram em `parcelas`; as regras de despesa (1, 2, 3, 7) os ignoram.
  const saidas = ctx.lancamentos.filter((l) => l.tipo === 'saida' && !ehPagamentoParcela(l, idsFin))
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
  const essencial = custoEssencial(ctx.lancamentos, ctx.categorias, parcelas, ctx.mes, idsFin)
  const meses = reservaAlvoMeses(ctx.fontes)
  const meta = essencial * meses
  const reservaOk = essencial > 0 && saldo >= meta
  if (essencial > 0 && saldo < meta) {
    const cobertos = Math.max(0, saldo / essencial)
    out.push({
      id: 'reserva-baixa', tipo: 'reserva_baixa', severidade: 'alerta',
      titulo: 'Reserva abaixo da meta',
      detalhe: `Você cobre ${formatarNumero(cobertos)} de ${meses} meses de custo essencial. Faltam ${formatarBRL(meta - saldo)}.`,
      dados: { saldo, meta, meses },
    })
  }

  // 5. sobra para a dívida / 6. dívida mais cara
  const candidatas = ctx.financiamentos.filter((f) => f.saldoDevedor > 0)
  const maisCara = [...candidatas].sort((a, b) => b.taxaMensal - a.taxaMensal)[0]
  const aporteExistente = ctx.planos.reduce((s, p) => s + p.aporteExtraMensal, 0)
  const resumo = resumoMes({
    mes: ctx.mes, contas: ctx.contas, lancamentos: ctx.lancamentos,
    financiamentos: ctx.financiamentos, aporteExtra: aporteExistente,
  })
  if (maisCara && resumo.sobraOtimizada > 0) {
    const sugerido = reservaOk ? resumo.sobraOtimizada : Math.round(resumo.sobraOtimizada / 2)
    const aporte = Math.min(sugerido, maisCara.saldoDevedor) // nunca além do saldo da dívida
    const planosDela = ctx.planos.filter((p) => p.financiamentoId === maisCara.id)
    const existente = planosDela.reduce((s, p) => s + p.aporteExtraMensal, 0)
    const efeito = planosDela[0]?.efeito ?? 'reduzir_prazo'
    const sim = (x: number) => simularAporte({
      saldo: maisCara.saldoDevedor, taxa: maisCara.taxaMensal, prazo: maisCara.prazoRestante,
      sistema: maisCara.sistema, aporte: x, efeito,
    })
    const antes = sim(existente)
    const depois = sim(existente + aporte)
    const economiaJuros = depois.economiaJuros - antes.economiaJuros
    const mesesEconomizados = depois.mesesEconomizados - antes.mesesEconomizados
    if (economiaJuros > 0) {
      out.push({
        id: 'sobra-divida', tipo: 'sobra_para_divida', severidade: 'info',
        titulo: reservaOk ? 'Use a sobra para quitar mais rápido' : 'Divida a sobra entre reserva e dívida',
        detalhe: `Um aporte de ${formatarBRL(aporte)}/mês em ${maisCara.nome} economiza ${formatarBRL(economiaJuros)} em juros e ${mesesEconomizados} meses.`,
        dados: { financiamento: maisCara.id, aporte, economia: economiaJuros },
      })
    }
  }
  if (candidatas.length > 1 && maisCara) {
    out.push({
      id: 'divida-cara', tipo: 'divida_mais_cara', severidade: 'info',
      titulo: `Priorize ${maisCara.nome}`,
      detalhe: `Maior taxa entre as dívidas: ${formatarPct(maisCara.taxaMensal)} ao mês.`,
      dados: { financiamento: maisCara.id, taxa: maisCara.taxaMensal },
    })
  }

  // 7. mês de risco (renda variável/eventual)
  const temVariavel = ctx.fontes.some((f) => f.tipo === 'variavel')
  const recebido = soma(
    ctx.lancamentos.filter((l) => l.tipo === 'entrada' && l.status === 'pago' && mesDe(l.data) === ctx.mes),
  )
  const fixosMes = soma(doMes.filter((l) => l.natureza === 'fixo')) + parcelas
  // A referência não pode cair a 0 só porque o histórico irregular zerou a estimativa.
  const referencia = Math.max(
    renda,
    ctx.fontes.filter((f) => f.tipo === 'variavel').reduce((s, f) => s + f.valorEsperado, 0),
  )
  if (temVariavel && recebido < referencia && fixosMes > recebido) {
    out.push({
      id: 'mes-risco', tipo: 'mes_de_risco', severidade: 'alerta',
      titulo: 'Mês de risco: fixos ainda não cobertos',
      detalhe: `Recebido ${formatarBRL(recebido)} de ${formatarBRL(referencia)} esperados; custos fixos somam ${formatarBRL(fixosMes)}.`,
      dados: { recebido, renda: referencia, fixos: fixosMes },
    })
  }

  // 8. comprometimento de renda
  if (renda === 0 && parcelas > 0) {
    out.push({
      id: 'comprometimento', tipo: 'comprometimento_renda', severidade: 'alerta',
      titulo: 'Parcelas sem renda esperada cadastrada',
      detalhe: `${formatarBRL(parcelas)} de parcelas no mês e nenhuma renda esperada cadastrada.`,
      dados: { parcelas, renda },
    })
  } else if (renda > 0 && parcelas / renda > cfg.comprometimentoMax) {
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
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { db } from './db'
import { repo, novoId } from './repo'
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

describe('novoId', () => {
  afterEach(() => vi.unstubAllGlobals())
  const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  it('usa randomUUID quando disponível', () => expect(novoId()).toMatch(v4))
  it('sem randomUUID, gera UUID v4 único via getRandomValues', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    const ids = Array.from({ length: 50 }, () => novoId())
    for (const id of ids) expect(id).toMatch(v4)
    expect(new Set(ids).size).toBe(50)
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

describe('backup: importação segura', () => {
  const conta = { id: 'c1', nome: 'Banco', tipo: 'banco' as const, saldoInicial: 1000 }
  const vazio = { contas: [], fontes: [], categorias: [], lancamentos: [], financiamentos: [], planos: [] }
  const preservou = async () => expect(await repo.contas.listar()).toEqual([conta])

  beforeEach(async () => { await repo.contas.salvar(conta) })

  it('rejeita {"versao":1} sem tabelas e preserva os dados', async () => {
    await expect(importar('{"versao":1}')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('{"versao":1,"foo":1}')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita tabela que não é array e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, contas: 'x' }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita linha sem id string e preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [{ nome: 'x' }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [{ id: 5 }] }))).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar(JSON.stringify({ versao: 1, ...vazio, fontes: [null] }))).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('rejeita array e null no topo sem tocar nos dados', async () => {
    await expect(importar('[]')).rejects.toThrow('Arquivo de backup inválido')
    await expect(importar('null')).rejects.toThrow('Arquivo de backup inválido')
    await preservou()
  })
  it('versão desconhecida preserva os dados', async () => {
    await expect(importar(JSON.stringify({ versao: 2, ...vazio }))).rejects.toThrow('Versão de backup não suportada')
    await preservou()
  })
  describe('campos com tipo errado', () => {
    const lanc = { id: 'l1', valor: 500, data: '2026-10-01', tipo: 'saida', categoriaId: 'k', natureza: 'variavel', contaId: 'c1', status: 'pago' }
    const fin = { id: 'fi', nome: 'Casa', saldoDevedor: 1000, taxaMensal: 0.01, prazoRestante: 12, sistema: 'SAC', diaVencimento: 5 }
    const rejeita = async (extra: object) => {
      await expect(importar(JSON.stringify({ versao: 1, ...vazio, ...extra }))).rejects.toThrow('Arquivo de backup inválido')
      await preservou()
    }
    it('saldoInicial string', () => rejeita({ contas: [{ ...conta, saldoInicial: '1000' }] }))
    it('tipo de conta inválido', () => rejeita({ contas: [{ ...conta, tipo: 'poupanca' }] }))
    it('valor string em lançamento', () => rejeita({ lancamentos: [{ ...lanc, valor: '500' }] }))
    it('valor negativo ou fracionário', async () => {
      await rejeita({ lancamentos: [{ ...lanc, valor: -1 }] })
      await rejeita({ lancamentos: [{ ...lanc, valor: 1.5 }] })
    })
    it('lançamento sem data', () => {
      const { data: _d, ...semData } = lanc
      return rejeita({ lancamentos: [semData] })
    })
    it('data em formato errado e geradoAte errado', async () => {
      await rejeita({ lancamentos: [{ ...lanc, data: '01/10/2026' }] })
      await rejeita({ lancamentos: [{ ...lanc, geradoAte: '2026-10-01' }] })
    })
    it('data impossível ou geradoAte com mês inválido', async () => {
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-13-45' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-00-10' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-02-30' }] })
      await rejeita({ lancamentos: [{ ...lanc, data: '2026-04-31' }] })
      await rejeita({ lancamentos: [{ ...lanc, geradoAte: '2026-13' }] })
    })
    it('aceita datas reais, inclusive 29/02 de ano bissexto', async () => {
      await importar(JSON.stringify({ versao: 1, ...vazio, lancamentos: [{ ...lanc, data: '2028-02-29', geradoAte: '2028-12' }] }))
      expect(await repo.lancamentos.listar()).toHaveLength(1)
    })
    it('enums inválidos', async () => {
      await rejeita({ lancamentos: [{ ...lanc, status: 'quitado' }] })
      await rejeita({ lancamentos: [{ ...lanc, recorrencia: 'anual' }] })
      await rejeita({ fontes: [{ id: 'f', nome: 'x', tipo: 'outra', valorEsperado: 1 }] })
      await rejeita({ categorias: [{ id: 'k', nome: 'x', icone: 'i', tipo: 'saida', natureza: 'fixo', essencial: 'sim' }] })
      await rejeita({ planos: [{ id: 'p', financiamentoId: 'fi', aporteExtraMensal: 1, efeito: 'nada' }] })
    })
    it('taxa NaN (null no JSON), negativa ou sistema inválido', async () => {
      await rejeita({ financiamentos: [{ ...fin, taxaMensal: null }] })
      await rejeita({ financiamentos: [{ ...fin, taxaMensal: -0.01 }] })
      await rejeita({ financiamentos: [{ ...fin, sistema: 'Price' }] })
      await rejeita({ financiamentos: [{ ...fin, prazoRestante: 0 }] })
      await rejeita({ financiamentos: [{ ...fin, diaVencimento: 32 }] })
    })
    it('fonte com diaPagamento fora de 1..31', () =>
      rejeita({ fontes: [{ id: 'f', nome: 'x', tipo: 'fixa', valorEsperado: 1, diaPagamento: 0 }] }))
  })
  it('round-trip com todas as tabelas', async () => {
    await repo.fontes.salvar({ id: 'f1', nome: 'Salário', tipo: 'fixa', valorEsperado: 500000, diaPagamento: 5 })
    await repo.categorias.salvar({ id: 'k1', nome: 'Mercado', icone: 'ShoppingCart', tipo: 'saida', natureza: 'variavel', essencial: true })
    await repo.lancamentos.salvar({ id: 'l1', valor: 1234, data: '2026-10-01', tipo: 'saida', categoriaId: 'k1', natureza: 'variavel', contaId: 'c1', status: 'pago', fonteId: 'f1', observacao: 'obs', origemId: 'm0', financiamentoId: 'fi1', recorrencia: 'mensal', geradoAte: '2026-10' })
    await repo.financiamentos.salvar({ id: 'fi1', nome: 'Casa', saldoDevedor: 10000000, taxaMensal: 0.01, prazoRestante: 120, sistema: 'SAC', diaVencimento: 10 })
    await repo.planos.salvar({ id: 'p1', financiamentoId: 'fi1', aporteExtraMensal: 50000, efeito: 'reduzir_prazo' })
    const antes = JSON.parse(await exportar())
    const json = await exportar()
    await db.delete(); await db.open()
    await importar(json)
    expect(JSON.parse(await exportar())).toEqual(antes)
    for (const t of ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos']) expect(antes[t]).toHaveLength(1)
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

/** UUID v4; usa randomUUID quando existe e cai para getRandomValues (nunca Math.random). */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
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
import type { Table } from 'dexie'
import { db } from './db'

const VERSAO = 1
const TABELAS = ['contas', 'fontes', 'categorias', 'lancamentos', 'financiamentos', 'planos'] as const

export async function exportar(): Promise<string> {
  const dados: Record<string, unknown> = { versao: VERSAO }
  for (const t of TABELAS) dados[t] = await db[t].toArray()
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
const ehMesReal = (v: unknown) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

type Regra = (v: unknown) => boolean
// Campos obrigatórios e opcionais (opcionais só são checados quando presentes e != undefined).
const REGRAS: Record<Tabela, { obrig: Record<string, Regra>; opc: Record<string, Regra> }> = {
  contas: {
    obrig: { nome: ehTexto, tipo: ehEnum('banco', 'caixa', 'carteira'), saldoInicial: ehInt },
    opc: {},
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
    opc: {},
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
    },
  },
  financiamentos: {
    obrig: {
      nome: ehTexto, saldoDevedor: ehIntMin(0), taxaMensal: ehFinitoMin0, prazoRestante: ehIntMin(1),
      sistema: ehEnum('SAC', 'PRICE'), diaVencimento: ehIntEntre(1, 31),
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
- Create: `app/src/ui/tema.css`, `app/src/ui/tema.ts`, `app/src/ui/validacao.ts`, `app/src/ui/componentes/BotaoTema.tsx`, `app/src/ui/rotulos.ts`, `app/src/ui/componentes/Moldura.tsx`, `SeletorMes.tsx`, `Fab.tsx`, `Drawer.tsx`, `app/src/ui/hooks/useDados.ts`, `app/src/ui/hooks/DadosContext.tsx`
- Modify: `app/src/index.css`, `app/src/main.tsx`, `app/src/App.tsx`, `app/index.html`

**Acceptance Criteria:**
- [ ] App abre com cabeçalho (menu, seletor de mês) e FAB; menu abre o drawer com as entradas do spec §7 (exceto Orçamento/Gráficos).
- [ ] Tema claro e escuro com **exatamente os tokens do spec §13** (`--fundo`, `--superficie`, `--superficie-2`, `--texto`, `--texto-suave`, `--linha`, `--marinho`, `--azul`, `--azul-texto`, `--destaque`, `--verde*`, `--vermelho*`, `--amarelo-bg`): padrão `prefers-color-scheme`, com botão no cabeçalho para trocar (`[data-theme="claro"|"escuro"]`, preferência em `localStorage` aplicada por script inline no `index.html` antes da primeira pintura, sem flash).
- [ ] Identidade §13: fontes Red Hat Display (`--font-display`, títulos e `.valor` com `tabular-nums`) e Figtree (`--font-sans`); cartões com raio 16 px; cabeçalho, drawer e cartão-herói do Resumo em `--marinho` com texto claro; FAB com fundo `--destaque` (limão) e ícone `--marinho`; limão nunca como texto sobre fundo claro; `theme-color` e ícones PWA em `#0d2b30` com acento limão.
- [ ] `npm run build` passa; sem erros no console ao abrir.
- [ ] O `Shell` chama `pedirPersistencia()` (`data/armazenamento.ts`) uma vez na abertura e guarda o `EstadoArmazenamento` (`'persistente' | 'nao_persistente' | 'indisponivel'`) no contexto (`armazenamento`), para a tela de Backup (Task 13).
- [ ] Categorias com `sistema: true` (transferência, ajuste) ficam fora de toda grade e tela de gestão: as telas filtram com `categoriasDaGrade` (nomes em listas continuam vindo da lista completa `categorias`). `semearCategorias()` na abertura também recria as de sistema em bancos que já tinham categorias.

**Verify:** `cd app && npm run build` → sucesso; abrir `npm run dev` e conferir o shell no navegador (390×844)

**Steps:**

- [ ] **Step 0: Trocar as fontes no `package.json`** (o scaffold da Task 0 já instalou as fontes antigas; o spec §13 usa Red Hat Display e Figtree). Em um clone novo o `npm install` da Task 0 já traz as novas e o comando abaixo é inofensivo:

```bash
cd app
npm uninstall @fontsource/plus-jakarta-sans @fontsource/geist-mono
npm install @fontsource/red-hat-display @fontsource/figtree
```

Conferir em `package.json` que `@fontsource/plus-jakarta-sans` e `@fontsource/geist-mono` sumiram das `dependencies`.

- [ ] **Step 1: Tokens (`tema.css`) e importação de fontes**

`app/src/ui/tema.css` (tokens do spec §13, linha a linha; `--sobre-marinho`, `--casca` e `--sombra` são derivados: texto sobre `--marinho`, fundo de campos/trilhos e elevação):

```css
@import '@fontsource/red-hat-display/500.css';
@import '@fontsource/red-hat-display/700.css';
@import '@fontsource/figtree/400.css';
@import '@fontsource/figtree/600.css';

:root {
  color-scheme: light dark;
  --fundo: #f1f5f4;
  --superficie: #ffffff;
  --superficie-2: #edf3f2;
  --texto: #10262b;
  --texto-suave: #4a6168;
  --linha: #dce8e6;
  --marinho: #0d2b30;
  --azul: #0b6b73;
  --azul-texto: #0b6b73;
  --destaque: #c6ef4f;
  --verde: #15803d;
  --verde-texto: #126b2f;
  --verde-bg: #e4f5ea;
  --vermelho: #c62828;
  --vermelho-texto: #c62828;
  --vermelho-bg: #fdecec;
  --amarelo-bg: #fff4dd;
  --sobre-marinho: #e4f2f0; /* texto sobre --marinho (derivado: = --texto do escuro) */
  --casca: var(--superficie-2); /* fundo de campos e trilhos */
  --sombra: 0 24px 48px -24px rgba(13, 43, 48, 0.18);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
}
/* Escuro: padrão do sistema (a menos que o usuário tenha escolhido claro), ou escolhido no botão. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='claro']) {
    --fundo: #09171a;
    --superficie: #102226;
    --superficie-2: #163035;
    --texto: #e4f2f0;
    --texto-suave: #9db8b6;
    --linha: #1f3c40;
    --marinho: #0b2a2f;
    --azul: #0f7f88;
    --azul-texto: #62d6d8;
    --destaque: #d4f55a;
    --verde: #2f9e5c;
    --verde-texto: #5bd58a;
    --verde-bg: #12301f;
    --vermelho: #c7352d;
    --vermelho-texto: #ff8f85;
    --vermelho-bg: #3a1a1f;
    --amarelo-bg: #3a2c12;
    --sombra: 0 24px 48px -24px rgba(0, 0, 0, 0.6);
  }
}
:root[data-theme='escuro'],
.heroi { /* o cartão-herói usa sempre a paleta escura sobre --marinho */
  --fundo: #09171a;
  --superficie: #102226;
  --superficie-2: #163035;
  --texto: #e4f2f0;
  --texto-suave: #9db8b6;
  --linha: #1f3c40;
  --marinho: #0b2a2f;
  --azul: #0f7f88;
  --azul-texto: #62d6d8;
  --destaque: #d4f55a;
  --verde: #2f9e5c;
  --verde-texto: #5bd58a;
  --verde-bg: #12301f;
  --vermelho: #c7352d;
  --vermelho-texto: #ff8f85;
  --vermelho-bg: #3a1a1f;
  --amarelo-bg: #3a2c12;
  --sombra: 0 24px 48px -24px rgba(0, 0, 0, 0.6);
}
:root[data-theme='escuro'] { color-scheme: dark; }
:root[data-theme='claro'] { color-scheme: light; }
```

`app/src/index.css`:

```css
@import 'tailwindcss';
@import './ui/tema.css';

/* Cores utilitárias remapeadas para os tokens do spec §13. Preenchimentos usam --azul; TEXTO em petróleo usa --azul-texto. */
@theme {
  --font-sans: 'Figtree', system-ui, sans-serif;
  --font-display: 'Red Hat Display', 'Figtree', system-ui, sans-serif;
  --color-superficie: var(--superficie);
  --color-tinta: var(--texto);
  --color-suave: var(--texto-suave);
  --color-marca: var(--azul); /* fundos: botão secundário, barras */
  --color-marca-texto: var(--azul-texto); /* links e textos em petróleo (antigo text-marca-texto) */
  --color-positivo: var(--verde-texto);
  --color-negativo: var(--vermelho-texto);
  --color-divida: var(--azul-texto); /* dívida = família azul; versão de texto, legível nos dois temas */
  --color-destaque: var(--destaque); /* limão: só preenchimento, nunca texto sobre fundo claro */
  --color-marinho: var(--marinho);
}

html, body, #root { min-height: 100dvh; }
body {
  background: var(--fundo);
  color: var(--texto);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-display); }
.valor { font-family: var(--font-display); font-variant-numeric: tabular-nums; }
/* Pendente: chip amarelo com texto normal (substitui o antigo text-alerta). */
.chip-pendente { background: var(--amarelo-bg); color: var(--texto); border-radius: 9999px; padding: 0.125rem 0.625rem; }
.aviso { background: var(--amarelo-bg); color: var(--texto); border-radius: 0.75rem; padding: 0.5rem 0.75rem; }
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 2: Componentes base**

`Moldura.tsx` (dupla moldura):

```tsx
import type { ReactNode } from 'react'

/** Cartão do spec §13 (raio 16 px). `heroi`: cartão-herói em --marinho com texto claro (paleta escura local). */
export function Moldura({ children, className = '', heroi = false }: { children: ReactNode; className?: string; heroi?: boolean }) {
  return (
    <div className={`rounded-[16px] p-1.5 ring-1 ring-[var(--linha)] ${heroi ? 'heroi bg-[var(--marinho)] text-[var(--texto)]' : 'bg-[var(--superficie-2)]'} ${className}`}>
      <div
        className={`rounded-[10px] p-5 ${heroi ? 'bg-[var(--marinho)]' : 'bg-[var(--superficie)]'}`}
        style={{ boxShadow: 'var(--sombra), inset 0 1px 1px rgba(255,255,255,0.12)' }}
      >
        {children}
      </div>
    </div>
  )
}
```

`app/src/ui/rotulos.ts` (rótulos compartilhados entre as telas):

```ts
import type { Categoria, Mes } from '../domain/tipos'

export const NOMES_MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/** 'YYYY-MM' → 'jun/27'. */
export function rotuloMes(mes: Mes): string {
  const [a, m] = mes.split('-').map(Number)
  return `${NOMES_MES[m - 1].slice(0, 3).toLowerCase()}/${String(a).slice(2)}`
}

/**
 * Itens de `projetarCompromissos` usam `descricao ?? observacao ?? categoriaId`: quando o lançamento não tem
 * descrição, `descricao` vem como o id da categoria. Mostre sempre o NOME da categoria.
 */
export const nomeCompromisso = (descricao: string, categorias: Categoria[]): string =>
  categorias.find((c) => c.id === descricao)?.nome ?? descricao
```

`SeletorMes.tsx` (usa `NOMES_MES` de `rotulos.ts`):

```tsx
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { mesAnterior } from '../../domain/meses'
import { NOMES_MES as NOMES } from '../rotulos'

export function SeletorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  const [ano, m] = mes.split('-').map(Number)
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Mês anterior" className="size-11 grid place-items-center rounded-full active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
        onClick={() => onChange(mesAnterior(mes, 1))}>
        <CaretLeft size={20} weight="light" />
      </button>
      <span className="min-w-32 text-center font-semibold">{NOMES[m - 1]} <span className="font-normal opacity-70">{ano}</span></span>
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
      className="fixed bottom-6 right-5 size-14 rounded-full bg-[var(--destaque)] text-[var(--marinho)] grid place-items-center active:scale-95 transition-transform duration-300 ease-[var(--ease)]"
      style={{ boxShadow: '0 16px 32px -12px rgba(13,43,48,0.55)' }}>
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
        className={`fixed inset-y-0 left-0 w-[82%] max-w-80 bg-[var(--marinho)] text-[var(--sobre-marinho)] p-4 pt-8 transition-transform duration-500 ease-[var(--ease)] ${aberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <ul className="grid gap-1">
          {ITENS.map((it, i) =>
            'secao' in it ? (
              <li key={i} className="mt-5 mb-1 px-3 text-[10px] uppercase tracking-[0.2em] opacity-60">{it.secao}</li>
            ) : (
              <li key={it.para}>
                <NavLink to={it.para} end={it.para === '/'} onClick={fechar}
                  className={({ isActive }) => `flex items-center gap-3 rounded-full px-4 min-h-12 ${isActive ? 'bg-white/10 text-[var(--destaque)] font-semibold' : ''}`}>
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

`useDados.ts` (lê o banco; `useDadosAoVivo` é chamado **uma única vez**, no `Shell`; o arquivo também reexporta `useDados` do contexto, para as telas importarem tudo de `../hooks/useDados`, e traz o filtro das categorias da grade):

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Categoria, TipoLancamento } from '../../domain/tipos'

export { useDados } from './DadosContext' // DadosContext só importa o TIPO daqui: sem ciclo em tempo de execução

export function useDadosAoVivo() {
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

/** Categorias da grade de lançamento e das telas de gestão: as de sistema (transferência, ajuste) nunca aparecem. */
export const categoriasDaGrade = (categorias: Categoria[], tipo?: TipoLancamento): Categoria[] =>
  categorias.filter((c) => !c.sistema && (tipo === undefined || c.tipo === tipo))
```

`DadosContext.tsx` — as telas leem os dados por aqui (`useDados()`), nunca montam `useLiveQuery` própria. O contexto também carrega o estado do armazenamento persistente (`undefined` até a resposta do navegador):

```tsx
import { createContext, useContext } from 'react'
import type { EstadoArmazenamento } from '../../data/armazenamento'
import type { useDadosAoVivo } from './useDados'

export type Dados = ReturnType<typeof useDadosAoVivo> & { armazenamento?: EstadoArmazenamento }
export const DadosContext = createContext<Dados | null>(null)

export function useDados(): Dados {
  const d = useContext(DadosContext)
  if (!d) throw new Error('useDados fora do DadosContext')
  return d
}
```

`ui/validacao.ts` (usado por todas as telas com campos numéricos e datas):

```ts
/** Só dígitos, no máximo 12 (cabe com folga em inteiro seguro: R$ 9.999.999.999,99). */
export const somenteDigitos = (v: string): string => v.replace(/\D/g, '').slice(0, 12)

/** 'YYYY-MM-DD' existente no calendário (rejeita vazio, mês 13, 30/02). */
export function dataReal(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [a, m, d] = v.split('-').map(Number)
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(a, m, 0)).getUTCDate()
}
```

`ui/tema.ts` e `componentes/BotaoTema.tsx` (botão de tema no cabeçalho; a preferência fica em `localStorage`, só quando o usuário escolhe):

```ts
// ui/tema.ts
export type Tema = 'claro' | 'escuro'
const CHAVE = 'financas.tema'

/** Tema em vigor: a escolha salva ou, sem ela, o do sistema. */
export function temaAtual(): Tema {
  const marcado = document.documentElement.getAttribute('data-theme')
  if (marcado === 'claro' || marcado === 'escuro') return marcado
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}
export function escolherTema(t: Tema) {
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(CHAVE, t) } catch { /* modo privado: vale só nesta sessão */ }
}
```

```tsx
// componentes/BotaoTema.tsx
import { useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import { escolherTema, temaAtual } from '../tema'

export function BotaoTema() {
  const [tema, setTema] = useState(temaAtual())
  const alternar = () => { const novo = tema === 'escuro' ? 'claro' : 'escuro'; escolherTema(novo); setTema(novo) }
  return (
    <button aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={alternar} className="size-11 grid place-items-center">
      {tema === 'escuro' ? <Sun size={22} weight="light" /> : <Moon size={22} weight="light" />}
    </button>
  )
}
```

`App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { List } from '@phosphor-icons/react'
import { BotaoTema } from './ui/componentes/BotaoTema'
import { Drawer } from './ui/componentes/Drawer'
import { Fab } from './ui/componentes/Fab'
import { SeletorMes } from './ui/componentes/SeletorMes'
import { useDadosAoVivo } from './ui/hooks/useDados'
import { DadosContext } from './ui/hooks/DadosContext'
import { semearCategorias } from './data/seed'
import { db } from './data/db'
import { gerarRecorrentes } from './domain/recorrencia'
import { hojeLocal, mesDe } from './domain/meses'
import { pedirPersistencia, type EstadoArmazenamento } from './data/armazenamento'

function Shell() {
  const [aberto, setAberto] = useState(false)
  const [mes, setMes] = useState(mesDe(hojeLocal()))
  const [lancando, setLancando] = useState(false)
  const dados = useDadosAoVivo() // única leitura do banco; as telas recebem por DadosContext
  const [armazenamento, setArmazenamento] = useState<EstadoArmazenamento>()
  const [hoje, setHoje] = useState(hojeLocal()) // dia local; muda ao voltar para o app em outro dia/mês
  const nav = useNavigate()

  useEffect(() => { semearCategorias() }, [])
  // Pede armazenamento persistente uma vez; o estado vai pelo contexto para a tela de Backup.
  useEffect(() => { void pedirPersistencia().then(setArmazenamento) }, [])
  // App aberto por dias: ao voltar (foco / aba visível) relê o dia local; se o mês virou, o efeito abaixo gera as cópias novas.
  useEffect(() => {
    const atualizar = () => setHoje(hojeLocal())
    window.addEventListener('focus', atualizar)
    document.addEventListener('visibilitychange', atualizar)
    return () => { window.removeEventListener('focus', atualizar); document.removeEventListener('visibilitychange', atualizar) }
  }, [])
  // Roda na abertura, quando o mês local muda e após qualquer mudança dos lançamentos (inclusive logo depois de
  // `importar`, que troca o banco inteiro). É idempotente: sem nada a gerar, `gerarRecorrentes` devolve vazio e o efeito sai.
  useEffect(() => {
    if (!dados.pronto) return
    const { copias, modelos } = gerarRecorrentes(dados.lancamentos, hoje)
    if (copias.length === 0 && modelos.length === 0) return
    // Uma transação com bulkPut: modelos (geradoAte avançado) e cópias juntos. Ids determinísticos
    // tornam o efeito duplicado do StrictMode (e duas abas) inofensivo.
    void db.transaction('rw', db.lancamentos, () => db.lancamentos.bulkPut([...modelos, ...copias]))
  }, [dados.pronto, dados.lancamentos, hoje.slice(0, 7)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!dados.pronto) return null
  // Telas são plugadas nas tarefas 9–12; rotas já declaradas aqui apontam para elas.
  return (
    <DadosContext.Provider value={{ ...dados, armazenamento }}>
    <div className="min-h-[100dvh] pb-28">
      <header className="sticky top-0 z-30 bg-[var(--marinho)] text-[var(--sobre-marinho)]">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-3 pt-4">
          <button aria-label="Abrir menu" className="size-11 grid place-items-center" onClick={() => setAberto(true)}>
            <List size={26} weight="light" />
          </button>
          <SeletorMes mes={mes} onChange={setMes} />
          <BotaoTema />
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-4">
      <Routes>
        <Route path="*" element={<div>Em construção</div>} />
      </Routes>
      </main>
      <Fab onClick={() => setLancando(true)} />
      <Drawer aberto={aberto} fechar={() => setAberto(false)} />
      {lancando && null}
      {void nav}
    </div>
    </DadosContext.Provider>
  )
}

export default function App() {
  return <HashRouter><Shell /></HashRouter>
}
```

(Ao editar um lançamento-modelo recorrente na UI, preserve o `geradoAte` existente: salve `{ ...modelo, ...edicoes }`, nunca um objeto reconstruído sem o campo. Modelos e cópias são persistidos juntos, em uma transação com `bulkPut`, como o JSDoc de `gerarRecorrentes` pede.)

(`lancando` e `nav` são conectados na Task 10 e Task 9; manter como está até lá.)

`main.tsx` importa `./index.css`. `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#0d2b30">` (o marinho do cabeçalho, nos dois temas), `lang="pt-BR"`, título "Finanças Pessoais", e, no `<head>` **antes** de qualquer CSS/JS (evita o flash de tema), o script inline que aplica a preferência salva:

```html
<script>
  try {
    var t = localStorage.getItem('financas.tema')
    if (t === 'claro' || t === 'escuro') document.documentElement.setAttribute('data-theme', t)
  } catch (e) {}
</script>
```

- [ ] **Step 4: Verificar**

Run: `npm run build` → sucesso. Rodar `npm run dev`, abrir no navegador em 390×844: menu abre/fecha com animação, seletor de mês troca, FAB limão visível, tema acompanha o sistema e o botão do cabeçalho alterna claro/escuro (a escolha sobrevive ao recarregar, sem flash), cabeçalho e drawer em marinho, console sem erros. Conferir os hex de cada token com o spec §13 nos dois temas e que nenhum texto limão aparece sobre fundo claro.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): tema, componentes base, drawer e shell"
```

---

### Task 9: Tela Resumo com o anel da sobra

**Goal:** Home com seletor de mês, anel da sobra (assinatura), trio Inicial/Saldo/Previsto, pendências com saldo seguro, visão geral, insights e últimos lançamentos.

**Files:**
- Create: `app/src/ui/componentes/SobraRing.tsx`, `app/src/ui/telas/Resumo.tsx`, `app/src/ui/telas/Compromissos.tsx`, `app/src/ui/hooks/useResumo.ts`, `app/src/ui/componentes/ChecklistInicial.tsx`, `app/src/ui/componentes/CartaoReserva.tsx`, `app/src/ui/hooks/usePreferencias.ts`, `app/src/ui/telas/ordemCartoes.ts`, `app/src/domain/categorias.ts`, `app/src/domain/reserva.ts`
- Test: `app/src/ui/telas/ordemCartoes.test.ts`, `app/src/domain/categorias.test.ts`, `app/src/domain/reserva.test.ts`
- Modify: `app/src/App.tsx` (rotas `/` e `/compromissos`, passa `mes`)

**Acceptance Criteria:**
- [ ] Anel (spec §13) no cartão-herói `--marinho`: arco petróleo `--azul` (sobra otimizada), arco limão `--destaque` (aporte), trilho `--linha`; sobra normal ≤ 0 mostra anel `--vermelho` com valor negativo. Sempre com sinal e rótulo além da cor.
- [ ] Valores vêm de `resumoMes`; `Saldo` é o do fim do mês visualizado. Saldo seguro e pendências refletem lançamentos `pendente`, recorrências ainda sem cópia (itens virtuais pendentes, já somados por `resumoMes`), **as parcelas de financiamento ainda não pagas** (`parcelasPendentes` + `parcelasAtrasadas`, linha "Parcelas a pagar") **e as antecipações agendadas** (`antecipacoesPendentes`, linha própria). O cartão Visão geral mostra também as antecipações pagas no mês (`antecipacoes`, que reduzem o saldo mas não são despesa nem mexem na sobra).
- [ ] Até 3 insights aparecem com título e detalhe; vazio mostra "Sem alertas este mês". Os insights de conta negativa (`conta_negativa`, `conta_ficara_negativa`) aparecem em destaque **no topo da tela**, acima do checklist e dos cartões.
- [ ] Sem dados, mostra estado vazio com convite "Registre seu primeiro lançamento".
- [ ] Cartão "Vamos começar" (checklist de 4 passos: conta, primeiro gasto, renda, financiamento) aparece enquanto houver passo pendente e não tiver sido fechado; "Não tenho financiamento" conclui o 4º passo.
- [ ] Cartão "Comprometido nos próximos meses": 3 meses a partir do mês visto, com o total de cada um (`projetarCompromissos(...).meses`) e os próximos términos ("óculos termina em jun/27", de `.terminos`); o link "Ver 6 meses" abre a tela `/compromissos` (6 meses, por tipo, com a lista de itens). Item cuja `descricao` cai no id da categoria é exibido com o NOME da categoria (`nomeCompromisso`).
- [ ] Cartão de Reserva (`CartaoReserva`): `saldoReserva(contas, lancamentos, fimDoMes(mes))` ÷ `custoEssencialReferencia(..., mes)` pelo `statusReserva`, com a meta de `reservaAlvoMeses` — sempre pelo **mês visto** (o mesmo número do insight de reserva baixa), não por `hojeLocal()`; barra em `--azul`. Se `usandoTodas`, mostra a dica para marcar a conta que é a reserva.
- [ ] Ordem e presença dos cartões seguem os objetivos do onboarding (`ordemCartoes`): `contas_em_dia` coloca Pendências primeiro; `destino` adiciona "Para onde foi o dinheiro" (top 3 categorias); `meta` adiciona o cartão de Reserva; "Comprometido" entra sempre, depois de Pendências.
- [ ] `topCategorias` (ignora transferências, ajustes e pagamentos de financiamento) e `statusReserva` têm testes e valores conferidos à mão. O Resumo nunca mostra pagamento de financiamento sob categoria alguma (a parcela aparece só em "Financiamentos").

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
          <Arco inicio={0} pct={100} cor="var(--vermelho)" />
        ) : (
          <>
            <Arco inicio={0} pct={pctOtima} cor="var(--azul)" />
            <Arco inicio={pctOtima} pct={pctAporte} cor="var(--destaque)" />
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

- [ ] **Step 2: `useResumo.ts`** — junta `resumoMes`, insights, projeção de compromissos, reserva e situação das contas (as telas Resumo, Compromissos, Insights e Dívidas leem daqui)

```ts
import { useMemo } from 'react'
import { saldoReserva } from '../../domain/contas'
import { custoEssencialReferencia } from '../../domain/essencial'
import { resumoMes } from '../../domain/fluxo'
import { gerarInsights, type Insight } from '../../domain/insights'
import { fimDoMes } from '../../domain/meses'
import { projetarCompromissos } from '../../domain/projecao'
import { reservaAlvoMeses } from '../../domain/renda'
import { statusReserva } from '../../domain/reserva'
import type { Mes } from '../../domain/tipos'
import { useDados } from './useDados'

const ehConta = (i: Insight) => i.tipo === 'conta_negativa' || i.tipo === 'conta_ficara_negativa'
const alertaPrimeiro = (a: Insight, b: Insight) => Number(b.severidade === 'alerta') - Number(a.severidade === 'alerta')

export function useResumo(mes: Mes) {
  const d = useDados() // vem do DadosContext (provido no Shell)
  return useMemo(() => {
    const aporte = d.planos.reduce((s, p) => s + p.aporteExtraMensal, 0)
    const resumo = resumoMes({
      mes, contas: d.contas, lancamentos: d.lancamentos, financiamentos: d.financiamentos, aporteExtra: aporte,
    })
    const todos = gerarInsights({ mes, ...d })
    const alertasConta = todos.filter(ehConta) // vão para o topo do Resumo
    const insights = todos.filter((i) => !ehConta(i)).sort(alertaPrimeiro) // cartão "Insights" do Resumo
    const todosInsights = [...alertasConta, ...insights] // tela Insights: contas negativas, alertas, informativos

    // 6 meses a partir do mês visto; o Resumo mostra os 3 primeiros, a tela /compromissos todos.
    const compromissos = projetarCompromissos({ lancamentos: d.lancamentos, financiamentos: d.financiamentos }, mes, 6)

    // Reserva do MÊS VISTO (mesmo critério do insight `reserva_baixa`): saldo das contas de reserva até o fim do mês
    // visto e custo essencial de referência a partir desse mês. Nunca `hojeLocal()`: o cartão e o insight têm de concordar.
    const { saldo, usandoTodas } = saldoReserva(d.contas, d.lancamentos, fimDoMes(mes))
    const custo = custoEssencialReferencia(
      { lancamentos: d.lancamentos, categorias: d.categorias, financiamentos: d.financiamentos },
      mes,
    )
    const alvo = reservaAlvoMeses(d.fontes)
    const reserva = { saldo, usandoTodas, custo, alvo, ...statusReserva(saldo, custo, alvo) }

    return { ...d, aporte, resumo, insights, alertasConta, todosInsights, compromissos, reserva }
  }, [mes, d.contas, d.lancamentos, d.financiamentos, d.planos, d.fontes, d.categorias]) // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 3: `Resumo.tsx`**

Estrutura (todos os cartões usam `Moldura`; o cartão do anel usa `<Moldura heroi>`; valores com classe `valor`; entrada `text-positivo` com prefixo `+`, saída `text-negativo` com prefixo `−`, pendente no chip `chip-pendente`):

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
  const { resumo: r, aporte, insights, alertasConta, compromissos, reserva, lancamentos, categorias } = useResumo(mes)
  const doMes = lancamentos.filter((l) => mesDe(l.data) === mes)
  const nomeCat = (id: string) => categorias.find((c) => c.id === id)?.nome ?? ''
  const ultimos = [...doMes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)

  if (lancamentos.length === 0)
    return (
      <Moldura>
        <h2 className="text-xl font-semibold">Comece pelo primeiro lançamento</h2>
        <p className="mt-2 text-suave">Registre uma entrada ou saída para ver sua sobra do mês.</p>
        <button onClick={abrirLancamento} className="mt-4 min-h-12 rounded-full bg-marca px-6 font-semibold text-white">
          Registrar lançamento
        </button>
      </Moldura>
    )

  return (
    <div className="grid gap-5">
      <Moldura heroi>
        <SobraRing normal={r.sobraNormal} otimizada={r.sobraOtimizada} aporte={aporte} />
        <div className="mt-4 grid grid-cols-3 text-center text-sm">
          <div><div className="text-suave">Inicial</div><div className="valor">{formatarBRL(r.inicial)}</div></div>
          <div><div className="text-suave">Saldo</div><div className="valor font-semibold">{formatarBRL(r.saldo)}</div></div>
          <div><div className="text-suave">Previsto</div><div className="valor">{formatarBRL(r.previsto)}</div></div>
        </div>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Pendências</h3>
        <Linha rotulo="Receitas pendentes" valor={`+ ${formatarBRL(r.receitasPendentes)}`} cor="chip-pendente" />
        <Linha rotulo="Despesas pendentes" valor={`− ${formatarBRL(r.despesasPendentes)}`} cor="chip-pendente" />
        <Linha rotulo="Parcelas a pagar" valor={`− ${formatarBRL(r.parcelasPendentes + r.parcelasAtrasadas)}`} cor="text-divida" />
        {r.antecipacoesPendentes > 0 && (
          <Linha rotulo="Antecipações agendadas" valor={`− ${formatarBRL(r.antecipacoesPendentes)}`} cor="chip-pendente" />
        )}
        <div className="mt-1 border-t border-[var(--linha)] pt-2">
          <Linha rotulo="Saldo seguro" valor={formatarBRL(r.saldoSeguro)} />
          <p className="text-xs text-suave">Saldo no fim do mês menos despesas, parcelas e antecipações ainda não pagas.</p>
        </div>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Visão geral</h3>
        <Linha rotulo="Receitas" valor={`+ ${formatarBRL(r.receitas)}`} cor="text-positivo" />
        <Linha rotulo="Despesas" valor={`− ${formatarBRL(r.despesas)}`} cor="text-negativo" />
        <Linha rotulo="Financiamentos" valor={`− ${formatarBRL(r.parcelas)}`} cor="text-divida" />
        {r.antecipacoes > 0 && (
          <Linha rotulo="Antecipações pagas (não entram na sobra)" valor={`− ${formatarBRL(r.antecipacoes)}`} cor="text-divida" />
        )}
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Insights</h3>
        {insights.length === 0 && <p className="mt-2 text-suave">Sem alertas este mês.</p>}
        <ul className="mt-2 grid gap-3">
          {insights.slice(0, 3).map((i) => (
            <li key={i.id}>
              <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-negativo' : ''}`}>{i.titulo}</div>
              <div className="text-sm text-suave">{i.detalhe}</div>
            </li>
          ))}
        </ul>
        <Link to="/insights" className="mt-3 inline-block text-marca-texto font-semibold">Ver todos</Link>
      </Moldura>

      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Últimos lançamentos</h3>
        <ul className="mt-2 divide-y divide-[var(--linha)]">
          {ultimos.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-3">
              <div>
                <div>
                  {l.descricao ?? nomeCat(l.categoriaId)}
                  {l.parcelamento && <span className="ml-2 valor text-xs text-suave">{l.parcelamento.numero}/{l.parcelamento.total}</span>}
                </div>
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

`domain/categorias.ts` (transferências e ajustes mexem no saldo, nunca em gasto por categoria; pagamentos de financiamento existente também ficam de fora: a parcela é do contrato e aparece em "Financiamentos", nunca sob uma categoria):

```ts
import { ehMovimentoInterno, ehPagamentoParcela } from './fluxo'
import { mesDe } from './meses'
import type { Centavos, Financiamento, Lancamento, Mes } from './tipos'

export function topCategorias(lancs: Lancamento[], financiamentos: Pick<Financiamento, 'id'>[], mes: Mes, n: number) {
  const ids = new Set(financiamentos.map((f) => f.id))
  const saidas = lancs.filter(
    (l) => l.tipo === 'saida' && !ehMovimentoInterno(l) && !ehPagamentoParcela(l, ids) && mesDe(l.data) === mes,
  )
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

const f1 = { id: 'f1' }

const s = (categoriaId: string, valor: number, data = '2026-10-05'): Lancamento => ({
  id: categoriaId + valor + data, valor, data, tipo: 'saida', categoriaId,
  natureza: 'variavel', contaId: 'c', status: 'pago',
})

describe('topCategorias', () => {
  const ls = [s('mer', 6000), s('alu', 3000), s('mer', 1000), s('mer', 9999, '2026-09-01')]
  it('agrupa, ordena e calcula percentual do mês', () => {
    expect(topCategorias(ls, [], '2026-10', 5)).toEqual([
      { categoriaId: 'mer', total: 7000, pct: 70 },
      { categoriaId: 'alu', total: 3000, pct: 30 },
    ])
  })
  it('respeita o limite n', () => expect(topCategorias(ls, [], '2026-10', 1)).toHaveLength(1))
  it('mês sem saídas devolve lista vazia', () => expect(topCategorias(ls, [], '2026-11', 3)).toEqual([]))
  it('ignora transferência e ajuste', () => {
    const internos: Lancamento[] = [
      { ...s('transferencia', 50000), especie: 'transferencia' },
      { ...s('ajuste', 5000), especie: 'ajuste' },
    ]
    expect(topCategorias([...ls, ...internos], [], '2026-10', 5)).toEqual(topCategorias(ls, [], '2026-10', 5))
  })
  it('ignora pagamento de financiamento existente, mas não o de financiamento apagado', () => {
    // 95.000 ligado a f1 (existe): fora, o resultado não muda (mer 7.000 = 70%, alu 3.000 = 30%).
    const pagamento: Lancamento = { ...s('moradia', 95000), financiamentoId: 'f1' }
    expect(topCategorias([...ls, pagamento], [f1], '2026-10', 5)).toEqual(topCategorias(ls, [f1], '2026-10', 5))
    // financiamentoId órfão (financiamento apagado) volta a ser saída comum: total 7.000 + 3.000 + 20.000 = 30.000
    // moradia 20.000 = 66,67% → 67; mer 7.000 = 23,33% → 23; alu 3.000 = 10%.
    const orfao: Lancamento = { ...s('moradia', 20000), financiamentoId: 'apagado' }
    expect(topCategorias([...ls, orfao], [f1], '2026-10', 5)).toEqual([
      { categoriaId: 'moradia', total: 20000, pct: 67 },
      { categoriaId: 'mer', total: 7000, pct: 23 },
      { categoriaId: 'alu', total: 3000, pct: 10 },
    ])
  })
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

export type Cartao = 'sobra' | 'pendencias' | 'compromissos' | 'visaoGeral' | 'destino' | 'reserva' | 'insights' | 'ultimos'

export function ordemCartoes(obj: Objetivo[]): Cartao[] {
  const extras: Cartao[] = []
  if (obj.includes('destino')) extras.push('destino')
  if (obj.includes('meta')) extras.push('reserva')
  const lista: Cartao[] = ['sobra', ...extras, 'pendencias', 'compromissos', 'visaoGeral', 'insights', 'ultimos']
  return obj.includes('contas_em_dia') ? ['pendencias', ...lista.filter((c) => c !== 'pendencias')] : lista
}
```

`ordemCartoes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ordemCartoes } from './ordemCartoes'

describe('ordemCartoes', () => {
  it('padrão', () =>
    expect(ordemCartoes([])).toEqual(['sobra', 'pendencias', 'compromissos', 'visaoGeral', 'insights', 'ultimos']))
  it('contas_em_dia põe pendências primeiro', () => expect(ordemCartoes(['contas_em_dia'])[0]).toBe('pendencias'))
  it('destino e meta entram depois da sobra', () =>
    expect(ordemCartoes(['destino', 'meta']).slice(0, 3)).toEqual(['sobra', 'destino', 'reserva']))
  it('nao_estourar mantém o padrão', () => expect(ordemCartoes(['nao_estourar'])).toEqual(ordemCartoes([])))
  it('compromissos aparece sempre', () => expect(ordemCartoes(['destino', 'meta', 'contas_em_dia'])).toContain('compromissos'))
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
            {p.feito ? <CheckCircle size={22} weight="fill" className="text-marca-texto" /> : <Circle size={22} weight="light" />}
            <span className={p.feito ? 'text-suave line-through' : 'font-semibold'}>{p.rotulo}</span>
          </li>
        ))}
      </ul>
      {proximo.para ? (
        <Link to={proximo.para} className="mt-3 grid min-h-12 place-items-center rounded-full bg-marca font-semibold text-white">{proximo.acao}</Link>
      ) : (
        <button onClick={abrirLancamento} className="mt-3 min-h-12 w-full rounded-full bg-marca font-semibold text-white">{proximo.acao}</button>
      )}
      {proximo.id === 'divida' && (
        <button onClick={() => salvarPrefs({ semFinanciamento: true })} className="mt-1 min-h-11 w-full text-sm text-suave">Não tenho financiamento</button>
      )}
      <button onClick={() => salvarPrefs({ checklistFechado: true })} className="min-h-11 w-full text-sm text-suave">Dispensar</button>
    </Moldura>
  )
}
```

`ui/componentes/CartaoReserva.tsx` (usado no Resumo e na tela Insights; o objeto vem de `useResumo().reserva`):

```tsx
import { Link } from 'react-router-dom'
import { Moldura } from './Moldura'
import { formatarBRL, formatarNumero } from '../../domain/dinheiro'
import type { Centavos } from '../../domain/tipos'

export interface DadosReserva { saldo: Centavos; usandoTodas: boolean; custo: Centavos; alvo: number; cobertos: number; progresso: number }

export function CartaoReserva({ reserva: r, verMais = false }: { reserva: DadosReserva; verMais?: boolean }) {
  return (
    <Moldura>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Reserva</h3>
      <p className="mt-2 valor text-2xl">{formatarNumero(r.cobertos)} <span className="text-base text-suave">de {r.alvo} meses</span></p>
      <div className="mt-3 h-2 rounded-full bg-[var(--linha)]" role="progressbar" aria-valuenow={Math.round(r.progresso)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-marca" style={{ width: `${r.progresso}%` }} />
      </div>
      <p className="mt-2 text-sm text-suave">
        Saldo da reserva {formatarBRL(r.saldo)} · custo essencial de referência {formatarBRL(r.custo)} por mês.
        A meta é {r.alvo} meses porque {r.alvo === 12 ? 'sua renda é variável' : 'sua renda é predominantemente fixa'}.
      </p>
      {r.usandoTodas && (
        <p className="mt-2 text-sm text-suave">
          Usando o saldo de todas as contas. <Link to="/contas" className="font-semibold text-marca-texto">Marque a conta que é sua reserva</Link> para o cálculo ficar exato.
        </p>
      )}
      {verMais && <Link to="/insights" className="mt-3 inline-block font-semibold text-marca-texto">Ver insights</Link>}
    </Moldura>
  )
}
```

Em `Resumo.tsx`: montar um `Record<Cartao, ReactNode>` com os cartões já escritos no Step 3, mais:
- `destino`: `<Moldura>` "Para onde foi o dinheiro" listando `topCategorias(lancamentos, financiamentos, mes, 3)` com nome da categoria, `%` e `formatarBRL(total)` (saída em coral com sinal −).
- `reserva`: `<CartaoReserva reserva={reserva} verMais />`.
- `compromissos`: cartão "Comprometido nos próximos meses" (3 meses, términos e link para a tela de 6 meses):

```tsx
compromissos: (
  <Moldura>
    <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Comprometido nos próximos meses</h3>
    {compromissos.meses.slice(0, 3).every((m) => m.total === 0) && compromissos.terminos.length === 0 ? (
      <p className="mt-2 text-suave">Nada programado.</p>
    ) : (
      <>
        <ul className="mt-2 divide-y divide-[var(--linha)]">
          {compromissos.meses.slice(0, 3).map((m) => (
            <li key={m.mes} className="flex items-baseline justify-between py-2">
              <span>{rotuloMes(m.mes)}</span>
              <span className="valor text-divida">− {formatarBRL(m.total)}</span>
            </li>
          ))}
        </ul>
        {compromissos.terminos.slice(0, 3).map((t) => (
          <p key={`${t.origem}-${t.descricao}-${t.mes}`} className="mt-1 text-sm text-suave">
            {nomeCompromisso(t.descricao, categorias)} termina em {rotuloMes(t.mes)}
          </p>
        ))}
      </>
    )}
    <Link to="/compromissos" className="mt-3 inline-block font-semibold text-marca-texto">Ver 6 meses</Link>
  </Moldura>
),
```

(imports extras em `Resumo.tsx`: `CartaoReserva`, `rotuloMes` e `nomeCompromisso` de `../rotulos`, `topCategorias`; `financiamentos` vem de `useResumo(mes)`). No topo do `return` (antes do checklist e dos cartões; também no estado vazio, pois um saldo inicial negativo já gera alerta), os alertas de conta negativa:

```tsx
{alertasConta.map((i) => (
  <div key={i.id} role="alert" className="rounded-2xl bg-[var(--casca)] p-4 ring-1 ring-[var(--vermelho)]">
    <div className="font-semibold text-negativo">{i.titulo}</div>
    <div className="text-sm text-suave">{i.detalhe}</div>
  </div>
))}
```

Renderizar `ordemCartoes(usePrefs().objetivos).map((c) => <Fragment key={c}>{cartoes[c]}</Fragment>)` e colocar `<ChecklistInicial abrirLancamento={abrirLancamento} />` logo abaixo dos alertas. O estado vazio (sem lançamentos) passa a mostrar o checklist em vez do cartão simples.

`ui/telas/Compromissos.tsx` (rota `/compromissos`, aberta pelo card; 6 meses por tipo, itens e términos):

```tsx
import { Moldura } from '../componentes/Moldura'
import { useResumo } from '../hooks/useResumo'
import { formatarBRL } from '../../domain/dinheiro'
import { nomeCompromisso, rotuloMes } from '../rotulos'
import type { Mes } from '../../domain/tipos'

const ROTULO = { financiamentos: 'Financiamentos', parcelados: 'Compras parceladas', recorrencias: 'Recorrentes', outros: 'Outros pendentes' } as const

export default function Compromissos({ mes }: { mes: Mes }) {
  const { compromissos, categorias } = useResumo(mes)
  return (
    <div className="grid gap-4">
      {compromissos.meses.map((m) => (
        <Moldura key={m.mes}>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">{rotuloMes(m.mes)}</h3>
            <span className="valor text-lg text-divida">− {formatarBRL(m.total)}</span>
          </div>
          {(Object.keys(ROTULO) as (keyof typeof ROTULO)[]).filter((k) => m[k] > 0).map((k) => (
            <div key={k} className="mt-1 flex items-baseline justify-between text-sm"><span className="text-suave">{ROTULO[k]}</span><span className="valor">{formatarBRL(m[k])}</span></div>
          ))}
          <ul className="mt-3 divide-y divide-[var(--linha)] text-sm">
            {m.itens.map((i, k) => (
              // `descricao` pode ser o id da categoria (lançamento sem descrição): mostrar o NOME.
              <li key={k} className="flex justify-between py-2"><span>{nomeCompromisso(i.descricao, categorias)}</span><span className="valor">{formatarBRL(i.valor)}</span></li>
            ))}
          </ul>
        </Moldura>
      ))}
      <Moldura>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Quando termina</h3>
        {compromissos.terminos.length === 0 && <p className="mt-2 text-suave">Nenhum compromisso com data de término.</p>}
        <ul className="mt-2 grid gap-2 text-sm">
          {compromissos.terminos.map((t) => (
            <li key={`${t.origem}-${t.descricao}-${t.mes}`}>{nomeCompromisso(t.descricao, categorias)} termina em {rotuloMes(t.mes)} · última de {formatarBRL(t.valor)}</li>
          ))}
        </ul>
      </Moldura>
    </div>
  )
}
```

Em `App.tsx`, adicionar também a rota `/compromissos` → `<Compromissos mes={mes} />` (sem item no drawer: a tela abre pelo card do Resumo).

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
- [ ] Campo **descrição** visível sob o valor (opcional; gravado em `descricao` só quando preenchido). Grade de categorias do tipo escolhido (`categoriasDaGrade`: categorias de sistema nunca aparecem), ordenadas por uso; tocar numa categoria **salva** (valor > 0) e fecha; data padrão = hoje (`hojeLocal()`).
- [ ] **Data válida**: `salvar` bloqueia (com `alert`) data vazia ou inexistente (`dataReal` de `ui/validacao.ts`) — o `<input type="date">` devolve `''` quando limpo e isso nunca é gravado. Campos de dígitos usam `somenteDigitos` (até 12).
- [ ] "Mais opções": conta, data, natureza, fonte (entrada), observação, pendente, repete todo mês (com "Termina em" opcional → `recorrenciaAte`) e, em saídas, o seletor **"Tipo de saída"**: *Comum*, *Parcelado* ou *Pagamento de financiamento*. Campos opcionais ficam omitidos quando vazios — nunca `null`.
- [ ] **Parcelado**: o valor digitado é o da parcela; informa total de parcelas (≥ 2), qual é a parcela deste mês e a data dela; mostra a prévia com a semântica de `resumoParcelamento` (`restantes` = parcelas ainda pendentes): com a parcela atual **paga**, 4/12 de R$ 50,00 mostra "Faltam 8 · R$ 400,00 · última em jun/27"; só quando a atual está **pendente** a prévia soma a de hoje e acrescenta "(inclui a de hoje)" ("Faltam 9 · R$ 450,00 · última em jun/27 (inclui a de hoje)") e grava o grupo com `criarParcelamento` + `bulkPut` (da parcela atual até a última; a atual com o status escolhido, as futuras pendentes). Erros do motor aparecem em `alert`.
- [ ] **Pagamento de financiamento**: escolhe o contrato e se é *Parcela* ou *Antecipação* → grava `financiamentoId` + `pagamentoFinanciamento`; em "Parcela", o valor vem preenchido com a parcela do contrato (`estadoFinanciamento(f, lancamentos).restantes[0].parcela`) e avisa quando o valor digitado difere (a parcela avança exatamente uma; o excesso conta como despesa).
- [ ] Na lista, todo lançamento `pendente` (inclusive cada cópia recorrente, que nasce pendente) tem o botão **"Marcar como pago"**, que salva `{ ...l, status: 'pago' }`; o botão **"Cancelar recorrência"** (no modelo e nas cópias de uma recorrência ativa) usa `cancelarRecorrencia(modelo, mês atual)`; parcelados mostram **"4/12"**; a linha mostra `descricao` quando existe (a categoria vai para o texto secundário).
- [ ] Lista de lançamentos do mês com filtro por tipo e exclusão (botão de lixeira com confirmação; excluir uma transferência apaga as duas pontas).
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

- [ ] **Step 2: `LancamentoRapido.tsx`** (folha inferior; salva ao tocar a categoria). Além do fluxo rápido, "Mais opções" traz o tipo de saída: **comum**, **parcelado** (`criarParcelamento`) ou **pagamento de financiamento** (`financiamentoId` + `pagamentoFinanciamento`). Campos opcionais entram só quando preenchidos (spread condicional); nunca `null`.

```tsx
import { useMemo, useRef, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { categoriasDaGrade, useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { estadoFinanciamento } from '../../domain/fluxo'
import { hojeLocal, mesDe } from '../../domain/meses'
import { criarParcelamento, resumoParcelamento } from '../../domain/parcelamento'
import { rotuloMes } from '../rotulos'
import { dataReal, somenteDigitos } from '../validacao'
import type { Categoria, Lancamento, PagamentoFinanciamento, TipoLancamento } from '../../domain/tipos'

export default function LancamentoRapido({ fechar }: { fechar: () => void }) {
  const d = useDados()
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  const [digitos, setDigitos] = useState('')
  const [descricao, setDescricao] = useState('')
  const [mais, setMais] = useState(false)
  const [modo, setModo] = useState<'comum' | 'parcelado' | 'financiamento'>('comum')
  const [data, setData] = useState(hojeLocal())
  const [obs, setObs] = useState('')
  const [pendente, setPendente] = useState(false)
  const [repete, setRepete] = useState(false)
  const [ate, setAte] = useState('') // 'YYYY-MM' (último mês da recorrência), opcional
  const [contaId, setContaId] = useState('')
  const [fonteId, setFonteId] = useState('')
  const [totalParc, setTotalParc] = useState('') // parcelado: total de parcelas
  const [parcAtual, setParcAtual] = useState('1') // parcelado: qual é a parcela deste mês
  const [financId, setFinancId] = useState('')
  const [pagTipo, setPagTipo] = useState<PagamentoFinanciamento>('parcela')
  const [natureza, setNatureza] = useState<'auto' | 'fixo' | 'variavel'>('auto')
  const valor = centavosDeDigitos(digitos)
  const campo = useRef<HTMLInputElement>(null)
  const efetivo = tipo === 'saida' ? modo : 'comum' // entrada nunca é parcelada nem pagamento de contrato

  // Categorias de sistema (transferência, ajuste) nunca entram na grade.
  const categorias = useMemo(() => {
    const usos = new Map<string, number>()
    d.lancamentos.forEach((l) => usos.set(l.categoriaId, (usos.get(l.categoriaId) ?? 0) + 1))
    return categoriasDaGrade(d.categorias, tipo).sort((a, b) => (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0))
  }, [d.categorias, d.lancamentos, tipo])

  // Parcela do contrato que um pagamento do tipo "parcela" consome (a próxima em aberto).
  const financ = d.financiamentos.find((f) => f.id === financId)
  const proxima = financ ? estadoFinanciamento(financ, d.lancamentos).restantes[0] : undefined
  const difere = efetivo === 'financiamento' && pagTipo === 'parcela' && proxima !== undefined && valor > 0 && valor !== proxima.parcela

  // Prévia do parcelado: quantas faltam, quanto falta pagar e o mês da última.
  const previa = useMemo(() => {
    if (efetivo !== 'parcelado' || valor <= 0) return null
    try {
      return resumoParcelamento(criarParcelamento({
        grupoId: 'previa', valorParcela: valor, total: Number(totalParc), parcelaAtual: Number(parcAtual),
        dataParcelaAtual: data, statusAtual: pendente ? 'pendente' : 'pago',
        base: { tipo: 'saida', categoriaId: '', natureza: 'variavel', contaId: '' },
      }))
    } catch { return null } // total/parcela atual inválidos: sem prévia
  }, [efetivo, valor, totalParc, parcAtual, data, pendente])

  async function salvar(c: Categoria) {
    if (valor <= 0) { campo.current?.focus(); return }
    if (!dataReal(data)) { alert('Informe uma data válida.'); return } // nunca grava data vazia/inválida
    const desc = descricao.trim()
    const base = {
      tipo, categoriaId: c.id, natureza: natureza === 'auto' ? c.natureza : natureza,
      contaId: contaId || d.contas[0]?.id || '',
      ...(desc ? { descricao: desc } : {}),
      ...(obs.trim() ? { observacao: obs.trim() } : {}),
    }
    if (efetivo === 'parcelado') {
      try {
        // grupo inteiro (parcela atual até a última) numa operação só; ids `${grupoId}:${n}`
        await db.lancamentos.bulkPut(criarParcelamento({
          grupoId: novoId(), valorParcela: valor, total: Number(totalParc), parcelaAtual: Number(parcAtual),
          dataParcelaAtual: data, statusAtual: pendente ? 'pendente' : 'pago', base,
        }))
      } catch (e) { alert((e as Error).message); return }
      fechar()
      return
    }
    if (efetivo === 'financiamento' && !financId) { alert('Escolha o financiamento.'); return }
    if (repete && ate && ate < mesDe(data)) { alert('O fim da recorrência deve ser depois da data do lançamento.'); return }
    const fonte = fonteId || d.fontes[0]?.id
    const l: Lancamento = {
      ...base, id: novoId(), valor, data, status: pendente ? 'pendente' : 'pago',
      ...(tipo === 'entrada' && fonte ? { fonteId: fonte } : {}),
      ...(efetivo === 'financiamento' ? { financiamentoId: financId, pagamentoFinanciamento: pagTipo } : {}),
      ...(repete && efetivo === 'comum' ? { recorrencia: 'mensal' as const, ...(ate ? { recorrenciaAte: ate } : {}) } : {}),
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
            onChange={(e) => setDigitos(somenteDigitos(e.target.value))}
            className="absolute opacity-0 pointer-events-none" aria-label="Valor em centavos" />
          <span onClick={() => campo.current?.focus()} className="valor block text-4xl font-medium">{formatarBRL(valor)}</span>
          {efetivo === 'parcelado' && <span className="text-xs text-suave">valor de cada parcela</span>}
        </label>

        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" aria-label="Descrição"
          className="mt-4 min-h-11 w-full rounded-xl bg-[var(--casca)] px-3 text-sm" />

        <div className="mt-4 grid grid-cols-4 gap-2">
          {categorias.map((c) => (
            <button key={c.id} onClick={() => salvar(c)}
              className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--casca)] p-2 text-center text-[11px] leading-tight active:scale-95 transition-transform duration-300 ease-[var(--ease)]">
              <Icone nome={c.icone} />
              {c.nome}
            </button>
          ))}
        </div>

        <button onClick={() => setMais(!mais)} className="mt-4 min-h-11 text-sm font-semibold text-marca-texto">
          {mais ? 'Menos opções' : 'Mais opções'}
        </button>
        {mais && (
          <div className="mt-2 grid gap-3 text-sm">
            {tipo === 'saida' && (
              <label className="grid gap-1">Tipo de saída
                <select value={modo} onChange={(e) => setModo(e.target.value as typeof modo)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                  <option value="comum">Comum</option>
                  <option value="parcelado">Parcelado</option>
                  {d.financiamentos.length > 0 && <option value="financiamento">Pagamento de financiamento</option>}
                </select>
              </label>
            )}
            {efetivo === 'parcelado' && (
              <>
                <label className="grid gap-1">Total de parcelas
                  <input inputMode="numeric" value={totalParc} onChange={(e) => setTotalParc(somenteDigitos(e.target.value))} placeholder="12" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                </label>
                <label className="grid gap-1">Qual é a parcela deste mês?
                  <input inputMode="numeric" value={parcAtual} onChange={(e) => setParcAtual(somenteDigitos(e.target.value))} placeholder="1" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                </label>
                {previa && (
                  <p className="text-suave">
                    Faltam {previa.restantes} · {formatarBRL(previa.valorRestante)} · última em {previa.ultimaData ? rotuloMes(mesDe(previa.ultimaData)) : ''}
                    {pendente ? ' (inclui a de hoje)' : ''}
                  </p>
                )}
              </>
            )}
            {efetivo === 'financiamento' && (
              <>
                <label className="grid gap-1">Financiamento
                  <select value={financId}
                    onChange={(e) => {
                      setFinancId(e.target.value)
                      const f = d.financiamentos.find((x) => x.id === e.target.value)
                      const prox = f && estadoFinanciamento(f, d.lancamentos).restantes[0]
                      if (prox && pagTipo === 'parcela' && valor === 0) setDigitos(String(prox.parcela))
                    }}
                    className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
                    <option value="">Escolha…</option>
                    {d.financiamentos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </label>
                <div role="radiogroup" className="grid grid-cols-2 rounded-full bg-[var(--casca)] p-1">
                  {(['parcela', 'antecipacao'] as const).map((p) => (
                    <button key={p} role="radio" aria-checked={pagTipo === p} onClick={() => setPagTipo(p)}
                      className={`min-h-11 rounded-full font-semibold ${pagTipo === p ? 'bg-[var(--superficie)]' : 'text-suave'}`}>
                      {p === 'parcela' ? 'Parcela' : 'Antecipação'}
                    </button>
                  ))}
                </div>
                {pagTipo === 'parcela' && proxima && <p className="text-suave">Parcela do contrato: {formatarBRL(proxima.parcela)}</p>}
                {difere && proxima && (
                  <p role="alert" className="aviso">
                    Pagar uma parcela sempre avança exatamente uma parcela do contrato.{' '}
                    {valor > proxima.parcela ? `A diferença de ${formatarBRL(valor - proxima.parcela)} conta como despesa comum.` : 'O contrato dá a parcela por paga mesmo com valor menor.'}
                  </p>
                )}
              </>
            )}
            <label className="grid gap-1">{efetivo === 'parcelado' ? 'Data desta parcela' : 'Data'}<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
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
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={pendente} onChange={(e) => setPendente(e.target.checked)} className="size-5" />{efetivo === 'parcelado' ? 'Esta parcela ainda não foi paga' : 'Ainda não foi pago/recebido'}</label>
            {efetivo === 'comum' && (
              <>
                <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={repete} onChange={(e) => setRepete(e.target.checked)} className="size-5" />Repete todo mês</label>
                {repete && (
                  <label className="grid gap-1">Termina em (opcional)
                    <input type="month" value={ate} onChange={(e) => setAte(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                  </label>
                )}
              </>
            )}
          </div>
        )}
        <p className="mt-3 text-center text-xs text-suave">Digite o valor e toque na categoria para salvar.</p>
      </div>
    </div>
  )
}
```

Notas: (1) `bulkPut` do grupo inteiro é uma operação atômica; as parcelas anteriores à adoção do app não são criadas. (2) O pagamento de financiamento é uma saída comum com `financiamentoId`: ele **substitui** a parcela no fluxo (não conta em dobro); o que passar do valor da parcela do contrato conta como despesa comum.

- [ ] **Step 3: `Lancamentos.tsx`** — lista do mês com filtro, "Marcar como pago", parcelado "4/12", cancelar recorrência e exclusão

```tsx
import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { Moldura } from '../componentes/Moldura'
import { useDados } from '../hooks/useDados'
import { repo } from '../../data/repo'
import { db } from '../../data/db'
import { formatarBRL } from '../../domain/dinheiro'
import { hojeLocal, mesDe } from '../../domain/meses'
import { cancelarRecorrencia } from '../../domain/recorrencia'
import { rotuloMes } from '../rotulos'
import type { Lancamento } from '../../domain/tipos'

export default function Lancamentos({ mes }: { mes: string }) {
  const d = useDados()
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const mesAtual = mesDe(hojeLocal())
  const nome = (id: string) => d.categorias.find((c) => c.id === id)?.nome ?? ''
  const itens = d.lancamentos
    .filter((l) => mesDe(l.data) === mes && (filtro === 'todos' || l.tipo === filtro))
    .sort((a, b) => b.data.localeCompare(a.data))

  // O modelo da recorrência: o próprio lançamento (modelo) ou aquele de que a cópia nasceu (`origemId`).
  const modeloDe = (l: Lancamento) =>
    l.recorrencia === 'mensal' ? l : d.lancamentos.find((m) => m.id === l.origemId && m.recorrencia === 'mensal')
  const ativo = (m?: Lancamento) => m !== undefined && (m.recorrenciaAte === undefined || m.recorrenciaAte > mesAtual)

  // `{ ...modelo, recorrenciaAte }` (dentro de cancelarRecorrencia) preserva o `geradoAte` do modelo.
  const cancelar = (m: Lancamento) => repo.lancamentos.salvar(cancelarRecorrencia(m, mesAtual))

  async function excluir(l: Lancamento) {
    if (!confirm(l.transferenciaId ? 'Excluir esta transferência (as duas pontas)?' : 'Excluir este lançamento?')) return
    if (l.transferenciaId) await db.lancamentos.where('transferenciaId').equals(l.transferenciaId).delete()
    else await repo.lancamentos.remover(l.id)
  }

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
          {itens.map((l) => {
            const modelo = modeloDe(l)
            const fin = d.financiamentos.find((f) => f.id === l.financiamentoId)
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                <div className="min-w-0">
                  <div className="truncate">
                    {l.descricao ?? nome(l.categoriaId)}
                    {l.parcelamento && <span className="ml-2 valor text-xs text-suave">{l.parcelamento.numero}/{l.parcelamento.total}</span>}
                  </div>
                  <div className="text-xs text-suave">
                    {l.data.slice(8)}/{l.data.slice(5, 7)}{l.descricao ? ` · ${nome(l.categoriaId)}` : ''} · {l.natureza}
                    {l.status === 'pendente' ? ' · pendente' : ''}
                    {fin ? ` · ${l.pagamentoFinanciamento === 'antecipacao' ? 'antecipação' : 'parcela'} de ${fin.nome}` : ''}
                    {modelo?.recorrenciaAte ? ` · recorrência até ${rotuloMes(modelo.recorrenciaAte)}` : ''}
                    {l.observacao ? ` · ${l.observacao}` : ''}
                  </div>
                </div>
                <span className={`valor ${l.tipo === 'entrada' ? 'text-positivo' : 'text-negativo'}`}>
                  {l.tipo === 'entrada' ? '+' : '−'} {formatarBRL(l.valor)}
                </span>
                {l.status === 'pendente' && (
                  <button className="min-h-11 rounded-full px-3 text-sm font-semibold text-marca-texto"
                    onClick={() => repo.lancamentos.salvar({ ...l, status: 'pago' })}>
                    Marcar como pago
                  </button>
                )}
                {modelo && ativo(modelo) && (
                  <button className="min-h-11 rounded-full px-3 text-sm font-semibold text-suave" onClick={() => cancelar(modelo)}>
                    Cancelar recorrência
                  </button>
                )}
                <button aria-label="Excluir lançamento" className="size-11 grid place-items-center text-suave" onClick={() => excluir(l)}>
                  <Trash size={20} weight="light" />
                </button>
              </li>
            )
          })}
        </ul>
      </Moldura>
    </div>
  )
}
```

Notas sobre recorrência:
- "Cancelar recorrência" encerra no mês atual (`cancelarRecorrencia(modelo, mês atual)`): o modelo não gera mais cópias depois dele e nada já lançado é apagado.
- Editar um modelo preserva o `geradoAte` (salve `{ ...modelo, ...edicoes }`).
- Reativar/estender: remover ou aumentar `recorrenciaAte` basta (`{ ...modelo, recorrenciaAte: novo }`, sem mexer em `geradoAte`): o motor nunca avança a marca d'água além de `recorrenciaAte`, então os meses que ficaram de fora são gerados na próxima abertura do app.

- [ ] **Step 4: `EtapaRenda.tsx`** — perguntas 2 e 3 do onboarding: escolhe fontes por exemplo e cria conta (o `Onboarding.tsx` que orquestra as etapas está no Step 4b)

```tsx
import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { repo, novoId } from '../../data/repo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'
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
                  onChange={(e) => setSel((s) => ({ ...s, [o.tipo]: somenteDigitos(e.target.value) }))}
                  className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
                <span className="text-suave">{formatarBRL(centavosDeDigitos(sel[o.tipo]))}</span>
              </label>
            )}
          </Moldura>
        )
      })}
      <Moldura>
        <label className="grid gap-1 text-sm">Quanto você tem hoje em conta e carteira?
          <input inputMode="numeric" value={saldo} onChange={(e) => setSaldo(somenteDigitos(e.target.value))}
            className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
          <span className="text-suave">{formatarBRL(centavosDeDigitos(saldo))}</span>
        </label>
      </Moldura>
      <button disabled={Object.keys(sel).length === 0} onClick={concluir}
        className="min-h-12 rounded-full bg-marca px-6 font-semibold text-white disabled:opacity-40">
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
      <li className="flex gap-3"><Lock size={22} weight="light" className="shrink-0 text-marca-texto" />Nada sai do seu celular: o app não envia seus dados para lugar nenhum.</li>
      <li className="flex gap-3"><CheckCircle size={22} weight="light" className="shrink-0 text-marca-texto" />Faça um backup de vez em quando para não perder nada ao trocar de aparelho.</li>
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
          className="min-h-12 rounded-full bg-marca font-semibold text-white disabled:opacity-40">
          Continuar
        </button>
      </div>
    )

  return (
    <div className="grid gap-5 pt-8">
      <h1 className="text-3xl font-extrabold leading-tight">Controle seus gastos.<br />Fácil assim.</h1>
      <p className="text-suave">Responda 3 perguntas e o app se monta do seu jeito.</p>
      <Moldura><Privacidade /></Moldura>
      <button onClick={() => setEtapa('objetivos')} className="min-h-12 rounded-full bg-marca font-semibold text-white">Montar meu controle</button>
      <p className="text-center text-xs text-suave">Leva menos de 1 minuto · sem cadastro</p>
      <button onClick={() => arquivo.current?.click()} className="min-h-11 text-sm font-semibold text-marca-texto">Já uso · Restaurar backup</button>
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

Run: `npm run build` → sucesso. No navegador: onboarding → criar saída de R$ 12,50 em Mercado (valor + 1 toque) → aparece no Resumo e em Lançamentos; marcar "pendente" altera Saldo seguro. Parcelado: "Mais opções" → Parcelado, R$ 50,00 × 12, parcela atual 4 → criam-se 9 lançamentos (4/12 a 12/12), a lista mostra "4/12" e a prévia mostra "Faltam 8 · R$ 400,00 · última em jun/27" (a parcela de hoje está paga); marcando "Esta parcela ainda não foi paga" a prévia passa a "Faltam 9 · R$ 450,00 · última em jun/27 (inclui a de hoje)". Pagamento de financiamento: escolher o contrato e "Parcela" → valor pré-preenchido com a parcela do contrato, aviso se for diferente. Transferência e ajuste (Task 11) nunca aparecem na grade de categorias.

```bash
git add -A && git commit -m "feat(ui): lancamento rapido, lista de lancamentos e onboarding"
```

---

### Task 11: Contas, fontes de renda e categorias

**Goal:** Telas de gestão de contas (banco/caixa), fontes de renda e categorias.

**Files:**
- Create: `app/src/ui/telas/Contas.tsx`, `Fontes.tsx`, `Categorias.tsx`, `app/src/ui/componentes/FormRapido.tsx`, `app/src/ui/componentes/CampoValor.tsx`
- Modify: `app/src/App.tsx` (rotas `/contas`, `/fontes`, `/categorias`)

**Acceptance Criteria:**
- [ ] Contas: lista com o saldo por conta vindo de `situacaoContas(contas, lancamentos, mêsAtual).saldo` (pagos até o fim do mês corrente, **não** o saldo do mês visto), adicionar, editar nome/tipo/saldo inicial, remover (bloqueia se houver lançamentos na conta, inclusive transferências e ajustes, com mensagem).
- [ ] Saldo inicial **com sinal**: botão ± ao lado do campo (`CampoValor`); o saldo pode ser negativo. Campos opcionais **limite** e **taxa do cheque especial** (% ao mês, até 4 casas decimais: 7,9899 é preservado ao editar) e a caixa **"Esta é minha reserva"**; vazios ficam omitidos (nunca `null`). Sem nenhuma conta marcada, a tela avisa que a reserva usa todas.
- [ ] Cartão da conta: badge **"Conta negativa"** com o juro estimado do mês (`jurosEstimadoMes`, quando há taxa), aviso de "vai ficar negativa até o fim do mês" (`ficaraNegativa`, com o `previsto`) e **limite disponível** (`limiteDisponivel`, quando há limite).
- [ ] **Conferir saldo**: o usuário informa o saldo real (com sinal), vê a diferença e, ao salvar, `criarAjuste({ saldoApp, saldoReal, ... })` lança o ajuste (`null` = já confere, nada é gravado). O `saldoApp` é o saldo **de hoje**: `saldoContas([conta], lancamentosDaConta, hojeLocal())` (pagos com data até hoje), não o do fim do mês, porque o banco mostra o saldo de agora; pendentes e lançamentos futuros não entram. O motor (`criarAjuste`) não muda.
- [ ] **Transferir**: escolhe a conta de destino, valor e descrição opcional; `criarTransferencia` e as duas pontas gravadas juntas (`bulkPut`). Erros do motor (mesma conta, valor zero) aparecem em `alert`.
- [ ] Fontes: lista com tipo e valor esperado; adicionar/editar/remover.
- [ ] Categorias: lista por tipo (sem as de sistema: transferência e ajuste não aparecem nem podem ser editadas); adicionar com nome, ícone (escolha entre 12 ícones), natureza e "essencial"; remover bloqueado se em uso.

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
          <button type="submit" className="min-h-12 rounded-full bg-marca font-semibold text-white">Salvar</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 1b: `CampoValor.tsx`** — valor em dígitos (centavos) com botão de sinal ±, para saldo inicial e saldo real (saldo pode ser negativo)

```tsx
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { somenteDigitos } from '../validacao'

/** Dígitos + sinal → centavos (sem -0). */
export const comSinal = (digitos: string, negativo: boolean) => {
  const v = centavosDeDigitos(digitos)
  return negativo && v > 0 ? -v : v
}

export function CampoValor({ rotulo, digitos, onDigitos, negativo, onNegativo }: {
  rotulo: string; digitos: string; onDigitos: (d: string) => void; negativo: boolean; onNegativo: (n: boolean) => void
}) {
  return (
    <div className="grid gap-1 text-sm">
      <span>{rotulo}</span>
      <div className="flex gap-2">
        <button type="button" aria-pressed={negativo} aria-label={negativo ? 'Valor negativo (tocar para positivo)' : 'Valor positivo (tocar para negativo)'}
          onClick={() => onNegativo(!negativo)} className="size-11 shrink-0 rounded-xl bg-[var(--casca)] text-lg font-semibold">
          {negativo ? '−' : '+'}
        </button>
        <input inputMode="numeric" aria-label={rotulo} value={digitos} onChange={(e) => onDigitos(somenteDigitos(e.target.value))}
          className="valor min-h-11 w-full rounded-xl bg-[var(--casca)] px-3" />
      </div>
      <span className="text-suave">{formatarBRL(comSinal(digitos, negativo))}</span>
    </div>
  )
}
```

- [ ] **Step 2: `Contas.tsx`** — saldo (do mês corrente, o mesmo número usado em "Conferir saldo"), cheque especial, reserva, conferir saldo, transferir

```tsx
import { useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { FormRapido } from '../componentes/FormRapido'
import { CampoValor, comSinal } from '../componentes/CampoValor'
import { useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { db } from '../../data/db'
import { criarAjuste, criarTransferencia, saldoReserva, situacaoContas } from '../../domain/contas'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { saldoContas } from '../../domain/fluxo'
import { somenteDigitos } from '../validacao'
import { hojeLocal, mesDe } from '../../domain/meses'
import type { Conta } from '../../domain/tipos'

export default function Contas() {
  const d = useDados()
  const mesAtual = mesDe(hojeLocal())
  const situacao = new Map(situacaoContas(d.contas, d.lancamentos, mesAtual).map((s) => [s.contaId, s]))
  const reserva = saldoReserva(d.contas, d.lancamentos) // só `usandoTodas` interessa aqui
  // Saldo de HOJE da conta (pagos com data <= hoje): é o que se confere com o banco; o cartão mostra o do fim do mês.
  const saldoHoje = (c: Conta) => saldoContas([c], d.lancamentos.filter((l) => l.contaId === c.id), hojeLocal())

  // cadastro/edição
  const [edit, setEdit] = useState<Conta | null>(null)
  const [saldo, setSaldo] = useState('')
  const [neg, setNeg] = useState(false)
  const [limite, setLimite] = useState('') // dígitos = centavos; vazio = sem limite
  const [taxa, setTaxa] = useState('') // % ao mês (ex. "8"); vazio = sem taxa
  // conferir saldo e transferir
  const [conferir, setConferir] = useState<Conta | null>(null)
  const [real, setReal] = useState('')
  const [negReal, setNegReal] = useState(false)
  const [transf, setTransf] = useState<Conta | null>(null)
  const [destinoId, setDestinoId] = useState('')
  const [valorTr, setValorTr] = useState('')
  const [descTr, setDescTr] = useState('')

  const abrir = (c: Conta) => {
    setEdit(c)
    setSaldo(String(Math.abs(c.saldoInicial))); setNeg(c.saldoInicial < 0)
    setLimite(c.limiteChequeEspecial === undefined ? '' : String(c.limiteChequeEspecial))
    // até 4 casas decimais de percent, sem zeros à direita ("8", "7,9899")
    setTaxa(c.taxaChequeEspecial === undefined ? '' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(c.taxaChequeEspecial * 100))
  }
  const novo = () => abrir({ id: novoId(), nome: '', tipo: 'banco', saldoInicial: 0 })

  async function salvar() {
    if (!edit || !edit.nome.trim()) return
    // `taxa` guarda o percent com até 4 casas (vírgula ou ponto); a fração gravada mantém essa precisão.
    const taxaNum = taxa.trim() === '' ? undefined : Number(taxa.replace(',', '.')) / 100
    if (taxaNum !== undefined && !(Number.isFinite(taxaNum) && taxaNum >= 0)) { alert('Taxa do cheque especial inválida.'); return }
    const lim = centavosDeDigitos(limite)
    // Opcionais entram só quando preenchidos (nunca null/undefined gravado à força).
    const { limiteChequeEspecial: _l, taxaChequeEspecial: _t, reserva: _r, ...base } = edit
    await repo.contas.salvar({
      ...base, nome: edit.nome.trim(), saldoInicial: comSinal(saldo, neg),
      ...(lim > 0 ? { limiteChequeEspecial: lim } : {}),
      ...(taxaNum !== undefined ? { taxaChequeEspecial: taxaNum } : {}),
      ...(edit.reserva ? { reserva: true } : {}),
    })
    setEdit(null)
  }

  async function remover(c: Conta) {
    if (d.lancamentos.some((l) => l.contaId === c.id)) { alert('Esta conta tem lançamentos (inclusive transferências e ajustes). Mova ou exclua-os antes.'); return }
    if (confirm(`Remover ${c.nome}?`)) await repo.contas.remover(c.id)
  }

  // Conferir saldo: o saldo do app é o de `situacaoContas` (o mesmo exibido no cartão); a diferença vira um ajuste.
  async function salvarConferencia() {
    if (!conferir) return
    const ajuste = criarAjuste({ id: novoId(), contaId: conferir.id, saldoApp: saldoHoje(conferir), saldoReal: comSinal(real, negReal), data: hojeLocal() })
    if (ajuste) await repo.lancamentos.salvar(ajuste)
    else alert('O saldo já confere.')
    setConferir(null)
  }

  async function salvarTransferencia() {
    if (!transf) return
    try {
      const par = criarTransferencia({
        id: novoId(), contaOrigemId: transf.id, contaDestinoId: destinoId, valor: centavosDeDigitos(valorTr), data: hojeLocal(),
        ...(descTr.trim() ? { descricao: descTr.trim() } : {}),
      })
      await db.lancamentos.bulkPut(par) // saída e entrada juntas
      setTransf(null)
    } catch (e) { alert((e as Error).message) } // mesma conta ou valor zero
  }

  return (
    <div className="grid gap-4">
      {reserva.usandoTodas && d.contas.length > 0 && (
        <p className="px-1 text-sm text-suave">Nenhuma conta marcada como reserva: a reserva usa todas as contas. Edite uma conta e marque "Esta é minha reserva".</p>
      )}
      {d.contas.map((c) => {
        const s = situacao.get(c.id)
        return (
          <Moldura key={c.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-suave">{c.tipo}{c.reserva ? ' · reserva' : ''}</div>
              </div>
              <div className={`valor text-lg ${s?.negativa ? 'text-negativo' : ''}`}>{formatarBRL(s?.saldo ?? 0)}</div>
            </div>
            {s?.negativa && (
              <p role="status" className="mt-2 rounded-xl bg-[var(--casca)] px-3 py-2 text-sm text-negativo">
                Conta negativa{s.jurosEstimadoMes > 0 ? ` · juro estimado de ${formatarBRL(s.jurosEstimadoMes)} no mês` : ''}
              </p>
            )}
            {s?.ficaraNegativa && (
              <p role="status" className="aviso mt-2 text-sm">
                Vai ficar negativa até o fim do mês (previsto {formatarBRL(s.previsto)})
              </p>
            )}
            {s?.limiteDisponivel !== undefined && (
              <p className="mt-2 text-sm text-suave">
                Limite disponível: <span className={`valor ${s.limiteDisponivel < 0 ? 'text-negativo' : ''}`}>{formatarBRL(s.limiteDisponivel)}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <button className="min-h-11 px-3 text-marca-texto" onClick={() => abrir(c)}>Editar</button>
              <button className="min-h-11 px-3 text-marca-texto" onClick={() => { setConferir(c); setReal(''); setNegReal(false) }}>Conferir saldo</button>
              {d.contas.length > 1 && (
                <button className="min-h-11 px-3 text-marca-texto"
                  onClick={() => { setTransf(c); setDestinoId(d.contas.find((x) => x.id !== c.id)?.id ?? ''); setValorTr(''); setDescTr('') }}>
                  Transferir
                </button>
              )}
              <button className="min-h-11 px-3 text-negativo" onClick={() => remover(c)}>Remover</button>
            </div>
          </Moldura>
        )
      })}
      <button onClick={novo} className="min-h-12 rounded-full bg-marca font-semibold text-white">Adicionar conta</button>

      {edit && (
        <FormRapido titulo="Conta" onSalvar={salvar} onCancelar={() => setEdit(null)}>
          <label className="grid gap-1 text-sm">Nome<input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <label className="grid gap-1 text-sm">Tipo
            <select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as Conta['tipo'] })} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              <option value="banco">Banco</option><option value="caixa">Caixa</option><option value="carteira">Carteira</option>
            </select>
          </label>
          <CampoValor rotulo="Saldo inicial" digitos={saldo} onDigitos={setSaldo} negativo={neg} onNegativo={setNeg} />
          <label className="grid gap-1 text-sm">Limite do cheque especial (opcional)
            <input inputMode="numeric" value={limite} onChange={(e) => setLimite(somenteDigitos(e.target.value))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(limite))}</span>
          </label>
          <label className="grid gap-1 text-sm">Taxa do cheque especial, % ao mês (opcional)
            <input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value.replace(/[^\d.,]/g, '').slice(0, 10))} placeholder="ex.: 8" className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5" checked={edit.reserva === true} onChange={(e) => setEdit({ ...edit, reserva: e.target.checked })} />
            Esta é minha reserva
          </label>
        </FormRapido>
      )}

      {conferir && (
        <FormRapido titulo={`Conferir saldo · ${conferir.nome}`} onSalvar={salvarConferencia} onCancelar={() => setConferir(null)}>
          <p className="text-sm text-suave">Saldo no app hoje: <span className="valor">{formatarBRL(saldoHoje(conferir))}</span></p>
          <CampoValor rotulo="Saldo real no banco" digitos={real} onDigitos={setReal} negativo={negReal} onNegativo={setNegReal} />
          <p className="text-sm">Diferença: <span className="valor">{formatarBRL(comSinal(real, negReal) - saldoHoje(conferir))}</span>. Salvar lança um ajuste de saldo para igualar.</p>
        </FormRapido>
      )}

      {transf && (
        <FormRapido titulo={`Transferir de ${transf.nome}`} onSalvar={salvarTransferencia} onCancelar={() => setTransf(null)}>
          <label className="grid gap-1 text-sm">Para a conta
            <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
              {d.contas.filter((x) => x.id !== transf.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Valor
            <input inputMode="numeric" value={valorTr} onChange={(e) => setValorTr(somenteDigitos(e.target.value))} className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
            <span className="text-suave">{formatarBRL(centavosDeDigitos(valorTr))}</span>
          </label>
          <label className="grid gap-1 text-sm">Descrição (opcional)<input value={descTr} onChange={(e) => setDescTr(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
          <p className="text-xs text-suave">Transferência e ajuste mexem só no saldo das contas; nunca entram em receita, despesa ou sobra.</p>
        </FormRapido>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `Fontes.tsx`** — mesmo padrão de `Contas.tsx`, com campos `nome`, `tipo` (`fixa`/`variavel`/`eventual`, rótulos "Fixa", "Variável", "Eventual"), `valorEsperado` (dígitos→centavos) e, se `fixa`, `diaPagamento` (1–31). Remover é bloqueado se houver lançamento com `fonteId` igual (mensagem "Esta fonte tem entradas registradas."). Lista exibe nome, tipo e `formatarBRL(valorEsperado)`; botão "Adicionar fonte de renda".

```tsx
// Esqueleto exato do estado e do salvar (o restante segue Contas.tsx).
// `diaPagamento` é omitido quando não vale: nunca se grava `undefined`/`null` no campo (o importador de backup rejeita `null`).
const novo = () => abrir({ id: novoId(), nome: '', tipo: 'fixa', valorEsperado: 0 })
async function salvar() {
  if (!edit || !edit.nome.trim()) return
  const { diaPagamento: _d, ...base } = edit
  await repo.fontes.salvar({
    ...base, nome: edit.nome.trim(), valorEsperado: centavosDeDigitos(valor),
    ...(edit.tipo === 'fixa' && dia ? { diaPagamento: Math.min(31, Math.max(1, Number(dia))) } : {}),
  })
  setEdit(null)
}
```

- [ ] **Step 4: `Categorias.tsx`** — lista agrupada por tipo (Saídas / Entradas) usando `categoriasDaGrade(d.categorias, tipo)` (as de sistema nunca aparecem); formulário com nome, ícone (grade com `['House','ForkKnife','ShoppingCart','GasPump','Bus','Heartbeat','Lightning','GraduationCap','FilmSlate','Bag','PawPrint','Gift']` usando `Icone`), natureza padrão, e checkbox "Essencial (entra no custo de vida)". Categoria nova nunca recebe `sistema`. Salvar:

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

**Goal:** Cadastro de financiamentos pelo carnê (taxa calculada), detalhe com o estado do contrato (total, pago, juros pagos e a pagar, saldo devedor, quitar hoje, desconto, antecipar as últimas N), registro de pagamento ligado ao contrato e simulador de aporte lado a lado partindo do estado atual.

**Files:**
- Create: `app/src/ui/telas/Dividas.tsx`, `app/src/ui/telas/DividaDetalhe.tsx`, `app/src/ui/telas/FormPagamento.tsx`
- Modify: `app/src/App.tsx` (rotas `/dividas` e `/dividas/:id`, ambas recebem `mes`)

**Acceptance Criteria:**
- [ ] Lista mostra por contrato: saldo devedor (`estadoFinanciamento(...).saldoDevedor`), parcela do mês (`parcelaDoMes(f, mes, lancamentos)`), `parcelasPagas/totalParcelas`, sistema e, se `parcelasAtrasadas(estado, mes) > 0`, o aviso de parcelas atrasadas. O estado da lista é o do **mês visto**: `estadoFinanciamento(f, lancamentos, fimDoMes(mes))` (saldo devedor, pagas e atrasadas coerentes com o Resumo do mesmo mês); em mês futuro o rótulo do aviso é "A pagar" (não "Atrasadas"), pois é o que ficará em aberto até lá.
- [ ] Formulário pelo carnê: nome, valor financiado, valor da parcela (Price: fixa; SAC: a 1ª), nº de parcelas, 1ª parcela (data), sistema, parcelas já pagas (padrão 0) e, opcional, a taxa que o usuário acha que é. A **taxa mensal é calculada** com `taxaImplicita` e mostrada na hora ("Taxa do carnê: 1,00% a.m."); se o usuário digitar uma taxa diferente, aviso "a taxa informada não bate com o carnê; o app usa a do carnê". Antes de salvar chama `validarContrato` (mais o nome) e mostra os erros em pt-BR; `NaN` nunca é gravado e nenhum campo opcional recebe `null`.
- [ ] Detalhe mostra: total do contrato (`estado.totalContrato`, **não** parcela × n: a última parcela absorve o arredondamento), já pago (n/N e R$), juros pagos (`jurosPagos`), juros a pagar (`jurosAPagar`), saldo devedor (`saldoDevedor`), **quitar hoje** (= saldo devedor) e **desconto por quitar** (`descontoQuitacao`), com o aviso de estimativa (o banco pode somar IOF, seguro e tarifas).
- [ ] Simulador "antecipar as últimas N parcelas": N inteiro ≥ 1 e ≤ parcelas restantes; usa `antecipacaoUltimas(estado, f.taxaMensal, n)` e mostra valor a pagar, nominal e desconto; botão "Registrar antecipação" cria a saída ligada com `pagamentoFinanciamento: 'antecipacao'`.
- [ ] Botão "Pagar parcela" cria a saída ligada (`financiamentoId` + `pagamentoFinanciamento: 'parcela'`) com o valor **da parcela do contrato** (`estado.restantes[0].parcela`) pré-preenchido; se o valor digitado difere, avisa que o pagamento de parcela sempre avança exatamente uma parcela e que a diferença acima dela conta como despesa comum.
- [ ] Simulador de aporte (atual × com aporte, reduzir prazo/parcela, "Usar sobra do mês", "Salvar como plano") parte do **estado** do contrato (saldo devedor e parcelas restantes), com `parcelaFixa`/`amortizacaoFixa` do contrato; contrato quitado não simula.
- [ ] Remover financiamento trata os lançamentos vinculados (pendentes saem; pagos viram saídas comuns, sem `financiamentoId` nem `pagamentoFinanciamento`) e os planos, tudo em uma transação.
- [ ] Conferência: carnê SAC, financiado R$ 1.200,00, 1ª parcela R$ 312,00, 4 parcelas, 0 pagas → taxa calculada 1,00%; aporte R$ 300,00 reduzindo prazo → economia R$ 12,00 e 2 meses (bate com `simularAporte`).

**Verify:** `cd app && npm run build`; no navegador, cadastrar o carnê de conferência e comparar com os valores acima

**Steps:**

- [ ] **Step 1: `Dividas.tsx`** — lista + formulário de cadastro/edição (mesmo padrão de `Contas.tsx` com `FormRapido`). Recebe `{ mes }`. Estado do formulário em texto/dígitos; a taxa nunca é digitada como obrigatória:

```tsx
import { Link } from 'react-router-dom'
import { estadoFinanciamento, parcelaDoMes } from '../../domain/fluxo'
import { parcelasAtrasadas, taxaImplicita, validarContrato } from '../../domain/contrato'
import { centavosDeDigitos, formatarBRL, formatarPct } from '../../domain/dinheiro'
import type { Contrato, Financiamento, SistemaAmortizacao } from '../../domain/tipos'

// campos de dígitos (valorFin, valorParc, total, pagas) filtram com `somenteDigitos` (até 12). A data da 1ª parcela vem de um
// <input type="date"> (vazio quando limpo): `validarContrato` já recusa data vazia/inexistente ("A data da primeira parcela é inválida."),
// então a data nunca é gravada inválida; mostre esses erros e não salve.
// estado do formulário: nome, valorFin/valorParc (dígitos = centavos), total, pagas (só dígitos),
// primeira ('YYYY-MM-DD'), sistema, taxaTexto (opcional, % ao mês, ex. "1,5")
const dadosCarne = {
  valorFinanciado: centavosDeDigitos(valorFin),
  valorParcela: centavosDeDigitos(valorParc),
  totalParcelas: Number(total), // vazio/NaN: taxaImplicita e validarContrato rejeitam
  sistema,
}
const implicita = taxaImplicita(dadosCarne) // number | null (null = os dados do carnê não fecham)
const informada = taxaTexto.trim() === '' ? undefined : Number(taxaTexto.replace(',', '.')) / 100
const taxaDifere =
  implicita !== null && informada !== undefined && Number.isFinite(informada) && Math.abs(informada - implicita) > 0.0005
// Na tela: implicita !== null → <p>Taxa do carnê: {formatarPct(implicita)} a.m.</p>
// taxaDifere → <p role="alert">A taxa que você informou ({formatarPct(informada!)}) não bate com o carnê; o app usa a do carnê.</p>

async function salvar() {
  const contrato: Contrato = {
    ...dadosCarne,
    taxaMensal: implicita ?? 0, // com `null`, validarContrato já reporta o problema (parcela pequena demais ou valores que não fecham)
    primeiraParcela: primeira,
    parcelasPagasAntes: Number(pagas || '0'),
  }
  const erros = validarContrato(contrato)
  if (!nome.trim()) erros.unshift('Informe o nome do financiamento.')
  if (erros.length > 0) { setErros(erros); return }
  await repo.financiamentos.salvar({ ...contrato, id: edit.id, nome: nome.trim() })
  setEdit(null)
}
```

Remover apaga os planos e trata os lançamentos vinculados (pendentes saem; pagos viram saídas comuns), em uma transação:

```tsx
async function remover(f: Financiamento) {
  if (!confirm(`Remover ${f.nome}? Parcelas pendentes serão excluídas e as pagas viram saídas comuns.`)) return
  await db.transaction('rw', db.financiamentos, db.planos, db.lancamentos, async () => {
    await db.financiamentos.delete(f.id)
    await db.planos.where('financiamentoId').equals(f.id).delete()
    for (const l of d.lancamentos.filter((l) => l.financiamentoId === f.id)) {
      if (l.status === 'pendente') await db.lancamentos.delete(l.id)
      else { const { financiamentoId: _f, pagamentoFinanciamento: _p, ...comum } = l; await db.lancamentos.put(comum) }
    }
  })
}
```

Cada cartão (`Link` para `/dividas/:id`) calcula `const estado = estadoFinanciamento(f, d.lancamentos, fimDoMes(mes))` (import de `fimDoMes` em `domain/meses`; mês visto, não "tudo") e exibe: `nome`; `formatarBRL(estado.saldoDevedor)`; `Parcela do mês ${formatarBRL(parcelaDoMes(f, mes, d.lancamentos))}` (valor em `text-divida`); `${estado.parcelasPagas}/${f.totalParcelas} pagas · ${f.sistema}`; e, se `parcelasAtrasadas(estado, mes) > 0`, `${mes > mesDe(hojeLocal()) ? 'A pagar' : 'Atrasadas'}: ${formatarBRL(...)}` no chip `chip-pendente`.

- [ ] **Step 2: `FormPagamento.tsx`** — folha que cria a saída ligada ao contrato (parcela ou antecipação). Não confundir com o tipo `PagamentoFinanciamento` de `domain/tipos`.

```tsx
import { useState } from 'react'
import { FormRapido } from '../componentes/FormRapido'
import { categoriasDaGrade, useDados } from '../hooks/useDados'
import { repo, novoId } from '../../data/repo'
import { centavosDeDigitos, formatarBRL } from '../../domain/dinheiro'
import { hojeLocal } from '../../domain/meses'
import { dataReal, somenteDigitos } from '../validacao'
import type { Centavos, Financiamento, PagamentoFinanciamento } from '../../domain/tipos'

export function FormPagamento({ f, tipo, valorInicial, parcelaContrato, descricao, fechar }: {
  f: Financiamento
  tipo: PagamentoFinanciamento
  valorInicial: Centavos
  parcelaContrato?: Centavos // só em 'parcela': valor da parcela do contrato
  descricao: string
  fechar: () => void
}) {
  const d = useDados()
  const grade = categoriasDaGrade(d.categorias, 'saida')
  const [digitos, setDigitos] = useState(String(valorInicial))
  const [data, setData] = useState(hojeLocal())
  const [contaId, setContaId] = useState(d.contas[0]?.id ?? '')
  // Padrão "Outros" (nunca `moradia`): é só um rótulo do lançamento; o Resumo não mostra pagamento de financiamento por categoria.
  const [categoriaId, setCategoriaId] = useState((grade.find((c) => c.id === 'outros') ?? grade[0])?.id ?? '')
  const valor = centavosDeDigitos(digitos)
  const difere = tipo === 'parcela' && parcelaContrato !== undefined && valor !== parcelaContrato

  async function salvar() {
    if (valor <= 0 || !contaId || !categoriaId) return
    if (!dataReal(data)) { alert('Informe uma data válida.'); return } // nunca grava data vazia/inválida
    await repo.lancamentos.salvar({
      id: novoId(), valor, data, tipo: 'saida', categoriaId,
      natureza: tipo === 'parcela' ? 'fixo' : 'variavel',
      contaId, status: 'pago', descricao,
      financiamentoId: f.id, pagamentoFinanciamento: tipo,
    })
    fechar()
  }

  return (
    <FormRapido titulo={tipo === 'parcela' ? 'Pagar parcela' : 'Registrar antecipação'} onSalvar={salvar} onCancelar={fechar}>
      <label className="grid gap-1 text-sm">Valor pago
        <input inputMode="numeric" value={digitos} onChange={(e) => setDigitos(somenteDigitos(e.target.value))}
          className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" />
        <span className="text-suave">{formatarBRL(valor)}</span>
      </label>
      {tipo === 'parcela' && parcelaContrato !== undefined && (
        <p className="text-sm text-suave">Parcela do contrato: <span className="valor">{formatarBRL(parcelaContrato)}</span></p>
      )}
      {difere && (
        <p role="alert" className="aviso text-sm">
          Pagar uma parcela sempre avança exatamente uma parcela do contrato. {valor > (parcelaContrato ?? 0)
            ? `A diferença de ${formatarBRL(valor - (parcelaContrato ?? 0))} conta como despesa comum.`
            : 'O contrato dá a parcela por paga mesmo com valor menor; confira o valor do carnê.'}
        </p>
      )}
      <label className="grid gap-1 text-sm">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3" /></label>
      <label className="grid gap-1 text-sm">Conta
        <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
          {d.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Categoria
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="min-h-11 rounded-xl bg-[var(--casca)] px-3">
          {grade.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
    </FormRapido>
  )
}
```

- [ ] **Step 3: `DividaDetalhe.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Moldura } from '../componentes/Moldura'
import { FormPagamento } from './FormPagamento'
import { useResumo } from '../hooks/useResumo'
import { repo, novoId } from '../../data/repo'
import { simularAporte } from '../../domain/amortizacao'
import { somenteDigitos } from '../validacao'
import { antecipacaoUltimas } from '../../domain/contrato'
import { centavosDeDigitos, formatarBRL, formatarPct } from '../../domain/dinheiro'
import { estadoFinanciamento } from '../../domain/fluxo'
import type { EfeitoAporte } from '../../domain/tipos'

export default function DividaDetalhe({ mes }: { mes: string }) {
  const { id } = useParams()
  const { financiamentos, planos, lancamentos, resumo } = useResumo(mes)
  const f = financiamentos.find((x) => x.id === id)
  const plano = planos.find((p) => p.financiamentoId === id)
  const [digitos, setDigitos] = useState(plano ? String(plano.aporteExtraMensal) : '')
  const [efeito, setEfeito] = useState<EfeitoAporte>(plano?.efeito ?? 'reduzir_prazo')
  const [nTexto, setNTexto] = useState('') // "antecipar as últimas N"
  const [pagando, setPagando] = useState<'parcela' | 'antecipacao' | null>(null)
  const aporte = centavosDeDigitos(digitos)
  // Sem flash de vazio: o Shell só renderiza as telas com os dados prontos, então `plano` já existe aqui.
  const sobraLivre = Math.max(0, resumo.sobraOtimizada + (plano?.aporteExtraMensal ?? 0))

  const estado = useMemo(() => (f ? estadoFinanciamento(f, lancamentos) : undefined), [f, lancamentos])
  // O simulador parte do estado atual: saldo devedor e parcelas restantes, com a parcela fixa do contrato.
  const sim = useMemo(
    () => f && estado && estado.restantes.length > 0
      ? simularAporte({
          saldo: estado.saldoDevedor, taxa: f.taxaMensal, prazo: estado.restantes.length, sistema: f.sistema, aporte, efeito,
          parcelaFixa: f.sistema === 'PRICE' ? f.valorParcela : undefined,
          amortizacaoFixa: f.sistema === 'SAC' ? Math.round(f.valorFinanciado / f.totalParcelas) : undefined,
        })
      : undefined,
    [f, estado, aporte, efeito],
  )
  if (!f || !estado) return <p>Financiamento não encontrado.</p>

  const proxima = estado.restantes[0] // parcela do contrato que o próximo "Pagar parcela" consome
  const n = Number(nTexto)
  const ant = Number.isInteger(n) && n >= 1 && n <= estado.restantes.length ? antecipacaoUltimas(estado, f.taxaMensal, n) : null
  const pagoContrato = estado.pagas.reduce((s, p) => s + p.parcela, 0) + estado.antecipado

  async function salvarPlano() {
    for (const p of planos.filter((p) => p.financiamentoId === f!.id)) await repo.planos.remover(p.id)
    if (aporte > 0)
      await repo.planos.salvar({ id: novoId(), financiamentoId: f!.id, aporteExtraMensal: aporte, efeito })
  }

  const Linha = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) => (
    <div className="flex items-baseline justify-between py-1.5"><span className="text-suave">{rotulo}</span><span className={`valor ${cor ?? ''}`}>{valor}</span></div>
  )
  const Col = ({ titulo, r }: { titulo: string; r: NonNullable<typeof sim>['atual'] }) => (
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
        <p className="text-suave">{formatarPct(f.taxaMensal)} a.m. (calculada do carnê) · {f.sistema}</p>
        <div className="mt-3 divide-y divide-[var(--linha)] text-sm">
          <Linha rotulo="Total do contrato" valor={formatarBRL(estado.totalContrato)} />
          <Linha rotulo={`Já pago (${estado.parcelasPagas}/${f.totalParcelas})`} valor={formatarBRL(pagoContrato)} />
          <Linha rotulo="Juros pagos" valor={formatarBRL(estado.jurosPagos)} />
          <Linha rotulo="Juros a pagar" valor={formatarBRL(estado.jurosAPagar)} />
          <Linha rotulo="Saldo devedor" valor={formatarBRL(estado.saldoDevedor)} cor="text-divida" />
          <Linha rotulo="Quitar hoje" valor={formatarBRL(estado.saldoDevedor)} />
          <Linha rotulo="Desconto por quitar" valor={`− ${formatarBRL(estado.descontoQuitacao)}`} cor="text-positivo" />
        </div>
        <p className="mt-2 text-xs text-suave">Estimativa: o banco pode somar IOF, seguro e tarifas.</p>
        {proxima ? (
          <button onClick={() => setPagando('parcela')} className="mt-3 min-h-12 w-full rounded-full bg-marca font-semibold text-white">
            Pagar parcela {proxima.numero} · {formatarBRL(proxima.parcela)}
          </button>
        ) : <p className="mt-3 font-semibold text-positivo">Contrato quitado.</p>}
      </Moldura>

      {estado.restantes.length > 0 && (
        <Moldura>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-suave">Antecipar as últimas parcelas</h3>
          <label className="mt-2 grid gap-1 text-sm">Quantas parcelas (de {estado.restantes.length} restantes)?
            <input inputMode="numeric" value={nTexto} onChange={(e) => setNTexto(somenteDigitos(e.target.value))}
              className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="1" />
          </label>
          {ant && (
            <div className="mt-3 text-sm">
              <Linha rotulo="Valor a pagar hoje" valor={formatarBRL(ant.valor)} />
              <Linha rotulo="Soma nominal das parcelas" valor={formatarBRL(ant.nominal)} />
              <Linha rotulo="Desconto" valor={`− ${formatarBRL(ant.desconto)}`} cor="text-positivo" />
              <button onClick={() => setPagando('antecipacao')} className="mt-2 min-h-11 text-sm font-semibold text-marca-texto">Registrar antecipação</button>
            </div>
          )}
        </Moldura>
      )}

      {sim && (
        <>
          <Moldura>
            <label className="grid gap-1 text-sm">Aporte extra por mês
              <input inputMode="numeric" value={digitos} onChange={(e) => setDigitos(somenteDigitos(e.target.value))}
                className="valor min-h-11 rounded-xl bg-[var(--casca)] px-3" placeholder="0" />
              <span className="text-suave">{formatarBRL(aporte)}</span>
            </label>
            <button disabled={sobraLivre <= 0} onClick={() => setDigitos(String(sobraLivre))}
              className="mt-2 min-h-11 text-sm font-semibold text-marca-texto disabled:opacity-40">
              Usar sobra do mês ({formatarBRL(sobraLivre)})
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
            <button onClick={salvarPlano} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-white">
              Salvar como plano
            </button>
          </Moldura>
        </>
      )}

      {pagando === 'parcela' && proxima && (
        <FormPagamento f={f} tipo="parcela" valorInicial={proxima.parcela} parcelaContrato={proxima.parcela}
          descricao={`Parcela ${proxima.numero} · ${f.nome}`} fechar={() => setPagando(null)} />
      )}
      {pagando === 'antecipacao' && ant && (
        <FormPagamento f={f} tipo="antecipacao" valorInicial={ant.valor}
          descricao={`Antecipação · ${f.nome}`} fechar={() => setPagando(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rotas, verificar e commitar**

Adicionar em `App.tsx`: `/dividas` → `<Dividas mes={mes} />`, `/dividas/:id` → `<DividaDetalhe mes={mes} />`.

Run: `npm run build` → sucesso. No navegador, cadastrar o carnê de conferência (SAC, financiado R$ 1.200,00, 1ª parcela R$ 312,00, 4 parcelas, 0 pagas): a taxa aparece como 1,00%; digitar taxa 2 → aviso de divergência. No detalhe: total do contrato R$ 1.230,00 (R$ 312 + 309 + 306 + 303 = 1.230; igual a `estado.totalContrato`), simular aporte R$ 300,00 "Reduzir prazo" → economia R$ 12,00 e 2 meses; "Pagar parcela" cria a saída ligada, o saldo devedor cai e a parcela do mês no Resumo não dobra; "Antecipar as últimas 2" mostra valor e desconto. Salvar plano → sobra otimizada no Resumo cai em R$ 300,00 (o anel mostra o arco limão do aporte).

```bash
git add -A && git commit -m "feat(ui): dividas pelo carne, estado do contrato e simulador de amortizacao"
```

---

### Task 13: Insights, backup e acabamento PWA

**Goal:** Tela Insights (com cartão de Reserva), tela Backup, ícones PWA e verificação final de ponta a ponta.

**Files:**
- Create: `app/src/ui/telas/Insights.tsx`, `app/src/ui/telas/Backup.tsx`, `app/public/icon-192.png`, `app/public/icon-512.png`
- Modify: `app/src/App.tsx` (rotas `/insights`, `/backup`)

**Acceptance Criteria:**
- [ ] Insights lista todos os insights do mês (`todosInsights`: contas negativas primeiro, depois alertas, depois informativos) com título e detalhe e o cartão "Reserva" (`CartaoReserva`, o mesmo componente do Resumo: `saldoReserva` + `custoEssencialReferencia` + `statusReserva`) com meses cobertos × meta do perfil (6 ou 12) e barra de progresso.
- [ ] Backup: "Exportar" baixa `financas-AAAA-MM-DD.json`; "Importar" lê arquivo, pede confirmação ("Isso substitui todos os dados atuais") e mostra erro legível se o arquivo for inválido.
- [ ] `npm run build` gera PWA (service worker + manifest); app abre offline após o primeiro carregamento (verificar em DevTools → Application).
- [ ] A tela Backup mostra o cartão de privacidade (textos iguais: "Nada sai do seu celular…" e o lembrete de backup) e o **status do armazenamento persistente** (`armazenamento` do contexto: persistente / não persistente, com botão para pedir de novo via `pedirPersistencia()` / indisponível).
- [ ] `npx vitest run` passa inteiro.
- [ ] Revisão visual em 390×844 e 1280×800, claro e escuro: sem rolagem horizontal, alvos ≥ 44 px, anel legível, nenhum texto cortado.

**Verify:** `cd app && npx vitest run && npm run build` → tudo verde; checagem manual descrita acima

**Steps:**

- [ ] **Step 1: `Insights.tsx`**

```tsx
import { Moldura } from '../componentes/Moldura'
import { CartaoReserva } from '../componentes/CartaoReserva'
import { useResumo } from '../hooks/useResumo'

export default function Insights({ mes }: { mes: string }) {
  // `reserva` (saldoReserva, custoEssencialReferencia, reservaAlvoMeses, statusReserva) e a lista ordenada vêm do hook.
  const { todosInsights, reserva } = useResumo(mes)

  return (
    <div className="grid gap-5">
      <CartaoReserva reserva={reserva} />
      {todosInsights.length === 0 && <Moldura><p className="text-suave">Sem alertas este mês.</p></Moldura>}
      {todosInsights.map((i) => (
        <Moldura key={i.id}>
          <div className={`font-semibold ${i.severidade === 'alerta' ? 'text-negativo' : ''}`}>{i.titulo}</div>
          <p className="mt-1 text-sm text-suave">{i.detalhe}</p>
        </Moldura>
      ))}
    </div>
  )
}
```

(A barra usa `width` dentro de um elemento pequeno e estático; sem animação.)

- [ ] **Step 2: `Backup.tsx`** — privacidade (textos inalterados), status do armazenamento persistente, exportar e importar

```tsx
import { useRef, useState } from 'react'
import { Moldura } from '../componentes/Moldura'
import { Privacidade } from '../componentes/Privacidade'
import { useDados } from '../hooks/useDados'
import { exportar, importar } from '../../data/backup'
import { pedirPersistencia, type EstadoArmazenamento } from '../../data/armazenamento'
import { hojeLocal } from '../../domain/meses'

const TEXTO_ARMAZENAMENTO: Record<EstadoArmazenamento, string> = {
  persistente: 'Armazenamento protegido: o navegador não apaga os dados do app por conta própria.',
  nao_persistente: 'O navegador pode apagar os dados do app se faltar espaço. Faça backup com frequência.',
  indisponivel: 'Este navegador não informa se os dados estão protegidos. Faça backup com frequência.',
}

export default function Backup() {
  const d = useDados()
  const [msg, setMsg] = useState('')
  const [pedido, setPedido] = useState<EstadoArmazenamento>() // resposta de um novo pedido; antes dele vale o do Shell
  const armazenamento = pedido ?? d.armazenamento
  const arquivo = useRef<HTMLInputElement>(null)

  async function baixar() {
    const blob = new Blob([await exportar()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `financas-${hojeLocal()}.json`
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
        <h3 className="mt-4 text-[10px] uppercase tracking-[0.2em] text-suave">Armazenamento</h3>
        <p role="status" className="mt-1 text-sm">{armazenamento ? TEXTO_ARMAZENAMENTO[armazenamento] : 'Verificando o armazenamento…'}</p>
        {armazenamento === 'nao_persistente' && (
          <button onClick={async () => setPedido(await pedirPersistencia())} className="mt-1 min-h-11 text-sm font-semibold text-marca-texto">
            Pedir proteção de novo
          </button>
        )}
        <button onClick={baixar} className="mt-4 min-h-12 w-full rounded-full bg-marca font-semibold text-white">Exportar backup</button>
        <button onClick={() => arquivo.current?.click()} className="mt-2 min-h-12 w-full rounded-full bg-[var(--casca)] font-semibold">Importar backup</button>
        <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} />
        {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      </Moldura>
    </div>
  )
}
```

- [ ] **Step 3: Rotas e ícones PWA**

Adicionar `/insights` → `<Insights mes={mes} />` e `/backup` → `<Backup />`. Gerar `public/icon-192.png` e `icon-512.png` (fundo `#0d2b30` com um anel limão `#c6ef4f` centralizado, no estilo do anel da sobra; pode ser desenhado em um SVG simples e exportado com qualquer ferramenta) e conferir que o manifest os referencia.

- [ ] **Step 4: Verificação final**

Run: `cd app && npx vitest run && npm run build && npm run preview`
Expected: testes PASS; build gera `dist/sw.js` e `manifest.webmanifest`. Abrir o preview, percorrer: onboarding → lançamento rápido (3 toques) → lançamento parcelado e pagamento de financiamento → Resumo (cartões Comprometido e Reserva) → Contas (conferir saldo, transferir) → Dívidas (carnê, pagar parcela, antecipar) → Insights → Backup (status do armazenamento, exportar e importar). Conferir offline no DevTools e os dois temas nas duas larguras.

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
- §8 e §13 visual (paleta petróleo e limão, fontes, tema claro/escuro com botão) → tokens e componentes em T8; anel em T9.
- §9 testes → Vitest nas Tasks 1–7; UI verificada por build e navegador.
- Consistência de nomes: `resumoMes`, `parcelaDoMes`, `saldoContas`, `simularAporte`, `gerarCronograma`, `rendaEsperada`, `reservaAlvoMeses`, `custoEssencial`, `gerarRecorrentes`, `gerarInsights`, `repo.*`, `novoId` usados de forma idêntica entre tarefas.
