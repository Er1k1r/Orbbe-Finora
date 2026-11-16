---
name: Finanças Pessoais
description: A folhinha de parede da cozinha virada app, com cobalto, papel claro, numerais condensados e o dia de hoje marcado a caneta.
colors:
  cobalto: "#1f3fbf"
  cobalto-fundo: "#16309a"
  marca-texto: "#ffd23f"
  marca-texto-suave: "#fff3c4"
  papel: "#eef0f4"
  folha: "#ffffff"
  casca: "#e6e9f0"
  casa: "#f3f5f9"
  tinta: "#14161c"
  tinta-suave: "#555c6b"
  linha: "#dde1e9"
  verde: "#1d8a4e"
  verde-texto: "#157a43"
  verde-fundo: "#e3f4ea"
  vermelho: "#d6332a"
  vermelho-texto: "#c0271f"
  vermelho-fundo: "#fde8e6"
  sobre-cobalto: "#ffffff"
  sobre-cobalto-suave: "#c8d2ff"
  noite-papel: "#0c0f1a"
  noite-folha: "#151a2b"
  noite-casca: "#1e2438"
  noite-casa: "#1b2135"
  noite-cobalto: "#1b33a0"
  noite-azul: "#4c6bff"
  noite-azul-texto: "#9fb2ff"
  noite-verde-texto: "#6fdc9f"
  noite-vermelho-texto: "#ff9d95"
typography:
  numeral:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 850
    lineHeight: 0.85
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 88"
  valor:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 82"
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  casa: "10px"
  aviso: "12px"
  folha: "16px"
  fab: "20px"
  chip: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  folha:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.folha}"
    padding: "20px"
  folha-heroi:
    backgroundColor: "{colors.cobalto}"
    textColor: "{colors.sobre-cobalto}"
    rounded: "{rounded.folha}"
    padding: "20px"
  cabecalho:
    backgroundColor: "{colors.cobalto}"
    textColor: "{colors.sobre-cobalto}"
    rounded: "{rounded.folha}"
    padding: "16px 24px"
  casa-do-dia:
    backgroundColor: "{colors.casa}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.casa}"
    padding: "8px"
    height: "96px"
  casa-de-hoje:
    backgroundColor: "{colors.casa}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.casa}"
  fab:
    backgroundColor: "{colors.marca-texto}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.fab}"
    size: "64px"
  chip-vencido:
    backgroundColor: "{colors.vermelho-fundo}"
    textColor: "{colors.vermelho-texto}"
    rounded: "{rounded.chip}"
    padding: "2px 10px"
  chip-pendente:
    backgroundColor: "{colors.casca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.chip}"
    padding: "2px 10px"
  aviso:
    backgroundColor: "{colors.casca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.aviso}"
    padding: "8px 12px"
  barra-lateral-item-ativo:
    backgroundColor: "{colors.cobalto-fundo}"
    textColor: "{colors.sobre-cobalto}"
    rounded: "{rounded.casa}"
    height: "48px"
---

# Design System: Finanças Pessoais

## Overview

**Creative North Star: "A Folhinha de Parede"**

O mês do dinheiro é a folhinha da cozinha: cada dia mostra o que entra e o que vence, e hoje está marcado a caneta. A interface é uma parede de papel claro com folhas brancas penduradas, um cabeçalho e uma barra lateral em azul-cobalto, tinta quase preta e numerais condensados e pesados que fazem o papel de dias e valores. O sistema recusa o app de banco branco com um azul, saldo gigante e atalhos em ícones.

A cor trabalha como sinal, não como enfeite. O cobalto ancora a estrutura (cabeçalho, barra, folha-herói). O vermelho é o vermelho de domingo da folhinha: serve para vencido, negativo e domingo. O verde é pago e entrada. O amarelo marca-texto aparece em dois lugares só: o dia de hoje e o botão de lançar. Essa escassez é o que faz o olho achar "hoje" e "lançar" sem procurar.

A densidade é de calendário: casas pequenas e regulares, números grandes, texto curto. Serve a quem tem pouca leitura financeira e usa o celular para lançar; no computador a mesma folhinha ganha casas com nomes e valores.

**Key Characteristics:**
- Numerais condensados (wdth 68 a 82, peso 700 a 850) em dias e valores; corpo em largura normal.
- Cobalto estrutural, papel claro, folhas brancas, tinta quase preta; tema escuro com a mesma lógica.
- Cor semântica fixa: amarelo = hoje e lançar; vermelho = vencido, negativo, domingo; verde = pago, entrada.
- Uma elevação só por folha; o resto é tom sobre tom.
- Assinatura: a folha do mês "arranca" ao trocar de mês; bens financiados giram em 3D sobre um anel pago/aberto.

