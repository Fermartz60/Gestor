import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Ejecuta el store real con almacenamiento aislado, sin tocar datos del navegador.
const source = readFileSync(new URL('../src/hooks/useFinanceData.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(
  source + '\nexport const testStore = { actions, getSnapshot: () => snapshot };',
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } },
)
const key = 'balance.finanzas.v1'

function setup() {
  const saved = new Map()
  const storage = {
    getItem: name => saved.get(name) ?? null,
    setItem: (name, value) => saved.set(name, value),
  }
  const exports = {}
  vm.runInNewContext(outputText, {
    exports, require: () => ({ useSyncExternalStore() { throw new Error('Hook not mounted') } }),
    window: { localStorage: storage }, crypto: { randomUUID },
  })
  const store = exports.testStore
  assert.equal(store.actions.reload().ok, true)
  return { ...store, saved, storage, getMonthlyAnalytics: exports.getMonthlyAnalytics }
}

function backup(store) {
  return JSON.parse(JSON.stringify(store.getSnapshot().data))
}

test('restaura y persiste todos los campos de un respaldo con categorías dinámicas', () => {
  const store = setup()
  const month = store.getSnapshot().currentMonth
  const data = backup(store)
  data.categories.push({ id: 'pets', name: 'Mascotas', color: '#123456' })
  data.budgets[month] = 100000
  data.categoryBudgets[month] = { pets: 20000 }
  data.transactions.push({ id: 't1', date: `${month}-01`, amount: 2500, category: 'pets', payment: 'Efectivo', description: 'Alimento', notes: '' })
  assert.equal(store.actions.importData(data).ok, true)
  assert.deepEqual(JSON.parse(store.saved.get(key)), data)
  assert.deepEqual(backup(store), data)
  assert.equal(store.actions.deleteCategory('pets').ok, false)
})

test('rechaza objetos vacíos, versión desconocida, importes y referencias inválidos sin sobrescribir', () => {
  const store = setup()
  const original = store.saved.get(key)
  const invalid = [null, [], {}, { ...backup(store), schemaVersion: 99 }]
  const wrongBudget = backup(store)
  wrongBudget.budgets[store.getSnapshot().currentMonth] = -10
  const wrongCategory = backup(store)
  wrongCategory.transactions.push({ id: 'bad', date: '2026-01-01', amount: 100, category: 'unknown', payment: 'Efectivo', description: '', notes: '' })
  for (const data of [...invalid, wrongBudget, wrongCategory]) {
    assert.equal(store.actions.importData(data).ok, false)
    assert.equal(store.saved.get(key), original)
    assert.equal(JSON.stringify(store.getSnapshot().data), original)
  }
})

test('migra esquema 2 y registra recurrencias sin duplicarlas ni regenerar eliminadas', () => {
  const store = setup()
  const data = backup(store)
  data.schemaVersion = 2
  delete data.categories
  const month = store.getSnapshot().currentMonth
  data.subscriptions.push({ id: 's1', name: 'Internet', amount: 50000, category: 'Servicios', payment: 'Transferencia', startMonth: month, cancelledFrom: null })
  assert.equal(store.actions.importData(data).ok, true)
  assert.equal(store.getSnapshot().data.schemaVersion, 3)
  assert.equal(store.getSnapshot().data.transactions.length, 1)
  assert.equal(store.actions.syncRecurring().ok, true)
  assert.equal(store.getSnapshot().data.transactions.length, 1)
  const id = store.getSnapshot().data.transactions[0].id
  assert.equal(store.actions.deleteTransaction(id).ok, true)
  assert.equal(store.actions.importData(backup(store)).ok, true)
  assert.equal(store.getSnapshot().data.transactions.length, 0)
  assert.equal(store.getSnapshot().data.recurringOccurrences.length, 1)
})

test('un fallo de localStorage o cambio externo impide aplicar el respaldo', () => {
  const store = setup()
  const original = backup(store)
  const data = backup(store)
  data.budgets[store.getSnapshot().currentMonth] = 100
  store.storage.setItem = () => { throw new Error('QuotaExceededError') }
  assert.equal(store.actions.importData(data).ok, false)
  assert.deepEqual(backup(store), original)
  assert.deepEqual(JSON.parse(store.saved.get(key)), original)
  store.saved.set(key, 'external-change')
  assert.equal(store.actions.importData(data).ok, false)
  assert.equal(store.getSnapshot().writesBlocked, true)
  assert.equal(store.saved.get(key), 'external-change')
})

test('las categorías nuevas sobreviven al respaldo y se pueden eliminar si no están en uso', () => {
  const store = setup()
  assert.equal(store.actions.addCategory('Mascotas', '#123456').ok, true)
  assert.equal(store.actions.addCategory('mascotas', '#123456').ok, false)
  const data = backup(store)
  assert.equal(store.actions.importData(data).ok, true)
  const category = store.getSnapshot().data.categories.find(row => row.name === 'Mascotas')
  assert.ok(category)
  assert.equal(store.actions.deleteCategory(category.id).ok, true)
  assert.equal(store.getSnapshot().data.categories.some(row => row.id === category.id), false)
})

test('comparación e historial cruzan el año, incluyen ceros y no dividen entre cero', () => {
  const store = setup()
  const data = backup(store)
  const row = { amount: 10000, category: 'Otros', payment: 'Efectivo', description: '', notes: '' }
  data.transactions = [{ ...row, id: 'dec', date: '2025-12-01' }, { ...row, id: 'jan', date: '2026-01-01', amount: 11200 }]
  const result = store.getMonthlyAnalytics(data, '2026-01', '2026-09')
  assert.equal(result.comparison.previousMonth, '2025-12')
  assert.equal(result.comparison.previousSpent, 10000)
  assert.equal(result.comparison.changePercent, 12)
  assert.deepEqual(Array.from(result.history, row => [row.month, row.total]), [['2025-08', 0], ['2025-09', 0], ['2025-10', 0], ['2025-11', 0], ['2025-12', 10000], ['2026-01', 11200]])
  data.transactions[1].amount = 5000
  assert.equal(store.getMonthlyAnalytics(data, '2026-01', '2026-09').comparison.changePercent, -50)
  data.transactions[1].amount = 10000
  assert.equal(store.getMonthlyAnalytics(data, '2026-01', '2026-09').comparison.changePercent, 0)
  assert.equal(store.getMonthlyAnalytics(data, '2025-12', '2026-09').comparison.changePercent, null)
})

test('comparación futura usa proyecciones, historial solo movimientos registrados', () => {
  const store = setup()
  const data = backup(store)
  data.subscriptions.push({ id: 's1', name: 'Internet', amount: 5000, category: 'Servicios', payment: 'Efectivo', startMonth: '2026-10', cancelledFrom: null })
  const result = store.getMonthlyAnalytics(data, '2026-11', '2026-09')
  assert.equal(result.comparison.previousSpent, 5000)
  assert.equal(result.comparison.changePercent, 0)
  assert.equal(result.history.every(row => row.total === 0), true)
})
