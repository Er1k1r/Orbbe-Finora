---
name: Finora
description: A folhinha de parede da cozinha virada app, com verde-cédula, papel claro, numerais condensados e o dia de hoje marcado a caneta.
colors:
  verde-cédula: "#0f4c45"
  verde-cédula-fundo: "#0b3a35"
  marca-texto: "#a1ffcb"
  marca-texto-suave: "#fff3c4"
  papel: "#f1f2ef"
  folha: "#ffffff"
  casca: "#e6e9e6"
  casa: "#e8ede9"
  tinta: "#1d2321"
  tinta-suave: "#56605c"
  linha: "#dfe4e1"
  verde: "#1d8a4e"
  verde-texto: "#13704a"
  verde-fundo: "#e1f4e8"
  vermelho: "#c2362b"
  vermelho-texto: "#b02a20"
  vermelho-fundo: "#fbe5e2"
  sobre-verde-cédula: "#ffffff"
  sobre-verde-cédula-suave: "#b9d6cc"
  noite-papel: "#0b1412"
  noite-folha: "#13201d"
  noite-casca: "#1a2a26"
  noite-casa: "#1e2e2a"
  noite-verde-cédula: "#0e3f39"
  noite-azul: "#3fae94"
  noite-azul-texto: "#7fdcc0"
  noite-verde-texto: "#6fdc9f"
  noite-vermelho-texto: "#ff9d92"
typography:
  numeral:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 850
    lineHeight: 0.85
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  valor:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk Variable, system-ui, sans-serif"
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
    backgroundColor: "{colors.verde-cédula}"
    textColor: "{colors.sobre-verde-cédula}"
    rounded: "{rounded.folha}"
    padding: "20px"
  cabecalho:
    backgroundColor: "{colors.verde-cédula}"
    textColor: "{colors.sobre-verde-cédula}"
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
    backgroundColor: "{colors.verde-cédula-fundo}"
    textColor: "{colors.sobre-verde-cédula}"
    rounded: "{rounded.casa}"
    height: "48px"
---

# Design System: Finanças Pessoais

