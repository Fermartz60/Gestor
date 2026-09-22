import { useEffect, useRef, useState } from 'react'
import { ArcElement, Chart as ChartJS, Tooltip, Legend } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { X } from 'lucide-react'
import type { Category, Month, Transaction } from '../hooks/useFinanceData'
import { formatDate, formatMoney } from '../utils/financeFormat'

ChartJS.register(ArcElement, Tooltip, Legend)

export interface ChartsAreaProps {
  transactions: readonly Transaction[]
  categories: readonly Category[]
  month: Month
  dark: boolean
  projectedIds: ReadonlySet<Transaction['id']>
}

function CategoryDetails({ category, rows, projectedIds, onClose }: {
  category: Category
  rows: readonly Transaction[]
  projectedIds: ReadonlySet<string>
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby="category-detail-title" onCancel={event => { event.preventDefault(); onClose() }} className="fixed inset-0 z-50 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-black bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:p-7 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="category-detail-title" className="min-w-0 break-words text-xl font-semibold">Movimientos · {category.name}</h2><button type="button" onClick={onClose} aria-label="Cerrar detalle de categoría" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={22} aria-hidden="true" /></button></div>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Movimientos de la categoría">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr>{['Fecha', 'Descripción', 'Método de pago', 'Monto', 'Estado'].map(title => <th key={title} scope="col" className={`px-4 py-3 ${title === 'Monto' ? 'text-right' : ''}`}>{title}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-200 even:bg-gray-100 dark:border-slate-700 dark:even:bg-slate-900/50">
          <td className="whitespace-nowrap px-4 py-3"><time dateTime={row.date}>{formatDate(row.date)}</time></td><td className="max-w-72 break-words px-4 py-3">{row.description || 'Sin descripción'}</td><td className="px-4 py-3">{row.payment}</td><td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatMoney(row.amount)}</td><td className="px-4 py-3 text-xs">{projectedIds.has(row.id) ? 'Proyectado' : 'Registrado'}</td>
        </tr>)}</tbody>
        <tfoot><tr className="font-semibold"><th colSpan={3} className="px-4 py-3">Total de la categoría</th><td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatMoney(rows.reduce((sum, row) => sum + row.amount, 0))}</td><td /></tr></tfoot>
      </table>
    </div>
  </dialog>
}

export default function ChartsArea({ transactions, categories, month, dark, projectedIds }: ChartsAreaProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const totals = new Map<string, number>()
  for (const row of transactions) totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount)
  const segments = categories.map(category => ({ ...category, amount: totals.get(category.id) ?? 0 })).filter(category => category.amount > 0).sort((a, b) => b.amount - a.amount)
  const total = segments.reduce((sum, category) => sum + category.amount, 0)
  const selected = categories.find(category => category.id === selectedId)
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    layout: { padding: 14 },
    animation: reducedMotion ? false : { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: dark ? '#e2e8f0' : '#1e293b', titleColor: dark ? '#0f172a' : '#fff', bodyColor: dark ? '#0f172a' : '#fff', callbacks: { label: context => `${context.label}: ${formatMoney(context.parsed)} (${(context.parsed / total * 100).toFixed(1)}%)` } },
    },
    onHover: (_event, elements, chart) => { chart.canvas.style.cursor = elements.length ? 'pointer' : 'default' },
    onClick: (_event, elements) => {
      const segment = elements[0] && segments[elements[0].index]
      if (segment) setSelectedId(segment.id)
    },
  }
  return <section aria-labelledby="distribution-title" className="mt-8 rounded-2xl border border-black bg-white p-5 sm:p-6 dark:border-slate-600 dark:bg-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="distribution-title" className="text-xl font-semibold">¿En qué se va tu dinero?</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Selecciona una categoría para ver sus movimientos.</p></div><span className="text-sm text-slate-500 dark:text-slate-300">{month}</span></div>
    {total === 0 ? <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-300">Aún no hay gastos en este mes. Registra uno para ver su distribución.</div> : <div className="mt-5 grid items-center gap-6 md:grid-cols-[minmax(240px,1fr)_1.5fr]">
      <div className="relative mx-auto h-72 w-full max-w-80">
        <Doughnut aria-label={`Distribución de gastos de ${month}. Usa los botones de categorías para consultar el detalle.`} role="img" data={{ labels: segments.map(category => category.name), datasets: [{ data: segments.map(category => category.amount), backgroundColor: segments.map(category => category.color), borderColor: dark ? '#1e293b' : '#ffffff', borderWidth: 2, hoverOffset: reducedMotion ? 0 : 10 }] }} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"><span className="text-xs text-slate-500 dark:text-slate-300">Total del mes</span><strong className="max-w-40 text-center text-lg break-words tabular-nums">{formatMoney(total)}</strong></div>
      </div>
      <ul className="min-w-0 divide-y divide-slate-200 dark:divide-slate-700">{segments.map(category => <li key={category.id}><button type="button" aria-haspopup="dialog" onClick={() => setSelectedId(category.id)} className="flex w-full flex-wrap items-center gap-3 rounded-lg px-2 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"><span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: category.color }} aria-hidden="true" /><span className="min-w-0 flex-1 break-words">{category.name}</span><strong className="tabular-nums">{formatMoney(category.amount)}</strong><span className="w-14 text-right text-xs text-slate-500 dark:text-slate-300">{(category.amount / total * 100).toFixed(1)}%</span></button></li>)}</ul>
    </div>}
    {selected && <CategoryDetails category={selected} rows={transactions.filter(row => row.category === selected.id)} projectedIds={projectedIds} onClose={() => setSelectedId(null)} />}
  </section>
}
