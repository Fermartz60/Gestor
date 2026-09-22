// src/hooks/useFinanceData.ts
import { useSyncExternalStore } from "react";

/** Todos los importes se expresan en centavos enteros de MXN. */
export type Cents = number;
export type Month = string; // YYYY-MM
export type LocalDate = string; // YYYY-MM-DD

export const PAYMENT_METHODS = [
  "Transferencia",
  "Tarjeta de Crédito",
  "Tarjeta de Débito",
  "Efectivo",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Category {
  /** Las categorías originales conservan su nombre como identificador. */
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface Transaction {
  readonly id: string;
  readonly date: LocalDate;
  readonly amount: Cents;
  /** Identificador de la categoría. Compatible con los datos originales. */
  readonly category: string;
  readonly payment: PaymentMethod;
  readonly description: string;
  readonly notes: string;
  readonly subscriptionId?: string;
  readonly recurrenceMonth?: Month;
}

export interface Subscription {
  readonly id: string;
  readonly name: string;
  readonly amount: Cents;
  readonly category: string;
  readonly payment: PaymentMethod;
  readonly startMonth: Month;
  /** Primer mes que ya no genera gastos. */
  readonly cancelledFrom: Month | null;
}

export interface RecurringOccurrence {
  readonly subscriptionId: string;
  readonly month: Month;
}

export interface FinanceData {
  readonly schemaVersion: 3;
  readonly currency: "MXN";
  readonly budgets: Readonly<Record<Month, Cents>>;
  readonly categoryBudgets: Readonly<
    Record<Month, Readonly<Record<string, Cents>>>
  >;
  readonly categories: readonly Category[];
  readonly transactions: readonly Transaction[];
  readonly subscriptions: readonly Subscription[];
  /** Se conservan al eliminar movimientos para evitar regenerarlos. */
  readonly recurringOccurrences: readonly RecurringOccurrence[];
}

export interface FinanceSnapshot {
  readonly data: FinanceData;
  readonly currentMonth: Month;
  readonly selectedMonth: Month;
  readonly hydrated: boolean;
  readonly writesBlocked: boolean;
  readonly error: string | null;
}

export interface BudgetAlert {
  readonly name: string;
  readonly amount: Cents;
  readonly budget: Cents;
  readonly percent: number;
}

export type NewTransaction = Omit<
  Transaction,
  "id" | "subscriptionId" | "recurrenceMonth"
>;

export type NewSubscription = Omit<
  Subscription,
  "id" | "cancelledFrom"
>;

export type MutationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

const STORAGE_KEY = "balance.finanzas.v1";

const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: "Alimentación", name: "Alimentación", color: "#527979" },
  { id: "Vivienda", name: "Vivienda", color: "#638ee5" },
  { id: "Servicios", name: "Servicios", color: "#ddab47" },
  { id: "Transporte", name: "Transporte", color: "#a482e2" },
  { id: "Salud", name: "Salud", color: "#e47d92" },
  { id: "Educación", name: "Educación", color: "#39a8bf" },
  { id: "Entretenimiento", name: "Entretenimiento", color: "#e68b52" },
  { id: "Otros", name: "Otros", color: "#8899ac" },
];

function today(): LocalDate {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function realMonth(): Month {
  return today().slice(0, 7);
}

function nextMonth(month: Month): Month {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5));
  return `${number === 12 ? year + 1 : year}-${String(
    number === 12 ? 1 : number + 1,
  ).padStart(2, "0")}`;
}

function emptyData(): FinanceData {
  return {
    schemaVersion: 3,
    currency: "MXN",
    budgets: {},
    categoryBudgets: {},
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    transactions: [],
    subscriptions: [],
    recurringOccurrences: [],
  };
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMonth(value: unknown): value is Month {
  return (
    typeof value === "string" &&
    /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)
  );
}

function isDate(value: unknown): value is LocalDate {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isCents(value: unknown, positive = false): value is Cents {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= (positive ? 1 : 0)
  );
}

function isText(value: unknown): value is string {
  return typeof value === "string";
}

function isId(value: unknown): value is string {
  return isText(value) && value.trim().length > 0;
}

function isPayment(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((payment) => payment === value);
}

function uniqueIds(rows: readonly { readonly id: string }[]): boolean {
  return new Set(rows.map((row) => row.id)).size === rows.length;
}

