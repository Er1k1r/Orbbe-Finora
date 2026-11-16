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

**Primeiro uso** (3 perguntas, sem cadastro): tela inicial "Controle seus gastos. Fácil assim." com aviso de
privacidade e opção "Já uso · Restaurar backup". Pergunta 1: "O que você quer resolver primeiro?" (seleção
múltipla: pra onde vai o dinheiro, não estourar o mês, contas e parcelas em dia, juntar pra uma meta); as
respostas definem a ordem e os cartões do Resumo. Pergunta 2: fontes de renda por exemplo ("Salário fixo",
"Vendas / negócio próprio", "Bicos e extras"). Pergunta 3: saldo atual (cria a primeira conta). Renda
variável/eventual mostra orçamento conservador e meta de reserva maior.

**Checklist "Vamos começar"** no Resumo enquanto houver passo pendente: criar conta, registrar o primeiro
gasto, cadastrar a renda, cadastrar um financiamento (ou "Não tenho financiamento"). Pode ser dispensado.

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

## 11. Ideias incorporadas do Kontto (2026-10-23)

- **v1:** onboarding em 3 perguntas com objetivos, checklist inicial, cartão de privacidade ("nada sai do
  celular") e restaurar backup na abertura. Objetivos e estado do checklist ficam em `localStorage`
  (preferências por aparelho); dados financeiros continuam no Dexie e no backup.
- **v1, motor:** interpretador de notificação bancária (`interpretarNotificacao`): texto de notificação →
  valor, tipo, estabelecimento, categoria sugerida e banco; devolve `null` para apps que não são de banco
  conhecido e para textos sem valor ou sem direção (ex.: fatura fechada). Testado com textos reais.
- **Fase APK (fora da v1):** captura automática exige app nativo Android (Capacitor + serviço de acesso a
  notificações; um PWA não lê notificações de outros apps). Requisitos já definidos: o lançamento capturado
  entra como sugestão e só é salvo após confirmação do usuário; tela de "Acesso bloqueado" com passo a passo
  para reativar a permissão e aviso de que a captura fica pausada enquanto bloqueada; desligável a qualquer
  momento; nenhum dado sai do aparelho; evitar lançamento duplicado quando a mesma compra for registrada
  à mão; validar os nomes de pacote dos bancos em aparelho real.

## 12. Motor v1.1 — decisões do dono (2026-10-23)

Substitui o que conflitar nas seções 4 a 7. Tudo continua em centavos, local, sem migração de dados (o app
ainda não foi publicado: banco e backup sobem para a versão 2).

### 12.1 Financiamento como contrato
- Cadastro pelo carnê: nome, valor financiado, valor da parcela (Price: fixa; SAC: a 1ª), total de parcelas,
  data da 1ª parcela, sistema, parcelas pagas antes de usar o app. A **taxa mensal é calculada** (taxa implícita;
  Price por cálculo numérico, SAC = (1ª parcela − valor ÷ n) ÷ valor). Se o usuário informar uma taxa que não bate
  com o carnê, o app avisa e usa a do carnê.
- Estado derivado do contrato + pagamentos ligados (lançamento com `financiamentoId` e tipo `parcela` ou
  `antecipacao`): cronograma original, parcelas pagas, saldo devedor, juros pagos, juros a pagar, total do
  contrato, valor para quitar hoje (= saldo devedor) e **desconto por quitar** (parcelas restantes − valor
  presente à taxa do contrato), e valor/desconto para **antecipar as últimas N parcelas**. Exibido como estimativa
  (CDC art. 52 §2; o banco pode somar IOF, seguro, tarifas).
- Pagar parcela reduz o saldo devedor; antecipação abate o saldo e encurta o prazo.
- A parcela de cada mês segue o calendário do contrato (mês passado mostra a parcela daquele mês; depois da última,
  zero); parcelas vencidas e não pagas contam como atrasadas no previsto e no saldo seguro.

### 12.2 Compra parcelada
Valor da parcela, total de parcelas e qual é a parcela deste mês (ex.: óculos R$ 50 × 12, esta é a 4/12): o app cria
da parcela atual até a última, uma por mês (atual com o status escolhido, futuras pendentes). Parcelas anteriores à
adoção do app não são criadas. Mostra quantas faltam, o valor restante e o mês da última.

### 12.3 Contas: cheque especial, reserva, transferência, ajuste
- Saldo pode ser negativo (inclusive o inicial). Campos opcionais: limite e taxa do cheque especial; marca "reserva".
- Insight "conta negativa": "Conta X negativa em R$ Y. Se no banco ela não está negativa, falta lançar alguma
  entrada." (com juro estimado se houver taxa) e aviso de "vai ficar negativa até o fim do mês" pelo previsto da conta.
- **Conferir saldo**: o usuário informa o saldo real; o app mostra a diferença e pode lançar um **ajuste**.
- **Transferência** entre contas: par saída/entrada ligado. Ajuste e transferência mexem no saldo, mas nunca em
  receita, despesa, sobra, renda, custo essencial ou insights.
- Reserva de emergência = saldo das contas marcadas como reserva; sem nenhuma marcada, todas (com dica para marcar).

### 12.4 Custo essencial com lançados e futuros
Custo essencial do mês = essenciais lançados (pagos e pendentes, sem movimentos internos nem pagamentos de
financiamento) + recorrências essenciais que ainda vão cair no mês + parcelas de financiamento do mês + para cada
categoria essencial variável, o que falta para chegar à média dos 3 meses anteriores. A reserva alvo usa a média
projetada do mês atual e dos 2 seguintes (6 ou 12 meses por perfil, como antes).

### 12.5 Comprometido nos próximos meses
Projeção de 6 meses dos compromissos já programados (financiamentos pelo contrato, compras parceladas, recorrências,
outros pendentes), total por mês e lista de términos ("óculos termina em jun/27").

### 12.6 Ajustes menores
Recorrência com fim (`recorrenciaAte`; cancelar = encerrar no mês atual); campo `descricao` no lançamento;
pedido de armazenamento persistente ao navegador com status na tela de Backup; categorias de sistema
(transferência, ajuste) fora da grade de lançamento.
Decisões de 2026-11-14: (a) excluir um lançamento recorrente (modelo ou cópia) pergunta "Só este mês" ou "Encerrar a repetição"; "só este mês" no modelo passa a recorrência para um novo modelo no mês seguinte ao último mês coberto (modelo, cópias, `geradoAte`), re-apontando as cópias; (b) o backup é versão 3 e leva as preferências (v2 continua importável, sem preferências; chaves extras ignoradas; conta padrão inexistente descartada); (c) a lista do mês mostra os previstos da recorrência (somente leitura) e o seletor de mês só aparece onde o mês importa (nas demais telas o cabeçalho mostra o título); (d) o Resumo ganha o card Contas (depois de Pendências) e o link "Verificar" no saldo seguro.

## 13. Identidade visual — base cfc_platform (2026-10-23, substitui a paleta e as fontes do §8)

Por decisão do dono, as cores seguem o projeto `cfc_platform` (`DESIGN.md` / `static/style.css`), identidade
"petróleo e limão", regra 60/30/10, tema claro e escuro (padrão do sistema, com botão para trocar).

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| --fundo | #f1f5f4 | #09171a | fundo (60%) |
| --superficie | #ffffff | #102226 | cartões |
| --superficie-2 | #edf3f2 | #163035 | cartão interno, trilho |
| --texto | #10262b | #e4f2f0 | texto |
| --texto-suave | #4a6168 | #9db8b6 | rótulos |
| --linha | #dce8e6 | #1f3c40 | divisórias |
| --marinho | #0d2b30 | #0b2a2f | topo, barra de navegação, cartão-herói (30%) |
| --azul (petróleo) | #0b6b73 | #0f7f88 | preenchimentos, gráficos, botão secundário |
| --azul-texto | #0b6b73 | #62d6d8 | links e textos em petróleo |
| --destaque (limão) | #c6ef4f | #d4f55a | só 10%: botão principal (+), aba atual, um realce por tela; nunca texto sobre fundo claro |
| --verde / --verde-texto / --verde-bg | #15803d / #126b2f / #e4f5ea | #2f9e5c / #5bd58a / #12301f | entrada |
| --vermelho / --vermelho-texto / --vermelho-bg | #c62828 / #c62828 / #fdecec | #c7352d / #ff8f85 / #3a1a1f | saída, conta negativa |
| --amarelo-bg | #fff4dd | #3a2c12 | pendente |

- Fontes: **Red Hat Display** (títulos e números) e **Figtree** (texto), via `@fontsource`, com fallback de sistema.
- O anel da sobra (assinatura) usa petróleo para a sobra otimizada, limão para o aporte e vermelho quando negativa;
  sempre com sinal e rótulo além da cor.
- Cartões com raio 16 px; o resto do §8 (movimento, acessibilidade, mobile) continua valendo.