> Atualização 2026-11-16: o dono trocou o azul-cobalto e a fonte. Paleta "verde-cédula e menta" (verde-escuro do dinheiro #0f4c45 no cabeçalho, barra e herói; menta #a1ffcb como marca-texto de hoje e do botão de lançar) e Hanken Grotesk Variable em tudo, numerais em 800 com tracking -0.04em (sem eixo de largura). Dívidas em tinta neutra, nunca em verde, para não parecer entrada de dinheiro. Nos nomes de token, "verde-cédula" substituiu "cobalto".

> Sistema de cores (2026-11-16), copiado do cfc_platform e mantendo verde-cédula e menta:
> - **60 · gelo e tinta:** fundo #edf2ef, folha #fbfcfb (sem branco puro), superfície-2 #e9efeb, faixa #e3ebe6, tinta #142824 (13,6:1), tinta suave #4a5f57 (6:1), linha #d6e2dc, linha forte #bccdc5, cinza #536a62, borda de controle #5f746c (4,9:1, todo campo tem contorno).
> - **30 · verde-cédula:** cabeçalho, barra e herói #0f4c45; preenchimento `--azul` #0f5c52 com texto branco (7,9:1), hover #0b4840; texto/link/foco `--azul-texto` #0f5c52; tinta clara #e0f0ea para aviso e hover de contorno.
> - **10 · menta:** #a1ffcb, só no hoje, no botão de lançar e num destaque por tela. O texto sobre menta é sempre #0b2b27 (12,7:1). Hover #7fe8ae, anel interno #2f8a5f no claro.
> - **Estados fora da conta:** verde #15803d/#126b2f/#e4f5ea, vermelho #c62828/#fdecec, amarelo-bg #fff4dd.
> - **Gráficos:** fixas #0f7f6e, parceladas #3a6fd8, financiamentos #a8620c, variáveis #b0402b, iguais nos dois temas e bem separados para quem tem daltonismo.
> - **Escuro:** fundo #0b1412, folha #13201d, tinta #e6f2ec, preenchimento #18735f (5,7:1 com branco), texto verde #7fdcc0, menta #b0ffd5, sem anel na menta.
> - **Foco:** 3px de `--azul-texto` com folga de 3px; menta sobre o verde.
> - **Diferenças do cfc:** cartões em vidro sem borda de 1px (pedido do dono) e dívida em tinta neutra.

> Atualização 2026-11-16 (noite): fonte trocada para **Geist Variable**, que substitui a Hanken Grotesk e vale onde este documento ainda cita Hanken. O tema escuro foi para verde-petróleo: fundo #0b1513, folha #111d1a com contorno de 1 px a 7%, menta #6fe3c2. Ver GUIA_VISUAL.md §3.

## Overview

**Creative North Star: "A Folhinha de Parede"**

O mês do dinheiro é a folhinha da cozinha: cada dia mostra o que entra e o que vence, e hoje está marcado a caneta. A interface é uma parede de papel claro com folhas brancas penduradas, um cabeçalho e uma barra lateral em azul-verde-cédula, tinta quase preta e numerais condensados e pesados que fazem o papel de dias e valores. O sistema recusa o app de banco branco com um azul, saldo gigante e atalhos em ícones.

A cor trabalha como sinal, não como enfeite. O verde-cédula ancora a estrutura (cabeçalho, barra, folha-herói). O vermelho é o vermelho de domingo da folhinha: serve para vencido, negativo e domingo. O verde é pago e entrada. O menta marca-texto aparece em dois lugares só: o dia de hoje e o botão de lançar. Essa escassez é o que faz o olho achar "hoje" e "lançar" sem procurar.

A densidade é de calendário: casas pequenas e regulares, números grandes, texto curto. Serve a quem tem pouca leitura financeira e usa o celular para lançar; no computador a mesma folhinha ganha casas com nomes e valores.

**Key Characteristics:**
- Numerais condensados (wdth 68 a 82, peso 700 a 850) em dias e valores; corpo em largura normal.
- Verde-cédula estrutural, papel claro, folhas brancas, tinta quase preta; tema escuro com a mesma lógica.
- Cor semântica fixa: menta = hoje e lançar; vermelho = vencido, negativo, domingo; verde = pago, entrada.
- Uma elevação só por folha; o resto é tom sobre tom.
- Assinatura: a folha do mês "arranca" ao trocar de mês; bens financiados giram em 3D sobre um anel pago/aberto.

## Colors

Paleta de papelaria: verde-cédula de tinta de carimbo, papel e folhas, tinta preta, vermelho de domingo, verde de conferido e uma caneta marca-texto amarela.

### Primary
- **Verde-cédula de Carimbo** (#0f4c45): cabeçalho, barra lateral, folha-herói, preenchimentos de marca (botão secundário, barras). Apelidos no código: `--marinho`, `--azul`. No tema escuro o cabeçalho e a barra descem para #0e3f39 e os preenchimentos de marca sobem para #3fae94.
- **Verde-cédula Fundo** (#0b3a35): segundo tom da folha-herói e item ativo sobre o verde-cédula.
- **Verde-cédula de Texto** (#0f4c45 no claro, #7fdcc0 no escuro): links e texto em verde-cédula, `--azul-texto`. Texto em verde-cédula nunca usa o tom de preenchimento do escuro.

### Secondary
- **Marca-texto** (#a1ffcb): só o dia de hoje (casa e faixa da semana) e o botão de lançar. Também é o aro de foco sobre o verde-cédula. Nunca texto sobre fundo claro.
- **Marca-texto Suave** (#fff3c4 no claro, #3b3210 no escuro): fundo de aviso quando o menta precisa de um sussurro; no herói vira rgba(255,210,63,0.22).

### Tertiary
- **Verde Conferido** (#1d8a4e; texto #13704a; fundo #e1f4e8): pago, recebido, entrada. Escuro: #2fae68, texto #6fdc9f, fundo #11291d.
- **Vermelho de Domingo** (#c2362b; texto #b02a20; fundo #fbe5e2): vencido, saldo negativo, domingo. Escuro: #e4473d, texto #ff9d92, fundo #3a1619.

### Neutral
- **Papel de Parede** (#f1f2ef): fundo da página. Escuro #0b1412.
- **Folha Branca** (#ffffff): folhas e cartões. Escuro #13201d.
- **Casca** (#e6e9e6): fundo de dia escolhido, chip pendente, aviso, campos. Escuro #1a2a26.
- **Casa do Dia** (#e8ede9): casa da folhinha sobre a folha. Escuro #1e2e2a.
- **Tinta** (#1d2321): texto. Escuro #eef0f6.
- **Tinta Suave** (#56605c): texto secundário. Escuro #a3abc2.
- **Linha** (#dfe4e1): divisores e traços. Escuro #262d45.
- **Branco sobre Verde-cédula** (#ffffff) e **Lavanda sobre Verde-cédula** (#b9d6cc): texto no cabeçalho, barra e herói.

### Named Rules
**The Hoje Rule.** O menta marca-texto existe para duas coisas: hoje e o botão de lançar. Qualquer terceiro uso dilui os dois.

**The Domingo Rule.** Vermelho é vencido, negativo e domingo. Não é erro de formulário genérico nem decoração; pago nunca é vermelho.

**The Texto Claro Rule.** Texto colorido usa as variantes `-texto` (verde, vermelho, verde-cédula); os tons cheios são para preenchimento, pontos e barras. Dentro de `.heroi` as variantes `-texto` são redefinidas para ficar legíveis sobre o verde-cédula.

## Typography

**Display Font:** Hanken Grotesk Variable (eixo de largura wdth, self-host via @fontsource-variable/archivo; fallback system-ui, sans-serif)
**Body Font:** Hanken Grotesk Variable em largura normal
**Label/Mono Font:** a mesma Hanken Grotesk; números sempre `tabular-nums`

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

Celular primeiro, com o mesmo peso para o computador. No celular: cabeçalho verde-cédula de borda a borda com dia de hoje grande, mês e a faixa da semana (7 casas), seguido das folhas empilhadas. No computador (lg): barra lateral verde-cédula fixa de 256px (w-64) à esquerda, cabeçalho arredondado (16px) no topo do conteúdo, folhinha do mês no centro (xl: duas de três colunas) e sobra, financiamentos e contas à direita. O Painel usa `grid xl:grid-cols-3` com gap de 20px.

A folhinha do mês é uma grade de 7 colunas com gap de 4px (6px a partir de sm); casas com altura mínima de 64px no celular e 96px a partir de sm. No celular a casa mostra só pontos (verde entra, vermelho sai); a partir de sm mostra até dois lançamentos com nome e valor. Tocar num dia abre a lista dele embaixo.

Largura: todas as telas usam até 1280px (`xl:max-w-7xl`), menos Fontes, Categorias e Backup, que ficam em uma coluna de 672px. Resumo: grade de 1/2/3 colunas (sobra e visão geral largas, "Esta semana" ao lado da sobra). Lançamentos: tabela no computador (Data, Descrição, Categoria, Conta, Tipo, Valor, Pago?, ações) com chips de filtro, linha tracejada "Novo lançamento", interruptor Pago? e rodapé de totais; no celular cada linha vira bloco. Contas: tabela "Movimento do mês" (saldo inicial, receitas, despesas, transferências, saldo, previsto, total) e as folhas de cada conta em grade.

Ritmo de espaço: 4, 8, 16, 20 (padding da folha), 24. Toques de no mínimo 44px (size-11, min-h-11), itens de menu de 48px. Respeita `env(safe-area-inset-top)`.

## Elevation & Depth

Híbrido contido: profundidade por tom (papel, folha branca, casca) e uma única sombra por folha.

### Shadow Vocabulary
- **Sombra da folha** (`box-shadow: 0 10px 24px -16px rgba(20,22,28,0.35)`; escuro `0 12px 28px -16px rgba(0,0,0,0.7)`): toda `Moldura`. Uma sombra, difusa, curta, deslocada para baixo.
- **Sombra do botão de lançar** (`box-shadow: 0 14px 28px -10px rgba(20,22,28,0.55)`): só o FAB, que flutua acima da página.
- **Marcação de dia** (`box-shadow: inset 0 0 0 3px var(--destaque)`): hoje na folhinha; dia escolhido soma `inset 0 0 0 2px var(--azul)` (5px quando é hoje). É contorno, não elevação.

### Vidro e fundo ambiente (pedido do dono, 2026-11-16)
As folhas são vidro: classe `.vidro` com `background: var(--vidro)` (claro `rgba(255,255,255,.64)`, escuro `rgba(21,26,43,.6)`), `backdrop-filter: blur(22px) saturate(1.5)` e `box-shadow: var(--sombra), inset 0 1px 0 var(--vidro-brilho)`. O brilho de cima é luz, não contorno: nada de borda de 1px. Cabeçalho, barra lateral e cartão-herói são vidro verde-cédula (`.heroi` troca `--vidro` por `--vidro-verde-cédula`, `rgba(31,63,191,.9)`). Atrás de tudo, `.ambiente`: três campos desfocados (verde-cédula, marca-texto, verde; `--ambiente-1..3`) à deriva em 32–44s, parados com "reduzir movimento". As casas da folhinha (`--casa`) também são translúcidas.

### Named Rules
**The Uma-Sombra Rule.** Cada cartão leva uma elevação, a da folha. Cartão dentro de cartão usa tom (Casca, Casa), nunca outra sombra.

**The Vidro-Com-Fundo Rule.** Vidro só sobre o fundo ambiente; sem campos de cor atrás, o desfoque não tem o que mostrar e vira cinza. Texto sobre vidro segue as cores `-texto`.

## Shapes

Papel cortado com quina suave. Folhas e cabeçalho em 16px, casas em 10px, avisos em 12px, botão de lançar em 20px (quadrado arredondado de 64px), chips e barras de régua em pílula (9999px). Sem bordas pesadas: divisores de 1px em Linha; o contorno forte vem do aro menta ou verde-cédula da casa. Bolinhas de 6px (size-1.5) marcam eventos na faixa e nas casas.

## Components

### Cabeçalho-folhinha
Faixa verde-cédula com o dia de hoje em numeral (ou o número do mês em outros meses), o mês em caixa-alta condensada e o ano com o dia da semana em Lavanda. Setas de mês de 44px em branco a 10%, com escala 0.95 ao pressionar. Link "Hoje" sublinhado em menta (2px) quando o mês não é o atual. Na faixa da semana: 7 casas de raio 10px; hoje com fundo marca-texto e texto tinta; domingo em #ffb4ae; pontos de entrada (#7be0a6) e saída (#ff8f87), no dia de hoje em verde e vermelho cheios. Foco: aro menta.

### Folha (Moldura)
Folha branca, raio 16px, padding 20px, uma sombra. Variante herói: fundo verde-cédula com texto branco e variáveis redefinidas para fundo escuro. Contém a Folha da Sobra: sobra em numeral de 64px (vermelho se negativa) e régua pílula de 12px dividindo a renda em despesas (#ff8f87), financiamentos (#7fdcc0), aporte (marca-texto) e sobra (#7be0a6); sobra negativa pinta a régua toda de vermelho.

### Folhinha do mês
Casas Casa do Dia de raio 10px; numeral do dia a 22px (28px em sm); domingo ou vencido em vermelho; hoje com aro menta inset de 3px; escolhido com fundo Casca e aro verde-cédula; pagos em Tinta Suave e riscados; vencidos em vermelho semibold. Hover troca para Casca (200ms).

### Lista "Esta semana"
Linhas em grade [2,75rem, 1fr, auto] com dia em numeral de 28px e abreviatura abaixo, nome, situação e valor (verde com + para entrada, vermelho com − para saída). Divisores de 1px. Vencido ganha chip vermelho.

### Botão de lançar (FAB)
Quadrado arredondado de 64px, fundo marca-texto, ícone de mais em tinta, canto inferior direito (24px/20px; 32px no computador). Hover sobe 2px, ativo escala 0.95 (300ms, ease da folhinha). Foco: aro na cor da tinta no claro e verde-cédula claro no escuro.

### Chips e aviso
Pílula com 2px 10px: **vencido** em vermelho-fundo com texto vermelho 700; **pendente** em Casca com texto tinta 600. **Aviso** em Casca, raio 12px, 8px 12px.

### Navegação (barra lateral e menu)
Verde-cédula, itens de 48px com raio 10px; ativo em branco a 15% com texto branco bold; inativo em Lavanda. Ícones Phosphor de 22px. No celular, painel de até 320px (82%) que desliza da esquerda sobre véu preto a 40% (500ms), com foco preso e Esc fecha; no computador a barra fica sempre aberta.

### Formulários
A folha do editor sobe da base no celular (e centraliza em md), fundo Folha Branca; botões de 48px em pílula: cancelar em Casca, salvar em verde-cédula (`bg-marca`) com texto branco. Foco global: aro de 2px em Verde-cédula de Texto, offset 2px; menta sobre verde-cédula.

### Bem em Movimento (assinatura)
Mini cena three.js (carro, moto, casa) em canvas de 176x112px (112x80 quando pequeno), sobre um anel: arco verde = parcelas pagas, vermelho = em aberto; veículo em verde-cédula com faróis marca-texto. Carregada sob demanda. Sem WebGL, ícone Phosphor leve; com reduzir movimento, quadro parado. Entra com mola (stiffness 220, damping 22) e cresce 6% no hover.

### Motion
- **Arrancar a folha** (assinatura): ao trocar de mês, o bloco número e mês sai com rotateX de 55 graus (sinal pela direção), y de 26px e opacidade 0; o novo entra de rotateX 25 graus e y de 18px, em 0.42s com cubic-bezier(0.16,1,0.3,1), origem no topo, perspectiva de 600px. A direção segue a seta usada. No Painel a folhinha inteira repete: entra com rotateX -18 graus e y 14, sai com rotateX 40 graus e y -30, em 0.45s, perspectiva de 1200px.
- A régua da sobra cresce em scaleX por 0.7s com atraso de 80ms por fatia. As folhas do Painel aparecem em 0.45 a 0.6s (ease [0.32,0.72,0,1]) com atraso escalonado de 40ms. A lista do dia entra com fade e 6px em 0.25s. Os pontos da trilha de parcelas crescem de 0.4 a 1 em 0.35s.
- `MotionConfig reducedMotion="user"` na raiz e `prefers-reduced-motion` no CSS (durações a 0.01ms). Easing padrão: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`.

## Do's and Don'ts

### Do:
- **Do** reservar o menta #a1ffcb para hoje e para o botão de lançar, e nada mais.
- **Do** usar vermelho para vencido, negativo e domingo; verde para pago e entrada; sempre com a variante `-texto` quando for texto.
- **Do** escrever dias e valores com `.numeral` ou `.valor` (condensado, tabular); reais grandes e centavos a 0.45em.
- **Do** dar a cada folha uma só sombra (`--sombra`) e usar tom (Casca, Casa) para níveis internos.
- **Do** manter toques de 44px, contraste AA e a lógica `.heroi` para texto sobre verde-cédula.
- **Do** manter o gesto de arrancar a folha ao trocar de mês e desligá-lo com reduzir movimento.

### Don't:
- **Don't** usar o menta como texto sobre fundo claro nem como cor de destaque genérica.
- **Don't** pintar pago de vermelho nem usar vermelho para erros que não sejam vencido, negativo ou domingo.
- **Don't** empilhar sombras nem pôr cartão com sombra dentro de cartão com sombra.
- **Don't** usar o numeral condensado em frases, nem uma segunda família tipográfica.
- **Don't** voltar ao app de banco: cartão branco anônimo, saldo gigante isolado e fileira de atalhos em ícones.
- **Don't** usar o verde-cédula de preenchimento (#3fae94) como texto no tema escuro; texto usa #7fdcc0.

### Defeitos e deriva não canonizados
- Editor e formulário rápido ainda usam cantos de 2rem (32px) e título de 18px semibold, da identidade anterior; não são regra do sistema.
- Rótulos de seção do menu (11px caixa-alta, tracking 0.12em) são resíduo, não padrão para novas telas.
- O comentário de `.chip-pendente` diz menta, mas o chip é Casca; vale o código.
- Os faróis do carro 3D em marca-texto são arte da cena, não um terceiro uso do menta em interface.