/** Valida datos externos y migra el esquema original a categorías dinámicas. */
function normalize(raw: unknown): FinanceData {
  assert(isObject(raw), "Documento de finanzas inválido.");
  assert(
    raw.schemaVersion === undefined ||
      raw.schemaVersion === 2 ||
      raw.schemaVersion === 3,
    "Versión de datos no compatible.",
  );

  const value: Record<string, unknown> =
    raw.schemaVersion === 3
      ? { ...raw }
      : {
          ...emptyData(),
          ...raw,
          categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
        };

  assert(value.currency === "MXN", "Moneda no compatible.");
  assert(Array.isArray(value.categories), "Categorías inválidas.");

  const categories: Category[] = value.categories.map((category: unknown) => {
    assert(isObject(category), "Categoría inválida.");
    assert(isId(category.id), "Identificador de categoría inválido.");
    assert(isId(category.name), "Nombre de categoría inválido.");
    assert(
      isText(category.color) && /^#[0-9a-f]{6}$/i.test(category.color),
      "Color de categoría inválido.",
    );

    return {
      id: category.id,
      name: category.name.trim(),
      color: category.color,
    };
  });

  assert(uniqueIds(categories), "Categorías duplicadas.");
  assert(
    new Set(categories.map((category) => category.name.toLocaleLowerCase("es-MX")))
      .size === categories.length,
    "Los nombres de categorías deben ser únicos.",
  );

  const categoryIds = new Set(categories.map((category) => category.id));

  assert(isObject(value.budgets), "Presupuestos inválidos.");
  const budgets = Object.fromEntries(
    Object.entries(value.budgets).map(([month, amount]) => {
      assert(isMonth(month) && isCents(amount), "Presupuesto inválido.");
      return [month, amount] as const;
    }),
  );

  assert(isObject(value.categoryBudgets), "Límites por categoría inválidos.");
  const categoryBudgets = Object.fromEntries(
    Object.entries(value.categoryBudgets).map(([month, limits]) => {
      assert(isMonth(month) && isObject(limits), "Límites mensuales inválidos.");
      return [
        month,
        Object.fromEntries(
          Object.entries(limits).map(([category, amount]) => {
            assert(
              categoryIds.has(category) && isCents(amount),
              "Límite de categoría inválido.",
            );
            return [category, amount] as const;
          }),
        ),
      ] as const;
    }),
  );

  assert(Array.isArray(value.transactions), "Movimientos inválidos.");
  const transactions: Transaction[] = value.transactions.map((row: unknown) => {
    assert(isObject(row), "Movimiento inválido.");
    assert(isId(row.id) && isDate(row.date), "Identificador o fecha inválidos.");
    assert(isCents(row.amount, true), "Importe de movimiento inválido.");
    assert(
      isText(row.category) && categoryIds.has(row.category),
      "Categoría de movimiento desconocida.",
    );
    assert(isPayment(row.payment), "Método de pago inválido.");
    assert(
      isText(row.description) && isText(row.notes),
      "Descripción o notas inválidas.",
    );

    const base: Transaction = {
      id: row.id,
      date: row.date,
      amount: row.amount,
      category: row.category,
      payment: row.payment,
      description: row.description,
      notes: row.notes,
    };

    if (row.subscriptionId === undefined && row.recurrenceMonth === undefined) {
      return base;
    }

    assert(
      isId(row.subscriptionId) && isMonth(row.recurrenceMonth),
      "Referencia recurrente inválida.",
    );

    return {
      ...base,
      subscriptionId: row.subscriptionId,
      recurrenceMonth: row.recurrenceMonth,
    };
  });

  assert(Array.isArray(value.subscriptions), "Suscripciones inválidas.");
  const subscriptions: Subscription[] = value.subscriptions.map(
    (row: unknown) => {
      assert(isObject(row), "Suscripción inválida.");
      assert(isId(row.id) && isId(row.name), "Identificador o nombre inválidos.");
      assert(isCents(row.amount, true), "Importe de suscripción inválido.");
      assert(
        isText(row.category) && categoryIds.has(row.category),
        "Categoría de suscripción desconocida.",
      );
      assert(isPayment(row.payment), "Método de pago inválido.");
      assert(isMonth(row.startMonth), "Mes de inicio inválido.");
      assert(
        row.cancelledFrom === null ||
          (isMonth(row.cancelledFrom) && row.cancelledFrom >= row.startMonth),
        "Mes de cancelación inválido.",
      );

      return {
        id: row.id,
        name: row.name.trim(),
        amount: row.amount,
        category: row.category,
        payment: row.payment,
        startMonth: row.startMonth,
        cancelledFrom: row.cancelledFrom,
      };
    },
  );

  assert(
    uniqueIds(transactions) && uniqueIds(subscriptions),
    "Identificadores duplicados.",
  );
  assert(
    Array.isArray(value.recurringOccurrences),
    "Registro de recurrencias inválido.",
  );

  const recurringOccurrences: RecurringOccurrence[] =
    value.recurringOccurrences.map((row: unknown) => {
      assert(isObject(row), "Ocurrencia inválida.");
      assert(
        isId(row.subscriptionId) && isMonth(row.month),
        "Ocurrencia recurrente inválida.",
      );
      return { subscriptionId: row.subscriptionId, month: row.month };
    });

  return {
    schemaVersion: 3,
    currency: "MXN",
    budgets,
    categoryBudgets,
    categories,
    transactions,
    subscriptions,
    recurringOccurrences,
  };
}

