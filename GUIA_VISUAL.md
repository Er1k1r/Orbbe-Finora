# Guia visual · Finanças Pessoais

Como o visual deste app está montado e como mexer nele sem quebrar nada. O método segue o guia do cfc_platform (`cfc_platform/GUIA_VISUAL.md`), adaptado a este app (React + Tailwind v4, PWA).

Leia nesta ordem antes de mexer:
1. `PRODUCT.md`: quem usa o app e para quê.
2. `DESIGN.md`: tokens, tipos e componentes. O topo do arquivo traz o sistema de cores atual (verde-cédula e menta).
3. Este guia: as regras de trabalho e as correções já feitas.

Se `DESIGN.md` discordar do código, valem o código e as notas do topo de `DESIGN.md`.

---

## 1. Como trabalhar

1. **Meça antes de opinar.** Use o servidor de teste e `docs/auditar-visual.js` (ver §8). Ele mede em cada tela: rolagem lateral, texto abaixo de 12 px e alvo de toque abaixo de 44 px. Contraste se calcula com `contraste(a, b)`. Cada achado ganha um código (A1, M2…) e uma evidência (`arquivo:linha` e medida).
2. **Priorize pelo efeito em quem usa.** Alto é o que esconde função, impede o toque ou não se lê. Corrija os altos primeiro.
3. **Um achado por vez, com a menor mudança possível.** Primeiro tente trocar um valor. Depois, ajustar a regra que já existe. Por último, acrescentar uma regra. Não redesenhe a tela.
4. **Meça antes e depois** em 390, 1024 e 1440 px, nos dois temas.
5. **Rode os testes** depois de cada bloco: `npm test` (504 testes), `npm run lint` e `npm run build`.

## 2. A identidade em seis regras

