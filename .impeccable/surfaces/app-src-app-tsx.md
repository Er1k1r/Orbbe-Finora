---
version: 1
slug: "app-src-app-tsx"
primary_target: "app/src/App.tsx"
related_targets: ["app/src/ui/telas/Painel.tsx","app/src/ui/telas/Resumo.tsx"]
---

Escopo: app inteiro (Resumo, Painel, Lançamentos, Contas, Dívidas, Insights, formulários). Modo: Operate.
Público: renda variada, pouca leitura financeira; celular para lançar, computador para planejar.

## Direction contract

THESIS: O mês do dinheiro é a folhinha da cozinha: cada dia mostra o que entra e o que vence, e hoje está marcado a caneta. Recusa o app de banco branco com um azul, saldo gigante e atalhos em ícones.

OWN-WORLD: Azul-cobalto (#1f3fbf) no cabeçalho e na barra lateral, papel claro (#f3f4f7) com folhas brancas, tinta quase preta, vermelho de domingo para vencido e negativo, verde para pago e entrada, amarelo marca-texto (#ffd23f) só para hoje e para o botão de lançar. Archivo variável: numerais condensados enormes (wdth 70, 800) para dias e valores; corpo em largura normal.

STORY: A pessoa abre e vê o dia de hoje, a semana com bolinhas do que vence e a sobra do mês; entende o que precisa pagar antes de sexta e lança o gasto no botão amarelo.

FIRST VIEWPORT: Celular: cabeçalho cobalto com dia de hoje grande, mês e a faixa da semana (7 casas, hoje amarelo, pontos verde/vermelho); abaixo, a sobra em numerais grandes com barra pago/aberto e a lista "Esta semana". Computador: barra lateral cobalto; centro com a folhinha do mês (casas com lançamentos e vencimentos), direita com sobra, financiamentos com carro/casa 3D e contas.

FORM: Folhinha de Parede, candidato 5 da lista ordenada (1 carnê, 2 caderneta, 3 cédulas, 4 cartaz de oferta, 5 folhinha, 6 cupom fiscal, 7 cofrinho). seed:e8980a0bbeaab592. Assinatura: a folha do mês "arranca" (vira para cima) ao trocar de mês; bens financiados em 3D rodando sobre o anel pago/aberto.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
