// Auditoria visual medida (GUIA_VISUAL.md §8). Cole no console da página do app (npm run dev, localhost:5173)
// depois de ajustar a largura da janela (390, 1024 ou 1440 px). Devolve, por tela: rolagem lateral,
// textos abaixo de 12 px e alvos de toque abaixo de 44 x 44 px (links dentro de frase não contam).
window.auditar = async (rotas = ['#/', '#/painel', '#/lancamentos', '#/contas', '#/dividas', '#/insights', '#/compromissos', '#/fontes', '#/categorias', '#/backup']) => {
  const out = {}
  for (const h of rotas) {
    location.hash = h
    await new Promise((r) => setTimeout(r, 1300))
    const w = document.documentElement
    const vis = (e) => {
      const r = e.getBoundingClientRect()
      const s = getComputedStyle(e)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[inert]')
    }
    const fontes = new Set()
    for (const e of document.querySelectorAll('body *')) {
      if (!vis(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
      const fs = parseFloat(getComputedStyle(e).fontSize)
      if (fs < 12) fontes.add(`${fs}px ${e.textContent.trim().slice(0, 14)}`)
    }
    const alvos = []
    for (const e of document.querySelectorAll('a[href], button, [role=switch], select, input:not([type=hidden])')) {
      if (!vis(e) || (e.closest('p') && e.tagName === 'A')) continue
      const r = e.getBoundingClientRect()
      if (r.width < 44 || r.height < 44) alvos.push(`${e.getAttribute('aria-label') || (e.textContent || '').trim().slice(0, 18)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    out[h] = { rolagem: w.scrollWidth > w.clientWidth ? `${w.scrollWidth}>${w.clientWidth}` : 'ok', fontes: [...fontes], alvos }
  }
  console.table(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { rolagem: v.rolagem, fontes: v.fontes.length, alvos: v.alvos.length }])))
  return out
}

// Contraste WCAG entre duas cores hex (texto 4,5:1; título grande, borda de controle e foco 3:1).
window.contraste = (a, b) => {
  const L = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p)
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
}