| Regra | Na prática |
|---|---|
| Verde-cédula, gelo e menta, na proporção 60 · 30 · 10 | A menta marca **hoje**, o botão de lançar e no máximo um destaque por tela. Nunca vira texto sobre fundo claro nem preenche área grande. O texto sobre menta é sempre `--sobre-destaque` (#0b2b27). |
| Uma fonte | Hanken Grotesk Variable em tudo. Numerais em 800, `tabular-nums`, tracking −0,04em. Sem itálico, sem segunda fonte, sem título em CAIXA ALTA miúda. |
| Folha de vidro | Cartão com raio de 16 px e uma elevação só: sombra mais brilho interno, sem borda de 1 px. O vidro só aparece sobre o fundo ambiente. A transparência do cabeçalho e da barra não pode baixar dos níveis atuais. (O vidro foi pedido do dono; o cfc não usa.) |
| Enfeite do assunto | A folhinha de parede (dia em numeral, domingo em vermelho, hoje marcado) e os bens em 3D sobre o anel pago/aberto. Nada de robô, foguete ou gráfico genérico. |
| Estado por forma | Pago: interruptor ligado e risco no nome da casa. Vencido: chip vermelho com a palavra. A pagar: contorno. Atrasado: cheio. A cor nunca carrega o sentido sozinha. |
| Pouco movimento | 200 a 450 ms, curva `cubic-bezier(.16, 1, .3, 1)`. A folha arranca ao trocar de mês. Com "reduzir movimento", tudo fica parado e completo (`MotionConfig reducedMotion="user"`, regra CSS e 3D em quadro parado). |

**Nunca mudar sem o dono pedir:** paleta, fonte, a folhinha e os bens em 3D.

## 3. Cores

Os tokens ficam em `app/src/ui/tema.css`. Há três blocos: `:root` (claro), `@media (prefers-color-scheme: dark)` e `:root[data-theme='escuro']`. **Um token do tema escuro entra nos dois blocos escuros.** Os apelidos Tailwind estão em `app/src/index.css` (`@theme inline`).

Regras de uso:
- **Preenchimento com texto branco:** `--azul` (classe `bg-marca`). **Texto, borda e foco sobre superfície:** `--azul-texto` (`text-marca-texto`). O mesmo par existe para verde e vermelho.
- **Dívida em tinta neutra** (`text-divida`), nunca em verde, porque verde lê como entrada.
- **Gráficos:** `--g-fixas`, `--g-parceladas`, `--g-financiamentos`, `--g-variaveis`. São iguais nos dois temas e separados para quem tem daltonismo.
- **Hex solto** só em cores de cena 3D (`cena3d.ts`) e nos tons claros sobre o verde do cabeçalho.
- **Contraste mínimo:** 4,5:1 para texto; 3:1 para título de 24 px ou mais, contorno de foco e borda de controle. Calcule antes de trocar (§8).

Medido em 16/11:

| Tema | Par | Contraste |
|---|---|---|
| Claro | tinta / fundo | 13,7 |
| Claro | tinta suave | 6,1 |
| Claro | cinza | 5,1 |
| Claro | borda de controle | 4,9 |
| Claro | branco / `--azul` | 7,9 |
| Claro | verde-texto | 6,9 |
| Claro | texto / menta | 12,7 |
| Escuro | tinta | 16,3 |
| Escuro | tinta suave | 8,6 |
| Escuro | branco / `--azul` | 5,7 |
| Escuro | verde-texto | 10,3 |

## 4. Tipo, espaço e tamanhos

- **Piso de 12 px** (`text-xs`) em qualquer texto, inclusive rótulos de dia, de mês e de tabela. Texto corrido com 14 px ou mais.
- **Alvo de toque de 44 × 44 px** (`size-11`, `min-h-11`) em tudo que se toca. A única exceção é link dentro de frase. Para aumentar o alvo sem aumentar o desenho, use um botão de 44 px com o desenho dentro (como o interruptor Pago?).
- **Espaço** em múltiplos de 4.
- **Raios:** 16 px nas folhas, 10 px nas casas da folhinha, 12 px nos avisos, 20 px no botão de lançar e pílula (9999px) nos chips.
- **Pontos de quebra:**
  - `md` (768 px): duas colunas.
  - `lg` (1024 px): barra lateral fixa.
  - `xl` (1280 px): três colunas, largura máxima de 1280 px.
  - Fontes, Categorias e Backup ficam numa coluna de 672 px.

## 5. Foco, hover e estados

- **Foco por teclado:** contorno de 3 px em `--azul-texto`. Sobre o verde do cabeçalho, da barra e do herói, o contorno é menta.
- **Campos:** `:focus` troca só a borda; `:focus-visible` desenha o contorno de 3 px com folga de 2 px.
- **Nunca** use `outline: none` sem pôr outro contorno no lugar.
- **Hover** só com ponteiro. O `hover:` do Tailwind v4 já vem dentro de `@media (hover: hover)`. Regra escrita à mão vai dentro desse `@media`.
- **Aviso (informação):** `.aviso` com tinta verde-clara, texto verde e borda forte. **Pendente:** `.chip-pendente`, neutro. **Vencido:** `.chip-vencido`, vermelho.

## 6. Regras técnicas

- **Sem `!important`**, e isso vale para o `!` do Tailwind. Para trocar o preenchimento de uma folha, use `<Moldura preenchimento="p-0">`.
- **Cores só por token.** Nada de hex em `className`, salvo nas exceções da §3.
- Não renomeie `aria-label`, textos de botão e papéis (`role`) que os testes procuram. Busque nos `*.test.tsx` antes de mudar.
- Estado vindo de dado vai em `style={}` (largura de barra, posição de traço); cor fixa vai em classe.

## 7. Passo a passo de uma mudança

1. Escolha um achado da §10 e cite o código.
2. Escreva uma frase: o que se vê hoje, o que se verá depois e quais arquivos mudam.
3. Rode `git status`, leia de novo o trecho e crie uma branch.
4. Meça antes (§8).
5. Faça a mudança: de 1 a 30 linhas; acima de 60, divida em partes.
6. Mexeu no celular? Confira o computador. Mexeu no computador? Confira o celular.
7. Rode `npm test`, `npm run lint` e `npm run build`.
8. Meça depois, nos dois temas.
9. Entregue um relato curto: o que mudou, o que foi verificado e o que **não** foi.
10. A mesclagem fica com o dono. Um achado por commit, com o código na mensagem.

**Pare e pergunte ao dono** quando a mudança:
- altera a ordem dos cartões;
- troca um texto de título ou botão;
- mexe na paleta, na fonte ou na folhinha;
- precisa de um dado novo do motor.

Pergunte também quando os testes já estavam falhando antes.

## 8. Como verificar

```bash
npm --prefix app run dev
```

1. Abra `localhost:5173`, ajuste a janela para 390, 1024 e 1440 px e cole `docs/auditar-visual.js` no console.
2. Rode `await auditar()`. A tabela precisa sair com zero em fontes e alvos e com rolagem `ok`.
3. Para o contraste, rode `contraste('#142824', '#edf2ef')`.
4. Use uma janela anônima (o IndexedDB é do aparelho) ou importe um backup de teste. Nunca use os dados reais.

## 9. Checklist de entrega

- [ ] Um achado só, citado pelo código.
- [ ] Medido em 390, 1024 e 1440 px, nos dois temas, antes e depois.
- [ ] Sem rolagem lateral, nada abaixo de 12 px, alvos de 44 px.
- [ ] Cores de token; contraste de 4,5:1 no texto e 3:1 em contorno e borda.
- [ ] No máximo um destaque menta por tela, além de hoje e do botão de lançar.
- [ ] Foco de 3 px visível nos dois temas.
- [ ] Com "reduzir movimento", nada se mexe e nada some.
- [ ] Testes, lint e build passando.

## 10. Achados

**Feitos em 16/11.** Auditoria medida em 390, 1024 e 1440 px, em todas as telas.

| Código | Prioridade | Achado | Correção |
|---|---|---|---|
| A1 | Alto | Categorias rolava para o lado em 390 px (457 > 390): Editar e Remover não cabiam | A linha quebra (`flex-wrap`) e os botões ficaram mais justos (`Categorias.tsx`) |
| A2 | Alto | O foco dos campos era um anel a 22% de opacidade, com cerca de 1,5:1 | `:focus` troca a borda e `:focus-visible` dá contorno de 3 px (`index.css`) |
| A3 | Alto | O interruptor Pago? tinha 48 × 28 px | Botão de 56 × 44 px com o mesmo desenho dentro; trilho desligado em `--borda-ui` (`Lancamentos.tsx`) |
| A4 | Alto | "Excluir parcelas restantes" e "Cancelar recorrência" tinham 16 px de altura | `min-h-11` |
| A5 | Médio | Casas da folhinha com 42 px de largura no celular | Folha da folhinha com `p-3` no celular e espaço de 2 px entre as casas (`Painel.tsx`, `FolhinhaMes.tsx`) |
| A6 | Médio | Painel: nome do financiamento, "Ver lista", "marcar pago" e o lápis abaixo de 44 px | `min-h-11` e `size-11` |
| A7 | Médio | Lápis e lixeira de Lançamentos com 43 px em 1024 px | Coluna de ações com 6,25rem e `shrink-0` |
| M1 | Médio | Textos de 10 a 11 px (dias da semana, meses do gráfico, cabeçalho de tabela, seções do menu, grade do lançamento rápido) | Piso em `text-xs`; sem caixa alta com letras espaçadas |
| M2 | Baixo | `!important` (`!p-0`, `!p-4`, `!bg-…`) | Propriedade `preenchimento` na `Moldura`; filtro ativo sem `vidro` |
| M3 | Baixo | Hover do botão principal fora de `@media (hover: hover)` | Regra movida para dentro do `@media` |

**Resultado depois das correções:** zero rolagem lateral, zero texto abaixo de 12 px e zero alvo abaixo de 44 px, nas três larguras.

**Ainda sem verificação:**
- leitor de tela de verdade (TalkBack ou NVDA);
- Android físico (a captura de notificações virá no APK);
- Safari ou iPhone;
- Lighthouse;
- prints de antes e depois no tema escuro (as medidas valem para os dois temas, porque não dependem de cor).

**Próximos, pela ordem sugerida:**
- M4: comparar a folha de vidro com a borda de 1 px do cfc no tema claro (pedir ao dono);
- M5: Lighthouse da build (`npm run preview`) no celular;
- M6: rótulo visível em todos os campos de Dívidas e Contas (hoje há campos só com `aria-label`).
