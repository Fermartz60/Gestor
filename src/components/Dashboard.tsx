import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { AlertCircle, AlertTriangle, ChartNoAxesColumnIncreasing, Settings, X } from 'lucide-react'
import useFinanceData, { PAYMENT_METHODS } from '../hooks/useFinanceData'
import type { NewTransaction, PaymentMethod, Transaction } from '../hooks/useFinanceData'
import { formatMoney, localToday, transactionsCsv } from '../utils/financeFormat'
import SummaryCards from './SummaryCards'
import TransactionTable from './TransactionTable'
import SettingsModal from './SettingsModal'
import ThemeToggle from './ThemeToggle'
import SubscriptionList from './SubscriptionList'
import ChartsArea from './ChartsArea'
import MultiMonthChart from './MultiMonthChart'
import QuickExpense from './QuickExpense'
import InstallPWA from './InstallPWA'

type Editor = { kind: 'budget' } | { kind: 'expense'; transaction?: Transaction } | { kind: 'delete'; transaction: Transaction }

const fieldClass = 'w-full rounded-lg border border-black dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-[#2b424a] dark:text-slate-100'
const labelClass = 'flex flex-col gap-2 text-sm font-medium'
const primaryClass = 'min-h-11 rounded-lg bg-[#2f4f4f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243e3e]'

