import { FORM_FIELD_CLASS } from '../utils/formStyles'
import useBodyScrollLock from '../hooks/useBodyScrollLock'
import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { Category, MutationResult, NewTransaction } from '../hooks/useFinanceData'
import { localToday } from '../utils/financeFormat'

export interface QuickExpenseProps {
  categories: readonly Category[]
  disabled?: boolean
  onSave: (input: NewTransaction) => MutationResult
}

export default function QuickExpense({ categories, disabled, onSave }: QuickExpenseProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  useBodyScrollLock(open)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) { dialog.showModal(); amountRef.current?.focus() }
    else dialog.close()
  }, [open])
  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const values = new FormData(event.currentTarget)
    const result = onSave({ date: localToday(), payment: 'Efectivo', description: '', notes: '', amount: Math.round(Number(values.get('amount')) * 100), category: String(values.get('category') ?? '') })
    if (result.ok) setOpen(false)
    else setError(result.error)
  }
  const field = FORM_FIELD_CLASS
  return <>
    <button type="button" disabled={disabled || categories.length === 0} onClick={() => { setError(null); setOpen(true) }} aria-label="Registrar gasto rápido" aria-haspopup="dialog" title={categories.length ? 'Registrar gasto rápido' : 'Crea una categoría en Ajustes'} className="fixed right-6 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-2 rounded-full bg-orange-500 p-4 font-semibold text-white shadow-lg hover:bg-orange-600"><Plus size={24} aria-hidden="true" /><span className="hidden sm:inline">Gasto rápido</span></button>
    <dialog ref={dialogRef} aria-labelledby="quick-expense-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
      {open && <form onSubmit={save}><div className="mb-5 flex items-center justify-between gap-3"><h2 id="quick-expense-title" className="text-xl font-semibold">Gasto rápido</h2><button type="button" aria-label="Cerrar gasto rápido" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} aria-hidden="true" /></button></div>
        {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <label className="mb-4 flex flex-col gap-2 text-sm font-medium">Monto (MXN)<input ref={amountRef} className={field} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999" step="0.01" placeholder="0.00" required /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">Categoría<select name="category" className={field} required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <button type="submit" disabled={disabled || categories.length === 0} className="mt-6 min-h-11 w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600">Guardar gasto</button>
      </form>}
    </dialog>
  </>
}