## Colors

Paleta de papelaria: cobalto de tinta de carimbo, papel e folhas, tinta preta, vermelho de domingo, verde de conferido e uma caneta marca-texto amarela.

### Primary
- **Cobalto de Carimbo** (#1f3fbf): cabeçalho, barra lateral, folha-herói, preenchimentos de marca (botão secundário, barras). Apelidos no código: `--marinho`, `--azul`. No tema escuro o cabeçalho e a barra descem para #1b33a0 e os preenchimentos de marca sobem para #4c6bff.
- **Cobalto Fundo** (#16309a): segundo tom da folha-herói e item ativo sobre o cobalto.
- **Cobalto de Texto** (#1f3fbf no claro, #9fb2ff no escuro): links e texto em cobalto, `--azul-texto`. Texto em cobalto nunca usa o tom de preenchimento do escuro.

### Secondary
- **Marca-texto** (#ffd23f): só o dia de hoje (casa e faixa da semana) e o botão de lançar. Também é o aro de foco sobre o cobalto. Nunca texto sobre fundo claro.
- **Marca-texto Suave** (#fff3c4 no claro, #3b3210 no escuro): fundo de aviso quando o amarelo precisa de um sussurro; no herói vira rgba(255,210,63,0.22).

### Tertiary
- **Verde Conferido** (#1d8a4e; texto #157a43; fundo #e3f4ea): pago, recebido, entrada. Escuro: #2fae68, texto #6fdc9f, fundo #11291d.
- **Vermelho de Domingo** (#d6332a; texto #c0271f; fundo #fde8e6): vencido, saldo negativo, domingo. Escuro: #e4473d, texto #ff9d95, fundo #3a1619.

### Neutral
- **Papel de Parede** (#eef0f4): fundo da página. Escuro #0c0f1a.
- **Folha Branca** (#ffffff): folhas e cartões. Escuro #151a2b.
- **Casca** (#e6e9f0): fundo de dia escolhido, chip pendente, aviso, campos. Escuro #1e2438.
- **Casa do Dia** (#f3f5f9): casa da folhinha sobre a folha. Escuro #1b2135.
- **Tinta** (#14161c): texto. Escuro #eef0f6.
- **Tinta Suave** (#555c6b): texto secundário. Escuro #a3abc2.
- **Linha** (#dde1e9): divisores e traços. Escuro #262d45.
- **Branco sobre Cobalto** (#ffffff) e **Lavanda sobre Cobalto** (#c8d2ff): texto no cabeçalho, barra e herói.

### Named Rules
**The Hoje Rule.** O amarelo marca-texto existe para duas coisas: hoje e o botão de lançar. Qualquer terceiro uso dilui os dois.

**The Domingo Rule.** Vermelho é vencido, negativo e domingo. Não é erro de formulário genérico nem decoração; pago nunca é vermelho.

**The Texto Claro Rule.** Texto colorido usa as variantes `-texto` (verde, vermelho, cobalto); os tons cheios são para preenchimento, pontos e barras. Dentro de `.heroi` as variantes `-texto` são redefinidas para ficar legíveis sobre o cobalto.

## Typography

**Display Font:** Archivo Variable (eixo de largura wdth, self-host via @fontsource-variable/archivo; fallback system-ui, sans-serif)
**Body Font:** Archivo Variable em largura normal
**Label/Mono Font:** a mesma Archivo; números sempre `tabular-nums`

**Character:** Uma só família que muda de largura: condensada e pesada quando é número de folhinha, aberta e calma quando é frase. O contraste vem da largura e do peso, não de uma segunda fonte.

### Hierarchy
- **Numeral** (850, 60 a 88px, line-height 0.85, wdth 68): dia de hoje ou número do mês no cabeçalho (clamp(60px,19vw,76px), 88px no computador), dia na casa (22 a 28px), sobra do mês (64px). Classe `.numeral`.
- **Headline** (800, 34 a 44px, line-height 1, wdth 72, caixa-alta): título das telas sem mês e nome do mês (20 a 34px, wdth 68).
- **Title** (800, 19px, line-height 1.2, wdth 88): h1 a h3 por padrão (peso 800, wdth 88%, tracking -0.01em), como "Esta semana".
- **Valor** (700, 14 a 16px, wdth 82, tabular): valores em reais em listas e casas. Reais grandes, centavos a 0.45em. Classe `.valor`.
- **Body** (400 a 600, 14 a 16px, line-height 1.5, wdth 100): frases, descrições, campos. Texto de apoio em 12 a 14px em Tinta Suave.
- **Label** (700, 10 a 11px, tracking 0.06 a 0.08em, caixa-alta): cabeçalho dos dias da semana (DOM, SEG...).

### Named Rules
**The Numeral Rule.** Número que é dia ou dinheiro usa a largura condensada e `tabular-nums`; frase nunca usa o numeral condensado.

**The Domingo Tipográfico Rule.** DOM em vermelho nos rótulos de dia e no numeral, sempre.

## Layout

Celular primeiro, com o mesmo peso para o computador. No celular: cabeçalho cobalto de borda a borda com dia de hoje grande, mês e a faixa da semana (7 casas), seguido das folhas empilhadas. No computador (lg): barra lateral cobalto fixa de 256px (w-64) à esquerda, cabeçalho arredondado (16px) no topo do conteúdo, folhinha do mês no centro (xl: duas de três colunas) e sobra, financiamentos e contas à direita. O Painel usa `grid xl:grid-cols-3` com gap de 20px.

A folhinha do mês é uma grade de 7 colunas com gap de 4px (6px a partir de sm); casas com altura mínima de 64px no celular e 96px a partir de sm. No celular a casa mostra só pontos (verde entra, vermelho sai); a partir de sm mostra até dois lançamentos com nome e valor. Tocar num dia abre a lista dele embaixo.

Ritmo de espaço: 4, 8, 16, 20 (padding da folha), 24. Toques de no mínimo 44px (size-11, min-h-11), itens de menu de 48px. Respeita `env(safe-area-inset-top)`.

## Elevation & Depth

Híbrido contido: profundidade por tom (papel, folha branca, casca) e uma única sombra por folha.

### Shadow Vocabulary
- **Sombra da folha** (`box-shadow: 0 10px 24px -16px rgba(20,22,28,0.35)`; escuro `0 12px 28px -16px rgba(0,0,0,0.7)`): toda `Moldura`. Uma sombra, difusa, curta, deslocada para baixo.
- **Sombra do botão de lançar** (`box-shadow: 0 14px 28px -10px rgba(20,22,28,0.55)`): só o FAB, que flutua acima da página.
- **Marcação de dia** (`box-shadow: inset 0 0 0 3px var(--destaque)`): hoje na folhinha; dia escolhido soma `inset 0 0 0 2px var(--azul)` (5px quando é hoje). É contorno, não elevação.

### Named Rules
**The Uma-Sombra Rule.** Cada cartão leva uma elevação, a da folha. Cartão dentro de cartão usa tom (Casca, Casa), nunca outra sombra.

## Shapes

Papel cortado com quina suave. Folhas e cabeçalho em 16px, casas em 10px, avisos em 12px, botão de lançar em 20px (quadrado arredondado de 64px), chips e barras de régua em pílula (9999px). Sem bordas pesadas: divisores de 1px em Linha; o contorno forte vem do aro amarelo ou cobalto da casa. Bolinhas de 6px (size-1.5) marcam eventos na faixa e nas casas.

## Components

### Cabeçalho-folhinha
Faixa cobalto com o dia de hoje em numeral (ou o número do mês em outros meses), o mês em caixa-alta condensada e o ano com o dia da semana em Lavanda. Setas de mês de 44px em branco a 10%, com escala 0.95 ao pressionar. Link "Hoje" sublinhado em amarelo (2px) quando o mês não é o atual. Na faixa da semana: 7 casas de raio 10px; hoje com fundo marca-texto e texto tinta; domingo em #ffb4ae; pontos de entrada (#7be0a6) e saída (#ff8f87), no dia de hoje em verde e vermelho cheios. Foco: aro amarelo.

### Folha (Moldura)
Folha branca, raio 16px, padding 20px, uma sombra. Variante herói: fundo cobalto com texto branco e variáveis redefinidas para fundo escuro. Contém a Folha da Sobra: sobra em numeral de 64px (vermelho se negativa) e régua pílula de 12px dividindo a renda em despesas (#ff8f87), financiamentos (#9fb2ff), aporte (marca-texto) e sobra (#7be0a6); sobra negativa pinta a régua toda de vermelho.

### Folhinha do mês
Casas Casa do Dia de raio 10px; numeral do dia a 22px (28px em sm); domingo ou vencido em vermelho; hoje com aro amarelo inset de 3px; escolhido com fundo Casca e aro cobalto; pagos em Tinta Suave e riscados; vencidos em vermelho semibold. Hover troca para Casca (200ms).

### Lista "Esta semana"
Linhas em grade [2,75rem, 1fr, auto] com dia em numeral de 28px e abreviatura abaixo, nome, situação e valor (verde com + para entrada, vermelho com − para saída). Divisores de 1px. Vencido ganha chip vermelho.

### Botão de lançar (FAB)
Quadrado arredondado de 64px, fundo marca-texto, ícone de mais em tinta, canto inferior direito (24px/20px; 32px no computador). Hover sobe 2px, ativo escala 0.95 (300ms, ease da folhinha). Foco: aro na cor da tinta no claro e cobalto claro no escuro.

### Chips e aviso
Pílula com 2px 10px: **vencido** em vermelho-fundo com texto vermelho 700; **pendente** em Casca com texto tinta 600. **Aviso** em Casca, raio 12px, 8px 12px.

### Navegação (barra lateral e menu)
Cobalto, itens de 48px com raio 10px; ativo em branco a 15% com texto branco bold; inativo em Lavanda. Ícones Phosphor de 22px. No celular, painel de até 320px (82%) que desliza da esquerda sobre véu preto a 40% (500ms), com foco preso e Esc fecha; no computador a barra fica sempre aberta.

### Formulários
A folha do editor sobe da base no celular (e centraliza em md), fundo Folha Branca; botões de 48px em pílula: cancelar em Casca, salvar em cobalto (`bg-marca`) com texto branco. Foco global: aro de 2px em Cobalto de Texto, offset 2px; amarelo sobre cobalto.

### Bem em Movimento (assinatura)
Mini cena three.js (carro, moto, casa) em canvas de 176x112px (112x80 quando pequeno), sobre um anel: arco verde = parcelas pagas, vermelho = em aberto; veículo em cobalto com faróis marca-texto. Carregada sob demanda. Sem WebGL, ícone Phosphor leve; com reduzir movimento, quadro parado. Entra com mola (stiffness 220, damping 22) e cresce 6% no hover.

### Motion
- **Arrancar a folha** (assinatura): ao trocar de mês, o bloco número e mês sai com rotateX de 55 graus (sinal pela direção), y de 26px e opacidade 0; o novo entra de rotateX 25 graus e y de 18px, em 0.42s com cubic-bezier(0.16,1,0.3,1), origem no topo, perspectiva de 600px. A direção segue a seta usada. No Painel a folhinha inteira repete: entra com rotateX -18 graus e y 14, sai com rotateX 40 graus e y -30, em 0.45s, perspectiva de 1200px.
- A régua da sobra cresce em scaleX por 0.7s com atraso de 80ms por fatia. As folhas do Painel aparecem em 0.45 a 0.6s (ease [0.32,0.72,0,1]) com atraso escalonado de 40ms. A lista do dia entra com fade e 6px em 0.25s. Os pontos da trilha de parcelas crescem de 0.4 a 1 em 0.35s.
- `MotionConfig reducedMotion="user"` na raiz e `prefers-reduced-motion` no CSS (durações a 0.01ms). Easing padrão: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`.

## Do's and Don'ts

### Do:
- **Do** reservar o amarelo #ffd23f para hoje e para o botão de lançar, e nada mais.
- **Do** usar vermelho para vencido, negativo e domingo; verde para pago e entrada; sempre com a variante `-texto` quando for texto.
- **Do** escrever dias e valores com `.numeral` ou `.valor` (condensado, tabular); reais grandes e centavos a 0.45em.
- **Do** dar a cada folha uma só sombra (`--sombra`) e usar tom (Casca, Casa) para níveis internos.
- **Do** manter toques de 44px, contraste AA e a lógica `.heroi` para texto sobre cobalto.
- **Do** manter o gesto de arrancar a folha ao trocar de mês e desligá-lo com reduzir movimento.

### Don't:
- **Don't** usar o amarelo como texto sobre fundo claro nem como cor de destaque genérica.
- **Don't** pintar pago de vermelho nem usar vermelho para erros que não sejam vencido, negativo ou domingo.
- **Don't** empilhar sombras nem pôr cartão com sombra dentro de cartão com sombra.
- **Don't** usar o numeral condensado em frases, nem uma segunda família tipográfica.
- **Don't** voltar ao app de banco: cartão branco anônimo, saldo gigante isolado e fileira de atalhos em ícones.
- **Don't** usar o cobalto de preenchimento (#4c6bff) como texto no tema escuro; texto usa #9fb2ff.

### Defeitos e deriva não canonizados
- Editor e formulário rápido ainda usam cantos de 2rem (32px) e título de 18px semibold, da identidade anterior; não são regra do sistema.
- Rótulos de seção do menu (11px caixa-alta, tracking 0.12em) são resíduo, não padrão para novas telas.
- O comentário de `.chip-pendente` diz amarelo, mas o chip é Casca; vale o código.
- Os faróis do carro 3D em marca-texto são arte da cena, não um terceiro uso do amarelo em interface.
