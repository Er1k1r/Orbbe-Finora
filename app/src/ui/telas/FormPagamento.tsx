import { useRef, useState } from 'react'
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
  // Padrão "Outros": é só um rótulo; o Resumo não mostra pagamento de financiamento por categoria.
  const [categoriaId, setCategoriaId] = useState((grade.find((c) => c.id === 'outros') ?? grade[0])?.id ?? '')
  const [erro, setErro] = useState('')
  const ocupado = useRef(false)
  const valor = centavosDeDigitos(digitos)
  const difere = tipo === 'parcela' && parcelaContrato !== undefined && valor !== parcelaContrato

  async function salvar() {
    if (ocupado.current) return
    if (valor <= 0) { setErro('Informe um valor maior que zero.'); return }
    if (!contaId || !categoriaId) { setErro('Escolha a conta e a categoria.'); return }
    if (!dataReal(data)) { setErro('Informe uma data válida.'); return }
    ocupado.current = true
    try {
      await repo.lancamentos.salvar({
        id: novoId(), valor, data, tipo: 'saida', categoriaId,
        natureza: tipo === 'parcela' ? 'fixo' : 'variavel',
        contaId, status: 'pago', descricao,
        financiamentoId: f.id, pagamentoFinanciamento: tipo,
      })
      fechar()
    } finally { ocupado.current = false }
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
      {erro && <p role="alert" className="text-sm text-negativo">{erro}</p>}
    </FormRapido>
  )
}
