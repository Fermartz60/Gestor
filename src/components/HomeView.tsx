import SummaryCards from './SummaryCards'
import type { SummaryCardsProps } from './SummaryCards'
import TransactionTable from './TransactionTable'
import type { TransactionTableProps } from './TransactionTable'
import QuickExpense from './QuickExpense'
import type { QuickExpenseProps } from './QuickExpense'
import SubscriptionList from './SubscriptionList'
import type { SubscriptionListProps } from './SubscriptionList'

interface HomeViewProps {
  summary: SummaryCardsProps
  table: TransactionTableProps
  quickExpense: QuickExpenseProps
  subscriptions: SubscriptionListProps
  projectionCount?: number
}

export default function HomeView({ summary, table, quickExpense, subscriptions, projectionCount }: HomeViewProps) {
  return <div className="min-w-0">
    <SummaryCards {...summary} />
    <div className="mt-8">
      {projectionCount !== undefined && <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">Incluye {projectionCount} cargos recurrentes proyectados. El CSV contiene solo movimientos registrados.</p>}
      <TransactionTable {...table} />
    </div>
    <SubscriptionList {...subscriptions} />
    <QuickExpense {...quickExpense} />
  </div>
}