function occurrenceKey(subscriptionId: string, month: Month): string {
  return `${subscriptionId}:${month}`;
}

/** Recupera todos los meses pendientes, no solamente el mes actual. */
function materialize(data: FinanceData, through: Month): FinanceData {
  const seen = new Set(
    data.recurringOccurrences.map((row) =>
      occurrenceKey(row.subscriptionId, row.month),
    ),
  );
  const transactionIds = new Set(data.transactions.map((row) => row.id));
  const transactions = [...data.transactions];
  const recurringOccurrences = [...data.recurringOccurrences];

  for (const subscription of data.subscriptions) {
    for (
      let month = subscription.startMonth;
      month <= through &&
      (subscription.cancelledFrom === null ||
        month < subscription.cancelledFrom);
      month = nextMonth(month)
    ) {
      const key = occurrenceKey(subscription.id, month);
      if (seen.has(key)) continue;

      const id = `recurring:${key}`;

      if (!transactionIds.has(id)) {
        transactions.push({
          id,
          date: `${month}-01`,
          amount: subscription.amount,
          category: subscription.category,
          payment: subscription.payment,
          description: subscription.name,
          notes: "Gasto recurrente",
          subscriptionId: subscription.id,
          recurrenceMonth: month,
        });
        transactionIds.add(id);
      }

      recurringOccurrences.push({ subscriptionId: subscription.id, month });
      seen.add(key);
    }
  }

  if (recurringOccurrences.length === data.recurringOccurrences.length) {
    return data;
  }

  return { ...data, transactions, recurringOccurrences };
}

/** Las proyecciones futuras nunca se escriben en localStorage. */
function project(data: FinanceData, month: Month): Transaction[] {
  const seen = new Set(
    data.recurringOccurrences.map((row) =>
      occurrenceKey(row.subscriptionId, row.month),
    ),
  );
  const transactionIds = new Set(data.transactions.map((row) => row.id));

  return data.subscriptions.flatMap((subscription) => {
    const key = occurrenceKey(subscription.id, month);
    const id = `recurring:${key}`;

    if (
      month < subscription.startMonth ||
      (subscription.cancelledFrom !== null &&
        month >= subscription.cancelledFrom) ||
      seen.has(key) ||
      transactionIds.has(id)
    ) {
      return [];
    }

    return [{
      id,
      date: `${month}-01`,
      amount: subscription.amount,
      category: subscription.category,
      payment: subscription.payment,
      description: subscription.name,
      notes: "Gasto recurrente",
      subscriptionId: subscription.id,
      recurrenceMonth: month,
    }];
  });
}

/** Impide mutaciones accidentales fuera de las acciones del store. */
function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

const initialMonth = realMonth();

const serverSnapshot: FinanceSnapshot = freezeDeep({
  data: emptyData(),
  currentMonth: initialMonth,
  selectedMonth: initialMonth,
  hydrated: false,
  writesBlocked: false,
  error: null,
});