export default function Dashboard() {
  const finance = useFinanceData()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [formError, setFormError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const disabled = !finance.hydrated || finance.writesBlocked

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (editor && !dialog.open) dialog.showModal()
    else if (!editor && dialog.open) dialog.close()
  }, [editor])

  function openEditor(value: Editor) {
    setFormError(null)
    setEditor(value)
  }

  function exportCsv() {
    const csv = transactionsCsv(finance.transactions, new Map(finance.categories.map(category => [category.id, category.name])))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `balance-${finance.selectedMonth}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || disabled) return
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    if (editor.kind === 'budget') {
      const result = finance.setBudget(Math.round(Number(text('budget')) * 100))
      if (result.ok) setEditor(null)
      else setFormError(result.error)
    } else if (editor.kind === 'delete') {
      const result = finance.deleteTransaction(editor.transaction.id)
      if (result.ok) setEditor(null)
      else setFormError(result.error)
    } else {
      const input: NewTransaction = {
        date: text('date'), amount: Math.round(Number(text('amount')) * 100),
        category: text('category'), payment: text('payment') as PaymentMethod,
        description: text('description'), notes: text('notes'),
      }
      const result = editor.transaction
        ? finance.updateTransaction(editor.transaction.id, input)
        : finance.addTransaction(input)
      if (result.ok) {
        finance.setSelectedMonth(input.date.slice(0, 7))
        setEditor(null)
      } else setFormError(result.error)
    }
  }

  const edited = editor?.kind === 'expense' ? editor.transaction : undefined
  const title = editor?.kind === 'budget' ? 'Presupuesto mensual' : editor?.kind === 'delete' ? '¿Eliminar este gasto?' : edited ? 'Editar gasto' : 'Agregar gasto'

  return (
    <>
      <header className="flex h-[88px] items-center gap-7 border-b border-black dark:border-slate-600 bg-white dark:bg-slate-800 px-[5%]">
        <a href="./" aria-label="Balance, inicio" className="flex items-center gap-2.5 text-[29px] font-bold tracking-tight text-[#2f4f4f] dark:text-teal-200"><span className="rounded-xl bg-[#2f4f4f] p-2 text-white"><ChartNoAxesColumnIncreasing size={26} aria-hidden="true" /></span><span>balance<span className="text-[#527979]">.</span></span></a>
        <span className="hidden border-l border-black dark:border-slate-600 pl-7 text-xs tracking-[0.15em] text-[#75858b] dark:text-slate-400 sm:block">FINANZAS PERSONALES</span>
        <span aria-label="Cuenta personal" className="ml-auto flex size-10 items-center justify-center rounded-full border border-black dark:border-slate-600 bg-[#edf2f2] dark:bg-slate-700 text-xs font-bold">TÚ</span>
      </header>
      <main className="mx-auto max-w-[1390px] px-[5%] pt-8 pb-6 sm:pt-11">
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div><p className="mb-2.5 text-xs font-bold tracking-[0.15em] text-[#2f4f4f] dark:text-teal-200">TU DINERO, CON CLARIDAD</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">Resumen mensual</h1><p className="mt-2.5 text-sm leading-relaxed text-[#64757d] dark:text-slate-300 sm:text-[15px]">Un lugar para organizar tus gastos y planear lo que sigue.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <InstallPWA />
            <ThemeToggle onThemeChange={setDark} />
            <label className="flex min-w-[185px] flex-1 flex-col gap-1.5 text-xs text-[#64757d] dark:text-slate-300">Periodo<input aria-label="Mes del resumen" className={fieldClass} type="month" min="1000-01" max="9999-12" required value={finance.selectedMonth} onChange={event => { if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(event.target.value)) finance.setSelectedMonth(event.target.value) }} /></label>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Abrir ajustes y respaldo" aria-haspopup="dialog" title="Ajustes y respaldo" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-black dark:border-slate-600 bg-white dark:bg-slate-800 text-[#2f4f4f] dark:text-teal-200 hover:bg-[#e5ecec] dark:hover:bg-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-teal-200 dark:hover:bg-slate-700"><Settings size={21} aria-hidden="true" /></button>
          </div>
        </div>
        {finance.error && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-600 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={19} aria-hidden="true" /><span className="min-w-0 flex-1">{finance.error}</span><button type="button" onClick={() => finance.reload()} className="rounded px-2 py-1 font-semibold underline">Volver a cargar</button></div>}
        {!finance.hydrated && <p role="status" className="mb-4 text-sm text-[#64757d] dark:text-slate-300">Cargando tus datos…</p>}
        <SummaryCards budget={finance.budget} spent={finance.spent} remaining={finance.remaining} comparison={finance.comparison} transactionCount={finance.monthlyTransactions.length} onEditBudget={() => openEditor({ kind: 'budget' })} disabled={disabled} />
        <MultiMonthChart history={finance.history} dark={dark} />
        {finance.alerts.length > 0 && <div className="mt-5 space-y-2">{finance.alerts.map(alert => {
          const exceeded = alert.amount > alert.budget
          return <div key={alert.name} role={exceeded ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${exceeded ? 'border-red-500/50 bg-red-500/10 font-semibold text-red-700 dark:text-red-400' : 'border-amber-600 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200'}`}>
            <AlertTriangle size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p>{exceeded && <strong className="mb-1 block font-bold">{alert.name === 'Presupuesto mensual' ? '¡Atención! Has excedido tu presupuesto mensual.' : `¡Atención! Has excedido el presupuesto de ${alert.name}.`}</strong>}{alert.name}: {alert.percent.toLocaleString('es-MX', { maximumFractionDigits: 1 })}% utilizado ({formatMoney(alert.amount)} de {formatMoney(alert.budget)}).</p>
          </div>
        })}</div>}
        <ChartsArea key={finance.selectedMonth} transactions={finance.monthlyTransactions} categories={finance.categories} month={finance.selectedMonth} dark={dark} projectedIds={new Set(finance.projectedTransactions.map(row => row.id))} />
        <SubscriptionList subscriptions={finance.subscriptions} categories={finance.categories} currentMonth={finance.currentMonth} disabled={disabled} onAdd={finance.addSubscription} onCancel={finance.cancelSubscription} />
        <div className="mt-8">
          {finance.selectedMonth > finance.currentMonth && <p className="mb-3 text-sm text-[#64757d] dark:text-slate-300">Incluye {finance.projectedTransactions.length} cargos recurrentes proyectados. El CSV contiene solo movimientos registrados.</p>}
          <TransactionTable transactions={finance.monthlyTransactions} categories={finance.categories} projectedIds={new Set(finance.projectedTransactions.map(row => row.id))} onAdd={() => openEditor({ kind: 'expense' })} onEdit={transaction => openEditor({ kind: 'expense', transaction })} onDelete={transaction => openEditor({ kind: 'delete', transaction })} onExport={exportCsv} disabled={disabled} />
        </div>
        <footer className="mt-7 flex flex-col justify-between gap-2 text-xs text-[#64757d] dark:text-slate-300 sm:flex-row"><span>Balance · Un paso a la vez.</span><span>Datos guardados en este navegador</span></footer>
        <div className="h-20" aria-hidden="true" />
      </main>
      <QuickExpense categories={finance.categories} disabled={disabled} onSave={input => {
        const result = finance.addTransaction(input)
        if (result.ok) finance.setSelectedMonth(input.date.slice(0, 7))
        return result
      }} />
      {settingsOpen && <SettingsModal data={finance.data} disabled={disabled} onClose={() => setSettingsOpen(false)} onAddCategory={finance.addCategory} onDeleteCategory={finance.deleteCategory} onImportData={finance.importData} />}
      <dialog ref={dialogRef} aria-labelledby="editor-title" onCancel={() => setEditor(null)} onClose={() => setEditor(null)} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-black dark:border-slate-600 bg-white dark:bg-slate-800 p-6 text-[#202f35] dark:text-slate-100 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm">
        {editor && <form key={editor.kind === 'expense' ? edited?.id ?? 'new' : editor.kind} onSubmit={submit}>
          <div className="mb-6 flex items-center justify-between gap-4"><h2 id="editor-title" className="text-xl font-semibold">{title}</h2><button type="button" onClick={() => setEditor(null)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-600"><X size={22} aria-hidden="true" /></button></div>
          {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
          {editor.kind === 'budget' ? <div>
            <p className="mb-4 text-sm text-[#64757d] dark:text-slate-300">Periodo: {finance.selectedMonth}</p>
            <label className={labelClass}>Ingreso disponible (MXN)<input className={fieldClass} name="budget" type="number" min="0" max="999999999" step="0.01" defaultValue={(finance.budget / 100).toFixed(2)} required /></label>
            <p className="mt-3 text-xs text-[#64757d] dark:text-slate-300">Este importe se aplica únicamente al mes seleccionado.</p>
          </div> : editor.kind === 'delete' ? <div><p className="break-words">{editor.transaction.description || 'Sin descripción'} · {formatMoney(editor.transaction.amount)}</p><p className="mt-3 text-sm text-[#64757d] dark:text-slate-300">Esta acción no se puede deshacer.</p></div> : <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Fecha<input className={fieldClass} type="date" name="date" min="1000-01-01" max="9999-12-31" defaultValue={edited?.date ?? (finance.selectedMonth === finance.currentMonth ? localToday() : `${finance.selectedMonth}-01`)} required /></label>
            <label className={labelClass}>Monto (MXN)<input className={fieldClass} type="number" name="amount" min="0.01" max="999999999" step="0.01" placeholder="0.00" defaultValue={edited ? (edited.amount / 100).toFixed(2) : ''} required /></label>
            <label className={labelClass}>Categoría<select className={fieldClass} name="category" defaultValue={edited?.category ?? finance.categories[0]?.id} required>{finance.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className={labelClass}>Método de pago<select className={fieldClass} name="payment" defaultValue={edited?.payment ?? 'Transferencia'}>{PAYMENT_METHODS.map(payment => <option key={payment}>{payment}</option>)}</select></label>
            <label className={`${labelClass} sm:col-span-2`}>Descripción<input className={fieldClass} name="description" maxLength={120} placeholder="Ej. Despensa de la semana" defaultValue={edited?.description ?? ''} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Notas (opcional)<textarea className={`${fieldClass} resize-y`} name="notes" maxLength={500} rows={3} placeholder="Algo que quieras recordar" defaultValue={edited?.notes ?? ''} /></label>
          </div>}
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditor(null)} className="min-h-11 rounded-lg bg-gray-100 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600">Cancelar</button><button type="submit" disabled={disabled} className={editor.kind === 'delete' ? 'min-h-11 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800' : primaryClass}>{editor.kind === 'delete' ? 'Eliminar gasto' : editor.kind === 'budget' ? 'Guardar presupuesto' : 'Guardar gasto'}</button></div>
        </form>}
      </dialog>
    </>
  )
}
