import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { ChevronDown } from 'lucide-react'
import type { MonthlyExpenseTotal } from '../hooks/useFinanceData'
import { formatMoney } from '../utils/financeFormat'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export interface MultiMonthChartProps {
  history: readonly MonthlyExpenseTotal[]
  dark: boolean
}

export default function MultiMonthChart({ history, dark }: MultiMonthChartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const options: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => formatMoney(Number(context.raw)) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: dark ? '#cbd5e1' : '#475569' } },
      y: { beginAtZero: true, grid: { color: dark ? '#334155' : '#e2e8f0' }, ticks: { color: dark ? '#cbd5e1' : '#475569', callback: value => formatMoney(Number(value)) } },
    },
  }
  return <section className="mt-6 overflow-hidden rounded-2xl border border-black bg-white dark:border-slate-600 dark:bg-slate-800">
    <h2><button type="button" onClick={() => setIsOpen(value => !value)} aria-expanded={isOpen} aria-controls="historical-chart" className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold hover:bg-slate-50 sm:px-6 dark:hover:bg-slate-700"><span>Ver tendencia histórica</span><ChevronDown size={20} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} /></button></h2>
    <div id="historical-chart" hidden={!isOpen} className="px-5 pb-6 sm:px-6">
      {isOpen && <><p className="mb-4 text-sm text-slate-500 dark:text-slate-300">Seis meses hasta el periodo seleccionado. Solo gastos registrados; los meses sin movimientos aparecen en cero.</p><div className="relative h-64 sm:h-72"><Bar role="img" aria-label="Total de gastos registrados durante seis meses" options={options} data={{ labels: history.map(row => new Date(`${row.month}-02T12:00:00`).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })), datasets: [{ label: 'Gasto registrado', data: history.map(row => row.total), backgroundColor: dark ? '#80b8ab' : '#527979', borderRadius: 6, maxBarThickness: 52 }] }} /></div><ul className="sr-only">{history.map(row => <li key={row.month}>{row.month}: {formatMoney(row.total)}</li>)}</ul></>}
    </div>
  </section>
}