/** Store compartido: todas las instancias del hook observan el mismo estado. */
let snapshot = serverSnapshot;
let lastStoredValue: string | null = null;
const listeners = new Set<() => void>();
let stopWatching: (() => void) | undefined;

function publish(patch: Partial<FinanceSnapshot>): void {
  snapshot = freezeDeep({ ...snapshot, ...patch });
  listeners.forEach((listener) => listener());
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

function fail(message: string, block = false): MutationResult {
  publish({
    error: message,
    writesBlocked: snapshot.writesBlocked || block,
  });
  return { ok: false, error: message };
}

function updateClock(): void {
  const month = realMonth();
  if (month === snapshot.currentMonth) return;

  publish({
    currentMonth: month,
    selectedMonth:
      snapshot.selectedMonth === snapshot.currentMonth
        ? month
        : snapshot.selectedMonth,
  });
}

/**
 * Se escribe antes de publicar: si falla localStorage, el cambio no se aplica.
 * Una lectura inválida o un conflicto bloquean escrituras hasta reload().
 */
function commit(
  transform: (data: FinanceData) => FinanceData,
): MutationResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "localStorage requiere un navegador." };
  }

  if (!snapshot.hydrated) reload();
  if (snapshot.writesBlocked) {
    return {
      ok: false,
      error: snapshot.error ?? "El almacenamiento necesita revisión.",
    };
  }

  updateClock();

  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== lastStoredValue) {
      return fail(
        "Los datos cambiaron en otra pestaña. Ejecuta reload() antes de editar.",
        true,
      );
    }
  } catch (error) {
    return fail(`No se pudo leer el almacenamiento: ${messageOf(error)}`, true);
  }

  try {
    const month = realMonth();
    const current = materialize(snapshot.data, month);
    const changed = normalize(transform(current));
    const next = normalize(materialize(changed, month));
    const serialized = JSON.stringify(next);

    if (serialized !== lastStoredValue) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }

    lastStoredValue = serialized;
    publish({ data: next, error: null });
    return { ok: true };
  } catch (error) {
    return fail(`No se guardó el cambio: ${messageOf(error)}`);
  }
}

function reload(): MutationResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "localStorage requiere un navegador." };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const data = saved === null ? emptyData() : normalize(JSON.parse(saved));

    lastStoredValue = saved;
    updateClock();
    publish({
      data,
      hydrated: true,
      writesBlocked: false,
      error: null,
    });
  } catch (error) {
    publish({ hydrated: true });
    return fail(
      `No se pudieron cargar los datos. No se sobrescribirán: ${messageOf(error)}`,
      true,
    );
  }

  // Persiste la migración y recupera recurrencias pendientes.
  return commit((data) => data);
}

function checkMonth(): void {
  if (!snapshot.hydrated || snapshot.writesBlocked) return;

  updateClock();

  if (materialize(snapshot.data, realMonth()) !== snapshot.data) {
    commit((data) => data);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1 && typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;

      try {
        if (event.storageArea !== window.localStorage) return;
      } catch {
        return;
      }

      fail(
        "El almacenamiento cambió en otra pestaña. Ejecuta reload() antes de editar.",
        true,
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkMonth();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", checkMonth);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(checkMonth, 60_000);

    stopWatching = () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", checkMonth);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };

    // También relee tras un remontaje para detectar cambios mientras no
    // existían consumidores. Las recurrencias son idempotentes en StrictMode.
    reload();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopWatching?.();
      stopWatching = undefined;
    }
  };
}

