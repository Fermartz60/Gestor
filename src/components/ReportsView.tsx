import type { ReactNode } from 'react'
import MultiMonthChart from './MultiMonthChart'
import type { MultiMonthChartProps } from './MultiMonthChart'
import ChartsArea from './ChartsArea'
import type { ChartsAreaProps } from './ChartsArea'

interface ReportsViewProps {
  history: MultiMonthChartProps['history']
  distribution: ChartsAreaProps
  children?: ReactNode
}

export default function ReportsView({ history, distribution, children }: ReportsViewProps) {
  return <div className="mt-4 min-w-0 pb-24">
    <MultiMonthChart history={history} dark={distribution.dark} />
    {children}
    <ChartsArea key={distribution.month} {...distribution} />
  </div>
}
