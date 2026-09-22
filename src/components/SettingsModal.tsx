import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, SubmitEvent } from 'react'
import { Download, Plus, Settings, Trash2, Upload, X } from 'lucide-react'
import type { Category, FinanceData, MutationResult } from '../hooks/useFinanceData'
import { localToday } from '../utils/financeFormat'

export interface SettingsModalProps {
  data: FinanceData
  disabled?: boolean
  onClose: () => void
  onAddCategory: (name: string, color: string) => MutationResult
  onDeleteCategory: (id: Category['id']) => MutationResult
  onImportData: (raw: unknown) => MutationResult
}

const fieldClass = 'min-w-0 rounded-lg border border-black bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100'
const secondaryClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700'

/** Se monta únicamente mientras está abierto; dialog gestiona foco y Escape. */
export default function SettingsModal({ data, disabled = false, onClose, onAddCategory, onDeleteCategory, onImportData }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mountedRef = useRef(false)
  const readingRef = useRef(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const blocked = disabled || reading
  const usedCategories = new Set([
    ...data.transactions.map(row => row.category),
    ...data.subscriptions.map(row => row.category),
  ])

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    mountedRef.current = true
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      mountedRef.current = false
      dialog?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  function showResult(result: MutationResult, success: string) {
    setError(result.ok ? null : result.error)
    setNotice(result.ok ? success : null)
  }

  function addCategory(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blocked) return
    const form = event.currentTarget
    const values = new FormData(form)
    const result = onAddCategory(String(values.get('name') ?? '').trim(), String(values.get('color') ?? '#527979'))
    showResult(result, 'Categoría creada.')
    if (result.ok) form.reset()
  }

  function exportJson() {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `balance-respaldo-${localToday()}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setError(null)
      setNotice('Descarga del respaldo iniciada.')
    } catch {
      setNotice(null)
      setError('No se pudo generar el respaldo. Inténtalo de nuevo.')
    }
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = '' // Permite volver a seleccionar el mismo archivo.
    if (!file || disabled || readingRef.current) return
    readingRef.current = true
    setReading(true)
    setError(null)
    setNotice(null)
    try {
      const text = await file.text()
      // No restaurar si el usuario cerró el modal durante la lectura.
      if (!mountedRef.current) return
      const raw: unknown = JSON.parse(text.replace(/^\uFEFF/, ''))
      showResult(onImportData(raw), 'Respaldo restaurado. Tus datos ya están actualizados.')
    } catch {
      if (mountedRef.current) setError('No se pudo leer el archivo JSON. Tus datos no se han reemplazado.')
    } finally {
      readingRef.current = false
      if (mountedRef.current) setReading(false)
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); onClose() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-black bg-white p-5 text-[#202f35] shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm sm:p-7 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="settings-title" className="flex items-center gap-2 text-xl font-semibold"><Settings size={22} aria-hidden="true" /> Ajustes y respaldo</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar ajustes" className="rounded-lg p-2.5 hover:bg-gray-100 dark:hover:bg-slate-700"><X size={21} aria-hidden="true" /></button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/50 dark:text-teal-200">{notice}</p>}
      {disabled && <p role="status" className="mb-4 text-sm text-amber-800 dark:text-amber-200">Los cambios están bloqueados. Cierra ajustes y vuelve a cargar los datos desde el aviso del resumen.</p>}

      <section aria-labelledby="categories-title">
        <h3 id="categories-title" className="text-lg font-semibold">Categorías</h3>
        <p className="mt-1 text-sm text-[#64757d] dark:text-slate-300">Organiza tus gastos con tus propias categorías y colores.</p>
        <ul className="my-4 max-h-60 overflow-y-auto rounded-lg border border-black divide-y divide-gray-200 dark:divide-slate-700 dark:border-slate-600">
          {data.categories.map(category => {
            const inUse = usedCategories.has(category.id)
            return <li key={category.id} className="flex items-center gap-3 px-3 py-2">
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-black/20" style={{ backgroundColor: category.color }} />
              <span className="min-w-0 flex-1 break-words text-sm">{category.name}{inUse && <span className="ml-2 text-xs text-[#64757d] dark:text-slate-400">En uso</span>}</span>
              <button type="button" disabled={blocked || inUse} onClick={() => showResult(onDeleteCategory(category.id), 'Categoría eliminada.')} aria-label={`Eliminar categoría ${category.name}`} title={inUse ? 'Esta categoría tiene movimientos o suscripciones asociados' : 'Eliminar categoría'} className="rounded-lg p-2.5 text-red-700 enabled:hover:bg-red-50 dark:text-red-300 dark:enabled:hover:bg-red-950/50"><Trash2 size={17} aria-hidden="true" /></button>
            </li>
          })}
        </ul>
        {data.categories.length === 0 && <p className="mb-4 text-sm text-[#64757d] dark:text-slate-300">Aún no hay categorías. Crea la primera para registrar gastos.</p>}
        <form onSubmit={addCategory}>
          <fieldset disabled={blocked} className="flex flex-wrap items-end gap-3">
            <legend className="sr-only">Crear categoría</legend>
            <label className="flex min-w-40 flex-1 flex-col gap-2 text-sm font-medium">Nombre<input name="name" className={fieldClass} placeholder="Ej. Mascotas" maxLength={80} required /></label>
            <label className="flex flex-col gap-2 text-sm font-medium">Color<input name="color" type="color" defaultValue="#527979" className="h-11 w-14 cursor-pointer rounded-lg border border-black bg-white p-1 dark:border-slate-600 dark:bg-slate-950" /></label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f4f4f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243e3e] dark:bg-teal-700 dark:hover:bg-teal-600"><Plus size={17} aria-hidden="true" /> Crear</button>
          </fieldset>
        </form>
        <p className="mt-3 text-xs text-[#64757d] dark:text-slate-400">Las categorías utilizadas en movimientos o suscripciones no se pueden eliminar.</p>
      </section>

      <section aria-labelledby="backup-title" className="mt-6 border-t border-black pt-6 dark:border-slate-600">
        <h3 id="backup-title" className="text-lg font-semibold">Datos y Respaldo</h3>
        <p className="mt-1 text-sm text-[#64757d] dark:text-slate-300">Guarda presupuestos, movimientos de todos los meses, suscripciones, categorías y registros de recurrencia.</p>
        <button type="button" disabled={reading} onClick={exportJson} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"><Download size={18} aria-hidden="true" /> Exportar a JSON</button>
        <div className="mt-5 rounded-xl border border-gray-300 bg-gray-50 p-4 dark:border-slate-600 dark:bg-slate-900/60">
          <label htmlFor="restore-backup" className="flex items-center gap-2 text-sm font-semibold"><Upload size={18} aria-hidden="true" /> Restaurar Backup</label>
          <p id="restore-description" className="mt-2 text-sm text-[#64757d] dark:text-slate-300">Al seleccionar un respaldo válido se reemplazarán todos los datos actuales. Exporta primero si deseas conservarlos. También se registrarán los cargos de suscripciones pendientes hasta hoy.</p>
          <input id="restore-backup" type="file" accept=".json" disabled={blocked} onChange={restoreBackup} aria-describedby="restore-description" className="mt-3 block w-full min-w-0 rounded-lg text-sm text-[#64757d] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#e5ecec] file:px-3 file:py-2.5 file:font-semibold file:text-[#2f4f4f] disabled:opacity-50 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-teal-200" />
          {reading && <p role="status" className="mt-2 text-sm">Leyendo y validando respaldo…</p>}
        </div>
      </section>
      <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className={secondaryClass}>Cerrar</button></div>
    </dialog>
  )
}
