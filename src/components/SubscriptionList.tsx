import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Plus, Repeat, X } from 'lucide-react'
import { PAYMENT_METHODS } from '../hooks/useFinanceData'
import type { Category, Month, MutationResult, NewSubscription, PaymentMethod, Subscription } from '../hooks/useFinanceData'
import { formatMoney } from '../utils/financeFormat'

export interface SubscriptionListProps {
  subscriptions: readonly Subscription[]
  categories: readonly Category[]
  currentMonth: Month
  disabled?: boolean
  onAdd: (input: NewSubscription) => MutationResult
  onCancel: (id: Subscription['id']) => MutationResult
}

const field = 'w-full rounded-lg border border-black bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
const label = 'flex flex-col gap-2 text-sm font-medium'

export default function SubscriptionList({ subscriptions, categories, currentMonth, disabled, onAdd, onCancel }: SubscriptionListProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) dialog.showModal()
    else dialog.close()
  }, [open])
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const result = onAdd({ name: text('name'), amount: Math.round(Number(text('amount')) * 100), startMonth: text('startMonth'), category: text('category'), payment: text('payment') as PaymentMethod })
    if (result.ok) { setOpen(false); setNotice('Suscripción agregada.'); setError(null) }
    else setError(result.error)
  }
  return <section aria-labelledby="subscriptions-title" className="mt-8 rounded-2xl border border-black bg-white p-5 sm:p-6 dark:border-slate-600 dark:bg-slate-800">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 id="subscriptions-title" className="text-xl font-semibold">Gastos fijos y suscripciones</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Se registran el día 1 de cada mes.</p></div><button type="button" disabled={disabled || categories.length === 0} onClick={() => { setError(null); setOpen(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={18} aria-hidden="true" /> Agregar suscripción</button></div>
    {notice && <p role="status" className="mb-3 text-sm text-teal-700 dark:text-teal-200">{notice}</p>}
    {!open && error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    <div className="space-y-3">{subscriptions.map(subscription => <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-linear-to-r from-slate-100 to-slate-50 px-5 py-4 dark:from-slate-700/70 dark:to-slate-800/50">
      <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold"><Repeat size={16} className="shrink-0 text-slate-500 dark:text-slate-300" aria-hidden="true" /><span className="break-words">{subscription.name}</span></p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatMoney(subscription.amount)} / mes · {categories.find(category => category.id === subscription.category)?.name ?? subscription.category} · Desde {subscription.startMonth}</p>{subscription.cancelledFrom && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cancelada desde {subscription.cancelledFrom}</p>}</div>
      {!subscription.cancelledFrom && <button type="button" disabled={disabled} aria-label={`Cancelar suscripción ${subscription.name}`} onClick={() => { const result = onCancel(subscription.id); setError(result.ok ? null : result.error); setNotice(result.ok ? 'Suscripción cancelada. Se conserva el historial.' : null) }} className="rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-300">Cancelar</button>}
    </div>)}</div>
    {subscriptions.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-300">Aún no tienes suscripciones.</p>}
    {categories.length === 0 && <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">Crea una categoría en Ajustes para agregar suscripciones.</p>}
    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Cancelar detiene los cargos desde el próximo mes; si aún no empieza, no generará cargos. Al abrir la app se recuperan los meses pendientes.</p>
    <dialog ref={dialogRef} aria-labelledby="subscription-form-title" onCancel={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-black bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
      {open && <form onSubmit={submit}><div className="mb-6 flex items-center justify-between gap-3"><h2 id="subscription-form-title" className="text-xl font-semibold">Nueva suscripción</h2><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar suscripción" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={21} /></button></div>
        {error && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>Nombre<input className={field} name="name" maxLength={120} placeholder="Ej. Renta o Netflix" required /></label>
          <label className={label}>Monto mensual (MXN)<input className={field} name="amount" type="number" min="0.01" max="999999999" step="0.01" required /></label>
          <label className={label}>Primer mes<input className={field} name="startMonth" type="month" min={currentMonth} max="9999-12" defaultValue={currentMonth} required /></label>
          <label className={label}>Categoría<select className={field} name="category" required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={label}>Método de pago<select className={field} name="payment">{PAYMENT_METHODS.map(payment => <option key={payment}>{payment}</option>)}</select></label>
        </div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button><button disabled={disabled} className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Guardar suscripción</button></div>
      </form>}
    </dialog>
  </section>
}
