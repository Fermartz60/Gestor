import { ArrowRight, Download, ListFilter, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category, Transaction } from '../hooks/useFinanceData'
import { formatDate, formatMoney } from '../utils/financeFormat'

export interface TransactionTableProps {
  transactions: readonly Transaction[]
  categories: readonly Category[]
  projectedIds: ReadonlySet<Transaction['id']>
  onAdd: () => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onExport: () => void
  disabled?: boolean
}

export default function TransactionTable({ transactions, categories, projectedIds, onAdd, onEdit, onDelete, onExport, disabled }: TransactionTableProps) {
  const categoryMap = new Map(categories.map(category => [category.id, category]))
  const total = transactions.reduce((sum, row) => sum + row.amount, 0)
  const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f4f4f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243e3e]'
  return (
    <section aria-labelledby="transactions-title" className="overflow-hidden rounded-2xl border border-black dark:border-slate-600 bg-white dark:bg-slate-800">
      <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div><h2 id="transactions-title" className="text-xl font-semibold">Movimientos del mes</h2><p className="mt-1.5 text-sm text-[#64757d] dark:text-slate-300">Todos tus gastos, en un solo vistazo.</p></div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onExport} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-black dark:border-slate-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" title="Exportar solo movimientos registrados"><Download size={17} aria-hidden="true" /> CSV</button>
          <button type="button" onClick={onAdd} disabled={disabled} className={primary}><Plus size={19} aria-hidden="true" /> Agregar gasto</button>
        </div>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de movimientos, desplazamiento horizontal">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <caption className="sr-only">Gastos del periodo seleccionado y proyecciones de suscripciones</caption>
          <thead className="bg-[#f7f9fa] dark:bg-slate-900 text-xs text-[#64757d] dark:text-slate-300"><tr>
            {['Fecha', 'Categoría', 'Descripción', 'Método de pago', 'Monto', 'Notas', 'Acciones'].map(label => <th key={label} scope="col" className={`border-b border-black dark:border-slate-600 px-5 py-4 font-semibold not-first:border-l ${label === 'Monto' ? 'text-right' : ''}`}><span className={label === 'Acciones' ? 'sr-only' : ''}>{label}</span></th>)}
          </tr></thead>
          <tbody>
            {transactions.map(transaction => {
              const category = categoryMap.get(transaction.category)
              const projected = projectedIds.has(transaction.id)
              return (
                <tr key={transaction.id} className="odd:bg-white dark:odd:bg-slate-800 even:bg-gray-100 dark:even:bg-slate-900/60 hover:bg-[#e5ecec] dark:hover:bg-slate-700 [&>td]:border-b [&>td]:border-black dark:[&>td]:border-slate-600 [&>td]:px-5 [&>td]:py-4 [&>td:not(:first-child)]:border-l">
                  <td className="whitespace-nowrap text-[#53676f] dark:text-slate-300"><time dateTime={transaction.date}>{formatDate(transaction.date)}</time></td>
                  <td><span className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-[#e5ecec] dark:bg-slate-700 px-2.5 py-1.5 text-xs text-[#2f4f4f] dark:text-teal-200"><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: category?.color ?? '#8899ac' }} />{category?.name ?? transaction.category}</span></td>
                  <td className="max-w-72 min-w-40 break-words font-medium">{transaction.description || 'Sin descripción'}</td>
                  <td className="text-[#53676f] dark:text-slate-300">{transaction.payment}</td>
                  <td className="text-right whitespace-nowrap font-medium tabular-nums">{formatMoney(transaction.amount)}</td>
                  <td className="max-w-52 break-words text-xs text-[#53676f] dark:text-slate-300">{transaction.notes || '—'}</td>
                  <td>{projected ? <span className="text-xs font-medium text-[#527979]">Proyectado</span> : <div className="flex gap-1">
                    <button type="button" disabled={disabled} onClick={() => onEdit(transaction)} aria-label={`Editar ${transaction.description || 'gasto'} del ${transaction.date}`} title="Editar gasto" className="rounded-md p-2.5 text-[#2f4f4f] dark:text-teal-200 hover:bg-white dark:hover:bg-slate-600"><Pencil size={17} aria-hidden="true" /></button>
                    <button type="button" disabled={disabled} onClick={() => onDelete(transaction)} aria-label={`Eliminar ${transaction.description || 'gasto'} del ${transaction.date}`} title="Eliminar gasto" className="rounded-md p-2.5 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={17} aria-hidden="true" /></button>
                  </div>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {transactions.length === 0 && <div className="px-5 py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#e5ecec] dark:bg-slate-700 text-[#527979]"><ListFilter size={26} aria-hidden="true" /></span>
        <h3 className="mt-4 font-semibold">Un mes por organizar</h3>
        <p className="mt-2 text-sm text-[#64757d] dark:text-slate-300">Agrega tu primer gasto para ver cómo va tu presupuesto.</p>
        <button type="button" disabled={disabled} onClick={onAdd} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2f4f4f] dark:text-teal-200 hover:underline">Registrar un gasto <ArrowRight size={16} aria-hidden="true" /></button>
      </div>}
      <div className="flex flex-wrap justify-between gap-2 border-t border-black dark:border-slate-600 px-6 py-4 text-xs text-[#64757d] dark:text-slate-300"><span>{transactions.length} {transactions.length === 1 ? 'movimiento' : 'movimientos'} · Total {formatMoney(total)}</span><span>Moneda: MXN</span></div>
    </section>
  )
}