const actions = {
  reload,

  /** Sustituye los datos financieros; no importa estados temporales de la UI. */
  importData(raw: unknown): MutationResult {
    let imported: FinanceData;
    try {
      // Exigir un respaldo completo evita interpretar {} como un borrado.
      assert(isObject(raw), "El respaldo debe ser un objeto JSON.");
      assert(
        raw.currency === "MXN" &&
          isObject(raw.budgets) && isObject(raw.categoryBudgets) &&
          Array.isArray(raw.transactions) &&
          Array.isArray(raw.subscriptions) &&
          Array.isArray(raw.recurringOccurrences),
        "El archivo no contiene un respaldo completo de Balance.",
      );
      imported = normalize(raw);
    } catch (error) {
      return { ok: false, error: `No se restauró el respaldo: ${messageOf(error)}` };
    }
    // Conserva protección entre pestañas y publica solo después de guardar.
    // Además registra las suscripciones pendientes hasta el mes actual.
    return commit(() => imported);
  },

  syncRecurring(): MutationResult {
    return commit((data) => data);
  },

  setSelectedMonth(month: Month): void {
    assert(isMonth(month), "Mes inválido.");
    publish({ selectedMonth: month });
  },

  setBudget(amount: Cents, month = snapshot.selectedMonth): MutationResult {
    return commit((data) => {
      assert(isMonth(month) && isCents(amount), "Presupuesto inválido.");
      return { ...data, budgets: { ...data.budgets, [month]: amount } };
    });
  },

  setCategoryBudget(
    categoryId: string,
    amount: Cents | null,
    month = snapshot.selectedMonth,
  ): MutationResult {
    return commit((data) => {
      assert(isMonth(month), "Mes inválido.");
      assert(
        data.categories.some((category) => category.id === categoryId),
        "Categoría inexistente.",
      );
      assert(amount === null || isCents(amount), "Límite inválido.");

      const limits = { ...data.categoryBudgets[month] };
      if (amount === null) delete limits[categoryId];
      else limits[categoryId] = amount;

      return {
        ...data,
        categoryBudgets: { ...data.categoryBudgets, [month]: limits },
      };
    });
  },

  addTransaction(input: NewTransaction): MutationResult {
    return commit((data) => ({
      ...data,
      transactions: [
        ...data.transactions,
        { ...input, id: crypto.randomUUID() },
      ],
    }));
  },

  updateTransaction(
    id: string,
    changes: Partial<NewTransaction>,
  ): MutationResult {
    return commit((data) => {
      assert(
        data.transactions.some((transaction) => transaction.id === id),
        "Movimiento inexistente.",
      );

      return {
        ...data,
        transactions: data.transactions.map((transaction) =>
          transaction.id === id
            ? {
                ...transaction,
                date: changes.date ?? transaction.date,
                amount: changes.amount ?? transaction.amount,
                category: changes.category ?? transaction.category,
                payment: changes.payment ?? transaction.payment,
                description: changes.description ?? transaction.description,
                notes: changes.notes ?? transaction.notes,
              }
            : transaction,
        ),
      };
    });
  },

  deleteTransaction(id: string): MutationResult {
    return commit((data) => ({
      ...data,
      transactions: data.transactions.filter((transaction) => transaction.id !== id),
      // No eliminar recurringOccurrences.
    }));
  },

  addSubscription(input: NewSubscription): MutationResult {
    return commit((data) => {
      assert(
        isMonth(input.startMonth) && input.startMonth >= realMonth(),
        "La suscripción debe comenzar este mes o en uno futuro.",
      );

      return {
        ...data,
        subscriptions: [
          ...data.subscriptions,
          { ...input, id: crypto.randomUUID(), cancelledFrom: null },
        ],
      };
    });
  },

  cancelSubscription(id: string): MutationResult {
    return commit((data) => {
      const subscription = data.subscriptions.find((row) => row.id === id);
      assert(subscription, "Suscripción inexistente.");
      if (subscription.cancelledFrom !== null) return data;

      const month = realMonth();
      const cancelledFrom =
        subscription.startMonth > month
          ? subscription.startMonth
          : nextMonth(month);

      return {
        ...data,
        subscriptions: data.subscriptions.map((row) =>
          row.id === id ? { ...row, cancelledFrom } : row,
        ),
      };
    });
  },

  addCategory(name: string, color = "#8899ac"): MutationResult {
    return commit((data) => ({
      ...data,
      categories: [
        ...data.categories,
        { id: crypto.randomUUID(), name: name.trim(), color },
      ],
    }));
  },

  updateCategory(
    id: string,
    changes: Partial<Pick<Category, "name" | "color">>,
  ): MutationResult {
    return commit((data) => {
      assert(
        data.categories.some((category) => category.id === id),
        "Categoría inexistente.",
      );

      return {
        ...data,
        categories: data.categories.map((category) =>
          category.id === id
            ? {
                ...category,
                name: changes.name?.trim() ?? category.name,
                color: changes.color ?? category.color,
              }
            : category,
        ),
      };
    });
  },

  deleteCategory(id: string): MutationResult {
    return commit((data) => {
      assert(
        !data.transactions.some((row) => row.category === id) &&
          !data.subscriptions.some((row) => row.category === id),
        "No se puede eliminar una categoría utilizada por movimientos o suscripciones.",
      );

      const categoryBudgets = Object.fromEntries(
        Object.entries(data.categoryBudgets).map(([month, limits]) => {
          const next = { ...limits };
          delete next[id];
          return [month, next];
        }),
      );

      return {
        ...data,
        categories: data.categories.filter((category) => category.id !== id),
        categoryBudgets,
      };
    });
  },
};

