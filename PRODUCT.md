# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas de renda variada, com pouca familiaridade com finanças: o contador de horário fixo, a vendedora de brownie desempregada, o pedreiro que vive de bicos. Usam para saber quanto sobra no mês, o que ainda vão pagar e se a conta vai ficar negativa.

## Product Purpose

Controle de finanças pessoais local: contas (banco, caixa, carteira, reserva), entradas e saídas, compras parceladas, financiamentos cadastrados pelo carnê, sobra normal e otimizada, insights conforme o tipo de renda. Sucesso: a pessoa lança um gasto em segundos e entende, sem planilha, quanto pode gastar e o que vem pela frente.

## Positioning

Financiamento entra pelo carnê (o app calcula a taxa, o saldo devedor e o desconto de quitação) e os insights se adaptam ao tipo de renda (fixa, variável, bicos). Tudo fica no aparelho, nada vai para a nuvem.

## Operating Context

Celular e computador com o mesmo peso: celular para lançar na hora do gasto, computador (Painel) para revisar e planejar o mês. PWA instalável e offline; depois vira APK (Capacitor) com leitura de notificações do banco.

## Capabilities and Constraints

- React 19 + Vite + TypeScript + Tailwind v4, Dexie/IndexedDB, PWA. Dinheiro em centavos inteiros.
- Telas: Resumo, Painel, Lançamentos (com editor), Contas, Fontes de renda, Categorias, Dívidas e detalhe, Insights, Compromissos, Backup, Onboarding, lançamento rápido.
- Termos: sobra normal, sobra otimizada, saldo seguro, previsto, pendente, parcela, antecipação, quitação, reserva, cheque especial.
- Precache do PWA abaixo de 2 MiB por arquivo; `three` só carregado sob demanda.

## Brand Commitments

Nome: Finanças Pessoais. Texto em português do Brasil, direto, sem jargão de banco. Identidade visual livre (o petróleo e limão do cfc_platform foi ponto de partida, não compromisso).

## Evidence on Hand

Nenhum depoimento, cliente ou número real. Dados de exemplo são sintéticos.

## Product Principles

- Lançar é mais rápido que esquecer: o caminho do gasto é o mais curto do app.
- Mostrar o que vem, não só o que foi: parcelas, recorrências e previstos sempre visíveis.
- Linguagem de quem não é do mercado financeiro.
- Os dados são da pessoa e ficam no aparelho.

## Accessibility & Inclusion

Público amplo, inclusive com pouca leitura financeira e celulares simples: toques de 44 px, contraste AA, funciona com "reduzir movimento".
