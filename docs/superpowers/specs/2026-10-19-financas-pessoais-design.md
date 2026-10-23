# Finanças Pessoais — Design (v1)

Data: 2026-10-19 · Status: aguardando revisão

## 1. Objetivo

App de controle financeiro pessoal, mobile-first, que se adapta à situação de renda da pessoa
(assalariado fixo, autônomo/vendedor, bicos). Funciona offline, com dados no próprio aparelho.
Começa como PWA e vira APK depois (Capacitor), reaproveitando o código.

Fora de escopo da v1: provisão de 13º/férias, leitura/parser de fatura de cartão, sincronização
em nuvem, empacotamento APK, login/multiusuário.

## 2. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA local-first (IndexedDB via Dexie), caminho para APK com Capacitor |
| Perfis | Por **fonte de renda** (`fixa`, `variavel`, `eventual`); uma pessoa pode ter várias |
| Escopo v1 | Núcleo (lançamentos, contas, categorias, sobra) + Financiamentos + insights por regras |
| Estrutura de código | Motor financeiro em TypeScript puro, separado da UI e do armazenamento |
| Visual | Próprio (sem padrão Tely), inspirado nas referências de apps de finanças em anexo |

## 3. Arquitetura

```
app/src/
  domain/     motor puro e testado: amortizacao, fluxo, renda, insights
  data/       interface de repositório + adaptador Dexie (trocável por SQLite/nuvem)
  ui/         telas React, mobile-first
PWA: manifest + service worker, offline
```

Stack: React, Vite, TypeScript, Tailwind, vite-plugin-pwa, Dexie, Vitest.
O motor não importa nada de UI nem de banco. Todo cálculo financeiro tem teste com valores
conferidos à mão.

## 4. Modelo de dados

- **Conta**: nome, tipo (`banco` | `caixa` | `carteira`), saldo inicial. Cobre "banco" e "caixa".
- **FonteDeRenda**: nome, tipo (`fixa` | `variavel` | `eventual`), valor esperado, dia de pagamento (fixa).
- **Categoria**: nome, ícone, natureza padrão (`fixo` | `variavel`), tipo (`entrada` | `saida`), `essencial` (sim/não; define o custo essencial).
- **Lançamento**: valor, data, tipo, categoria, natureza, conta, fonte (se entrada), observação,
  **status** (`pago` | `pendente`), recorrência opcional. Mês de referência é derivado da data.
- **Financiamento**: nome, saldo devedor, taxa mensal, prazo restante, sistema (`SAC` | `Price`), dia de vencimento.
- **PlanoDeAmortizacao**: financiamento, aporte extra mensal, efeito (`reduzir_prazo` | `reduzir_parcela`).

Lançamentos `pendentes` alimentam "Previsto" e "Saldo seguro". O campo `status` e a conta já deixam
espaço para cartão de crédito na v2.

## 5. Regras de negócio

- **Sobra normal** = receitas do mês − despesas correntes (inclui parcelas contratuais, exclui aporte extra).
- **Sobra otimizada** = sobra normal − aporte extra planejado.
- **Saldo** = soma dos saldos das contas considerando só lançamentos `pagos`.
- **Previsto** = saldo + entradas pendentes − saídas pendentes até o fim do mês.
- **Saldo seguro** = saldo das contas − saídas pendentes.
- **Renda esperada**: fixa = valor cadastrado; variável = mínimo entre média e mediana dos últimos 3 meses;
  eventual = fora do orçamento base (conta só como bônus).
- **Custo essencial** = média dos últimos 3 meses das despesas em categorias marcadas `essencial` (parcelas de financiamento incluídas).
- **Reserva alvo** = 6 meses de custo essencial para renda fixa; 12 para variável/eventual (perfil misto
  usa a regra da maior fatia da renda esperada).
- **Amortização**: SAC e Price calculados por mês; simulador compara cenário atual × com aporte
  (prazo total, valor da parcela, juros totais, economia de juros), respeitando `efeito`.

## 6. Insights da v1 (regras determinísticas, sem IA)

Cada insight mostra o dado que o gerou. Limites são valores iniciais e configuráveis.

| Insight | Disparo |
|---|---|
| Gasto crescendo | Categoria > +20% vs. média dos 3 meses anteriores e acima de um piso mínimo |
| Pico atípico | Lançamento > 3× a mediana da própria categoria |
| Despesa recorrente a revisar | Despesa fixa > 5% da renda esperada |
| Reserva baixa | Reserva < meta do perfil; informa meses faltantes |
| Sobra para a dívida | Sobra normal > 0 e reserva no alvo → sugere aporte com economia de juros; reserva baixa → divide entre reserva e dívida |
| Dívida mais cara primeiro | Mais de um financiamento → recomenda o de maior taxa |
| Mês de risco | Renda variável: receita até agora abaixo do esperado e fixos não cobertos |
| Comprometimento de renda | Parcelas > 30% da renda esperada |

