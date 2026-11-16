# Finanças Pessoais

PWA de finanças pessoais que funciona offline: lançamentos, contas, fontes de renda, financiamentos
com simulação de amortização e insights sobre o mês. Os dados ficam só no aparelho (IndexedDB) e
podem ser exportados/importados como backup.

Valores em centavos (inteiros); a lógica financeira fica em `src/domain` (TypeScript puro) e a
persistência em `src/data` (Dexie).

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: checagem de tipos e build de produção
- `npm test`: testes (Vitest)
- `npm run lint`: lint (Oxlint)
