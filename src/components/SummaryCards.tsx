import { ArrowDown, ArrowUp, ArrowDownRight, ArrowUpRight, Pencil, Wallet } from 'lucide-react'
import type { Cents, MonthComparison } from '../hooks/useFinanceData'
import { formatMoney } from '../utils/financeFormat'

export interface SummaryCardsProps {
  budget: Cents
  spent: Cents
  remaining: Cents
  transactionCount: number
  comparison: MonthComparison
  onEditBudget: () => void
  disabled?: boolean
}

export default function SummaryCards({ budget, spent, remaining, transactionCount, comparison, onEditBudget, disabled }: SummaryCardsProps) {
  const amountClass = 'my-4 block break-words text-3xl font-semibold tracking-tight tabular-nums lg:text-[38px]'
  return (
    <section aria-label="Resumen del presupuesto" className="grid gap-5 md:grid-cols-3">
      <article className="rounded-2xl border border-black dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-[#687980] dark:text-slate-300">
          Presupuesto total
          <span className="rounded-lg bg-[#e5ecec] dark:bg-slate-700 p-1.5 text-[#527979]"><ArrowUpRight size={20} aria-hidden="true" /></span>
        </div>
        <strong className={amountClass}>{formatMoney(budget)}</strong>
        <button type="button" disabled={disabled} onClick={onEditBudget} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-black dark:border-slate-600 px-3 py-2 text-sm font-semibold transition-colors ${budget > 0 ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-amber-400 text-slate-900 hover:bg-amber-300'}`}>
          <Pencil size={15} aria-hidden="true" />
          {budget > 0 ? 'Editar presupuesto' : 'Configurar ingreso mensual'}
        </button>
      </article>
      <article className="rounded-2xl border border-black dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-[#687980] dark:text-slate-300">
          Total gastado
          <span className="rounded-lg bg-[#fff1ec] p-1.5 text-[#ba6656]"><ArrowDownRight size={20} aria-hidden="true" /></span>
        </div>
        <strong className={`${amountClass} text-[#be5b4d] dark:text-red-300`}>{formatMoney(spent)}</strong>
        <p title={`${comparison.previousMonth}: ${formatMoney(comparison.previousSpent)}`} className={`mb-2 flex items-center gap-1 text-xs font-semibold ${comparison.changePercent === null || comparison.changePercent === 0 ? 'text-slate-500 dark:text-slate-300' : comparison.changePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          {comparison.changePercent === null ? 'Sin datos previos' : <>
            {comparison.changePercent > 0 ? <ArrowUp size={15} aria-label="Aumento" /> : comparison.changePercent < 0 ? <ArrowDown size={15} aria-label="Disminución" /> : null}
            {Math.abs(comparison.changePercent).toLocaleString('es-MX', { maximumFractionDigits: 1 })}% vs mes anterior{comparison.changePercent === 0 ? ' · Sin cambios' : ''}
          </>}
        </p>
        <p className="text-sm text-[#687980] dark:text-slate-300">{transactionCount} {transactionCount === 1 ? 'movimiento' : 'movimientos'} este mes</p>
      </article>
      <article className={`relative rounded-2xl border p-6 text-white shadow-sm ${remaining < 0 ? 'border-red-500/50 bg-slate-900' : 'border-black bg-[#1f5751] dark:border-slate-600'}`}>
        {remaining < 0 && <span aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-2xl border-2 border-red-400/70 motion-safe:animate-pulse motion-reduce:animate-none" />}
        <div className="flex items-center justify-between gap-3 text-sm font-medium text-white/80">
          Saldo disponible
          <span className="rounded-lg bg-white/10 p-1.5"><Wallet size={20} aria-hidden="true" /></span>
        </div>
        <strong className={`${amountClass} ${remaining < 0 ? 'text-red-400' : ''}`}>{formatMoney(remaining)}</strong>
        <p className="text-sm text-white/80">{remaining < 0 ? 'Has superado tu presupuesto' : budget > 0 ? 'Dinero disponible este mes' : 'Configura tu presupuesto para empezar'}</p>
      </article>
    </section>
  )
}
