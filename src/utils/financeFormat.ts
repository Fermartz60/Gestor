import type { Cents, LocalDate, Transaction } from '../hooks/useFinanceData'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateFormat = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' })

export const formatMoney = (amount: Cents): string => currency.format(amount / 100)
export const formatDate = (date: LocalDate): string => dateFormat.format(new Date(`${date}T12:00:00`))

export function localToday(): LocalDate {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Mantiene BOM, comillas escapadas y protección contra fórmulas del original. */
export function transactionsCsv(rows: readonly Transaction[], categoryNames: ReadonlyMap<string, string>): string {
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value
    return `"${safe.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [
    ['Fecha', 'Categoría', 'Descripción', 'Método de pago', 'Monto (MXN)', 'Notas'],
    ...[...rows].sort((a, b) => a.date.localeCompare(b.date)).map(row => [
      row.date, categoryNames.get(row.category) ?? row.category, row.description,
      row.payment, (row.amount / 100).toFixed(2), row.notes,
    ]),
  ].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
}