export interface MonthlyExpenseTotal {
  readonly month: Month;
  readonly total: Cents;
}

export interface MonthComparison {
  readonly previousMonth: Month;
  readonly previousSpent: Cents;
  /** null cuando no hay una base positiva para calcular el porcentaje. */
  readonly changePercent: number | null;
}

function previousMonth(month: Month): Month {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5));
  return `${number === 1 ? year - 1 : year}-${String(number === 1 ? 12 : number - 1).padStart(2, "0")}`;
}

export function getMonthlyAnalytics(data: FinanceData, selectedMonth: Month, currentMonth: Month) {
  const totals = new Map<Month, Cents>();
  for (const row of data.transactions) {
    const month = row.date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + row.amount);
  }
  // Coincide con los totales de las tarjetas, incluidas proyecciones futuras.
  const displayedTotal = (month: Month) => (totals.get(month) ?? 0) +
    (month > currentMonth ? project(data, month).reduce((sum, row) => sum + row.amount, 0) : 0);
  const priorMonth = previousMonth(selectedMonth);
  const priorSpent = displayedTotal(priorMonth);
  const comparison: MonthComparison = {
    previousMonth: priorMonth,
    previousSpent: priorSpent,
    changePercent: priorSpent > 0 ? (displayedTotal(selectedMonth) - priorSpent) / priorSpent * 100 : null,
  };
  const history: MonthlyExpenseTotal[] = [];
  for (let month = selectedMonth; history.length < 6; month = previousMonth(month)) {
    history.unshift({ month, total: totals.get(month) ?? 0 });
  }
  return { comparison, history };
}

export function useFinanceData() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );

  const { data, selectedMonth, currentMonth } = state;
  const { comparison, history } = getMonthlyAnalytics(data, selectedMonth, currentMonth);

  const transactions = data.transactions
    .filter((transaction) => transaction.date.startsWith(`${selectedMonth}-`))
    .sort((a, b) => b.date.localeCompare(a.date));

  const projectedTransactions =
    selectedMonth > currentMonth ? project(data, selectedMonth) : [];

  const monthlyTransactions = [...transactions, ...projectedTransactions].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  const budget = data.budgets[selectedMonth] ?? 0;
  const spent = monthlyTransactions.reduce((sum, row) => sum + row.amount, 0);
  const categoryBudgets = data.categoryBudgets[selectedMonth] ?? {};

  const alerts: BudgetAlert[] = [];

  function addAlert(name: string, amount: Cents, limit: Cents): void {
    if (limit > 0 && amount > limit * 0.8) {
      alerts.push({ name, amount, budget: limit, percent: (amount / limit) * 100 });
    }
  }

  addAlert("Presupuesto mensual", spent, budget);

  for (const [categoryId, limit] of Object.entries(categoryBudgets)) {
    const amount = monthlyTransactions
      .filter((transaction) => transaction.category === categoryId)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    addAlert(
      data.categories.find((category) => category.id === categoryId)?.name ??
        categoryId,
      amount,
      limit,
    );
  }

  return {
    ...state,
    ...actions,
    currency: data.currency,
    comparison,
    history,
    budget,
    categoryBudgets,
    /** Movimientos registrados del mes seleccionado. */
    transactions,
    /** Proyecciones independientes; no están persistidas. */
    projectedTransactions,
    /** Registrados + proyecciones, compatible con los totales originales. */
    monthlyTransactions,
    allTransactions: data.transactions,
    subscriptions: data.subscriptions,
    categories: data.categories,
    spent,
    remaining: budget - spent,
    percentUsed: budget > 0 ? (spent / budget) * 100 : 0,
    alerts,
  };
}

export default useFinanceData;