## 7. Telas e navegação

Seguem a lógica das referências: **seletor de mês no topo**, **menu lateral (drawer)**, **botão + flutuante**.

**Drawer**: Resumo · Contas · Lançamentos · Dívidas · *Planejar* (Orçamento, Reserva) · *Analisar*
(Insights, Gráficos, Categorias) · Fontes de renda · Backup · Configurações.

**Resumo (home)**, de cima para baixo:
1. Seletor de mês (‹ Outubro ›).
2. Hero da sobra: anel segmentado com **Sobra normal** e **Sobra otimizada** e o aporte como arco próprio;
   abaixo, trio Inicial · Saldo · Previsto.
3. Cartão de pendências: receitas pendentes, despesas pendentes, **Saldo seguro** (com "Verificar").
4. Visão geral: Receitas, Despesas (realizado e previsto), Financiamentos (parcelas do mês).
5. Insights principais (2–3) com o dado que os gerou.
6. Contas (saldo por conta) e últimos lançamentos.

**Lançamento rápido (+)**: abas **Saída | Entrada** no topo, campo de valor com teclado numérico em foco,
grade de categorias (as mais usadas primeiro), data (hoje) e botão "Salvar saída/entrada".
Observação, conta, natureza, fonte, status pendente e "repete todo mês" ficam em "Mais opções".
Meta: menos de 10 s e 3 toques.

**Dívidas**: lista com saldo, parcela e prazo; detalhe com simulador lado a lado (atual × com aporte).

**Primeiro uso**: pergunta as fontes de renda por exemplos ("Salário fixo", "Vendas / negócio próprio",
"Bicos e extras") e cria a primeira conta. Renda variável/eventual mostra orçamento conservador e meta
de reserva maior.

**Backup**: exportar/importar JSON.

## 8. Direção visual

Arquétipo: **Soft Structuralism** (taste-skill), adaptado para app. Superfícies claras e arejadas,
cartões em dupla moldura (casca externa + núcleo interno com raios concêntricos), sombras muito
difusas, sem bordas cinza duras. Tema claro e escuro, ambos de primeira classe.

- **Paleta**: Papel `#F4F5F2` · Tinta `#14201C` · Verde-floresta (marca) `#0F5C4A` · Positivo `#2FA87A` ·
  Negativo `#D9534F` · Alerta/pendente `#E39A2D`. Escuro: fundo `#0B100E`, superfícies `#131B18`.
- **Tipografia**: Plus Jakarta Sans (títulos e interface) + Geist Mono para valores e datas
  (números tabulares). Sem Inter/Roboto/Arial.
- **Ícones**: Phosphor Light (traço fino).
- **Assinatura**: o **anel da sobra** — um anel segmentado (inspirado no anel de faturamento das referências)
  que mostra, de uma vez, sobra normal, o trecho comprometido com o aporte e a sobra otimizada. É o elemento
  memorável; o resto fica discreto.
- **Cores com significado fixo**: verde = entrada, coral = saída, âmbar = pendente, azul-petróleo = dívida.
  Cor nunca é a única pista (sempre com sinal + e − e rótulo).
- **Movimento**: curvas `cubic-bezier(0.32,0.72,0,1)`, só `transform` e `opacity`; anel anima ao carregar e
  ao trocar de mês; botão + com press físico. Respeita `prefers-reduced-motion`.
- **Mobile**: alvos ≥ 44 px, FAB ao alcance do polegar, `min-h-[100dvh]`, foco de teclado visível, contraste AA.
- **Observação**: o FAB e o drawer são padrões de plataforma, mantidos de propósito; a moldura dupla, o anel
  e a tipografia dão a identidade.

## 9. Testes e qualidade

- Vitest no motor: tabelas SAC e Price com valores conhecidos, economia de juros, sobra normal/otimizada,
  renda esperada por tipo, cada regra de insight (disparo e não disparo).
- Poucos testes de fluxo na UI (lançamento rápido, troca de mês, simulador).
- Dados só no aparelho: backup JSON é parte da v1.

## 10. Riscos e pontos em aberto

- Dado local se perde ao trocar de celular sem backup → lembrete periódico de exportar.
- Limites dos insights podem não servir a todos os perfis → configuráveis desde a v1.
- Arredondamento de centavos nas parcelas: armazenar valores em centavos (inteiros) em todo o motor.
